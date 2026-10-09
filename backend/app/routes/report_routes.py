"""
FAKENIX 2.0 — Report Routes

POST /api/reports
GET  /api/reports
GET  /api/reports/<report_uid>
GET  /api/reports/<report_uid>/download
"""
import os
from flask import Blueprint, request, g, current_app, send_file

from app.services.report_service import generate_report, get_all_reports, get_report_by_uid, get_report_path
from app.services.auth_service import get_user_by_id
from app.utils.response import success_response, error_response
from app.utils.decorators import demo_mode_optional

report_bp = Blueprint('report', __name__)


@report_bp.route('/reports', methods=['POST'])
@demo_mode_optional
def create_report():
    """POST /api/reports — generate a forensic PDF report for a detection"""
    data = request.get_json(silent=True) or {}
    detection_id = data.get('detectionId') or data.get('detection_id')

    if not detection_id:
        return error_response("'detectionId' is required.", 400)

    user_id = getattr(g, 'current_user_id', None)
    user = get_user_by_id(user_id) if user_id else None

    report, err = generate_report(detection_id, user)
    if err:
        return error_response(err, 400)

    return success_response(
        data=report.to_dict(),
        message='Report generated successfully.',
        status_code=201,
    )


@report_bp.route('/reports', methods=['GET'])
@demo_mode_optional
def list_reports():
    """GET /api/reports — list all reports for current user"""
    try:
        user_id = getattr(g, 'current_user_id', None)
        reports = get_all_reports(user_id)
        return success_response(data=reports)
    except Exception as e:
        current_app.logger.error(f'Reports list error: {e}')
        return error_response('Failed to retrieve reports.', 500)


@report_bp.route('/reports/<report_uid>', methods=['GET'])
@demo_mode_optional
def get_report(report_uid: str):
    """GET /api/reports/<report_uid>"""
    user_id = getattr(g, 'current_user_id', None)
    report = get_report_by_uid(report_uid, user_id)
    if not report:
        return error_response('Report not found.', 404)
    return success_response(data=report.to_dict())


@report_bp.route('/reports/<report_uid>/download', methods=['GET'])
@demo_mode_optional
def download_report(report_uid: str):
    """GET /api/reports/<report_uid>/download — stream PDF to client"""
    user_id = getattr(g, 'current_user_id', None)
    user = get_user_by_id(user_id) if user_id else None

    report = get_report_by_uid(report_uid, user_id)
    if not report:
        report, err = generate_report(report_uid, user)
        if err or not report:
            return error_response('Report not found.', 404)

    report_path = get_report_path(report)
    if not report_path or not os.path.exists(report_path):
        from app.services.report_service import _generate_pdf_for_report
        err = _generate_pdf_for_report(report, user)
        report_path = get_report_path(report)
        if err or not report_path or not os.path.exists(report_path):
            return error_response('Report PDF file generation failed.', 500)

    download_name = f'{report.report_uid}.pdf' if not report.report_uid.endswith('.pdf') else report.report_uid
    return send_file(
        report_path,
        mimetype='application/pdf',
        as_attachment=True,
        download_name=download_name,
    )

