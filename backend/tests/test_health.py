"""
FAKENIX 2.0 — Health Endpoint Tests
"""


def test_health_check_returns_200(client):
    """GET /api/health should return 200 without authentication."""
    resp = client.get('/api/health')
    assert resp.status_code == 200


def test_health_check_structure(client):
    """Health response should have required fields."""
    resp = client.get('/api/health')
    data = resp.get_json()
    assert data['success'] is True
    assert data['status'] == 'healthy'
    assert data['service'] == 'FAKENIX Backend'
    assert 'version' in data


def test_health_check_no_auth_required(client):
    """Health check must work without any Authorization header."""
    resp = client.get('/api/health', headers={})
    assert resp.status_code == 200


def test_root_returns_200(client):
    """GET / should return 200 welcome status."""
    resp = client.get('/')
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['success'] is True
    assert 'FAKENIX' in data['service']


def test_api_root_returns_200(client):
    """GET /api should return 200 and available endpoints."""
    resp = client.get('/api')
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['success'] is True
    assert 'endpoints' in data


def test_nonexistent_endpoint_returns_404(client):
    """Unknown routes should return 404."""
    resp = client.get('/api/nonexistent_route')
    assert resp.status_code == 404

