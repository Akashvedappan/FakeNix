"""
FAKENIX 2.0 — Custom Decorators
"""
import os
from functools import wraps
from flask import current_app, request, g
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity

from app.utils.response import error_response


def jwt_required_custom(fn):
    """
    Decorator to require a valid JWT token.
    Sets g.current_user_id from the JWT identity.
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        try:
            verify_jwt_in_request()
            identity = get_jwt_identity()
            # JWT identity is stored as str(user.id); cast back to int for DB queries
            g.current_user_id = int(identity) if identity is not None else None
        except Exception as e:
            return error_response(str(e), 401)
        return fn(*args, **kwargs)
    return wrapper


def demo_mode_optional(fn):
    """
    Decorator that allows demo mode or optional JWT tokens to pass through.
    In DEMO_MODE=true, any token starting with 'demo_token_' or missing header
    is accepted and g.current_user_id is set to 1.
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get('Authorization', '')
        if current_app.config.get('DEMO_MODE'):
            if not auth_header or auth_header.startswith('Bearer demo_token_'):
                g.current_user_id = 1  # demo user ID
                return fn(*args, **kwargs)
        # Attempt JWT verification
        try:
            verify_jwt_in_request(optional=True)
            identity = get_jwt_identity()
            g.current_user_id = int(identity) if identity is not None else (1 if current_app.config.get('DEMO_MODE') else None)
        except Exception:
            # A token was sent but is expired or was signed with a different secret.
            # It is never downgraded to the demo user: the client must log in again.
            return error_response('Your session is no longer valid. Please log in again.', 401)
        return fn(*args, **kwargs)
    return wrapper

