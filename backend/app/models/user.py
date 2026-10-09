"""
FAKENIX 2.0 — User Model
"""
from datetime import datetime, timezone
from werkzeug.security import generate_password_hash, check_password_hash
from app.extensions import db


class User(db.Model):
    __tablename__ = 'users'
    __table_args__ = {'extend_existing': True}

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    full_name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(254), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(50), nullable=False, default='Analyst')
    organization = db.Column(db.String(120), nullable=True, default='FAKENIX Labs')
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    # Relationships
    detections = db.relationship('Detection', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    reports = db.relationship('Report', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    cybercrime_reports = db.relationship('CybercrimeReport', backref='user', lazy='dynamic', cascade='all, delete-orphan')

    def set_password(self, password: str) -> None:
        """Hash and store the password. Never stores plaintext."""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        """Verify a password against the stored hash."""
        return check_password_hash(self.password_hash, password)

    def to_dict(self) -> dict:
        """Serialize to a safe dictionary (no password hash)."""
        return {
            'id': self.id,
            'name': self.full_name,
            'full_name': self.full_name,
            'email': self.email,
            'role': self.role,
            'organization': self.organization,
            'avatar': None,
            'joinDate': self.created_at.isoformat() if self.created_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self) -> str:
        return f'<User id={self.id} email={self.email}>'
