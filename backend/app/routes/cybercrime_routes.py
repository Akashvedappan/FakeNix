"""
FAKENIX 2.0 — Cybercrime Report Routes

POST /api/cybercrime/report
GET  /api/cybercrime/reports
GET  /api/cybercrime/reports/<report_uid>
"""
from flask import Blueprint, request, g, current_app

from app.services.cybercrime_service import (
    create_cybercrime_report,
    get_all_cybercrime_reports,
    get_cybercrime_report_by_uid,
)
from app.utils.response import success_response, error_response
from app.utils.validators import validate_required_fields
from app.utils.decorators import demo_mode_optional

cybercrime_bp = Blueprint('cybercrime', __name__)


@cybercrime_bp.route('/cybercrime/report', methods=['POST'])
@demo_mode_optional
def submit_cybercrime_report():
    """
    POST /api/cybercrime/report

    IMPORTANT DISCLAIMER: This endpoint prepares a structured incident report
    document only. It does NOT submit anything to any government agency,
    cybercrime authority, or law enforcement. The user is solely responsible
    for officially reporting incidents to the appropriate authorities.
    """
    data = request.get_json(silent=True) or {}

    ok, errs = validate_required_fields(data, ['incidentType', 'description'])
    if not ok:
        # Try snake_case fallback
        ok2, errs2 = validate_required_fields(data, ['incident_type', 'description'])
        if not ok2:
            return error_response('Validation failed.', 400, {**errs, **errs2})

    report, err = create_cybercrime_report(data, g.current_user_id)
    if err:
        return error_response(err, 400)

    return success_response(
        data={
            'reportId': report.report_uid,
            'status': report.status,
            'timestamp': report.created_at.isoformat() if report.created_at else None,
            'message': (
                'Incident report prepared successfully. '
                'Please submit this report to your local cybercrime authority manually. '
                'FAKENIX does not automatically report to law enforcement.'
            ),
        },
        message='Incident report prepared successfully.',
        status_code=201,
    )


@cybercrime_bp.route('/cybercrime/reports', methods=['GET'])
@demo_mode_optional
def list_cybercrime_reports():
    """GET /api/cybercrime/reports"""
    try:
        reports = get_all_cybercrime_reports(g.current_user_id)
        return success_response(data=reports)
    except Exception as e:
        current_app.logger.error(f'Cybercrime reports list error: {e}')
        return error_response('Failed to retrieve reports.', 500)


@cybercrime_bp.route('/cybercrime/reports/<report_uid>', methods=['GET'])
@demo_mode_optional
def get_cybercrime_report(report_uid: str):
    """GET /api/cybercrime/reports/<report_uid>"""
    report = get_cybercrime_report_by_uid(report_uid, g.current_user_id)
    if not report:
        return error_response('Report not found.', 404)
    return success_response(data=report.to_dict())
