# FAKENIX 2.0 — Backend

AI-Powered Deepfake Detection, Digital Forensics & Cybercrime Evidence Platform

---

## Table of Contents

1. [Technology Stack](#1-technology-stack)
2. [Database Schema Overview](#2-database-schema-overview)
3. [MySQL Installation & Setup](#3-mysql-installation--setup)
4. [Environment Configuration](#4-environment-configuration)
5. [Database Initialization](#5-database-initialization)
6. [Migration Commands](#6-migration-commands)
7. [Running the Backend](#7-running-the-backend)
8. [Running the Frontend](#8-running-the-frontend)
9. [Testing](#9-testing)
10. [Demo Data](#10-demo-data)
11. [API Endpoints](#11-api-endpoints)
12. [Storage Architecture](#12-storage-architecture)
13. [Backup & Restore](#13-backup--restore)
14. [Security Considerations](#14-security-considerations)

---

## 1. Technology Stack

| Component            | Technology                                |
|----------------------|-------------------------------------------|
| Framework            | Flask 3.x                                 |
| Primary Database     | MySQL 8+                                  |
| ORM                  | Flask-SQLAlchemy 3.x / SQLAlchemy 2.x     |
| Migrations           | Flask-Migrate 4.x / Alembic               |
| MySQL Driver         | PyMySQL                                   |
| Authentication       | Flask-JWT-Extended                        |
| Password Hashing     | Werkzeug (PBKDF2-SHA256)                  |
| PDF Reports          | ReportLab                                 |
| Environment          | python-dotenv                             |

---

## 2. Database Schema Overview

The database is named `fakenix_db` and contains five tables:

```
users
 ├── id (PK)
 ├── full_name
 ├── email (UNIQUE, indexed)
 ├── password_hash          ← Never stored in plaintext
 ├── role
 ├── organization
 ├── is_active
 ├── created_at
 └── updated_at

detections
 ├── id (PK)
 ├── detection_uid (UNIQUE)
 ├── user_id (FK → users.id, CASCADE DELETE)
 ├── file_name / file_type / file_size / resolution / duration
 ├── result / confidence / risk_level
 ├── model_name
 ├── is_demo
 ├── status
 ├── indicators_json / frames_json / metadata_json
 └── created_at

evidence
 ├── id (PK)
 ├── evidence_uid (UNIQUE)  ← Format: FX-YYYY-NNNNN
 ├── detection_id (FK → detections.id, SET NULL on delete)
 │   ★ SET NULL is deliberate — evidence must survive detection deletion
 ├── file_name / file_type / file_path
 ├── sha256_hash (indexed)  ← 64-char hex, cryptographic integrity
 ├── md5_hash
 ├── integrity_status       ← pending | verified | failed
 ├── metadata_json
 ├── chain_of_custody_json  ← Forensic audit trail
 ├── created_at
 └── verified_at

reports
 ├── id (PK)
 ├── report_uid (UNIQUE)    ← Format: FX-RPT-YYYY-NNN
 ├── user_id (FK → users.id, SET NULL)
 ├── detection_id (FK → detections.id, SET NULL)
 ├── report_type / report_path / status / generated_by
 └── created_at

cybercrime_reports
 ├── id (PK)
 ├── report_uid (UNIQUE)    ← Format: CC-YYYY-NNN
 ├── user_id (FK → users.id, SET NULL)
 ├── evidence_id (string reference, optional)
 ├── incident_type / description / incident_date
 ├── platform / source_url / additional_information
 ├── status                 ← prepared (NOT submitted to authorities)
 └── created_at
```

> **Cascade Behavior:**
> - `detections.user_id` → CASCADE DELETE (user deleted → their detections deleted)
> - `evidence.detection_id` → SET NULL (detection deleted → evidence preserved for forensics)
> - `reports.user_id` & `reports.detection_id` → SET NULL (preserve audit record)
> - `cybercrime_reports.user_id` → SET NULL

> **Media Storage:**
> Uploaded files (images, videos) are stored in `backend/storage/` on disk.
> MySQL stores only the secure file path reference and SHA-256 hash.

---

## 3. MySQL Installation & Setup

### Windows

1. Download MySQL 8+ from https://dev.mysql.com/downloads/installer/
2. Run the installer — select "Server Only" or "Full"
3. Set the root password during setup

### Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install mysql-server
sudo systemctl start mysql
sudo mysql_secure_installation
```

### Create the Database & Application User

```bash
# Run as MySQL root
mysql -u root -p < scripts/mysql_setup.sql
```

Or manually in the MySQL shell:

```sql
CREATE DATABASE IF NOT EXISTS fakenix_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'fakenix_user'@'localhost'
    IDENTIFIED BY 'your_secure_password';

GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, DROP, REFERENCES
    ON fakenix_db.*
    TO 'fakenix_user'@'localhost';

FLUSH PRIVILEGES;
```

> **Security:** The application never uses MySQL root credentials.
> `fakenix_user` has only the minimum required permissions.

---

## 4. Environment Configuration

```bash
# Copy the example file
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

```env
# Flask
FLASK_ENV=development
SECRET_KEY=your_32_char_minimum_random_secret
PORT=5000

# Database — MySQL (recommended)
DATABASE_URL=mysql+pymysql://fakenix_user:your_secure_password@localhost/fakenix_db

# Database — SQLite fallback (dev/testing, no MySQL needed)
# DATABASE_URL=sqlite:///fakenix_dev.db

# JWT
JWT_SECRET_KEY=your_32_char_minimum_random_jwt_secret
JWT_ACCESS_TOKEN_EXPIRES_HOURS=24

# Frontend origin
FRONTEND_URL=http://localhost:5173

# Demo mode (set false to use real AI model)
DEMO_MODE=true

# Logging
LOG_LEVEL=INFO
```

> **Never commit `.env` to Git.** It is listed in `.gitignore`.
> Secrets are never printed to logs.

---

## 5. Database Initialization

### Option A — Using Flask-Migrate (Recommended for MySQL)

```bash
cd backend

# Step 1: Initialize migrations folder (first time only)
uv run flask db init

# Step 2: Generate migration from models
uv run flask db migrate -m "Initial database schema"

# Step 3: Apply migration to database
uv run flask db upgrade
```

### Option B — Using init_db.py (Quick setup)

```bash
cd backend
uv run python scripts/init_db.py
```

This runs `db.create_all()` which is safe and idempotent — it skips existing tables.

> **For MySQL:** Ensure the database and user exist (step 3) before running either option.

---

## 6. Migration Commands

```bash
# Show current migration status
uv run flask db current

# Show migration history
uv run flask db history

# Apply all pending migrations
uv run flask db upgrade

# Roll back one migration (USE WITH CAUTION — data loss possible)
uv run flask db downgrade

# Generate a new migration after model changes
uv run flask db migrate -m "Add field X to detections"
```

> **Destructive commands** (`DROP TABLE`, `downgrade`) are never run automatically.
> Always review the generated migration file before applying.

---

## 7. Running the Backend

The backend is managed with [uv](https://docs.astral.sh/uv/). Dependencies are declared in
`pyproject.toml` and pinned in `uv.lock`; the Python version is pinned in `.python-version` (3.12).

```bash
cd backend

# Create .venv and install dependencies (including the dev group: pytest etc.)
uv sync

# Initialize database
uv run python scripts/init_db.py

# Start the Flask development server
uv run python run.py
```

### AI analysis (Groq)

Every image and video upload is analyzed by a vision LLM through the Groq API
(`app/ai/groq_analyzer.py`). Configure it in `.env`:

| Variable               | Required | Description                                                    |
|------------------------|----------|----------------------------------------------------------------|
| `GROQ_API_KEY`         | yes      | Groq API key                                                   |
| `GROQ_MODEL`           | yes      | Vision-capable model, e.g. `qwen/qwen3.8-27b`                  |
| `GROQ_TIMEOUT_SECONDS` | no       | Request timeout (default 90)                                   |
| `GROQ_VIDEO_FRAMES`    | no       | Frames sampled per video, sent in one request (default 2)      |

- Images are sent as one JPEG (longest side up to 1280 px) together with extracted metadata.
- Videos: `GROQ_VIDEO_FRAMES` frames are sampled evenly and analyzed in a single request;
  the model returns an overall verdict plus a probability per frame.
- The model must answer with a JSON verdict (`real` / `fake` / `uncertain`), a 0–100 deepfake
  probability, visible indicators and an explanation. `fake` maps to `deepfake`, `uncertain`
  to `suspicious`; the risk level is derived from the probability.
- There is no offline or demo fallback. If the key is missing or the Groq call fails, the upload
  returns HTTP 502 with the reason and no detection is stored.
- Limits observed for `qwen/qwen3.8-27b`: at most 3 images per request; each image costs
  ~1,800 input tokens, and the on-demand tier allows 7,000 input tokens per minute. That means
  roughly 2 image analyses or 1 video analysis per minute before Groq rate-limits (the client
  retries automatically).
- The test suite also calls Groq for the upload tests; it reads the `GROQ_*` values from `.env`.

Managing dependencies:

```bash
uv add <package>            # add a runtime dependency
uv add --dev <package>      # add a development-only dependency
uv remove <package>         # remove a dependency
uv lock --upgrade           # upgrade locked versions
```

Commit both `pyproject.toml` and `uv.lock`. Do not use `pip install` in this project.

The backend runs at: http://127.0.0.1:5000

Health check: http://127.0.0.1:5000/api/health

---

## 8. Running the Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at: http://localhost:5173

---

## 9. Testing

```bash
cd backend

# Run all tests
uv run pytest -v

# Run only database tests
uv run pytest tests/test_database.py -v

# Run with coverage
uv run pytest --cov=app --cov-report=term-missing
```

Tests use an **in-memory SQLite** database (configured in `TestingConfig`).
Production data is never touched during testing.

### Test Coverage

| Test File             | Areas Covered                                    |
|-----------------------|--------------------------------------------------|
| `test_database.py`    | Connection, CRUD, hashing, ownership, rollback   |
| `test_auth.py`        | Registration, login, JWT, profile                |
| `test_detection.py`   | Image upload, video, URL, history endpoints      |
| `test_health.py`      | Health check, root endpoints                     |

---

## 10. Demo Data

```bash
cd backend
uv run python scripts/seed_demo_data.py
```

Creates:
- Demo user: `demo@fakenix.ai` / `Demo@123`
- 2 sample detection records (labeled `is_demo=True`)
- Associated evidence records

> This script only runs when explicitly called.
> It never overwrites existing users or detections.
> Demo records are clearly marked and must not be presented as real activity.

---

## 11. API Endpoints

All endpoints return JSON:

```json
{
  "success": true,
  "data": { ... },
  "message": "...",
  "timestamp": "..."
}
```

### Authentication

| Method | Endpoint              | Auth     | Description              |
|--------|-----------------------|----------|--------------------------|
| POST   | `/api/auth/register`  | None     | Create account           |
| POST   | `/api/auth/login`     | None     | Login, get JWT token     |
| GET    | `/api/auth/me`        | JWT      | Current user profile     |
| POST   | `/api/auth/logout`    | None     | Client-side token clear  |

### Detection

| Method | Endpoint                          | Auth | Description              |
|--------|-----------------------------------|------|--------------------------|
| POST   | `/api/detect/image`               | JWT  | Analyze image file       |
| POST   | `/api/detect/video`               | JWT  | Analyze video file       |
| POST   | `/api/detect/url`                 | JWT  | Analyze URL (demo mode)  |
| GET    | `/api/detections`                 | JWT  | Detection history        |
| GET    | `/api/detections/<uid>`           | JWT  | Single detection result  |
| DELETE | `/api/detections/<uid>`           | JWT  | Delete a detection       |

### Evidence

| Method | Endpoint                              | Auth | Description              |
|--------|---------------------------------------|------|--------------------------|
| GET    | `/api/evidence`                       | JWT  | List evidence records    |
| GET    | `/api/evidence/<uid>`                 | JWT  | Single evidence record   |
| GET    | `/api/evidence/<uid>/verify`          | JWT  | SHA-256 integrity check  |

### Reports

| Method | Endpoint                          | Auth | Description              |
|--------|-----------------------------------|------|--------------------------|
| POST   | `/api/reports`                    | JWT  | Generate PDF report      |
| GET    | `/api/reports`                    | JWT  | List user's reports      |
| GET    | `/api/reports/<uid>`              | JWT  | Single report            |
| GET    | `/api/reports/<uid>/download`     | JWT  | Download PDF             |

### Cybercrime Reports

| Method | Endpoint                              | Auth | Description                |
|--------|---------------------------------------|------|----------------------------|
| POST   | `/api/cybercrime/report`              | JWT  | Prepare incident report    |
| GET    | `/api/cybercrime/reports`             | JWT  | List incident reports      |
| GET    | `/api/cybercrime/reports/<uid>`       | JWT  | Single incident report     |

> **Cybercrime Report Disclaimer:**
> The platform prepares structured incident report documents only.
> It does NOT submit reports to any government authority or law enforcement.
> Actual submission is the user's sole responsibility.

---

## 12. Storage Architecture

```
backend/
└── storage/
    ├── uploads/       ← Raw uploaded images/videos
    ├── processed/     ← Processed frames/artifacts
    ├── reports/       ← Generated PDF reports
    └── evidence/      ← Evidence-related files
```

- Raw media files are stored on disk; MySQL stores only the filename and SHA-256 hash.
- File paths are stored relative to `backend/storage/`.
- Absolute paths are resolved at runtime from `UPLOAD_FOLDER` config.

---

## 13. Backup & Restore

### MySQL Backup

```bash
# Full database backup
mysqldump -u fakenix_user -p fakenix_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup with stored routines and triggers
mysqldump -u fakenix_user -p --routines --triggers fakenix_db > backup_full.sql
```

### MySQL Restore

```bash
# Restore from backup
mysql -u fakenix_user -p fakenix_db < backup_YYYYMMDD_HHMMSS.sql
```

### Storage Backup

```bash
# Back up uploaded files and reports
xcopy /E /I backend\storage backup_storage\
```

> **Recommendation:** Schedule automated backups before any migration or maintenance window.

---

## 14. Security Considerations

| Control                     | Implementation                                        |
|-----------------------------|-------------------------------------------------------|
| Password storage            | PBKDF2-SHA256 via Werkzeug (never plaintext)          |
| Authentication              | JWT (Flask-JWT-Extended), 24h expiry                  |
| Authorization               | User ownership checks on all data queries             |
| SQL injection prevention    | SQLAlchemy parameterized queries (no raw SQL)         |
| IDOR prevention             | All queries filter by `user_id`                       |
| SSRF protection             | URL validation blocks private/localhost addresses     |
| Secret management           | Credentials in `.env` only, never in code or Git      |
| CORS                        | Restricted to configured frontend origins             |
| File upload validation      | Extension + MIME type checks, 100 MB limit            |
| Error responses             | Generic messages, no stack traces in production       |
| Cryptographic integrity     | SHA-256 hash stored per evidence record               |
| Least privilege DB access   | `fakenix_user` has no SUPER or GRANT privileges       |

> The `DEBUG=True` setting is only active in `development` environment.
> Never deploy with `DEBUG=True` in production.
