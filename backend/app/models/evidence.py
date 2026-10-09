"""
FAKENIX 2.0 — Evidence Model
"""
from datetime import datetime, timezone
from app.extensions import db


class Evidence(db.Model):
    __tablename__ = 'evidence'
    __table_args__ = {'extend_existing': True}

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    evidence_uid = db.Column(db.String(30), unique=True, nullable=False, index=True)  # FX-2026-00001
    detection_id = db.Column(db.Integer, db.ForeignKey('detections.id', ondelete='CASCADE'), nullable=True, index=True)

    # File info
    file_name = db.Column(db.String(255), nullable=True)
    file_type = db.Column(db.String(20), nullable=True)
    file_path = db.Column(db.Text, nullable=True)          # relative to storage/

    # Cryptographic integrity
    sha256_hash = db.Column(db.String(64), nullable=True, index=True)
    md5_hash = db.Column(db.String(32), nullable=True)
    integrity_status = db.Column(db.String(20), default='pending')  # pending | verified | failed

    # Metadata
    metadata_json = db.Column(db.Text, nullable=True)
    chain_of_custody_json = db.Column(db.Text, nullable=True)  # JSON array

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    verified_at = db.Column(db.DateTime, nullable=True)

    def to_dict(self) -> dict:
        import json
        det = self.detection

        return {
            'id': f'ev_{self.id}',
            'evidenceId': self.evidence_uid,
            'detectionId': det.detection_uid if det else None,
            'fileName': self.file_name,
            'fileType': self.file_type,
            'sha256': self.sha256_hash,
            'md5': self.md5_hash,
            'status': self.integrity_status,
            'result': det.result if det else None,
            'confidence': det.confidence if det else None,
            'timestamp': self.created_at.isoformat() if self.created_at else None,
            'integrityCheck': self.verified_at.isoformat() if self.verified_at else None,
            'chainOfCustody': json.loads(self.chain_of_custody_json) if self.chain_of_custody_json else [],
            'metadata': json.loads(self.metadata_json) if self.metadata_json else {},
        }

    def __repr__(self) -> str:
        return f'<Evidence id={self.id} uid={self.evidence_uid} sha256={self.sha256_hash[:8] if self.sha256_hash else None}>'
