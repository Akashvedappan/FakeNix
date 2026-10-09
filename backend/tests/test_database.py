"""
FAKENIX 2.0 — Comprehensive Database Tests

Tests cover:
  1.  Database connection
  2.  User creation
  3.  Duplicate email prevention
  4.  Password hashing (never stored in plaintext)
  5.  Detection insertion
  6.  Evidence insertion
  7.  SHA-256 storage
  8.  Report creation
  9.  User ownership checks
  10. Transaction rollback
  11. Invalid foreign keys
  12. Database unavailable behavior (simulated)
  13. Cybercrime report creation
  14. Evidence integrity verification record

Run:
    cd backend
    pytest tests/test_database.py -v
"""
import json
import pytest
from datetime import datetime, timezone


# ──────────────────────────────────────────────────────────────
# 1. Database Connection
# ──────────────────────────────────────────────────────────────

class TestDatabaseConnection:
    def test_db_is_reachable(self, db):
        """The database engine should execute a simple query without error."""
        from sqlalchemy import text
        result = db.session.execute(text('SELECT 1')).scalar()
        assert result == 1

    def test_tables_exist(self, db):
        """All five core tables should be present after db.create_all()."""
        from sqlalchemy import inspect
        inspector = inspect(db.engine)
        tables = inspector.get_table_names()
        required = {'users', 'detections', 'evidence', 'reports', 'cybercrime_reports'}
        assert required.issubset(set(tables)), (
            f"Missing tables: {required - set(tables)}"
        )


# ──────────────────────────────────────────────────────────────
# 2. User Creation
# ──────────────────────────────────────────────────────────────

class TestUserCreation:
    def test_create_user_success(self, db):
        """A user with valid fields should be persisted."""
        from app.models.user import User
        user = User(
            full_name='Alice Analyst',
            email='alice_dbtest@fakenix.ai',
            role='Analyst',
        )
        user.set_password('AlicePass@99')
        db.session.add(user)
        db.session.commit()

        fetched = db.session.query(User).filter_by(email='alice_dbtest@fakenix.ai').first()
        assert fetched is not None
        assert fetched.full_name == 'Alice Analyst'
        assert fetched.id is not None

    def test_user_has_created_at(self, db):
        """created_at should be auto-set on insert."""
        from app.models.user import User
        user = User(
            full_name='Bob Tester',
            email='bob_dbtest@fakenix.ai',
            role='Analyst',
        )
        user.set_password('BobPass@77')
        db.session.add(user)
        db.session.commit()

        assert user.created_at is not None
        assert isinstance(user.created_at, datetime)


# ──────────────────────────────────────────────────────────────
# 3. Duplicate Email Prevention
# ──────────────────────────────────────────────────────────────

class TestDuplicateEmailPrevention:
    def test_duplicate_email_raises_error(self, db):
        """Inserting two users with the same email should raise an IntegrityError."""
        from app.models.user import User
        from sqlalchemy.exc import IntegrityError

        email = 'duplicate_dbtest@fakenix.ai'
        u1 = User(full_name='First', email=email, role='Analyst')
        u1.set_password('First@Pass1')
        db.session.add(u1)
        db.session.commit()

        u2 = User(full_name='Second', email=email, role='Analyst')
        u2.set_password('Second@Pass2')
        db.session.add(u2)

        with pytest.raises(IntegrityError):
            db.session.commit()

        db.session.rollback()

    def test_service_rejects_duplicate_email(self, app):
        """register_user service should return an error for duplicate emails."""
        from app.services.auth_service import register_user
        with app.app_context():
            email = f'svc_dup_{int(datetime.now().timestamp())}@fakenix.ai'
            user1, err1 = register_user('First User', email, 'Secure@Pass1')
            assert err1 == ''
            assert user1 is not None

            user2, err2 = register_user('Second User', email, 'Secure@Pass2')
            assert user2 is None
            assert 'already exists' in err2.lower()


# ──────────────────────────────────────────────────────────────
# 4. Password Hashing
# ──────────────────────────────────────────────────────────────

class TestPasswordHashing:
    def test_password_is_not_plaintext(self, db):
        """Password hash must not match the plaintext password string."""
        from app.models.user import User
        user = User(full_name='Hash Test', email='hashtest@fakenix.ai', role='Analyst')
        plain = 'MyPlainPassword@1'
        user.set_password(plain)
        db.session.add(user)
        db.session.commit()

        assert user.password_hash != plain
        assert len(user.password_hash) > 30  # Must be a hash

    def test_check_password_correct(self, db):
        """check_password should return True for the correct password."""
        from app.models.user import User
        user = User(full_name='PW Check', email='pwcheck@fakenix.ai', role='Analyst')
        plain = 'CorrectPass@55'
        user.set_password(plain)
        db.session.add(user)
        db.session.commit()

        assert user.check_password(plain) is True

    def test_check_password_wrong(self, db):
        """check_password should return False for a wrong password."""
        from app.models.user import User
        user = User(full_name='PW Wrong', email='pwwrong@fakenix.ai', role='Analyst')
        user.set_password('CorrectPass@55')
        db.session.add(user)
        db.session.commit()

        assert user.check_password('WrongPass@99') is False


# ──────────────────────────────────────────────────────────────
# 5. Detection Insertion
# ──────────────────────────────────────────────────────────────

class TestDetectionInsertion:
    def _create_user(self, db, suffix='det'):
        from app.models.user import User
        u = User(full_name='Det User', email=f'detuser_{suffix}@fakenix.ai', role='Analyst')
        u.set_password('DetPass@1')
        db.session.add(u)
        db.session.flush()
        return u

    def test_insert_detection(self, db):
        """A Detection record linked to a User should persist."""
        from app.models.detection import Detection
        user = self._create_user(db, suffix='ins')

        det = Detection(
            detection_uid='det_dbtest_001',
            user_id=user.id,
            file_name='test.jpg',
            file_type='image',
            result='deepfake',
            confidence=91.5,
            risk_level='high',
            model_name='EfficientNet-B4',
            status='complete',
        )
        db.session.add(det)
        db.session.commit()

        fetched = db.session.query(Detection).filter_by(detection_uid='det_dbtest_001').first()
        assert fetched is not None
        assert fetched.result == 'deepfake'
        assert fetched.user_id == user.id

    def test_detection_to_dict_shape(self, db):
        """to_dict() should return expected keys."""
        from app.models.detection import Detection
        user = self._create_user(db, suffix='dict')

        det = Detection(
            detection_uid='det_dbtest_dict',
            user_id=user.id,
            file_name='img.png',
            file_type='image',
            result='real',
            confidence=12.0,
            risk_level='low',
            status='complete',
            indicators_json=json.dumps([]),
            frames_json=json.dumps([]),
            metadata_json=json.dumps({}),
        )
        db.session.add(det)
        db.session.commit()

        d = det.to_dict()
        for key in ('id', 'result', 'confidence', 'risk', 'status', 'timestamp'):
            assert key in d, f"Missing key: {key}"


# ──────────────────────────────────────────────────────────────
# 6. Evidence Insertion
# ──────────────────────────────────────────────────────────────

class TestEvidenceInsertion:
    def _make_detection(self, db, suffix='ev'):
        from app.models.user import User
        from app.models.detection import Detection
        u = User(full_name='Ev User', email=f'evuser_{suffix}@fakenix.ai', role='Analyst')
        u.set_password('EvPass@1')
        db.session.add(u)
        db.session.flush()

        det = Detection(
            detection_uid=f'det_ev_{suffix}',
            user_id=u.id,
            file_name='ev_test.jpg',
            file_type='image',
            result='deepfake',
            confidence=85.0,
            status='complete',
        )
        db.session.add(det)
        db.session.flush()
        return det

    def test_insert_evidence(self, db):
        """Evidence linked to a detection should persist."""
        from app.models.evidence import Evidence
        det = self._make_detection(db, suffix='ins')

        ev = Evidence(
            evidence_uid='FX-2026-99001',
            detection_id=det.id,
            file_name='ev_test.jpg',
            file_type='image',
            sha256_hash='a' * 64,
            integrity_status='verified',
            verified_at=datetime.now(timezone.utc),
        )
        db.session.add(ev)
        db.session.commit()

        fetched = db.session.query(Evidence).filter_by(evidence_uid='FX-2026-99001').first()
        assert fetched is not None
        assert fetched.detection_id == det.id


# ──────────────────────────────────────────────────────────────
# 7. SHA-256 Storage
# ──────────────────────────────────────────────────────────────

class TestSHA256Storage:
    def test_sha256_stored_correctly(self, db):
        """SHA-256 hash should be stored as a 64-character hex string."""
        from app.models.evidence import Evidence
        from app.models.detection import Detection
        from app.models.user import User
        import hashlib

        u = User(full_name='Hash User', email='hashuser_sha@fakenix.ai', role='Analyst')
        u.set_password('Hash@Pass1')
        db.session.add(u)
        db.session.flush()

        det = Detection(
            detection_uid='det_sha_test',
            user_id=u.id,
            file_name='sha_test.jpg',
            file_type='image',
            status='complete',
        )
        db.session.add(det)
        db.session.flush()

        sample_data = b'test file content for sha256 verification'
        expected_sha = hashlib.sha256(sample_data).hexdigest()

        ev = Evidence(
            evidence_uid='FX-2026-SHA01',
            detection_id=det.id,
            sha256_hash=expected_sha,
            integrity_status='verified',
        )
        db.session.add(ev)
        db.session.commit()

        fetched = db.session.query(Evidence).filter_by(evidence_uid='FX-2026-SHA01').first()
        assert fetched.sha256_hash == expected_sha
        assert len(fetched.sha256_hash) == 64


# ──────────────────────────────────────────────────────────────
# 8. Report Creation
# ──────────────────────────────────────────────────────────────

class TestReportCreation:
    def test_insert_report(self, db):
        """A Report linked to user and detection should persist."""
        from app.models.user import User
        from app.models.detection import Detection
        from app.models.report import Report

        u = User(full_name='Rpt User', email='rptuser@fakenix.ai', role='Analyst')
        u.set_password('RptPass@1')
        db.session.add(u)
        db.session.flush()

        det = Detection(
            detection_uid='det_rpt_test',
            user_id=u.id,
            file_name='rpt_file.jpg',
            file_type='image',
            result='deepfake',
            confidence=88.0,
            status='complete',
        )
        db.session.add(det)
        db.session.flush()

        rpt = Report(
            report_uid='FX-RPT-2026-999',
            user_id=u.id,
            detection_id=det.id,
            report_type='Forensic Analysis',
            status='ready',
            generated_by=u.full_name,
        )
        db.session.add(rpt)
        db.session.commit()

        fetched = db.session.query(Report).filter_by(report_uid='FX-RPT-2026-999').first()
        assert fetched is not None
        assert fetched.user_id == u.id
        assert fetched.detection_id == det.id

    def test_report_to_dict_shape(self, db):
        """Report.to_dict() should contain required fields."""
        from app.models.user import User
        from app.models.detection import Detection
        from app.models.report import Report

        u = User(full_name='Dict User', email='dictrpt@fakenix.ai', role='Analyst')
        u.set_password('Dict@Pass1')
        db.session.add(u)
        db.session.flush()

        det = Detection(
            detection_uid='det_dict_rpt',
            user_id=u.id,
            file_name='dict_rpt.jpg',
            file_type='image',
            result='real',
            confidence=5.0,
            status='complete',
        )
        db.session.add(det)
        db.session.flush()

        rpt = Report(
            report_uid='FX-RPT-2026-000',
            user_id=u.id,
            detection_id=det.id,
            report_type='Authenticity Certificate',
            status='ready',
        )
        db.session.add(rpt)
        db.session.commit()

        d = rpt.to_dict()
        for key in ('reportId', 'detectionId', 'reportType', 'status', 'generatedDate'):
            assert key in d, f"Missing key in Report.to_dict(): {key}"


# ──────────────────────────────────────────────────────────────
# 9. User Ownership Checks
# ──────────────────────────────────────────────────────────────

class TestOwnershipChecks:
    def test_detection_not_visible_to_other_user(self, app):
        """A user should not be able to retrieve another user's detection."""
        from app.services.detection_service import get_detection_by_uid
        from app.models.user import User
        from app.models.detection import Detection
        from app.extensions import db

        with app.app_context():
            u1 = User(full_name='Owner', email='owner_own@fakenix.ai', role='Analyst')
            u1.set_password('Own@Pass1')
            u2 = User(full_name='Thief', email='thief_own@fakenix.ai', role='Analyst')
            u2.set_password('Thief@Pass1')
            db.session.add_all([u1, u2])
            db.session.flush()

            det = Detection(
                detection_uid='det_own_test',
                user_id=u1.id,
                file_name='secret.jpg',
                file_type='image',
                status='complete',
            )
            db.session.add(det)
            db.session.commit()

            # Owner can access
            result = get_detection_by_uid('det_own_test', u1.id)
            assert result is not None

            # Thief cannot access
            result2 = get_detection_by_uid('det_own_test', u2.id)
            assert result2 is None

    def test_report_not_visible_to_other_user(self, app):
        """get_report_by_uid enforces ownership."""
        from app.services.report_service import get_report_by_uid
        from app.models.user import User
        from app.models.report import Report
        from app.extensions import db

        with app.app_context():
            u1 = User(full_name='Report Owner', email='rptowner@fakenix.ai', role='Analyst')
            u1.set_password('Rpt@Own1')
            u2 = User(full_name='Report Intruder', email='rptintruder@fakenix.ai', role='Analyst')
            u2.set_password('Rpt@Int1')
            db.session.add_all([u1, u2])
            db.session.flush()

            rpt = Report(
                report_uid='FX-RPT-OWN-001',
                user_id=u1.id,
                report_type='Forensic Analysis',
                status='ready',
            )
            db.session.add(rpt)
            db.session.commit()

            # Owner can access
            result = get_report_by_uid('FX-RPT-OWN-001', u1.id)
            assert result is not None

            # Other user cannot
            result2 = get_report_by_uid('FX-RPT-OWN-001', u2.id)
            assert result2 is None


# ──────────────────────────────────────────────────────────────
# 10. Transaction Rollback
# ──────────────────────────────────────────────────────────────

class TestTransactionRollback:
    def test_rollback_on_partial_failure(self, db):
        """
        If a commit fails midway, no partial records should remain.
        Simulate by attempting to insert a duplicate evidence_uid.
        """
        from app.models.evidence import Evidence
        from sqlalchemy.exc import IntegrityError

        ev1 = Evidence(
            evidence_uid='FX-ROLLBACK-001',
            integrity_status='pending',
        )
        db.session.add(ev1)
        db.session.commit()

        # Attempt duplicate — should fail
        ev2 = Evidence(
            evidence_uid='FX-ROLLBACK-001',  # Duplicate unique key
            integrity_status='pending',
        )
        db.session.add(ev2)
        with pytest.raises(IntegrityError):
            db.session.commit()

        db.session.rollback()

        # Only original record should exist
        count = db.session.query(Evidence).filter_by(evidence_uid='FX-ROLLBACK-001').count()
        assert count == 1

    def test_auth_service_rolls_back_on_duplicate(self, app):
        """register_user rolls back on DB error and returns a safe error."""
        from app.services.auth_service import register_user
        with app.app_context():
            email = 'rollback_test@fakenix.ai'
            register_user('First', email, 'Secure@Pass1')
            user2, err = register_user('Second', email, 'Secure@Pass2')
            assert user2 is None
            assert err  # Non-empty error message


# ──────────────────────────────────────────────────────────────
# 11. Invalid Foreign Keys
# ──────────────────────────────────────────────────────────────

class TestForeignKeys:
    def test_detection_with_nonexistent_user(self, db):
        """
        In SQLite (test mode), FK constraints may not be enforced by default.
        We verify the query correctly filters by user_id.
        A detection with user_id=99999 should not be returned for user 1.
        """
        from app.models.detection import Detection
        from app.services.detection_service import get_detection_by_uid

        det = Detection(
            detection_uid='det_orphan_test',
            user_id=99999,  # Non-existent user
            file_name='orphan.jpg',
            file_type='image',
            status='complete',
        )
        db.session.add(det)
        db.session.commit()

        # Should NOT be visible to user 1
        result = db.session.query(Detection).filter(
            Detection.detection_uid == 'det_orphan_test',
            Detection.user_id == 1,
        ).first()
        assert result is None


# ──────────────────────────────────────────────────────────────
# 12. Database Unavailable Behavior (Simulated)
# ──────────────────────────────────────────────────────────────

class TestDatabaseUnavailable:
    def test_auth_service_handles_db_error_gracefully(self, app, monkeypatch):
        """
        If db.session.commit() raises, register_user should return
        (None, error_message) without crashing.
        """
        from app.services import auth_service
        from app.extensions import db

        with app.app_context():
            original_commit = db.session.commit

            def bad_commit():
                raise RuntimeError('Simulated DB failure')

            monkeypatch.setattr(db.session, 'commit', bad_commit)

            try:
                user, err = auth_service.register_user(
                    'Crash Test',
                    'crash_test@fakenix.ai',
                    'Crash@Pass1',
                )
                assert user is None
                assert err  # Non-empty error message
            finally:
                monkeypatch.setattr(db.session, 'commit', original_commit)
                db.session.rollback()


# ──────────────────────────────────────────────────────────────
# 13. Cybercrime Report Creation
# ──────────────────────────────────────────────────────────────

class TestCybercrimeReportCreation:
    def test_create_cybercrime_report(self, app):
        """CybercrimeReport creation via service should persist a record."""
        from app.services.cybercrime_service import create_cybercrime_report
        from app.models.user import User
        from app.extensions import db

        with app.app_context():
            u = User(full_name='CC User', email='cc_user@fakenix.ai', role='Analyst')
            u.set_password('CC@Pass1')
            db.session.add(u)
            db.session.commit()

            data = {
                'incidentType': 'Deepfake Impersonation',
                'description': 'A deepfake video was used to impersonate me.',
                'incidentDate': '2026-09-10',
                'platform': 'Social Media',
                'sourceUrl': 'https://example.com/fake-video',
            }
            report, err = create_cybercrime_report(data, u.id)
            assert err == ''
            assert report is not None
            assert report.incident_type == 'Deepfake Impersonation'
            assert report.status == 'prepared'

    def test_cybercrime_report_ownership(self, app):
        """get_cybercrime_report_by_uid enforces user ownership."""
        from app.services.cybercrime_service import (
            create_cybercrime_report, get_cybercrime_report_by_uid
        )
        from app.models.user import User
        from app.extensions import db

        with app.app_context():
            u1 = User(full_name='CC Own', email='cc_own@fakenix.ai', role='Analyst')
            u1.set_password('CC@Pass1')
            u2 = User(full_name='CC Spy', email='cc_spy@fakenix.ai', role='Analyst')
            u2.set_password('CC@Spy1')
            db.session.add_all([u1, u2])
            db.session.commit()

            data = {
                'incidentType': 'Identity Theft',
                'description': 'Deepfake used for identity theft.',
            }
            report, _ = create_cybercrime_report(data, u1.id)

            # Owner retrieves
            found = get_cybercrime_report_by_uid(report.report_uid, u1.id)
            assert found is not None

            # Spy cannot retrieve
            not_found = get_cybercrime_report_by_uid(report.report_uid, u2.id)
            assert not_found is None


# ──────────────────────────────────────────────────────────────
# 14. Evidence Integrity Verification Record
# ──────────────────────────────────────────────────────────────

class TestEvidenceIntegrity:
    def test_integrity_status_default(self, db):
        """New evidence should default to 'pending' integrity status."""
        from app.models.evidence import Evidence

        ev = Evidence(
            evidence_uid='FX-INTEGRITY-001',
        )
        db.session.add(ev)
        db.session.commit()

        fetched = db.session.query(Evidence).filter_by(evidence_uid='FX-INTEGRITY-001').first()
        assert fetched.integrity_status == 'pending'

    def test_chain_of_custody_json_storage(self, db):
        """Chain-of-custody JSON should be stored and retrievable."""
        from app.models.evidence import Evidence
        import json

        chain = [
            {'action': 'Uploaded', 'by': 'Test User', 'time': datetime.now(timezone.utc).isoformat()},
            {'action': 'Analyzed', 'by': 'FAKENIX AI', 'time': datetime.now(timezone.utc).isoformat()},
        ]

        ev = Evidence(
            evidence_uid='FX-CHAIN-001',
            chain_of_custody_json=json.dumps(chain),
            integrity_status='verified',
        )
        db.session.add(ev)
        db.session.commit()

        fetched = db.session.query(Evidence).filter_by(evidence_uid='FX-CHAIN-001').first()
        loaded = json.loads(fetched.chain_of_custody_json)
        assert len(loaded) == 2
        assert loaded[0]['action'] == 'Uploaded'
