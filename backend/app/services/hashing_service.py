"""
FAKENIX 2.0 — SHA-256 Evidence Hashing Service
"""
import hashlib
import os
from datetime import datetime, timezone
from app.utils.logger import get_logger

logger = get_logger('hashing_service')

_evidence_counter_cache = {}  # In-memory cache for evidence counter (fallback)


def calculate_sha256(file_path: str) -> str:
    """
    Calculate the SHA-256 hash of a file on disk.
    Reads in 64 KB chunks to avoid loading large files into memory.
    """
    sha256 = hashlib.sha256()
    try:
        with open(file_path, 'rb') as f:
            for chunk in iter(lambda: f.read(65536), b''):
                sha256.update(chunk)
        return sha256.hexdigest()
    except FileNotFoundError:
        logger.error(f'File not found for hashing: {file_path}')
        raise
    except Exception as e:
        logger.error(f'Error hashing file {file_path}: {e}')
        raise


def calculate_sha256_bytes(data: bytes) -> str:
    """Calculate SHA-256 of in-memory bytes."""
    return hashlib.sha256(data).hexdigest()


def calculate_md5(file_path: str) -> str:
    """Calculate MD5 of a file (for reference only, not security)."""
    md5 = hashlib.md5()
    try:
        with open(file_path, 'rb') as f:
            for chunk in iter(lambda: f.read(65536), b''):
                md5.update(chunk)
        return md5.hexdigest()
    except Exception as e:
        logger.warning(f'MD5 calculation failed for {file_path}: {e}')
        return ''


def generate_evidence_id(year: int = None) -> str:
    """
    Generate a unique evidence ID in the format: FX-YYYY-NNNNN
    Uses the highest existing number for the year, so IDs stay unique after deletions.
    """
    from app.extensions import db
    from app.models.evidence import Evidence

    if year is None:
        year = datetime.now(timezone.utc).year

    # Next number after the highest in use (row count would collide after deletions)
    from app.utils.ids import next_sequential_id
    return next_sequential_id(Evidence.evidence_uid, f'FX-{year}-', 5)


def verify_file_integrity(file_path: str, expected_hash: str) -> dict:
    """
    Verify file integrity by recalculating its SHA-256 hash.
    Returns a dict with status and details.
    """
    if not os.path.exists(file_path):
        return {
            'status': 'failed',
            'reason': 'File not found on disk.',
            'expected': expected_hash,
            'actual': None,
            'match': False,
        }

    actual_hash = calculate_sha256(file_path)
    match = actual_hash.lower() == expected_hash.lower()

    return {
        'status': 'verified' if match else 'failed',
        'reason': 'Integrity verified.' if match else 'Hash mismatch — file may have been modified.',
        'expected': expected_hash,
        'actual': actual_hash,
        'match': match,
        'verified_at': datetime.now(timezone.utc).isoformat(),
    }
