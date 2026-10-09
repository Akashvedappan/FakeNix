"""
FAKENIX 2.0 — Video Processing Service
"""
import os
import cv2
import numpy as np
from flask import current_app
from app.utils.logger import get_logger

logger = get_logger('video_service')


def extract_frames(
    video_path: str,
    max_frames: int = 30,
    sample_interval: int = 30,
) -> list[np.ndarray]:
    """
    Extract frames from a video file with safety limits.

    Args:
        video_path: Absolute path to the video file.
        max_frames: Maximum number of frames to extract.
        sample_interval: Extract one frame every N frames.

    Returns:
        List of numpy arrays (BGR format, as OpenCV returns them).
    """
    frames = []

    try:
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            logger.error(f'Cannot open video: {video_path}')
            return frames

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0

        # If video is very short, reduce sample_interval
        if total_frames < sample_interval * max_frames:
            sample_interval = max(1, total_frames // max_frames)

        frame_idx = 0
        extracted = 0

        while extracted < max_frames:
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
            ret, frame = cap.read()
            if not ret:
                break

            frames.append(frame)
            extracted += 1
            frame_idx += sample_interval

            if frame_idx >= total_frames:
                break

        cap.release()
        logger.info(f'Extracted {len(frames)} frames from {os.path.basename(video_path)}')

    except ImportError:
        logger.error('OpenCV (cv2) is not installed. Cannot extract video frames.')
    except Exception as e:
        logger.error(f'Frame extraction error: {e}')

    return frames


def get_video_info(video_path: str) -> dict:
    """
    Get basic video information using OpenCV.
    Returns a dict with fps, frame_count, duration, width, height.
    """
    info = {
        'fps': 30.0,
        'frame_count': 0,
        'duration_seconds': 0,
        'width': 0,
        'height': 0,
    }

    try:
        cap = cv2.VideoCapture(video_path)
        if cap.isOpened():
            info['fps'] = cap.get(cv2.CAP_PROP_FPS) or 30.0
            info['frame_count'] = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            info['width'] = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            info['height'] = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            if info['fps'] > 0:
                info['duration_seconds'] = info['frame_count'] / info['fps']
            cap.release()
    except Exception as e:
        logger.warning(f'Could not read video info: {e}')

    return info
