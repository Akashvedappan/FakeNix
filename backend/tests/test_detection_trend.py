"""
FAKENIX 2.0 — Tests for Detection Trend Aggregation
Comprehensive tests covering:
- Dynamic 11-calendar-day range calculation ending today
- Month boundary transitions
- Year boundary transitions
- Leap year / February handling
- Zero-detection day preservation
- Real, Deepfake, and Suspicious categorization & aliases
- User data isolation
- SQL database aggregation
- API endpoint validation (GET /api/dashboard/detection-trend & GET /api/detections/trend)
- Parameter validation (days limits)
"""
import pytest
from datetime import datetime, date, timedelta, timezone

from app.models.user import User
from app.models.detection import Detection
from app.services.dashboard_service import (
    get_detection_trend,
    normalize_detection_result
)


class TestNormalization:
    """Test result string normalization."""

    def test_normalize_real(self):
        assert normalize_detection_result('real') == 'real'
        assert normalize_detection_result('REAL') == 'real'
        assert normalize_detection_result('genuine') == 'real'
        assert normalize_detection_result('authentic') == 'real'

    def test_normalize_deepfake(self):
        assert normalize_detection_result('deepfake') == 'deepfake'
        assert normalize_detection_result('DEEPFAKE') == 'deepfake'
        assert normalize_detection_result('fake') == 'deepfake'
        assert normalize_detection_result('manipulated') == 'deepfake'

    def test_normalize_suspicious(self):
        assert normalize_detection_result('suspicious') == 'suspicious'
        assert normalize_detection_result('SUSPICIOUS') == 'suspicious'
        assert normalize_detection_result('uncertain') == 'suspicious'
        assert normalize_detection_result('flagged') == 'suspicious'
        assert normalize_detection_result(None) == 'suspicious'
        assert normalize_detection_result('') == 'suspicious'


class TestDateBoundaries:
    """Test dynamic calendar date calculation across boundaries."""

    def test_11_day_range_consecutive(self, app, db):
        with app.app_context():
            ref = date(2026, 9, 21)
            result = get_detection_trend(days=11, reference_date=ref)

            assert result['range']['start'] == '2026-09-11'
            assert result['range']['end'] == '2026-09-21'
            assert len(result['trend']) == 11

            expected_dates = [
                '2026-09-11', '2026-09-12', '2026-09-13', '2026-09-14',
                '2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18',
                '2026-09-19', '2026-09-20', '2026-09-21'
            ]
            actual_dates = [item['date'] for item in result['trend']]
            assert actual_dates == expected_dates

    def test_month_boundary(self, app, db):
        """Crossing from September to October."""
        with app.app_context():
            ref = date(2026, 10, 1)
            result = get_detection_trend(days=11, reference_date=ref)

            assert result['range']['start'] == '2026-09-21'
            assert result['range']['end'] == '2026-10-01'
            assert len(result['trend']) == 11
            assert result['trend'][0]['date'] == '2026-09-21'
            assert result['trend'][-1]['date'] == '2026-10-01'

    def test_year_boundary(self, app, db):
        """Crossing from December to January."""
        with app.app_context():
            ref = date(2027, 1, 1)
            result = get_detection_trend(days=11, reference_date=ref)

            assert result['range']['start'] == '2026-12-22'
            assert result['range']['end'] == '2027-01-01'
            assert len(result['trend']) == 11
            assert result['trend'][0]['date'] == '2026-12-22'
            assert result['trend'][-1]['date'] == '2027-01-01'

    def test_leap_year_february(self, app, db):
        """Crossing February in a leap year (2028 is a leap year)."""
        with app.app_context():
            ref = date(2028, 3, 1)
            result = get_detection_trend(days=11, reference_date=ref)

            # 2028 has Feb 29. 11 days ending Mar 1 = Feb 20 through Mar 1 (10 days in Feb: 20..29 + 1 in Mar)
            assert result['range']['start'] == '2028-02-20'
            assert result['range']['end'] == '2028-03-01'
            assert len(result['trend']) == 11
            dates = [item['date'] for item in result['trend']]
            assert '2028-02-29' in dates


class TestDatabaseAggregation:
    """Test SQL aggregation and zero-detection day preservation."""

    def test_zero_detection_days_preserved(self, app, db):
        """When a user has no detections, all 11 dates still return 0 counts."""
        with app.app_context():
            user = User(full_name='Zero User', email='zero_user@test.ai', role='Analyst')
            user.set_password('Pass@123')
            db.session.add(user)
            db.session.commit()

            ref = date(2026, 9, 21)
            result = get_detection_trend(user_id=user.id, days=11, reference_date=ref)

            assert len(result['trend']) == 11
            for day_stat in result['trend']:
                assert day_stat['real'] == 0
                assert day_stat['deepfake'] == 0
                assert day_stat['suspicious'] == 0
                assert day_stat['total'] == 0

    def test_counts_aggregated_accurately(self, app, db):
        """Verify real, deepfake, and suspicious detections are correctly counted on their dates."""
        with app.app_context():
            user = User(full_name='Test Analyst', email='analyst@test.ai', role='Analyst')
            user.set_password('Pass@123')
            db.session.add(user)
            db.session.flush()

            ref = date(2026, 9, 21)

            # Insert detections on specific dates
            d1 = Detection(
                detection_uid='det_t1',
                user_id=user.id,
                file_name='img1.png',
                file_type='image',
                result='real',
                confidence=95.0,
                created_at=datetime(2026, 9, 21, 10, 0, 0, tzinfo=timezone.utc)
            )
            d2 = Detection(
                detection_uid='det_t2',
                user_id=user.id,
                file_name='img2.png',
                file_type='image',
                result='deepfake',
                confidence=90.0,
                created_at=datetime(2026, 9, 21, 14, 0, 0, tzinfo=timezone.utc)
            )
            d3 = Detection(
                detection_uid='det_t3',
                user_id=user.id,
                file_name='img3.png',
                file_type='image',
                result='suspicious',
                confidence=55.0,
                created_at=datetime(2026, 9, 15, 8, 30, 0, tzinfo=timezone.utc)
            )
            d4 = Detection(
                detection_uid='det_t4',
                user_id=user.id,
                file_name='img4.png',
                file_type='image',
                result='genuine',  # Alias for real
                confidence=98.0,
                created_at=datetime(2026, 9, 15, 12, 0, 0, tzinfo=timezone.utc)
            )
            # Out of range detection (before Sep 11)
            d5 = Detection(
                detection_uid='det_t5',
                user_id=user.id,
                file_name='old.png',
                file_type='image',
                result='real',
                confidence=90.0,
                created_at=datetime(2026, 9, 5, 10, 0, 0, tzinfo=timezone.utc)
            )

            db.session.add_all([d1, d2, d3, d4, d5])
            db.session.commit()

            result = get_detection_trend(user_id=user.id, days=11, reference_date=ref)

            trend_by_date = {item['date']: item for item in result['trend']}

            # Check Sep 21 (Today)
            assert trend_by_date['2026-09-21']['real'] == 1
            assert trend_by_date['2026-09-21']['deepfake'] == 1
            assert trend_by_date['2026-09-21']['suspicious'] == 0
            assert trend_by_date['2026-09-21']['total'] == 2

            # Check Sep 15
            assert trend_by_date['2026-09-15']['real'] == 1  # From 'genuine' alias
            assert trend_by_date['2026-09-15']['suspicious'] == 1
            assert trend_by_date['2026-09-15']['deepfake'] == 0
            assert trend_by_date['2026-09-15']['total'] == 2

            # Check zero-activity day
            assert trend_by_date['2026-09-17']['total'] == 0

    def test_user_data_isolation(self, app, db):
        """User A should not see User B's detection counts."""
        with app.app_context():
            u1 = User(full_name='User One', email='u1@test.ai', role='Analyst')
            u1.set_password('Pass@123')
            u2 = User(full_name='User Two', email='u2@test.ai', role='Analyst')
            u2.set_password('Pass@123')
            db.session.add_all([u1, u2])
            db.session.flush()

            ref = date(2026, 9, 21)

            # u1 detection
            d1 = Detection(
                detection_uid='det_u1',
                user_id=u1.id,
                file_name='u1.png',
                file_type='image',
                result='deepfake',
                confidence=99.0,
                created_at=datetime(2026, 9, 21, 10, 0, 0, tzinfo=timezone.utc)
            )
            # u2 detection
            d2 = Detection(
                detection_uid='det_u2',
                user_id=u2.id,
                file_name='u2.png',
                file_type='image',
                result='real',
                confidence=99.0,
                created_at=datetime(2026, 9, 21, 11, 0, 0, tzinfo=timezone.utc)
            )
            db.session.add_all([d1, d2])
            db.session.commit()

            # Query for u1
            res_u1 = get_detection_trend(user_id=u1.id, days=11, reference_date=ref)
            u1_today = [x for x in res_u1['trend'] if x['date'] == '2026-09-21'][0]
            assert u1_today['deepfake'] == 1
            assert u1_today['real'] == 0

            # Query for u2
            res_u2 = get_detection_trend(user_id=u2.id, days=11, reference_date=ref)
            u2_today = [x for x in res_u2['trend'] if x['date'] == '2026-09-21'][0]
            assert u2_today['deepfake'] == 0
            assert u2_today['real'] == 1


class TestAPIEndpoints:
    """Test GET /api/dashboard/detection-trend and GET /api/detections/trend."""

    def test_dashboard_detection_trend_endpoint(self, client, auth_headers):
        resp = client.get('/api/dashboard/detection-trend?days=11', headers=auth_headers)
        assert resp.status_code == 200
        json_data = resp.get_json()
        assert json_data['success'] is True
        data = json_data['data']
        assert 'range' in data
        assert 'trend' in data
        assert len(data['trend']) == 11
        assert data['range']['days'] == 11

    def test_detections_trend_alias_endpoint(self, client, auth_headers):
        resp = client.get('/api/detections/trend?days=7', headers=auth_headers)
        assert resp.status_code == 200
        json_data = resp.get_json()
        assert json_data['success'] is True
        assert len(json_data['data']['trend']) == 7

    def test_invalid_days_param(self, client, auth_headers):
        resp = client.get('/api/dashboard/detection-trend?days=invalid', headers=auth_headers)
        assert resp.status_code == 400

        resp = client.get('/api/dashboard/detection-trend?days=0', headers=auth_headers)
        assert resp.status_code == 400

        resp = client.get('/api/dashboard/detection-trend?days=100', headers=auth_headers)
        assert resp.status_code == 400
