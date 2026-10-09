"""
FAKENIX 2.0 — Forensic Metadata Extraction Service

Extracts safe, non-sensitive metadata from uploaded files.
Metadata is informational only and should NOT be treated as proof of authenticity.
"""
import os
import mimetypes
from datetime import datetime, timezone
from app.utils.logger import get_logger

logger = get_logger('metadata_service')


def extract_image_metadata(file_path: str) -> dict:
    """
    Extract metadata from an image file.
    Uses Pillow for EXIF and basic image info.
    """
    meta = {
        'format': None,
        'width': None,
        'height': None,
        'resolution': None,
        'mode': None,
        'mimeType': None,
        'created': None,
        'modified': None,
        'softwareTag': None,
        'gpsData': None,
        'exifStripped': None,
        'codec': None,
        'bitrate': None,
        'fps': None,
        'audioCodec': None,
    }

    try:
        from PIL import Image
        from PIL.ExifTags import TAGS, GPSTAGS

        with Image.open(file_path) as img:
            meta['format'] = img.format or 'Unknown'
            meta['width'] = img.width
            meta['height'] = img.height
            meta['resolution'] = f'{img.width}x{img.height}'
            meta['mode'] = img.mode

        meta['mimeType'] = mimetypes.guess_type(file_path)[0] or 'application/octet-stream'

        # File system timestamps
        stat = os.stat(file_path)
        meta['modified'] = datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat()

        # EXIF data
        try:
            with Image.open(file_path) as img:
                exif_data = img._getexif() if hasattr(img, '_getexif') else None
                if exif_data:
                    meta['exifStripped'] = False
                    for tag_id, value in exif_data.items():
                        tag = TAGS.get(tag_id, tag_id)
                        if tag == 'DateTime':
                            meta['created'] = str(value)
                        elif tag == 'Software':
                            meta['softwareTag'] = str(value)[:100]
                        elif tag == 'GPSInfo':
                            gps = {GPSTAGS.get(k, k): v for k, v in value.items()}
                            if 'GPSLatitude' in gps and 'GPSLongitude' in gps:
                                meta['gpsData'] = f"GPS data present"
                            else:
                                meta['gpsData'] = 'GPS data present (partial)'
                else:
                    meta['exifStripped'] = True
                    meta['gpsData'] = 'Not available'
        except Exception:
            meta['exifStripped'] = True
            meta['gpsData'] = 'Not available'

    except Exception as e:
        logger.warning(f'Image metadata extraction error for {file_path}: {e}')

    return meta


def extract_video_metadata(file_path: str) -> dict:
    """
    Extract metadata from a video file using OpenCV.
    Falls back to basic file info if OpenCV fails.
    """
    meta = {
        'format': None,
        'codec': None,
        'width': None,
        'height': None,
        'resolution': None,
        'fps': None,
        'duration': None,
        'bitrate': None,
        'audioCodec': None,
        'mimeType': None,
        'created': None,
        'modified': None,
        'softwareTag': 'Unknown',
        'gpsData': 'Not available',
        'exifStripped': None,
    }

    try:
        import cv2

        cap = cv2.VideoCapture(file_path)
        if cap.isOpened():
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            fps = cap.get(cv2.CAP_PROP_FPS)
            frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            duration_seconds = frame_count / fps if fps > 0 else 0

            meta['width'] = width
            meta['height'] = height
            meta['resolution'] = f'{width}x{height}'
            meta['fps'] = f'{fps:.2f}' if fps else None
            meta['format'] = _detect_video_format(file_path)

            # Format duration as M:SS
            minutes = int(duration_seconds // 60)
            seconds = int(duration_seconds % 60)
            meta['duration'] = f'{minutes}:{seconds:02d}'

            cap.release()

        meta['mimeType'] = mimetypes.guess_type(file_path)[0] or 'video/mp4'

        stat = os.stat(file_path)
        meta['modified'] = datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat()

    except ImportError:
        logger.warning('OpenCV not available — returning basic file metadata.')
        meta['format'] = os.path.splitext(file_path)[1].upper().lstrip('.')
    except Exception as e:
        logger.warning(f'Video metadata extraction error for {file_path}: {e}')

    return meta


def _detect_video_format(file_path: str) -> str:
    """Detect video container format from extension."""
    ext = os.path.splitext(file_path)[1].lower()
    formats = {
        '.mp4': 'MP4 (H.264)',
        '.mov': 'MOV (QuickTime)',
        '.avi': 'AVI',
        '.mkv': 'MKV (Matroska)',
    }
    return formats.get(ext, ext.upper().lstrip('.'))


def extract_basic_metadata(file_path: str, file_name: str) -> dict:
    """Extract basic file-level metadata (name, size, MIME)."""
    stat = os.stat(file_path)
    size_bytes = stat.st_size
    size_mb = round(size_bytes / (1024 * 1024), 2)

    mime, _ = mimetypes.guess_type(file_name)

    return {
        'fileName': file_name,
        'mimeType': mime or 'application/octet-stream',
        'fileSizeBytes': size_bytes,
        'fileSizeMB': size_mb,
        'modified': datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat(),
    }
