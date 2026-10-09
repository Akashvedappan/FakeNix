"""
FAKENIX 2.0 — Detection Model
"""
from datetime import datetime, timezone
from app.extensions import db


class Detection(db.Model):
    __tablename__ = 'detections'
    __table_args__ = {'extend_existing': True}

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    detection_uid = db.Column(db.String(64), unique=True, nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=True, index=True)

    # File info
    file_name = db.Column(db.String(255), nullable=False)
    file_type = db.Column(db.String(20), nullable=False)   # image | video | url
    file_size = db.Column(db.String(30), nullable=True)
    resolution = db.Column(db.String(30), nullable=True)
    duration = db.Column(db.String(20), nullable=True)
    source_url = db.Column(db.Text, nullable=True)

    # Detection results
    result = db.Column(db.String(20), nullable=True)        # deepfake | real | suspicious
    confidence = db.Column(db.Float, nullable=True)
    deepfake_probability = db.Column(db.Float, nullable=True)
    real_probability = db.Column(db.Float, nullable=True)
    risk_level = db.Column(db.String(20), nullable=True)    # low | medium | high | critical

    # Model
    model_name = db.Column(db.String(50), nullable=True, default='EfficientNet-B4')
    is_demo = db.Column(db.Boolean, default=False, nullable=False)

    # Status
    status = db.Column(db.String(20), nullable=False, default='pending')  # pending | complete | error

    # JSON fields
    indicators_json = db.Column(db.Text, nullable=True)      # JSON array
    frames_json = db.Column(db.Text, nullable=True)          # JSON array
    metadata_json = db.Column(db.Text, nullable=True)        # JSON object

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    # Relationships
    evidence = db.relationship('Evidence', backref='detection', lazy='dynamic', cascade='all, delete-orphan')
    reports = db.relationship('Report', backref='detection', lazy='dynamic', cascade='all, delete-orphan')

    def to_dict(self) -> dict:
        import json
        evidence_list = list(self.evidence)
        evidence_id = evidence_list[0].evidence_uid if evidence_list else None
        sha256 = evidence_list[0].sha256_hash if evidence_list else None

        metadata = json.loads(self.metadata_json) if self.metadata_json else {}

        return {
            'id': self.detection_uid,
            'evidenceId': evidence_id,
            'fileName': self.file_name,
            'fileType': self.file_type,
            'fileSize': self.file_size,
            'resolution': self.resolution,
            'duration': self.duration,
            'sourceUrl': self.source_url,
            'result': self.result,
            'risk': self.risk_level,
            'confidence': self.confidence,
            'deepfakeProbability': self.deepfake_probability,
            'realProbability': self.real_probability,
            'model': self.model_name,
            'isDemo': self.is_demo,
            'sha256': sha256,
            'indicators': json.loads(self.indicators_json) if self.indicators_json else [],
            'frames': json.loads(self.frames_json) if self.frames_json else [],
            'metadata': {k: v for k, v in metadata.items() if k != 'aiExplanation'},
            'explanation': metadata.get('aiExplanation'),
            'timestamp': self.created_at.isoformat() if self.created_at else None,
            'status': self.status,
        }

    def __repr__(self) -> str:
        return f'<Detection id={self.id} uid={self.detection_uid} result={self.result}>'
