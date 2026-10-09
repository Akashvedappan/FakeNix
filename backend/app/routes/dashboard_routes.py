"""
FAKENIX 2.0 — Dashboard Routes

GET /api/dashboard/detection-trend
"""
from flask import Blueprint, request, g, current_app

from app.services.dashboard_service import get_detection_trend
from app.utils.response import success_response, error_response
from app.utils.decorators import demo_mode_optional

dashboard_bp = Blueprint('dashboard', __name__)


@dashboard_bp.route('/detection-trend', methods=['GET'])
@demo_mode_optional
def detection_trend():
    """
    GET /api/dashboard/detection-trend?days=11
    
    Returns dynamic detection trend aggregated by calendar date for the requested number
    of consecutive days ending today.
    """
    days_param = request.args.get('days', '11')
    try:
        days = int(days_param)
        if days < 1 or days > 90:
            return error_response('Query parameter "days" must be an integer between 1 and 90.', 400)
    except ValueError:
        return error_response('Query parameter "days" must be a valid integer.', 400)

    try:
        data = get_detection_trend(
            user_id=g.current_user_id,
            days=days,
            tz_name='UTC'
        )
        return success_response(data=data, message='Detection trend retrieved successfully.')
    except Exception as e:
        current_app.logger.exception(f'Error retrieving detection trend: {e}')
        return error_response('Failed to retrieve detection trend.', 500)
