"""
FAKENIX 2.0 — Image Predictor

Runs the EfficientNet-B4 model on a single image.
Returns None if the model is unavailable — caller must handle fallback.
"""
from app.ai.model_loader import get_model, get_model_info
from app.ai.preprocessing import preprocess_image_file, get_target_size
from app.ai.risk_classifier import classify_risk, get_result_from_risk
from app.utils.logger import get_logger

logger = get_logger('image_predictor')


def predict_image(file_path: str) -> dict | None:
    """
    Run deepfake detection inference on a single image.

    Returns:
        dict with keys: result, confidence, risk_level, model_name, is_demo
        Returns None if the model is unavailable.
    """
    model = get_model()
    if model is None:
        info = get_model_info()
        logger.warning(f'Model unavailable: {info.get("reason")}')
        return None

    try:
        import numpy as np
        target_size = get_target_size(model)
        processed = preprocess_image_file(file_path, target_size)
        predictions = model.predict(processed, verbose=0)

        # Interpret output
        # Assumes binary classification: output[0] is deepfake probability
        # Adjust based on your actual model output format
        if predictions.ndim == 2 and predictions.shape[1] == 1:
            # Single sigmoid output
            deepfake_prob = float(predictions[0][0]) * 100
        elif predictions.ndim == 2 and predictions.shape[1] == 2:
            # Two-class softmax: [real_prob, fake_prob]
            deepfake_prob = float(predictions[0][1]) * 100
        else:
            deepfake_prob = float(predictions.flatten()[0]) * 100

        deepfake_prob = round(min(100.0, max(0.0, deepfake_prob)), 2)
        risk = classify_risk(deepfake_prob)
        result = get_result_from_risk(risk)

        return {
            'result': result,
            'confidence': deepfake_prob,
            'risk_level': risk,
            'model_name': 'EfficientNet-B4',
            'is_demo': False,
            'indicators': [],
            'frames': [],
        }

    except Exception as e:
        logger.error(f'Image prediction error: {e}')
        return None
