"""
FAKENIX 2.0 — CybercrimeReport Model
"""
from datetime import datetime, timezone
from app.extensions import db


class CybercrimeReport(db.Model):
    __tablename__ = 'cybercrime_reports'
    __table_args__ = {'extend_existing': True}

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    report_uid = db.Column(db.String(30), unique=True, nullable=False, index=True)  # CC-2026-001
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)
    evidence_id = db.Column(db.String(30), nullable=True)  # FX-2026-xxxxx reference (string, optional)

    incident_type = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=False)
    incident_date = db.Column(db.String(20), nullable=True)
    platform = db.Column(db.String(100), nullable=True)
    source_url = db.Column(db.Text, nullable=True)
    additional_information = db.Column(db.Text, nullable=True)

    # Status: prepared | submitted
    # IMPORTANT: 'submitted' does NOT mean it was sent to a government agency.
    # This platform only prepares reports; actual submission is the user's responsibility.
    status = db.Column(db.String(20), nullable=False, default='prepared')

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    def to_dict(self) -> dict:
        return {
            'id': f'ccr_{self.id}',
            'reportId': self.report_uid,
            'incidentType': self.incident_type,
            'description': self.description,
            'date': self.incident_date,
            'platform': self.platform,
            'sourceUrl': self.source_url,
            'additionalInformation': self.additional_information,
            'evidenceId': self.evidence_id,
            'status': self.status,
            'timestamp': self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self) -> str:
        return f'<CybercrimeReport id={self.id} uid={self.report_uid}>'
