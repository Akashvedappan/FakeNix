"""
FAKENIX 2.0 — Secure Image Upload Service
"""
import os
import uuid
import mimetypes
from flask import current_app
from werkzeug.utils import secure_filename
from werkzeug.datastructures import FileStorage
from app.utils.logger import get_logger

logger = get_logger('image_service')

ALLOWED_IMAGE_EXTENSIONS = {'jpg', 'jpeg', 'png', 'webp'}
ALLOWED_IMAGE_MIMES = {'image/jpeg', 'image/png', 'image/webp', 'image/jpg'}


def validate_image_file(file: FileStorage) -> tuple[bool, str]:
    """
    Validate an uploaded image file.
    Checks extension AND MIME type — never trusts extension alone.
    Returns (is_valid, error_message).
    """
    if not file or not file.filename:
        return False, 'No file provided.'

    filename = file.filename
    ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''

    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        return False, f'Unsupported file extension ".{ext}". Allowed: JPG, JPEG, PNG, WEBP.'

    # Read first bytes to detect MIME type (magic bytes)
    header = file.stream.read(512)
    file.stream.seek(0)  # Reset stream after reading

    detected_mime = _detect_mime_from_bytes(header)
    if detected_mime not in ALLOWED_IMAGE_MIMES:
        return False, f'File content does not match an allowed image type (detected: {detected_mime}).'

    return True, ''


def validate_video_file(file: FileStorage) -> tuple[bool, str]:
    """
    Validate an uploaded video file.
    Returns (is_valid, error_message).
    """
    if not file or not file.filename:
        return False, 'No file provided.'

    allowed_video_exts = {'mp4', 'mov', 'avi', 'mkv'}
    filename = file.filename
    ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''

    if ext not in allowed_video_exts:
        return False, f'Unsupported file extension ".{ext}". Allowed: MP4, MOV, AVI, MKV.'

    return True, ''


def save_upload(file: FileStorage, subfolder: str = '') -> tuple[str, str]:
    """
    Save an uploaded file securely.
    - Generates a random UUID filename (never uses original)
    - Preserves the file extension (lowercased)
    - Saves inside UPLOAD_FOLDER

    Returns:
        (storage_filename, absolute_file_path)
    """
    original_ext = ''
    if file.filename and '.' in file.filename:
        original_ext = file.filename.rsplit('.', 1)[-1].lower()

    # Random filename — path traversal protection
    storage_name = f'{uuid.uuid4().hex}.{original_ext}'

    upload_dir = current_app.config.get('UPLOAD_FOLDER')
    if subfolder:
        upload_dir = os.path.join(upload_dir, subfolder)
    os.makedirs(upload_dir, exist_ok=True)

    file_path = os.path.join(upload_dir, storage_name)
    file.save(file_path)
    logger.info(f'Saved upload: {storage_name} ({os.path.getsize(file_path)} bytes)')

    return storage_name, file_path


def _detect_mime_from_bytes(header: bytes) -> str:
    """
    Detect MIME type from file magic bytes.
    Simple implementation for common image formats.
    """
    if header[:3] == b'\xff\xd8\xff':
        return 'image/jpeg'
    elif header[:8] == b'\x89PNG\r\n\x1a\n':
        return 'image/png'
    elif header[:4] in (b'RIFF', ) and b'WEBP' in header[:12]:
        return 'image/webp'
    # Fallback to content-type header (less trusted)
    return 'application/octet-stream'


def get_file_size_display(path: str) -> str:
    """Return human-readable file size string."""
    try:
        size = os.path.getsize(path)
        if size < 1024:
            return f'{size} B'
        elif size < 1024 * 1024:
            return f'{size / 1024:.1f} KB'
        else:
            return f'{size / 1024 / 1024:.1f} MB'
    except Exception:
        return 'Unknown'
