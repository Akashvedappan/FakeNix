"""
FAKENIX 2.0 — Authentication Tests
"""
import pytest


class TestRegistration:
    def test_register_success(self, client):
        """Valid registration should return 201 with user and token."""
        resp = client.post('/api/auth/register', json={
            'name': 'New User',
            'email': 'newuser@fakenix.ai',
            'password': 'SecurePass@1',
        })
        assert resp.status_code == 201
        data = resp.get_json()
        assert data['success'] is True
        assert 'token' in data['data']
        assert 'user' in data['data']
        assert data['data']['user']['email'] == 'newuser@fakenix.ai'

    def test_register_missing_fields(self, client):
        """Missing required fields should return 400."""
        resp = client.post('/api/auth/register', json={'email': 'incomplete@fakenix.ai'})
        assert resp.status_code == 400
        data = resp.get_json()
        assert data['success'] is False

    def test_register_invalid_email(self, client):
        """Invalid email should be rejected."""
        resp = client.post('/api/auth/register', json={
            'name': 'Bad Email',
            'email': 'not-an-email',
            'password': 'Password@1',
        })
        assert resp.status_code == 400

    def test_register_short_password(self, client):
        """Password shorter than 6 chars should be rejected."""
        resp = client.post('/api/auth/register', json={
            'name': 'Short PW',
            'email': 'shortpw@fakenix.ai',
            'password': '123',
        })
        assert resp.status_code == 400

    def test_register_duplicate_email(self, client):
        """Duplicate email should return 400."""
        email = 'dup@fakenix.ai'
        client.post('/api/auth/register', json={
            'name': 'First', 'email': email, 'password': 'Password@1'
        })
        resp = client.post('/api/auth/register', json={
            'name': 'Second', 'email': email, 'password': 'Password@1'
        })
        assert resp.status_code == 400
        data = resp.get_json()
        assert 'already exists' in data['message'].lower()


class TestLogin:
    def test_login_success(self, client):
        """Valid credentials should return token and user."""
        # First register
        client.post('/api/auth/register', json={
            'name': 'Login User',
            'email': 'loginuser@fakenix.ai',
            'password': 'LoginPass@1',
        })
        resp = client.post('/api/auth/login', json={
            'email': 'loginuser@fakenix.ai',
            'password': 'LoginPass@1',
        })
        assert resp.status_code == 200
        data = resp.get_json()
        assert data['success'] is True
        assert 'token' in data['data']
        assert 'user' in data['data']

    def test_login_wrong_password(self, client):
        """Wrong password should return 401."""
        client.post('/api/auth/register', json={
            'name': 'PW Test', 'email': 'pwtest@fakenix.ai', 'password': 'RightPass@1'
        })
        resp = client.post('/api/auth/login', json={
            'email': 'pwtest@fakenix.ai',
            'password': 'WrongPass@1',
        })
        assert resp.status_code == 401
        data = resp.get_json()
        assert data['success'] is False

    def test_login_nonexistent_user(self, client):
        """Non-existent email should return 401."""
        resp = client.post('/api/auth/login', json={
            'email': 'nobody@fakenix.ai',
            'password': 'SomePass@1',
        })
        assert resp.status_code == 401

    def test_login_missing_fields(self, client):
        """Missing fields should return 400."""
        resp = client.post('/api/auth/login', json={'email': 'test@fakenix.ai'})
        assert resp.status_code == 400


class TestProfile:
    def test_me_authenticated(self, client, auth_headers):
        """GET /api/auth/me with valid token should return user info."""
        resp = client.get('/api/auth/me', headers=auth_headers)
        assert resp.status_code == 200
        data = resp.get_json()
        assert data['success'] is True
        assert 'user' in data['data']

    def test_me_unauthenticated(self, client):
        """GET /api/auth/me without token should return 401."""
        resp = client.get('/api/auth/me')
        assert resp.status_code == 401
