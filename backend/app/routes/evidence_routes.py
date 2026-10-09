"""
FAKENIX 2.0 — Evidence Routes

GET  /api/evidence
GET  /api/evidence/<evidence_uid>
GET  /api/evidence/<evidence_uid>/verify
"""
from flask import Blueprint, g, current_app

from app.services.evidence_service import get_all_evidence, get_evidence_by_uid, verify_evidence
from app.utils.response import success_response, error_response
from app.utils.decorators import demo_mode_optional

evidence_bp = Blueprint('evidence', __name__)


@evidence_bp.route('/evidence', methods=['GET'])
@demo_mode_optional
def list_evidence():
    """GET /api/evidence — list all evidence for current user"""
    try:
        items = get_all_evidence(g.current_user_id)
        return success_response(data=items)
    except Exception as e:
        current_app.logger.error(f'Evidence list error: {e}')
        return error_response('Failed to retrieve evidence.', 500)


@evidence_bp.route('/evidence/<evidence_uid>', methods=['GET'])
@demo_mode_optional
def get_evidence(evidence_uid: str):
    """GET /api/evidence/<evidence_uid>"""
    item = get_evidence_by_uid(evidence_uid, g.current_user_id)
    if not item:
        return error_response('Evidence not found.', 404)
    return success_response(data=item)


@evidence_bp.route('/evidence/<evidence_uid>/verify', methods=['GET'])
@demo_mode_optional
def verify_evidence_integrity(evidence_uid: str):
    """GET /api/evidence/<evidence_uid>/verify — recalculate SHA-256 and verify"""
    try:
        result = verify_evidence(evidence_uid)
        if not result.get('success') and result.get('message') == 'Evidence not found.':
            return error_response('Evidence not found.', 404)
        return success_response(
            data=result,
            message='Integrity verification complete.' if result.get('match') else 'Integrity check failed.'
        )
    except Exception as e:
        current_app.logger.error(f'Evidence verify error: {e}')
        return error_response('Integrity verification failed.', 500)
