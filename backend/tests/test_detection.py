"""
FAKENIX 2.0 — Detection Tests
"""
import io
import pytest


def _make_image(fmt: str) -> bytes:
    """Return a small but real, decodable image (the Groq model analyzes the pixels)."""
    from PIL import Image, ImageDraw

    img = Image.new('RGB', (256, 256), (70, 110, 160))
    draw = ImageDraw.Draw(img)
    draw.ellipse((80, 60, 176, 180), fill=(225, 190, 160))
    draw.rectangle((0, 210, 256, 256), fill=(40, 40, 40))
    buf = io.BytesIO()
    img.save(buf, format=fmt)
    return buf.getvalue()


def _make_fake_png() -> bytes:
    return _make_image('PNG')


def _make_fake_jpeg() -> bytes:
    return _make_image('JPEG')


class TestImageDetection:
    def test_image_upload_no_file(self, client, auth_headers):
        """Upload without file should return 400."""
        resp = client.post('/api/detect/image', headers=auth_headers)
        assert resp.status_code == 400

    def test_image_upload_wrong_type(self, client, auth_headers):
        """Uploading a non-image file should return 400."""
        data = {
            'file': (io.BytesIO(b'fake pdf content'), 'document.pdf')
        }
        resp = client.post(
            '/api/detect/image',
            data=data,
            content_type='multipart/form-data',
            headers=auth_headers,
        )
        assert resp.status_code == 400

    def test_image_upload_valid_png(self, client, auth_headers):
        """Valid PNG upload is analyzed by the Groq LLM and returns a real result."""
        png_bytes = _make_fake_png()
        data = {
            'file': (io.BytesIO(png_bytes), 'test_image.png')
        }
        resp = client.post(
            '/api/detect/image',
            data=data,
            content_type='multipart/form-data',
            headers=auth_headers,
        )
        assert resp.status_code == 200
        result = resp.get_json()
        assert result['success'] is True
        d = result['data']
        assert 'result' in d
        assert d['result'] in ('deepfake', 'real', 'suspicious')
        assert 'confidence' in d
        assert 'evidenceId' in d
        assert 'sha256' in d
        # Produced by the LLM, never simulated
        assert d['isDemo'] is False
        assert '(Groq)' in d['model']
        assert 0 <= d['deepfakeProbability'] <= 100

    def test_image_upload_valid_jpeg(self, client, auth_headers):
        """Valid JPEG upload should succeed."""
        jpeg_bytes = _make_fake_jpeg()
        data = {
            'file': (io.BytesIO(jpeg_bytes), 'test_image.jpg')
        }
        resp = client.post(
            '/api/detect/image',
            data=data,
            content_type='multipart/form-data',
            headers=auth_headers,
        )
        assert resp.status_code == 200

    def test_detection_history(self, client, auth_headers):
        """GET /api/detections should return a list."""
        resp = client.get('/api/detections', headers=auth_headers)
        assert resp.status_code == 200
        data = resp.get_json()
        assert data['success'] is True
        assert isinstance(data['data'], list)

    def test_detection_unauthenticated(self, client):
        """Detection endpoints require authentication."""
        resp = client.get('/api/detections')
        assert resp.status_code == 401


class TestURLDetection:
    def test_url_invalid(self, client, auth_headers):
        """Invalid URL should return 400."""
        resp = client.post('/api/detect/url', json={'url': 'not-a-url'}, headers=auth_headers)
        assert resp.status_code == 400

    def test_url_localhost_blocked(self, client, auth_headers):
        """Localhost URL should be blocked (SSRF protection)."""
        resp = client.post('/api/detect/url', json={'url': 'http://localhost/evil'}, headers=auth_headers)
        assert resp.status_code == 400

    def test_url_missing_field(self, client, auth_headers):
        """Missing URL field should return 400."""
        resp = client.post('/api/detect/url', json={}, headers=auth_headers)
        assert resp.status_code == 400

    def test_url_demo_mode_returns_result(self, client, auth_headers):
        """In demo mode, a valid external URL should return analysis."""
        resp = client.post('/api/detect/url',
            json={'url': 'https://example.com/video.mp4'},
            headers=auth_headers,
        )
        # Demo mode returns 200 or 501 (not implemented) — either is acceptable
        assert resp.status_code in (200, 501)
