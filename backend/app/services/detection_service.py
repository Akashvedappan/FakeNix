"""
FAKENIX 2.0 — Detection Orchestration Service
Coordinates image/video upload, AI inference, hashing, and DB persistence.
"""
import json
import os
import uuid
from datetime import datetime, timezone
from flask import current_app

from app.extensions import db
from app.models.detection import Detection
from app.services.hashing_service import calculate_sha256, calculate_md5, generate_evidence_id
from app.services.evidence_service import create_evidence_record
from app.services.metadata_service import extract_image_metadata, extract_video_metadata, extract_basic_metadata
from app.services.image_service import get_file_size_display
from app.utils.logger import get_logger

logger = get_logger('detection_service')


def run_image_detection(file_path: str, file_name: str, user_id: int = None) -> dict:
    """
    Full image detection pipeline:
    1. Hash the file
    2. Extract metadata
    3. Run AI inference (or demo fallback)
    4. Persist detection + evidence records
    5. Return unified result dict
    """
    logger.info(f'Starting image detection for: {file_name}')

    # Step 1: Hashing
    sha256 = calculate_sha256(file_path)
    md5 = calculate_md5(file_path)

    # Step 2: Metadata
    meta = extract_image_metadata(file_path)
    basic = extract_basic_metadata(file_path, file_name)

    # Step 3: AI Inference (Groq vision LLM)
    inference = _run_inference(file_path, file_type='image', metadata={**meta, **basic})

    # Step 4: Persist
    detection_uid = f'det_{uuid.uuid4().hex[:12]}'

    detection = Detection(
        detection_uid=detection_uid,
        user_id=user_id,
        file_name=file_name,
        file_type='image',
        file_size=basic['fileSizeMB'] and f'{basic["fileSizeMB"]} MB',
        resolution=meta.get('resolution'),
        result=inference['result'],
        confidence=inference['confidence'],
        deepfake_probability=inference['confidence'],
        real_probability=round(100 - inference['confidence'], 2),
        risk_level=inference['risk_level'],
        model_name=inference['model_name'],
        is_demo=inference.get('is_demo', False),
        status='complete',
        indicators_json=json.dumps(inference.get('indicators', [])),
        frames_json=json.dumps([]),
        metadata_json=json.dumps({**meta, **basic, 'aiExplanation': inference.get('explanation')}),
    )
    db.session.add(detection)
    db.session.flush()  # Get detection.id before creating evidence

    uploaded_by = f'User #{user_id}' if user_id else 'Anonymous'
    storage_filename = os.path.basename(file_path)
    evidence = create_evidence_record(
        detection=detection,
        file_path=storage_filename,
        sha256_hash=sha256,
        md5_hash=md5,
        file_name=file_name,
        file_type='image',
        metadata={**meta, **basic},
        uploaded_by=uploaded_by,
    )
    db.session.commit()

    result = detection.to_dict()
    result['sha256'] = sha256
    result['evidenceId'] = evidence.evidence_uid
    return result


def run_video_detection(file_path: str, file_name: str, user_id: int = None) -> dict:
    """
    Full video detection pipeline with frame-level analysis.
    """
    logger.info(f'Starting video detection for: {file_name}')

    sha256 = calculate_sha256(file_path)
    md5 = calculate_md5(file_path)

    meta = extract_video_metadata(file_path)
    basic = extract_basic_metadata(file_path, file_name)

    # AI inference on sampled frames (Groq vision LLM)
    inference = _run_inference(file_path, file_type='video', metadata={**meta, **basic})

    detection_uid = f'det_{uuid.uuid4().hex[:12]}'
    duration_str = meta.get('duration', None)
    resolution_str = meta.get('resolution', None)

    detection = Detection(
        detection_uid=detection_uid,
        user_id=user_id,
        file_name=file_name,
        file_type='video',
        file_size=basic['fileSizeMB'] and f'{basic["fileSizeMB"]} MB',
        resolution=resolution_str,
        duration=duration_str,
        result=inference['result'],
        confidence=inference['confidence'],
        deepfake_probability=inference['confidence'],
        real_probability=round(100 - inference['confidence'], 2),
        risk_level=inference['risk_level'],
        model_name=inference['model_name'],
        is_demo=inference.get('is_demo', False),
        status='complete',
        indicators_json=json.dumps(inference.get('indicators', [])),
        frames_json=json.dumps(inference.get('frames', [])),
        metadata_json=json.dumps({**meta, **basic, 'aiExplanation': inference.get('explanation')}),
    )
    db.session.add(detection)
    db.session.flush()

    uploaded_by = f'User #{user_id}' if user_id else 'Anonymous'
    storage_filename = os.path.basename(file_path)
    evidence = create_evidence_record(
        detection=detection,
        file_path=storage_filename,
        sha256_hash=sha256,
        md5_hash=md5,
        file_name=file_name,
        file_type='video',
        metadata={**meta, **basic},
        uploaded_by=uploaded_by,
    )
    db.session.commit()

    result = detection.to_dict()
    result['sha256'] = sha256
    result['evidenceId'] = evidence.evidence_uid
    return result


def run_url_detection(url: str, user_id: int = None) -> dict:
    """
    URL analysis.
    Currently returns a NOT IMPLEMENTED response.
    Real implementation would download media and run detection.
    """
    logger.info(f'URL analysis requested: {url}')
    demo_mode = current_app.config.get('DEMO_MODE', True)

    if demo_mode:
        import random
        r = random.random()
        if r < 0.4:
            result, confidence, risk = 'deepfake', round(85 + random.random() * 14, 1), 'high'
        elif r < 0.65:
            result, confidence, risk = 'suspicious', round(45 + random.random() * 25, 1), 'medium'
        else:
            result, confidence, risk = 'real', round(5 + random.random() * 25, 1), 'low'

        detection_uid = f'det_{uuid.uuid4().hex[:12]}'
        evidence_uid = generate_evidence_id()

        detection = Detection(
            detection_uid=detection_uid,
            user_id=user_id,
            file_name=url,
            file_type='url',
            source_url=url,
            result=result,
            confidence=confidence,
            deepfake_probability=confidence,
            real_probability=round(100 - confidence, 2),
            risk_level=risk,
            model_name='DEMO ANALYSIS',
            is_demo=True,
            status='complete',
            indicators_json=json.dumps([]),
            frames_json=json.dumps([]),
            metadata_json=json.dumps({'sourceUrl': url}),
        )
        db.session.add(detection)
        db.session.commit()

        return {
            'id': detection_uid,
            'evidenceId': evidence_uid,
            'fileName': url,
            'sourceUrl': url,
            'fileType': 'url',
            'fileSize': 'N/A',
            'result': result,
            'risk': risk,
            'confidence': confidence,
            'deepfakeProbability': confidence,
            'realProbability': round(100 - confidence, 2),
            'model': 'DEMO ANALYSIS',
            'isDemo': True,
            'sha256': 'N/A — no file downloaded',
            'frames': [],
            'indicators': [],
            'metadata': {'sourceUrl': url},
            'timestamp': datetime.now(timezone.utc).isoformat(),
        }

    return {
        'success': False,
        'message': 'URL media analysis is not yet implemented. Please upload a file directly.',
        'status': 'not_implemented',
    }


def get_detection_history(user_id: int) -> list:
    """Return all detections for a user."""
    detections = (
        db.session.query(Detection)
        .filter(Detection.user_id == user_id)
        .order_by(Detection.created_at.desc())
        .limit(100)
        .all()
    )
    return [d.to_dict() for d in detections]


def get_detection_by_uid(detection_uid: str, user_id: int) -> dict | None:
    """Get a single detection result."""
    detection = db.session.query(Detection).filter(
        Detection.detection_uid == detection_uid,
        Detection.user_id == user_id
    ).first()
    if not detection:
        return None
    return detection.to_dict()


def delete_detection(detection_uid: str, user_id: int) -> bool:
    """Delete a detection and its evidence."""
    detection = db.session.query(Detection).filter(
        Detection.detection_uid == detection_uid,
        Detection.user_id == user_id
    ).first()
    if not detection:
        return False
    db.session.delete(detection)
    db.session.commit()
    return True


# ──────────────────────────────────────────────────────────────
# Internal: AI inference dispatch
# ──────────────────────────────────────────────────────────────

def _run_inference(file_path: str, file_type: str, metadata: dict | None = None) -> dict:
    """
    Analyze the media with the Groq vision LLM (see app.ai.groq_analyzer).

    There is no fallback: if Groq is not configured or the call fails,
    GroqAnalysisError propagates and the upload fails with that message.
    """
    from app.ai.groq_analyzer import analyze_image, analyze_video

    if file_type == 'image':
        return analyze_image(file_path, metadata)
    return analyze_video(file_path, metadata)
