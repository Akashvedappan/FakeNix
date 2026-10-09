"""
FAKENIX 2.0 — Flask Application Factory
"""
import os
import logging
from flask import Flask, jsonify

from dotenv import load_dotenv

# Load .env from the backend/ directory
_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(_BACKEND_DIR, '.env'))

from app.config import config_map
from app.extensions import db, migrate, jwt, cors


def create_app(config_name: str = None) -> Flask:
    """
    Flask application factory.

    Args:
        config_name: One of 'development', 'testing', 'production'.
                     Defaults to FLASK_ENV environment variable or 'development'.

    Returns:
        Configured Flask application instance.
    """
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'development')

    app = Flask(__name__, instance_relative_config=False)

    # ── Configuration ──────────────────────────────────────────
    cfg = config_map.get(config_name, config_map['development'])
    app.config.from_object(cfg)

    # ── Logging ────────────────────────────────────────────────
    _configure_logging(app)

    # ── Extensions ─────────────────────────────────────────────
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    with app.app_context():
        from app.models.user import User  # noqa: F401
        from app.models.detection import Detection  # noqa: F401
        from app.models.evidence import Evidence  # noqa: F401
        from app.models.report import Report  # noqa: F401
        from app.models.cybercrime_report import CybercrimeReport  # noqa: F401
        db.create_all()

    # CORS — allow the configured frontend origin(s)
    allowed_origins = [
        app.config.get('FRONTEND_URL', 'http://localhost:3000'),
        'http://localhost:3000',
        'http://localhost:5173',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5173',
    ]
    # Deduplicate
    allowed_origins = list(dict.fromkeys(allowed_origins))

    cors.init_app(
        app,
        resources={r'/api/*': {'origins': allowed_origins}},
        supports_credentials=True,
        allow_headers=['Content-Type', 'Authorization'],
        methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    )

    # ── Storage directories ────────────────────────────────────
    _ensure_storage_dirs(app)

    # ── Blueprints ─────────────────────────────────────────────
    _register_blueprints(app)

    # ── Error handlers ─────────────────────────────────────────
    _register_error_handlers(app)

    # ── JWT error handlers ─────────────────────────────────────
    _register_jwt_handlers(app)

    app.logger.info(
        f"FAKENIX 2.0 started | env={config_name} | demo={app.config.get('DEMO_MODE')}"
    )

    return app


# ──────────────────────────────────────────────────────────────
# Internal helpers
# ──────────────────────────────────────────────────────────────

def _configure_logging(app: Flask) -> None:
    log_level = getattr(logging, app.config.get('LOG_LEVEL', 'INFO').upper(), logging.INFO)
    logging.basicConfig(
        level=log_level,
        format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S',
    )
    app.logger.setLevel(log_level)
    # Third-party clients log full request bodies (including base64 media) at DEBUG.
    for noisy in ('groq', 'httpx', 'httpcore', 'PIL'):
        logging.getLogger(noisy).setLevel(logging.WARNING)


def _ensure_storage_dirs(app: Flask) -> None:
    dirs = [
        app.config.get('UPLOAD_FOLDER'),
        app.config.get('REPORT_FOLDER'),
        app.config.get('PROCESSED_FOLDER'),
        app.config.get('EVIDENCE_FOLDER'),
    ]
    for d in dirs:
        if d:
            os.makedirs(d, exist_ok=True)


def _register_blueprints(app: Flask) -> None:
    from app.routes.auth_routes import auth_bp
    from app.routes.detection_routes import detection_bp
    from app.routes.evidence_routes import evidence_bp
    from app.routes.report_routes import report_bp
    from app.routes.cybercrime_routes import cybercrime_bp
    from app.routes.user_routes import user_bp
    from app.routes.dashboard_routes import dashboard_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(detection_bp, url_prefix='/api')
    app.register_blueprint(evidence_bp, url_prefix='/api')
    app.register_blueprint(report_bp, url_prefix='/api')
    app.register_blueprint(cybercrime_bp, url_prefix='/api')
    app.register_blueprint(user_bp, url_prefix='/api/user')
    app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')

    # Root route GET /
    @app.route('/', methods=['GET'])
    def root():
        return jsonify({
            'success': True,
            'service': 'FAKENIX 2.0 Backend API',
            'status': 'running',
            'version': '2.0.0',
            'health_check': '/api/health',
            'demo_mode': app.config.get('DEMO_MODE', True),
        }), 200

    # Base API route GET /api or GET /api/
    @app.route('/api', methods=['GET'])
    @app.route('/api/', methods=['GET'])
    def api_root():
        return jsonify({
            'success': True,
            'service': 'FAKENIX 2.0 API',
            'status': 'active',
            'version': '2.0.0',
            'health_check': '/api/health',
            'endpoints': {
                'health': '/api/health',
                'auth': '/api/auth',
                'detect_image': '/api/detect/image',
                'detect_video': '/api/detect/video',
                'detect_url': '/api/detect/url',
                'detections': '/api/detections',
                'detection_trend': '/api/dashboard/detection-trend',
                'evidence': '/api/evidence',
                'reports': '/api/reports',
                'cybercrime': '/api/cybercrime',
                'user': '/api/user',
            }
        }), 200

    # Health check (no auth required)
    @app.route('/api/health', methods=['GET'])
    def health():
        return jsonify({
            'success': True,
            'service': 'FAKENIX Backend',
            'status': 'healthy',
            'version': '2.0.0',
            'demo_mode': app.config.get('DEMO_MODE', True),
        }), 200


def _register_error_handlers(app: Flask) -> None:
    from app.utils.response import error_response

    @app.errorhandler(400)
    def bad_request(e):
        return error_response(str(e), 400)

    @app.errorhandler(401)
    def unauthorized(e):
        return error_response('Unauthorized', 401)

    @app.errorhandler(403)
    def forbidden(e):
        return error_response('Forbidden', 403)

    @app.errorhandler(404)
    def not_found(e):
        return error_response('Resource not found', 404)

    @app.errorhandler(413)
    def payload_too_large(e):
        return error_response('File too large. Maximum allowed size is 100 MB.', 413)

    @app.errorhandler(500)
    def internal_error(e):
        app.logger.error(f'Internal Server Error: {e}')
        return error_response('An internal server error occurred.', 500)

    @app.errorhandler(Exception)
    def unhandled_exception(e):
        # HTTP errors without their own handler (405, 415, ...) keep their status.
        from werkzeug.exceptions import HTTPException
        if isinstance(e, HTTPException):
            return error_response(e.description or e.name, e.code or 500)
        app.logger.exception(f'Unhandled exception: {e}')
        return error_response('An unexpected error occurred.', 500)


def _register_jwt_handlers(app: Flask) -> None:
    from app.utils.response import error_response

    @jwt.expired_token_loader
    def expired_token(jwt_header, jwt_payload):
        return error_response('Token has expired. Please login again.', 401)

    @jwt.invalid_token_loader
    def invalid_token(reason):
        return error_response(f'Invalid token: {reason}', 401)

    @jwt.unauthorized_loader
    def missing_token(reason):
        return error_response('Authentication token required.', 401)
