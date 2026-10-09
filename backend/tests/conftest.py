"""
FAKENIX 2.0 — Shared Test Fixtures (conftest.py)
"""
import pytest
import sys
import os

# Ensure backend/ is on path
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND_DIR)

# Image/video detection always calls the Groq LLM (no offline mode), so the tests
# need the real Groq settings. Only GROQ_* values are taken from backend/.env;
# everything else stays on the isolated testing config. Must run before app import.
from dotenv import dotenv_values

for _key, _value in dotenv_values(os.path.join(BACKEND_DIR, '.env')).items():
    if _key.startswith('GROQ_') and _value and not os.environ.get(_key):
        os.environ[_key] = _value

from app import create_app
from app.extensions import db as _db


@pytest.fixture(scope='session')
def app():
    """Create a test Flask app with in-memory SQLite."""
    flask_app = create_app('testing')

    with flask_app.app_context():
        _db.create_all()
        yield flask_app
        _db.drop_all()


@pytest.fixture(scope='session')
def client(app):
    """Return a test client."""
    return app.test_client()


@pytest.fixture(scope='function')
def db(app):
    """Return a clean DB session per test, with rollback after each test."""
    with app.app_context():
        yield _db
        _db.session.rollback()


@pytest.fixture(scope='function')
def registered_user(client):
    """Register a test user and return the user data + token."""
    resp = client.post('/api/auth/register', json={
        'name': 'Test User',
        'email': f'testuser_{os.urandom(4).hex()}@fakenix.ai',
        'password': 'TestPass@123',
    })
    data = resp.get_json()
    return data.get('data', {})


@pytest.fixture(scope='function')
def auth_headers(registered_user):
    """Return Authorization headers for a registered user."""
    token = registered_user.get('token', '')
    return {'Authorization': f'Bearer {token}'}
