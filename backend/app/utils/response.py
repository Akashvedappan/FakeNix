"""
FAKENIX 2.0 — Consistent JSON Response Helpers
"""
from flask import jsonify
from typing import Any, Optional


def success_response(
    data: Any = None,
    message: str = 'Success',
    status_code: int = 200
):
    """Return a consistent success JSON response."""
    body = {
        'success': True,
        'message': message,
    }
    if data is not None:
        body['data'] = data
    return jsonify(body), status_code


def error_response(
    message: str = 'An error occurred',
    status_code: int = 400,
    errors: Optional[dict] = None
):
    """Return a consistent error JSON response."""
    body = {
        'success': False,
        'message': message,
    }
    if errors:
        body['errors'] = errors
    return jsonify(body), status_code


def paginated_response(
    items: list,
    total: int,
    page: int,
    per_page: int,
    message: str = 'Success',
):
    """Return a paginated list response."""
    body = {
        'success': True,
        'message': message,
        'data': items,
        'pagination': {
            'total': total,
            'page': page,
            'per_page': per_page,
            'pages': (total + per_page - 1) // per_page,
        }
    }
    return jsonify(body), 200
