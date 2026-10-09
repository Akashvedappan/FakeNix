"""
FAKENIX 2.0 — Demo Data Seeding Script

Usage:
    cd backend
    python scripts/seed_demo_data.py

Seeds:
    - Demo user (demo@fakenix.ai / Demo@123)
    - Sample detection records
    - Sample evidence records

ONLY run this for development/demo purposes.
Never seed into a production database.
"""
import sys
import os
import json
from datetime import datetime, timezone, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

from app import create_app
from app.extensions import db
import app.models  # noqa


def seed():
    flask_app = create_app()

    with flask_app.app_context():
        print('\n[FAKENIX] Seeding demo data...')

        # Ensure tables exist
        db.create_all()

        from app.models.user import User
        from app.models.detection import Detection
        from app.models.evidence import Evidence

        # ── Demo User ──────────────────────────────────────────
        demo_email = 'demo@fakenix.ai'
        existing_user = db.session.query(User).filter(User.email == demo_email).first()

        if existing_user:
            print(f'[FAKENIX] Demo user already exists (id={existing_user.id}). Skipping user seed.')
            user = existing_user
        else:
            user = User(
                full_name='Akash Kumar',
                email=demo_email,
                role='Analyst',
                organization='FAKENIX Labs',
            )
            user.set_password('Demo@123')
            db.session.add(user)
            db.session.flush()
            print(f'[FAKENIX] [OK] Demo user created: {demo_email} / Demo@123')

        # ── Sample Detections ──────────────────────────────────
        samples = [
            {
                'uid': 'det_demo_001',
                'file_name': 'interview_clip.mp4',
                'file_type': 'video',
                'file_size': '48.3 MB',
                'resolution': '1920x1080',
                'duration': '0:42',
                'result': 'deepfake',
                'confidence': 92.4,
                'risk_level': 'high',
                'sha256': 'a91f4b9e7e8c3d1f4f9e7c2a5b6d8e9f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6',
                'evidence_uid': 'FX-2026-00142',
                'indicators': [
                    {'name': 'Facial boundary inconsistency', 'severity': 'high', 'score': 0.91},
                    {'name': 'Texture anomaly', 'severity': 'high', 'score': 0.88},
                ],
                'frames': [
                    {'frameNum': 1, 'timestamp': '0:00', 'probability': 91.2, 'risk': 'high'},
                    {'frameNum': 24, 'timestamp': '0:08', 'probability': 93.1, 'risk': 'high'},
                ],
            },
            {
                'uid': 'det_demo_002',
                'file_name': 'profile_photo.jpg',
                'file_type': 'image',
                'file_size': '2.1 MB',
                'resolution': '1024x1024',
                'duration': None,
                'result': 'real',
                'confidence': 8.4,
                'risk_level': 'low',
                'sha256': 'b72e3a8f1c9d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9',
                'evidence_uid': 'FX-2026-00141',
                'indicators': [],
                'frames': [],
            },
        ]

        now = datetime.now(timezone.utc)
        for i, s in enumerate(samples):
            existing_det = db.session.query(Detection).filter(Detection.detection_uid == s['uid']).first()
            if existing_det:
                print(f'[FAKENIX] Detection {s["uid"]} already exists. Skipping.')
                continue

            # Give sample detections realistic dynamic timestamps within the last 11 days
            sample_time = now - timedelta(days=i, hours=2 * (i + 1))

            det = Detection(
                detection_uid=s['uid'],
                user_id=user.id,
                file_name=s['file_name'],
                file_type=s['file_type'],
                file_size=s['file_size'],
                resolution=s['resolution'],
                duration=s['duration'],
                result=s['result'],
                confidence=s['confidence'],
                deepfake_probability=s['confidence'],
                real_probability=round(100 - s['confidence'], 2),
                risk_level=s['risk_level'],
                model_name='EfficientNet-B4 (Demo)',
                is_demo=True,
                status='complete',
                indicators_json=json.dumps(s['indicators']),
                frames_json=json.dumps(s['frames']),
                metadata_json=json.dumps({}),
                created_at=sample_time,
            )
            db.session.add(det)
            db.session.flush()

            # Create evidence
            existing_ev = db.session.query(Evidence).filter(Evidence.evidence_uid == s['evidence_uid']).first()
            if not existing_ev:
                ev = Evidence(
                    evidence_uid=s['evidence_uid'],
                    detection_id=det.id,
                    file_name=s['file_name'],
                    file_type=s['file_type'],
                    sha256_hash=s['sha256'],
                    integrity_status='verified',
                    verified_at=datetime.now(timezone.utc),
                    chain_of_custody_json=json.dumps([
                        {'action': 'Seeded (Demo)', 'by': 'FAKENIX System', 'time': datetime.now(timezone.utc).isoformat()}
                    ]),
                )
                db.session.add(ev)

            print(f'[FAKENIX] [OK] Detection seeded: {s["uid"]} ({s["result"]})')

        db.session.commit()
        print('[FAKENIX] [OK] Demo data seeding complete.\n')
        print('[FAKENIX] Demo Login:')
        print('  Email:    demo@fakenix.ai')
        print('  Password: Demo@123\n')


if __name__ == '__main__':
    seed()
