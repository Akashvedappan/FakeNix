"""
FAKENIX 2.0 — Cybercrime Report Service
"""
import uuid
from datetime import datetime, timezone

from app.extensions import db
from app.models.cybercrime_report import CybercrimeReport
from app.utils.logger import get_logger

logger = get_logger('cybercrime_service')


def create_cybercrime_report(data: dict, user_id: int) -> tuple[CybercrimeReport | None, str]:
    """
    Create a structured cybercrime incident report.

    NOTE: This prepares a report document only. It does NOT submit
    anything to any government authority or law enforcement agency.
    Submission is entirely the user's responsibility.
    """
    year = datetime.now(timezone.utc).year
    from app.utils.ids import next_sequential_id
    report_uid = next_sequential_id(CybercrimeReport.report_uid, f'CC-{year}-', 3)

    report = CybercrimeReport(
        report_uid=report_uid,
        user_id=user_id,
        evidence_id=data.get('evidenceId') or data.get('evidence_id'),
        incident_type=data.get('incidentType') or data.get('incident_type', ''),
        description=data.get('description', ''),
        incident_date=data.get('incidentDate') or data.get('incident_date'),
        platform=data.get('platform'),
        source_url=data.get('sourceUrl') or data.get('source_url'),
        additional_information=data.get('additionalInformation') or data.get('additional_information'),
        status='prepared',
    )

    try:
        db.session.add(report)
        db.session.commit()
        logger.info(f'Cybercrime report created: {report_uid}')
        return report, ''
    except Exception as e:
        db.session.rollback()
        logger.error(f'Error creating cybercrime report: {e}')
        return None, 'Failed to save incident report.'


def get_all_cybercrime_reports(user_id: int) -> list:
    """Get all cybercrime reports for a user."""
    reports = (
        db.session.query(CybercrimeReport)
        .filter(CybercrimeReport.user_id == user_id)
        .order_by(CybercrimeReport.created_at.desc())
        .all()
    )
    return [r.to_dict() for r in reports]


def get_cybercrime_report_by_uid(report_uid: str, user_id: int) -> CybercrimeReport | None:
    """Get a cybercrime report by UID, verifying ownership."""
    return db.session.query(CybercrimeReport).filter(
        CybercrimeReport.report_uid == report_uid,
        CybercrimeReport.user_id == user_id
    ).first()
