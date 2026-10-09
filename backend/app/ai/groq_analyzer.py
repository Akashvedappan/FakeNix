"""
FAKENIX 2.0 — Groq vision-LLM deepfake analyzer

Sends the uploaded image (or sampled video frames) to a vision-capable LLM on
Groq and asks for a structured forensic assessment. The model's response is
validated and mapped onto the detection result format used by the rest of the
pipeline (result, confidence, risk_level, indicators, frames).

Configuration (backend/.env):
    GROQ_API_KEY   — required
    GROQ_MODEL     — required, e.g. qwen/qwen3.8-27b
    GROQ_TIMEOUT_SECONDS, GROQ_VIDEO_FRAMES — optional

There is no fallback: if the LLM call fails, GroqAnalysisError is raised and the
upload fails with that message. Results are never fabricated.
"""
import base64
import io
import json
import re

from flask import current_app

from app.ai.risk_classifier import classify_risk
from app.utils.logger import get_logger

logger = get_logger('groq_analyzer')

# Groq allows up to 5 images per request, but individual models can allow fewer
# (qwen/qwen3.8-27b accepts 3). GROQ_VIDEO_FRAMES is capped by this value.
MAX_IMAGES_PER_REQUEST = 5
# Each image costs ~1,800 input tokens on qwen/qwen3.8-27b regardless of resolution and
# the system prompt ~950, so 2 frames fit the on-demand tier's 7,000 tokens/minute limit.
DEFAULT_VIDEO_FRAMES = 2
# Keep the longest side modest: plenty for artifact inspection, well under request size limits.
MAX_IMAGE_SIDE = 1280
JPEG_QUALITY = 90

VERDICT_TO_RESULT = {'real': 'real', 'fake': 'deepfake', 'uncertain': 'suspicious'}
SEVERITIES = {'low', 'medium', 'high'}


class GroqAnalysisError(Exception):
    """Raised when the LLM analysis cannot be completed or its answer is unusable."""


SYSTEM_PROMPT = """You are the analysis engine of FAKENIX, a digital-forensics platform that investigators, journalists and cybercrime victims use to decide whether media is authentic or manipulated. Your assessment is stored as evidence, shown to the user as a verdict with a deepfake probability and a list of indicators, and printed in a forensic PDF report. Accuracy and honest calibration matter more than a confident-sounding answer.

TASK
Decide whether the provided media is a REAL, unmanipulated capture or FAKE, meaning any of:
- face swap, face reenactment or lip-sync deepfake
- fully AI-generated imagery (GAN, diffusion models such as Stable Diffusion, Midjourney, DALL-E, Flux)
- digital manipulation (splicing, cloning, object insertion/removal, face or body retouching that changes identity)

HOW TO EXAMINE
Inspect the pixels carefully before deciding. Check, where applicable:
1. Face boundaries and blending: seams at the jaw, hairline or neck; color or sharpness mismatch between face and surroundings.
2. Skin texture: waxy, over-smoothed or plastic skin; missing pores; repeated texture patches.
3. Eyes: asymmetric or inconsistent catchlight reflections, irregular pupils, mismatched iris color, unnatural gaze.
4. Mouth and teeth: blurred, merged or unnaturally uniform teeth; lip edges that smear.
5. Hair, ears, jewelry and glasses: strands dissolving into background, asymmetric earrings, broken frames.
6. Hands and anatomy: wrong finger count, fused or bent fingers, impossible joints.
7. Lighting and shadows: light direction inconsistent between subject and scene, missing or contradictory shadows.
8. Background and geometry: warped straight lines, melting objects, nonsensical structures, inconsistent perspective.
9. Text and symbols: garbled or pseudo-letters on signs, clothing or screens.
10. Generation and compression artifacts: checkerboard or grid patterns, unnatural noise uniformity, regions with a different compression level.
11. For multiple video frames: identity drift, flickering facial features, or face/background inconsistency between frames.

If the media is not a photograph or camera video at all (for example an illustration, cartoon, simple graphic, diagram or screenshot of an interface), say so explicitly in the explanation. Such media is not a deepfake unless it imitates a real photo or a real person; judge photorealistic renders and AI-generated "photos" as FAKE.

Metadata may be supplied as context. Treat it as weak supporting evidence only: missing EXIF is common for images shared on social media, and an editing-software tag alone does not prove manipulation.

CALIBRATION
- deepfake_probability is 0-100: the likelihood that the media is FAKE (0 = certainly real, 100 = certainly fake).
- Use "real" only when you actively checked and found no meaningful artifacts (typically probability below 30).
- Use "fake" when there is clear visual evidence (typically probability above 70).
- Use "uncertain" when evidence is weak, mixed, or the media is too small, blurry or compressed to judge (typically 30-70).
- The verdict and the probability must agree with each other.
- Never invent artifacts. Every indicator must describe something actually visible in the provided media. If you found nothing suspicious, return an empty indicators list.

OUTPUT
Respond with a single JSON object and nothing else, using exactly this schema:
{
  "verdict": "real" | "fake" | "uncertain",
  "deepfake_probability": number,
  "indicators": [
    {
      "name": "short artifact name, e.g. 'Facial boundary blending'",
      "severity": "low" | "medium" | "high",
      "score": number between 0 and 1 (how strongly this artifact suggests manipulation),
      "evidence": "one sentence stating where in the media it is visible"
    }
  ],
  "frames": [ { "index": integer, "deepfake_probability": number, "notes": "short observation" } ],
  "explanation": "2-4 sentences summarising the decisive evidence for the verdict, written for a non-expert investigator"
}
"frames" must contain one entry per provided video frame, in order, with "index" starting at 0. For a single image, return "frames": []."""


def _config(key, default=None):
    return current_app.config.get(key, default)


def is_configured() -> bool:
    return bool(_config('GROQ_API_KEY')) and bool(_config('GROQ_MODEL'))


def _get_client():
    try:
        from groq import Groq
    except ImportError as e:
        raise GroqAnalysisError(
            'The "groq" package is not installed in the Python environment running the server. '
            'Start the backend from its project environment: uv run python run.py'
        ) from e

    api_key = _config('GROQ_API_KEY')
    if not api_key:
        raise GroqAnalysisError('GROQ_API_KEY is not configured on the server.')
    if not _config('GROQ_MODEL'):
        raise GroqAnalysisError('GROQ_MODEL is not configured on the server.')
    return Groq(api_key=api_key, timeout=float(_config('GROQ_TIMEOUT_SECONDS', 90)), max_retries=2)


def _to_data_url(pil_image, max_side: int = MAX_IMAGE_SIDE) -> str:
    """Downscale if needed and encode as a base64 JPEG data URL."""
    img = pil_image.convert('RGB')
    img.thumbnail((max_side, max_side))
    buf = io.BytesIO()
    img.save(buf, format='JPEG', quality=JPEG_QUALITY)
    return 'data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode('ascii')


def _describe_metadata(metadata: dict) -> str:
    """Compact, model-friendly summary of the extracted file metadata."""
    if not metadata:
        return 'No metadata available.'
    keys = [
        ('format', 'Format'), ('mimeType', 'MIME type'), ('resolution', 'Resolution'),
        ('duration', 'Duration'), ('fps', 'Frame rate'), ('codec', 'Codec'),
        ('exifStripped', 'EXIF stripped'), ('softwareTag', 'Software tag'),
        ('created', 'Created'), ('gpsData', 'GPS'),
    ]
    lines = []
    for key, label in keys:
        value = metadata.get(key)
        if value is None or value == '':
            continue
        lines.append(f'- {label}: {value}')
    return '\n'.join(lines) if lines else 'No metadata available.'


_THINK_RE = re.compile(r'<think>.*?</think>', re.DOTALL | re.IGNORECASE)


def _extract_json(text: str) -> dict:
    """Parse the model's JSON answer, tolerating reasoning tags or code fences."""
    if not text:
        raise GroqAnalysisError('The AI model returned an empty response.')
    cleaned = _THINK_RE.sub('', text).strip()
    cleaned = re.sub(r'^```(?:json)?\s*|\s*```$', '', cleaned, flags=re.IGNORECASE).strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        start, end = cleaned.find('{'), cleaned.rfind('}')
        if start != -1 and end > start:
            try:
                return json.loads(cleaned[start:end + 1])
            except json.JSONDecodeError:
                pass
    logger.error(f'Unparseable AI response: {cleaned[:500]}')
    raise GroqAnalysisError('The AI model returned a response that could not be parsed.')


def _call_model(user_content: list) -> dict:
    client = _get_client()
    model = _config('GROQ_MODEL')
    messages = [
        {'role': 'system', 'content': SYSTEM_PROMPT},
        {'role': 'user', 'content': user_content},
    ]
    base_kwargs = dict(
        model=model,
        messages=messages,
        temperature=0.1,
        max_completion_tokens=2048,
        response_format={'type': 'json_object'},
    )

    from groq import APIStatusError, APIConnectionError, APITimeoutError, BadRequestError

    try:
        # Reasoning models (e.g. Qwen3) otherwise emit <think> blocks; hide them so
        # the message content is only the JSON answer.
        completion = client.chat.completions.create(reasoning_format='hidden', **base_kwargs)
    except BadRequestError as e:
        if 'reasoning' not in str(e).lower():
            raise GroqAnalysisError(_describe_api_error(e)) from e
        # Model does not support reasoning_format; retry without it.
        try:
            completion = client.chat.completions.create(**base_kwargs)
        except APIStatusError as e2:
            raise GroqAnalysisError(_describe_api_error(e2)) from e2
    except APITimeoutError as e:
        raise GroqAnalysisError('The AI analysis timed out. Please try again.') from e
    except APIConnectionError as e:
        raise GroqAnalysisError('Could not connect to the Groq API.') from e
    except APIStatusError as e:
        raise GroqAnalysisError(_describe_api_error(e)) from e

    content = completion.choices[0].message.content if completion.choices else None
    usage = getattr(completion, 'usage', None)
    logger.info(f'Groq analysis complete: model={model} tokens={getattr(usage, "total_tokens", "?")}')
    return _extract_json(content)


def _describe_api_error(err) -> str:
    status = getattr(err, 'status_code', None)
    detail = ''
    try:
        body = err.response.json()
        detail = body.get('error', {}).get('message', '')
    except Exception:
        detail = str(err)
    logger.error(f'Groq API error ({status}): {detail}')
    if status == 401:
        return 'The Groq API key was rejected. Check GROQ_API_KEY.'
    if status == 404:
        return f'Groq model "{_config("GROQ_MODEL")}" was not found or is not available to this API key.'
    if status == 413:
        if 'tokens per minute' in detail.lower() or 'itpm' in detail.lower():
            return ('The request exceeds the input-token-per-minute limit of your Groq plan. '
                    'Wait a minute and retry, lower GROQ_VIDEO_FRAMES, or upgrade the Groq tier.')
        return 'The media is too large for the AI model request.'
    if status == 429:
        return 'Groq rate limit reached. Please wait a moment and try again.'
    return f'AI analysis failed: {detail or "Groq API error"}'


def _clamp_pct(value) -> float | None:
    try:
        num = float(value)
    except (TypeError, ValueError):
        return None
    if num != num:  # NaN
        return None
    return round(min(100.0, max(0.0, num)), 1)


def _normalize_indicators(raw) -> list:
    indicators = []
    for item in raw if isinstance(raw, list) else []:
        if not isinstance(item, dict) or not str(item.get('name', '')).strip():
            continue
        severity = str(item.get('severity', '')).lower()
        try:
            score = float(item.get('score'))
            score = score / 100 if score > 1 else score
            score = round(min(1.0, max(0.0, score)), 2)
        except (TypeError, ValueError):
            score = None
        indicators.append({
            'name': str(item['name']).strip()[:120],
            'severity': severity if severity in SEVERITIES else 'medium',
            'score': score,
            'evidence': str(item.get('evidence', '')).strip()[:400] or None,
        })
    return indicators[:12]


def _build_result(answer: dict, model: str) -> dict:
    probability = _clamp_pct(answer.get('deepfake_probability'))
    if probability is None:
        raise GroqAnalysisError('The AI model did not return a deepfake probability.')

    verdict = str(answer.get('verdict', '')).strip().lower()
    result = VERDICT_TO_RESULT.get(verdict)
    if result is None:
        raise GroqAnalysisError(f'The AI model returned an invalid verdict: "{verdict}".')

    explanation = str(answer.get('explanation', '')).strip()[:2000] or None

    return {
        'result': result,
        'confidence': probability,
        'risk_level': classify_risk(probability),
        'model_name': f'{model} (Groq)',
        'is_demo': False,
        'indicators': _normalize_indicators(answer.get('indicators')),
        'frames': [],
        'explanation': explanation,
    }


def analyze_image(file_path: str, metadata: dict | None = None) -> dict:
    """Run the LLM forensic assessment on a single image file."""
    from PIL import Image

    try:
        with Image.open(file_path) as img:
            data_url = _to_data_url(img)
    except Exception as e:
        raise GroqAnalysisError('The image could not be read for AI analysis.') from e

    user_content = [
        {'type': 'text', 'text': (
            'Analyze this image for deepfake or AI manipulation and respond with the JSON object.\n\n'
            f'File metadata:\n{_describe_metadata(metadata or {})}'
        )},
        {'type': 'image_url', 'image_url': {'url': data_url}},
    ]
    return _build_result(_call_model(user_content), _config('GROQ_MODEL'))


def analyze_video(file_path: str, metadata: dict | None = None) -> dict:
    """Sample frames across the video and run one multi-image LLM assessment."""
    import cv2
    from PIL import Image
    from app.services.video_service import get_video_info

    info = get_video_info(file_path)
    total = info.get('frame_count') or 0
    fps = info.get('fps') or 30.0
    count = max(1, min(int(_config('GROQ_VIDEO_FRAMES', DEFAULT_VIDEO_FRAMES)), MAX_IMAGES_PER_REQUEST))

    # Evenly spaced frames, avoiding the very first/last frame (often black).
    positions = [int(total * (i + 1) / (count + 1)) for i in range(count)] if total else [0]

    cap = cv2.VideoCapture(file_path)
    if not cap.isOpened():
        raise GroqAnalysisError('The video could not be opened for AI analysis.')
    sampled = []
    try:
        for pos in dict.fromkeys(positions):
            cap.set(cv2.CAP_PROP_POS_FRAMES, pos)
            ok, frame = cap.read()
            if not ok:
                continue
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            sampled.append((pos, _to_data_url(Image.fromarray(rgb))))
    finally:
        cap.release()

    if not sampled:
        raise GroqAnalysisError('No frames could be extracted from the video.')

    def ts(frame_num):
        seconds = frame_num / fps if fps else 0
        return f'{int(seconds // 60)}:{int(seconds % 60):02d}'

    frame_list = '\n'.join(f'- Frame index {i}: video frame #{pos} at {ts(pos)}' for i, (pos, _) in enumerate(sampled))
    user_content = [
        {'type': 'text', 'text': (
            f'These are {len(sampled)} frames sampled evenly from one video, in chronological order. '
            'Analyze them together for deepfake or AI manipulation, including inconsistencies between frames, '
            'and respond with the JSON object. Include one "frames" entry per frame.\n\n'
            f'{frame_list}\n\nFile metadata:\n{_describe_metadata(metadata or {})}'
        )},
        *({'type': 'image_url', 'image_url': {'url': url}} for _, url in sampled),
    ]

    answer = _call_model(user_content)
    result = _build_result(answer, _config('GROQ_MODEL'))

    by_index = {}
    for entry in answer.get('frames') or []:
        if isinstance(entry, dict):
            try:
                by_index[int(entry.get('index'))] = entry
            except (TypeError, ValueError):
                continue

    frames = []
    for i, (pos, _) in enumerate(sampled):
        entry = by_index.get(i, {})
        prob = _clamp_pct(entry.get('deepfake_probability'))
        notes = str(entry.get('notes', '')).strip()
        frames.append({
            'frameNum': pos,
            'timestamp': ts(pos),
            'probability': prob,
            'risk': classify_risk(prob) if prob is not None else None,
            'anomalies': [notes[:200]] if notes else [],
        })
    result['frames'] = frames
    return result
