"""
FAKENIX 2.0 — Evidence Service
"""
import json
import os
from datetime import datetime, timezone

from app.extensions import db
from app.models.evidence import Evidence
from app.models.detection import Detection
from app.services.hashing_service import verify_file_integrity, generate_evidence_id
from app.utils.logger import get_logger

logger = get_logger('evidence_service')


def create_evidence_record(
    detection: Detection,
    file_path: str,
    sha256_hash: str,
    md5_hash: str,
    file_name: str,
    file_type: str,
    metadata: dict,
    uploaded_by: str = 'FAKENIX System',
) -> Evidence:
    """Create an evidence record linked to a detection."""

    evidence_uid = generate_evidence_id()
    now_iso = datetime.now(timezone.utc).isoformat()

    chain = [
        {'action': 'Uploaded', 'by': uploaded_by, 'time': now_iso},
        {'action': 'Analyzed', 'by': 'FAKENIX AI Engine', 'time': now_iso},
        {'action': 'Evidence Hash Generated', 'by': 'FAKENIX System', 'time': now_iso},
    ]

    evidence = Evidence(
        evidence_uid=evidence_uid,
        detection_id=detection.id if detection else None,
        file_name=file_name,
        file_type=file_type,
        file_path=file_path,
        sha256_hash=sha256_hash,
        md5_hash=md5_hash,
        integrity_status='verified',
        verified_at=datetime.now(timezone.utc),
        metadata_json=json.dumps(metadata) if metadata else None,
        chain_of_custody_json=json.dumps(chain),
    )

    db.session.add(evidence)
    db.session.commit()
    logger.info(f'Evidence created: {evidence_uid}')
    return evidence


def get_all_evidence(user_id: int) -> list:
    """Return all evidence records for a user's detections."""
    evidences = (
        db.session.query(Evidence)
        .join(Detection, Evidence.detection_id == Detection.id, isouter=True)
        .filter(
            db.or_(
                Detection.user_id == user_id,
                Detection.user_id == None
            )
        )
        .order_by(Evidence.created_at.desc())
        .all()
    )
    return [e.to_dict() for e in evidences]


def get_evidence_by_uid(evidence_uid: str, user_id: int) -> dict | None:
    """Get a single evidence item."""
    ev = db.session.query(Evidence).filter(Evidence.evidence_uid == evidence_uid).first()
    if not ev:
        return None
    return ev.to_dict()


def verify_evidence(evidence_uid: str) -> dict:
    """Re-verify evidence integrity by recalculating SHA-256."""
    from flask import current_app
    ev = db.session.query(Evidence).filter(Evidence.evidence_uid == evidence_uid).first()
    if not ev:
        return {'success': False, 'message': 'Evidence not found.'}

    if not ev.file_path:
        return {
            'success': False,
            'message': 'No file path stored for this evidence record.',
            'evidenceId': evidence_uid,
        }

    upload_folder = current_app.config.get('UPLOAD_FOLDER', '')
    full_path = os.path.join(upload_folder, ev.file_path) if not os.path.isabs(ev.file_path) else ev.file_path

    result = verify_file_integrity(full_path, ev.sha256_hash)

    # Update DB status
    ev.integrity_status = result['status']
    if result['match']:
        ev.verified_at = datetime.now(timezone.utc)
    db.session.commit()

    return {
        'success': result['match'],
        'evidenceId': evidence_uid,
        **result,
    }
