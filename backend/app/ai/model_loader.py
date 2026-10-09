"""
FAKENIX 2.0 — AI Model Loader

Handles lazy loading of the EfficientNet-B4 model.
The model is loaded once (singleton) and reused across requests.

Requirements:
    - Python 3.10–3.12 (TensorFlow does not support Python 3.14 yet)
    - TensorFlow >= 2.16 installed in the environment
    - Model file at MODEL_PATH (.keras or .h5 format)

If TensorFlow is unavailable or the model file is missing, all functions
return None. The caller (predictor modules) handles the fallback.
"""
import os
from app.utils.logger import get_logger

logger = get_logger('model_loader')

# Module-level singleton — the model is loaded at most once
_model = None
_model_load_attempted = False
_tensorflow_available = False


def is_tensorflow_available() -> bool:
    """Check if TensorFlow can be imported."""
    global _tensorflow_available
    try:
        import tensorflow  # noqa: F401
        _tensorflow_available = True
    except ImportError:
        _tensorflow_available = False
    return _tensorflow_available


def get_model():
    """
    Get the loaded Keras model (singleton).

    Returns:
        Loaded Keras model, or None if unavailable.
    """
    global _model, _model_load_attempted

    if _model_load_attempted:
        return _model

    _model_load_attempted = True

    if not is_tensorflow_available():
        logger.warning(
            'TensorFlow is not installed. AI inference is unavailable. '
            'This is expected on Python 3.14. Install TF in a Python 3.10-3.12 environment '
            'and set MODEL_PATH in .env to enable real inference.'
        )
        return None

    try:
        from flask import current_app
        model_path = current_app.config.get('MODEL_PATH', 'models/fakenix_model.keras')
    except RuntimeError:
        model_path = os.environ.get('MODEL_PATH', 'models/fakenix_model.keras')

    if not os.path.exists(model_path):
        logger.warning(
            f'Model file not found at: {model_path}. '
            'Place your trained .keras or .h5 model at this path to enable real AI inference.'
        )
        return None

    try:
        import tensorflow as tf
        logger.info(f'Loading model from: {model_path}')
        _model = tf.keras.models.load_model(model_path)
        logger.info(f'Model loaded successfully: {model_path}')
        logger.info(f'Model input shape: {_model.input_shape}')
        return _model
    except Exception as e:
        logger.error(f'Failed to load model from {model_path}: {e}')
        _model = None
        return None


def get_model_info() -> dict:
    """Return information about the model status."""
    tf_available = is_tensorflow_available()

    if not tf_available:
        return {
            'available': False,
            'reason': 'TensorFlow not installed (Python 3.14 is not yet supported by TF)',
            'model_name': 'EfficientNet-B4',
            'model_path': None,
        }

    model = get_model()
    if model is None:
        try:
            from flask import current_app
            model_path = current_app.config.get('MODEL_PATH', 'models/fakenix_model.keras')
        except RuntimeError:
            model_path = 'models/fakenix_model.keras'

        return {
            'available': False,
            'reason': f'Model file not found at: {model_path}',
            'model_name': 'EfficientNet-B4',
            'model_path': model_path,
        }

    return {
        'available': True,
        'model_name': 'EfficientNet-B4',
        'input_shape': str(model.input_shape),
        'reason': None,
    }
