"""
FAKENIX 2.0 — Grad-CAM Explainability Module

Generates gradient-weighted class activation maps (Grad-CAM) heatmaps
to visualize which regions of an image influenced the model's decision.

Requires:
    - TensorFlow >= 2.16
    - A model with a named convolutional layer (e.g., 'top_conv' for EfficientNet)
    - OpenCV for heatmap overlay

If the model architecture does not support Grad-CAM or TF is unavailable,
a clear 'unavailable' response is returned — no fabricated heatmaps.
"""
import os
import uuid
from app.utils.logger import get_logger

logger = get_logger('gradcam')

# Typical EfficientNet-B4 last conv layer name
DEFAULT_CONV_LAYER = 'top_conv'


def generate_gradcam(
    file_path: str,
    output_dir: str,
    conv_layer_name: str = DEFAULT_CONV_LAYER
) -> dict:
    """
    Generate a Grad-CAM heatmap for an image.

    Args:
        file_path: Path to the input image.
        output_dir: Directory to save the heatmap image.
        conv_layer_name: Name of the target convolutional layer.

    Returns:
        dict with keys: available, heatmap_path (if successful), message
    """
    from app.ai.model_loader import get_model

    model = get_model()
    if model is None:
        return {
            'available': False,
            'heatmap_path': None,
            'message': 'Model not available — Grad-CAM cannot be generated.',
        }

    try:
        import tensorflow as tf
        import numpy as np
        import cv2
        from app.ai.preprocessing import preprocess_image_file, get_target_size

        target_size = get_target_size(model)
        img_array = preprocess_image_file(file_path, target_size)

        # Find the target layer
        try:
            grad_model = tf.keras.models.Model(
                inputs=model.input,
                outputs=[model.get_layer(conv_layer_name).output, model.output]
            )
        except ValueError:
            # Layer not found — try last conv layer
            conv_layers = [l for l in model.layers if 'conv' in l.name.lower()]
            if not conv_layers:
                return {
                    'available': False,
                    'heatmap_path': None,
                    'message': f'Grad-CAM: no convolutional layer found in model.',
                }
            grad_model = tf.keras.models.Model(
                inputs=model.input,
                outputs=[conv_layers[-1].output, model.output]
            )

        with tf.GradientTape() as tape:
            inputs = tf.cast(img_array, tf.float32)
            conv_outputs, predictions = grad_model(inputs)
            # Binary classification: gradient of output w.r.t. conv layer
            if predictions.shape[-1] == 1:
                loss = predictions[:, 0]
            else:
                loss = predictions[:, 1]  # deepfake class

        grads = tape.gradient(loss, conv_outputs)
        pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))
        conv_outputs = conv_outputs[0]
        heatmap = conv_outputs @ pooled_grads[..., tf.newaxis]
        heatmap = tf.squeeze(heatmap)
        heatmap = tf.maximum(heatmap, 0) / (tf.reduce_max(heatmap) + 1e-8)
        heatmap = heatmap.numpy()

        # Overlay on original image
        original = cv2.imread(file_path)
        h, w = original.shape[:2]
        heatmap_resized = cv2.resize(heatmap, (w, h))
        heatmap_uint8 = np.uint8(255 * heatmap_resized)
        heatmap_colored = cv2.applyColorMap(heatmap_uint8, cv2.COLORMAP_JET)
        overlay = cv2.addWeighted(original, 0.6, heatmap_colored, 0.4, 0)

        # Save heatmap
        os.makedirs(output_dir, exist_ok=True)
        heatmap_filename = f'gradcam_{uuid.uuid4().hex[:8]}.jpg'
        heatmap_path = os.path.join(output_dir, heatmap_filename)
        cv2.imwrite(heatmap_path, overlay)

        logger.info(f'Grad-CAM generated: {heatmap_path}')
        return {
            'available': True,
            'heatmap_path': heatmap_filename,
            'message': 'Grad-CAM heatmap generated successfully.',
        }

    except ImportError as e:
        return {
            'available': False,
            'heatmap_path': None,
            'message': f'Required library not available: {e}',
        }
    except Exception as e:
        logger.error(f'Grad-CAM generation error: {e}')
        return {
            'available': False,
            'heatmap_path': None,
            'message': f'Grad-CAM generation failed: {str(e)}',
        }
