"""
FAKENIX 2.0 — Video Predictor

Runs EfficientNet-B4 on extracted video frames and aggregates results.
"""
import numpy as np
from app.ai.model_loader import get_model, get_model_info
from app.ai.preprocessing import preprocess_image_array, get_target_size
from app.ai.risk_classifier import classify_risk, get_result_from_risk
from app.services.video_service import extract_frames, get_video_info
from app.utils.logger import get_logger

logger = get_logger('video_predictor')


def predict_video(file_path: str, max_frames: int = 20) -> dict | None:
    """
    Run deepfake detection on a video by analyzing sampled frames.

    Returns:
        dict with result, confidence, risk_level, model_name, frames list
        Returns None if the model is unavailable.
    """
    model = get_model()
    if model is None:
        logger.warning('Model unavailable for video prediction.')
        return None

    try:
        target_size = get_target_size(model)
        frames = extract_frames(file_path, max_frames=max_frames)

        if not frames:
            logger.warning('No frames extracted from video.')
            return None

        video_info = get_video_info(file_path)
        fps = video_info.get('fps', 30.0) or 30.0

        frame_results = []
        probabilities = []

        for i, frame in enumerate(frames):
            try:
                processed = preprocess_image_array(frame, target_size)
                pred = model.predict(processed, verbose=0)

                # Interpret output (same logic as image predictor)
                if pred.ndim == 2 and pred.shape[1] == 1:
                    prob = float(pred[0][0]) * 100
                elif pred.ndim == 2 and pred.shape[1] == 2:
                    prob = float(pred[0][1]) * 100
                else:
                    prob = float(pred.flatten()[0]) * 100

                prob = round(min(100.0, max(0.0, prob)), 2)
                probabilities.append(prob)

                # Calculate approximate timestamp
                frame_num = i * (video_info.get('frame_count', 1) // max(len(frames), 1))
                seconds = frame_num / fps
                minutes = int(seconds // 60)
                secs = int(seconds % 60)

                frame_results.append({
                    'frameNum': frame_num,
                    'timestamp': f'{minutes}:{secs:02d}',
                    'probability': prob,
                    'risk': classify_risk(prob),
                })

            except Exception as e:
                logger.warning(f'Frame {i} prediction error: {e}')

        if not probabilities:
            return None

        # Aggregate: use mean confidence
        avg_confidence = round(float(np.mean(probabilities)), 2)
        risk = classify_risk(avg_confidence)
        result = get_result_from_risk(risk)

        return {
            'result': result,
            'confidence': avg_confidence,
            'risk_level': risk,
            'model_name': 'EfficientNet-B4',
            'is_demo': False,
            'frames': frame_results,
            'indicators': [],
        }

    except Exception as e:
        logger.error(f'Video prediction error: {e}')
        return None
