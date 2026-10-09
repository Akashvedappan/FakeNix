"""
FAKENIX 2.0 — Image Preprocessing for EfficientNet-B4

EfficientNet-B4 default input: 380×380×3
However, many fine-tuned models are resized to 224×224×3.
The target size is read from the model's actual input shape when available.
"""
import numpy as np
from app.utils.logger import get_logger

logger = get_logger('preprocessing')

# Default input shape — will be overridden by model.input_shape if model is loaded
DEFAULT_INPUT_SIZE = (224, 224)


def preprocess_image_array(img_array: np.ndarray, target_size: tuple = DEFAULT_INPUT_SIZE) -> np.ndarray:
    """
    Preprocess a numpy image array for model input.
    - Resize to target_size
    - Convert BGR → RGB (OpenCV convention)
    - Normalize to [0, 1]
    - Add batch dimension

    Args:
        img_array: numpy array in BGR format (as returned by cv2.imread)
        target_size: (height, width) tuple

    Returns:
        Preprocessed array with shape (1, H, W, 3)
    """
    try:
        import cv2
        # Resize
        resized = cv2.resize(img_array, (target_size[1], target_size[0]))
        # BGR → RGB
        rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB)
        # Normalize
        normalized = rgb.astype(np.float32) / 255.0
        # Add batch dimension
        return np.expand_dims(normalized, axis=0)
    except Exception as e:
        logger.error(f'Image preprocessing error: {e}')
        raise


def preprocess_image_file(file_path: str, target_size: tuple = DEFAULT_INPUT_SIZE) -> np.ndarray:
    """
    Load an image from disk and preprocess it for model input.

    Returns:
        Preprocessed array with shape (1, H, W, 3)
    """
    try:
        import cv2
        img = cv2.imread(file_path)
        if img is None:
            raise ValueError(f'Could not read image: {file_path}')
        return preprocess_image_array(img, target_size)
    except ImportError:
        # Fallback: use Pillow if OpenCV unavailable
        from PIL import Image
        img = Image.open(file_path).convert('RGB').resize((target_size[1], target_size[0]))
        arr = np.array(img, dtype=np.float32) / 255.0
        return np.expand_dims(arr, axis=0)


def get_target_size(model) -> tuple:
    """Extract the target input size from the model's input shape."""
    try:
        shape = model.input_shape  # (None, H, W, C)
        if len(shape) == 4:
            return (shape[1], shape[2])
    except Exception:
        pass
    return DEFAULT_INPUT_SIZE
