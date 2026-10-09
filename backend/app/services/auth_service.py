"""
FAKENIX 2.0 — Authentication Service
"""
from app.extensions import db
from app.models.user import User
from app.utils.logger import get_logger
from app.utils.validators import validate_email, validate_password

logger = get_logger('auth_service')


def register_user(full_name: str, email: str, password: str) -> tuple[User, str]:
    """
    Register a new user.

    Returns:
        (user, error_message) — error_message is empty string on success.
    """
    # Validate inputs
    email = email.strip().lower()
    full_name = full_name.strip()

    if not full_name:
        return None, 'Full name is required.'

    if not validate_email(email):
        return None, 'Please provide a valid email address.'

    valid_pw, pw_error = validate_password(password)
    if not valid_pw:
        return None, pw_error

    # Check for duplicate email
    existing = db.session.query(User).filter(
        db.func.lower(User.email) == email
    ).first()
    if existing:
        return None, 'An account with this email already exists.'

    # Create user
    user = User(
        full_name=full_name,
        email=email,
        role='Analyst',
    )
    user.set_password(password)

    try:
        db.session.add(user)
        db.session.commit()
        logger.info(f'New user registered: id={user.id} email={email}')
        return user, ''
    except Exception as e:
        db.session.rollback()
        logger.error(f'Registration DB error: {e}')
        return None, 'Registration failed due to a database error. Please try again.'


def authenticate_user(email: str, password: str) -> tuple[User | None, str]:
    """
    Authenticate a user by email and password.

    Returns:
        (user, error_message) — user is None on failure.
    """
    email = email.strip().lower()

    if not email or not password:
        return None, 'Email and password are required.'

    user = db.session.query(User).filter(
        db.func.lower(User.email) == email
    ).first()

    if not user:
        # Use generic message to prevent email enumeration
        return None, 'Invalid email or password.'

    if not user.is_active:
        return None, 'Your account has been deactivated. Please contact support.'

    if not user.check_password(password):
        return None, 'Invalid email or password.'

    logger.info(f'User authenticated: id={user.id}')
    return user, ''


def get_user_by_id(user_id: int) -> User | None:
    """Fetch a user by primary key."""
    return db.session.get(User, user_id)


def update_user_profile(user_id: int, data: dict) -> tuple[User | None, str]:
    """Update user profile fields."""
    user = get_user_by_id(user_id)
    if not user:
        return None, 'User not found.'

    if 'name' in data and data['name']:
        user.full_name = data['name'].strip()
    if 'organization' in data:
        user.organization = data['organization']

    try:
        db.session.commit()
        return user, ''
    except Exception as e:
        db.session.rollback()
        logger.error(f'Profile update error: {e}')
        return None, 'Failed to update profile.'
