"""
FAKENIX 2.0 — Authentication Routes

POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
POST /api/auth/logout
"""
from flask import Blueprint, request, g
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity

from app.services.auth_service import register_user, authenticate_user, get_user_by_id
from app.utils.response import success_response, error_response
from app.utils.validators import validate_required_fields
from app.utils.decorators import demo_mode_optional

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/register', methods=['POST'])
def register():
    """POST /api/auth/register"""
    data = request.get_json(silent=True) or {}

    ok, errs = validate_required_fields(data, ['name', 'email', 'password'])
    if not ok:
        return error_response('Validation failed.', 400, errs)

    user, err = register_user(
        full_name=data['name'],
        email=data['email'],
        password=data['password'],
    )

    if err:
        return error_response(err, 400)

    token = create_access_token(identity=str(user.id))
    return success_response(
        data={'user': user.to_dict(), 'token': token},
        message='Account created successfully.',
        status_code=201,
    )


@auth_bp.route('/login', methods=['POST'])
def login():
    """POST /api/auth/login"""
    data = request.get_json(silent=True) or {}

    ok, errs = validate_required_fields(data, ['email', 'password'])
    if not ok:
        return error_response('Validation failed.', 400, errs)

    user, err = authenticate_user(
        email=data['email'],
        password=data['password'],
    )

    if err:
        return error_response(err, 401)

    token = create_access_token(identity=str(user.id))

    # Return shape matches what authService.js expects:
    # const { user, token } = response.data
    return success_response(
        data={'user': user.to_dict(), 'token': token},
        message='Login successful.',
    )


@auth_bp.route('/me', methods=['GET'])
@demo_mode_optional
def me():
    """GET /api/auth/me — return current user info"""
    user = get_user_by_id(g.current_user_id)
    if not user:
        return error_response('User not found.', 404)
    return success_response(data={'user': user.to_dict()})


@auth_bp.route('/logout', methods=['POST'])
def logout():
    """
    POST /api/auth/logout
    JWT is stateless — the client must discard the token.
    """
    return success_response(message='Logged out successfully.')
