"""
FAKENIX 2.0 — Database Initialization Script

Usage:
    cd backend
    python scripts/init_db.py

What it does:
  1. Loads Flask configuration from .env
  2. Connects to the configured database (MySQL or SQLite)
  3. Verifies the connection
  4. Creates all tables via db.create_all() (safe — uses IF NOT EXISTS)
  5. Reports table counts

For production MySQL, prefer Flask-Migrate:
    flask db upgrade

This script is safe to run multiple times — it will NOT drop or alter
existing tables or data.
"""
import sys
import os
import re

# Ensure backend/ is on the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

from app import create_app
from app.extensions import db
import app.models  # noqa: ensure all models are imported


def _mask_url(url: str) -> str:
    """Mask password in DB URL for safe display."""
    return re.sub(r'(://[^:@]+:)[^@]+(@)', r'\1***\2', url)


def init_db():
    """Initialize the database — create all tables safely."""
    flask_app = create_app()

    with flask_app.app_context():
        db_url = flask_app.config.get('SQLALCHEMY_DATABASE_URI', 'unknown')
        safe_url = _mask_url(db_url)

        print(f'\n{"="*60}')
        print(f'  FAKENIX 2.0 — Database Initialization')
        print(f'{"="*60}')
        print(f'  Database: {safe_url}')
        print(f'  Environment: {flask_app.config.get("FLASK_ENV", "development")}')
        print(f'{"="*60}\n')

        # Step 1: Verify connection
        print('[1/3] Verifying database connection...')
        try:
            from sqlalchemy import text
            with db.engine.connect() as conn:
                conn.execute(text('SELECT 1'))
            print('      [OK] Database connection successful.')
        except Exception as e:
            print(f'      [ERROR] Cannot connect to database: {e}')
            print()
            print('  Possible fixes:')
            print('  - For MySQL: ensure MySQL is running and fakenix_db exists.')
            print('    Run: mysql -u root -p < scripts/mysql_setup.sql')
            print('  - Check DATABASE_URL in backend/.env')
            print('  - For SQLite: no setup needed, file will be created automatically.')
            sys.exit(1)

        # Step 2: Create tables
        print('[2/3] Creating database tables (safe — skips existing)...')
        try:
            db.create_all()
            print('      [OK] All tables created or already exist.')
        except Exception as e:
            print(f'      [ERROR] Table creation failed: {e}')
            sys.exit(1)

        # Step 3: Report
        print('[3/3] Inspecting database...')
        from sqlalchemy import inspect
        inspector = inspect(db.engine)
        tables = inspector.get_table_names()

        print(f'      [OK] Tables in database: {", ".join(sorted(tables)) if tables else "none"}')

        required = {'users', 'detections', 'evidence', 'reports', 'cybercrime_reports'}
        missing = required - set(tables)
        if missing:
            print(f'      [WARN] Missing expected tables: {", ".join(missing)}')
        else:
            print('      [OK] All 5 FAKENIX tables confirmed.')

        print()
        print('  Next steps:')
        print('  - Start backend:   python run.py')
        print('  - Seed demo data:  python scripts/seed_demo_data.py')
        print('  - Run migrations:  flask db upgrade')
        print(f'{"="*60}\n')


if __name__ == '__main__':
    init_db()
