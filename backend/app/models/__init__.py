"""FAKENIX 2.0 — Models package."""
from app.models.user import User
from app.models.detection import Detection
from app.models.evidence import Evidence
from app.models.report import Report
from app.models.cybercrime_report import CybercrimeReport

__all__ = ['User', 'Detection', 'Evidence', 'Report', 'CybercrimeReport']
