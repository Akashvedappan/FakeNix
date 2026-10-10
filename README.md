# FAKENIX 2.0

**AI-Powered Deepfake Detection & Digital Forensics Platform**

An end-to-end investigative platform for analyzing suspicious media, assessing manipulation risks, preserving cryptographic evidence, and preparing structured incident reports for law enforcement and digital forensics investigations.

---

## Live Demo

**Production Website:** [FAKENIX — Try the Platform](https://fake-nix.vercel.app/)

Explore the live FAKENIX platform for AI-powered deepfake detection and digital forensic analysis.

---

## Table of Contents

1. [Live Demo](#live-demo)
2. [Overview](#overview)
3. [Key Features](#key-features)
4. [Technology Stack](#technology-stack)
5. [Documentation](#documentation)
6. [License](#license)

---

## Overview

FAKENIX 2.0 is a comprehensive digital forensics platform designed to combat synthetic media threats. It provides investigators, journalists, law enforcement, and security operations centers (SOCs) with a unified toolkit to:

- **Analyze** suspicious images and videos for deepfake indicators
- **Assess** manipulation probabilities using AI-powered vision models
- **Verify** cryptographic evidence with SHA-256 hashing and chain-of-custody tracking
- **Report** structured cybercrime incident dossiers compliant with law enforcement standards

The platform integrates image and video analysis, EXIF/metadata extraction, AI-assisted deepfake detection via Groq's hosted vision LLM, automatic evidence sealing, and court-ready PDF forensic report generation into a single forensic-first workflow.

---

## Key Features

- **Multi-Format Media Analysis:** Support for JPEG, PNG, WEBP images; MP4, AVI, MOV videos; and URL-based analysis
- **AI Deepfake Detection:** Powered by Groq's hosted vision LLM (e.g., Qwen 3.8-27B) analyzing facial artifacts, lighting inconsistencies, and frame anomalies
- **Frame-by-Frame Analysis:** For videos, sample frames analyzed independently with per-frame confidence scores and temporal anomaly curves
- **Metadata Extraction:** Automatic EXIF and header metadata parsing for images; resolution, duration, and codec details for videos
- **Cryptographic Evidence Sealing:** Immediate SHA-256 and MD5 hashing of all uploaded media with tamper-evident verification
- **Chain of Custody Tracking:** Immutable audit logs recording who uploaded, analyzed, and sealed each evidence artifact
- **Forensic Report Generation:** PDF-exportable forensic dossiers with analysis results, risk assessments, and evidence summaries compliant with Section 65B electronic evidence standards
- **Cybercrime Incident Reporting:** Standardized report templates for preparing law enforcement complaint packets
- **User Authentication:** Secure JWT-based authentication with role-based access control
- **Dashboard & Analytics:** SOC command center with detection trends, activity streams, and real-time metrics
- **Demo Mode:** Complete offline simulation mode with realistic mock detections for evaluation and training

---

## Technology Stack

| Component             | Technology                                     |
| --------------------- | ---------------------------------------------- |
| **Frontend**          | React 18, Vite 5, React Router v6              |
| **Backend**           | Flask 3.x, Python 3.12                         |
| **Database**          | MySQL 8+ (or SQLite for development)           |
| **ORM**               | Flask-SQLAlchemy 3.x / SQLAlchemy 2.x          |
| **Migrations**        | Flask-Migrate 4.x / Alembic                    |
| **Authentication**    | Flask-JWT-Extended (JWT 24h expiry)            |
| **AI Analysis**       | Groq-hosted vision LLM (e.g., qwen/qwen3.8-27b) |
| **PDF Reporting**     | ReportLab 4.x                                  |
| **Image Processing**  | OpenCV (headless), Pillow                      |
| **Metadata Parsing**  | pymediainfo 6.x                                |
| **HTTP Client**       | Axios (frontend), Requests (backend)           |
| **Data Visualization**| Recharts (React charting)                      |
| **Dependency Mgmt**   | uv (backend), npm (frontend)                   |

---


## License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

Copyright © 2026 FAKENIX 2.0 Contributors

---

**FAKENIX 2.0** — *Detect. Verify. Investigate. Report.*
