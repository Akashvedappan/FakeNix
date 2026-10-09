"""
FAKENIX 2.0 — Input Validators
"""
import re
import ipaddress
from urllib.parse import urlparse


EMAIL_RE = re.compile(r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$')
PASSWORD_MIN_LENGTH = 6


def validate_email(email: str) -> bool:
    """Return True if email is a valid format."""
    if not email or not isinstance(email, str):
        return False
    return bool(EMAIL_RE.match(email.strip()))


def validate_password(password: str) -> tuple[bool, str]:
    """
    Validate password strength.
    Returns (is_valid, error_message).
    """
    if not password:
        return False, 'Password is required.'
    if len(password) < PASSWORD_MIN_LENGTH:
        return False, f'Password must be at least {PASSWORD_MIN_LENGTH} characters.'
    return True, ''


def validate_required_fields(data: dict, fields: list[str]) -> tuple[bool, dict]:
    """
    Check that all required fields are present and non-empty.
    Returns (all_present, errors_dict).
    """
    errors = {}
    for field in fields:
        value = data.get(field)
        if value is None or (isinstance(value, str) and not value.strip()):
            errors[field] = f'{field} is required.'
    return len(errors) == 0, errors


def validate_url(url: str) -> tuple[bool, str]:
    """
    Validate a URL for safe fetching.
    Protects against SSRF, localhost access, unsupported schemes.
    Returns (is_valid, error_message).
    """
    if not url or not isinstance(url, str):
        return False, 'URL is required.'

    url = url.strip()

    try:
        parsed = urlparse(url)
    except Exception:
        return False, 'Invalid URL format.'

    # Only allow http and https
    if parsed.scheme not in ('http', 'https'):
        return False, 'Only http and https URLs are supported.'

    hostname = parsed.hostname
    if not hostname:
        return False, 'URL must include a valid hostname.'

    # Block localhost and loopback
    loopback_patterns = [
        'localhost', '127.0.0.1', '::1', '0.0.0.0',
        '169.254.169.254',  # AWS metadata
        'metadata.google.internal',
    ]
    if hostname.lower() in loopback_patterns:
        return False, 'Access to local/internal addresses is not permitted.'

    # Block private IP ranges
    try:
        ip = ipaddress.ip_address(hostname)
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
            return False, 'Access to private/reserved IP addresses is not permitted.'
    except ValueError:
        # hostname is a domain name, not an IP — that's fine
        pass

    return True, ''
