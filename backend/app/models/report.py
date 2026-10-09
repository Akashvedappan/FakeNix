"""
FAKENIX 2.0 — Report Model
"""
from datetime import datetime, timezone
from app.extensions import db


class Report(db.Model):
    __tablename__ = 'reports'
    __table_args__ = {'extend_existing': True}

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    report_uid = db.Column(db.String(30), unique=True, nullable=False, index=True)  # FX-RPT-2026-001
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)
    detection_id = db.Column(db.Integer, db.ForeignKey('detections.id', ondelete='SET NULL'), nullable=True)

    report_type = db.Column(db.String(50), nullable=False, default='Forensic Analysis')
    report_path = db.Column(db.Text, nullable=True)     # relative path to PDF
    status = db.Column(db.String(20), nullable=False, default='generating')  # generating | ready | error
    generated_by = db.Column(db.String(120), nullable=True)

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    def to_dict(self) -> dict:
        det = self.detection
        user = self.user

        # Determine detection result display
        result_display = 'Unknown'
        confidence = None
        risk = None
        evidence_id = None
        file_name = None

        if det:
            result_display = (det.result or 'unknown').capitalize()
            confidence = det.confidence
            risk = det.risk_level
            file_name = det.file_name
            ev_list = list(det.evidence)
            evidence_id = ev_list[0].evidence_uid if ev_list else None

        return {
            'id': f'rpt_{self.id}',
            'reportId': self.report_uid,
            'evidenceId': evidence_id,
            'detectionId': det.detection_uid if det else None,
            'reportType': self.report_type,
            'detection': result_display,
            'confidence': confidence,
            'risk': risk,
            'generatedDate': self.created_at.isoformat() if self.created_at else None,
            'generatedBy': self.generated_by or (user.full_name if user else 'FAKENIX System'),
            'status': self.status,
            'fileName': file_name,
        }

    def __repr__(self) -> str:
        return f'<Report id={self.id} uid={self.report_uid} status={self.status}>'
