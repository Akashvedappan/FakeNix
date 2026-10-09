"""
FAKENIX 2.0 — User Routes

GET /api/user/profile
PUT /api/user/profile
"""
from flask import Blueprint, request, g

from app.services.auth_service import get_user_by_id, update_user_profile
from app.utils.response import success_response, error_response
from app.utils.decorators import demo_mode_optional

user_bp = Blueprint('user', __name__)


@user_bp.route('/profile', methods=['GET'])
@demo_mode_optional
def get_profile():
    """GET /api/user/profile"""
    user = get_user_by_id(g.current_user_id)
    if not user:
        return error_response('User not found.', 404)
    return success_response(data={'user': user.to_dict()})


@user_bp.route('/profile', methods=['PUT'])
@demo_mode_optional
def update_profile():
    """PUT /api/user/profile"""
    data = request.get_json(silent=True) or {}
    user, err = update_user_profile(g.current_user_id, data)
    if err:
        return error_response(err, 400)
    return success_response(data={'user': user.to_dict()}, message='Profile updated successfully.')
