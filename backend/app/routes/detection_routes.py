"""
FAKENIX 2.0 — Detection Routes

POST   /api/detect/image
POST   /api/detect/video
POST   /api/detect/url
GET    /api/detections
GET    /api/detections/<detection_uid>
DELETE /api/detections/<detection_uid>
"""
from flask import Blueprint, request, g, current_app

from app.services.detection_service import (
    run_image_detection,
    run_video_detection,
    run_url_detection,
    get_detection_history,
    get_detection_by_uid,
    delete_detection,
)
from app.services.image_service import validate_image_file, validate_video_file, save_upload
from app.utils.response import success_response, error_response
from app.utils.validators import validate_url
from app.utils.decorators import demo_mode_optional
from app.ai.groq_analyzer import GroqAnalysisError

detection_bp = Blueprint('detection', __name__)


@detection_bp.route('/detect/image', methods=['POST'])
@demo_mode_optional
def detect_image():
    """POST /api/detect/image — multipart/form-data with field 'file'"""
    if 'file' not in request.files:
        return error_response("No file provided. Upload a file using the 'file' form field.", 400)

    file = request.files['file']

    # Validate
    valid, err = validate_image_file(file)
    if not valid:
        return error_response(err, 400)

    # Save securely
    try:
        storage_name, file_path = save_upload(file)
    except Exception as e:
        current_app.logger.error(f'Upload save error: {e}')
        return error_response('Failed to save uploaded file.', 500)

    # Run detection pipeline
    try:
        result = run_image_detection(
            file_path=file_path,
            file_name=file.filename,
            user_id=g.current_user_id,
        )
        return success_response(data=result, message='Image analysis complete.')
    except GroqAnalysisError as e:
        current_app.logger.error(f'Image AI analysis error: {e}')
        return error_response(str(e), 502)
    except Exception as e:
        current_app.logger.exception(f'Image detection error: {e}')
        return error_response('Image analysis failed.', 500)


@detection_bp.route('/detect/video', methods=['POST'])
@demo_mode_optional
def detect_video():
    """POST /api/detect/video — multipart/form-data with field 'file'"""
    if 'file' not in request.files:
        return error_response("No file provided. Upload a file using the 'file' form field.", 400)

    file = request.files['file']

    valid, err = validate_video_file(file)
    if not valid:
        return error_response(err, 400)

    try:
        storage_name, file_path = save_upload(file)
    except Exception as e:
        current_app.logger.error(f'Upload save error: {e}')
        return error_response('Failed to save uploaded file.', 500)

    try:
        result = run_video_detection(
            file_path=file_path,
            file_name=file.filename,
            user_id=g.current_user_id,
        )
        return success_response(data=result, message='Video analysis complete.')
    except GroqAnalysisError as e:
        current_app.logger.error(f'Video AI analysis error: {e}')
        return error_response(str(e), 502)
    except Exception as e:
        current_app.logger.exception(f'Video detection error: {e}')
        return error_response('Video analysis failed.', 500)


@detection_bp.route('/detect/url', methods=['POST'])
@demo_mode_optional
def detect_url():
    """POST /api/detect/url — JSON body with 'url'"""
    data = request.get_json(silent=True) or {}
    url = data.get('url', '').strip()

    valid, err = validate_url(url)
    if not valid:
        return error_response(err, 400)

    try:
        result = run_url_detection(url=url, user_id=g.current_user_id)

        if isinstance(result, dict) and result.get('status') == 'not_implemented':
            return error_response(result['message'], 501)

        return success_response(data=result, message='URL analysis complete.')
    except Exception as e:
        current_app.logger.exception(f'URL detection error: {e}')
        return error_response('URL analysis failed.', 500)


@detection_bp.route('/detections', methods=['GET'])
@demo_mode_optional
def list_detections():
    """GET /api/detections — list all detections for current user"""
    try:
        history = get_detection_history(g.current_user_id)
        return success_response(data=history)
    except Exception as e:
        current_app.logger.error(f'Detection history error: {e}')
        return error_response('Failed to retrieve detection history.', 500)


@detection_bp.route('/detections/<detection_uid>', methods=['GET'])
@demo_mode_optional
def get_detection(detection_uid: str):
    """GET /api/detections/<id>"""
    detection = get_detection_by_uid(detection_uid, g.current_user_id)
    if not detection:
        return error_response('Detection not found.', 404)
    return success_response(data=detection)


@detection_bp.route('/detections/<detection_uid>', methods=['DELETE'])
@demo_mode_optional
def remove_detection(detection_uid: str):
    """DELETE /api/detections/<id>"""
    deleted = delete_detection(detection_uid, g.current_user_id)
    if not deleted:
        return error_response('Detection not found or not authorized.', 404)
    return success_response(message='Detection deleted successfully.')


@detection_bp.route('/detections/trend', methods=['GET'])
@demo_mode_optional
def get_trend():
    """GET /api/detections/trend?days=11"""
    from app.services.dashboard_service import get_detection_trend
    days_param = request.args.get('days', '11')
    try:
        days = int(days_param)
        if days < 1 or days > 90:
            return error_response('Query parameter "days" must be an integer between 1 and 90.', 400)
    except ValueError:
        return error_response('Query parameter "days" must be a valid integer.', 400)

    try:
        data = get_detection_trend(user_id=g.current_user_id, days=days)
        return success_response(data=data, message='Detection trend retrieved successfully.')
    except Exception as e:
        current_app.logger.exception(f'Error retrieving detection trend: {e}')
        return error_response('Failed to retrieve detection trend.', 500)

