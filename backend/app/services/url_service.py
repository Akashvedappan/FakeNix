"""
FAKENIX 2.0 — Secure URL & Media Processing Service
Provides SSRF protection, DNS rebinding prevention, safe redirect checks,
media type classification, and safe streaming media downloads.
"""
import os
import re
import socket
import uuid
import ipaddress
import mimetypes
from urllib.parse import urlparse, urljoin
import requests
from flask import current_app
from werkzeug.utils import secure_filename
from app.utils.logger import get_logger

logger = get_logger('url_service')

DEFAULT_TIMEOUT = 10
MAX_REDIRECTS = 3
DEFAULT_MAX_BYTES = 50 * 1024 * 1024  # 50 MB
USER_AGENT = 'FAKENIX-MediaScanner/2.0 (Forensic Analysis Platform)'

# Blocked hostnames & cloud metadata services
BLOCKED_HOSTNAMES = {
    'localhost',
    '127.0.0.1',
    '::1',
    '0.0.0.0',
    '169.254.169.254',       # AWS / GCP / Azure metadata
    'metadata.google.internal',
    'instance-data',
}

SUPPORTED_IMAGE_MIMES = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
}

SUPPORTED_VIDEO_MIMES = {
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
    'video/x-msvideo': 'avi',
    'video/x-matroska': 'mkv',
    'video/webm': 'webm',
}

WEBPAGE_MIMES = {
    'text/html',
    'application/xhtml+xml',
    'text/xml',
}


def is_ip_private_or_restricted(ip_str: str) -> bool:
    """Check if an IP address string is private, loopback, or reserved."""
    try:
        ip = ipaddress.ip_address(ip_str)
        return (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_reserved
            or ip.is_multicast
            or ip.is_unspecified
        )
    except ValueError:
        return True


def validate_safe_url(url: str) -> tuple[bool, str]:
    """
    Validate a URL for security before fetching.
    Guards against SSRF, loopback, private networks, and cloud metadata.
    Returns (is_valid, error_message).
    """
    if not url or not isinstance(url, str):
        return False, 'URL is required.'

    url = url.strip()

    try:
        parsed = urlparse(url)
    except Exception:
        return False, 'Invalid URL format.'

    if parsed.scheme not in ('http', 'https'):
        return False, f'Unsupported URL protocol "{parsed.scheme}". Only HTTP and HTTPS are permitted.'

    hostname = parsed.hostname
    if not hostname:
        return False, 'URL must include a valid hostname.'

    hostname_lower = hostname.lower()

    if hostname_lower in BLOCKED_HOSTNAMES or hostname_lower.endswith('.local') or hostname_lower.endswith('.internal'):
        return False, 'Access to local or private network addresses is not permitted.'

    # Check if direct IP
    try:
        if is_ip_private_or_restricted(hostname):
            return False, 'Access to private, loopback, or reserved IP addresses is not permitted.'
    except Exception:
        pass

    # Resolve domain to IP addresses and verify none are private/loopback (anti-SSRF / DNS rebinding)
    try:
        addr_info = socket.getaddrinfo(hostname, parsed.port or (443 if parsed.scheme == 'https' else 80))
        resolved_ips = set()
        for item in addr_info:
            sockaddr = item[4]
            resolved_ips.add(sockaddr[0])

        if not resolved_ips:
            return False, f'Could not resolve hostname "{hostname}".'

        for ip_str in resolved_ips:
            if is_ip_private_or_restricted(ip_str):
                return False, 'Domain resolves to a private or restricted IP address.'
    except socket.gaierror:
        return False, f'Could not resolve host "{hostname}".'
    except Exception as e:
        logger.warning(f'DNS resolution check failed for {hostname}: {e}')
        return False, 'Failed to verify URL destination.'

    return True, ''


def inspect_and_classify_url(url: str) -> tuple[bool, dict, str]:
    """
    Safely inspects a URL via HTTP HEAD / streaming GET.
    Classifies whether the resource is an image, video, webpage, or unsupported.

    Returns:
        (success, info_dict, error_message)
    """
    valid, err = validate_safe_url(url)
    if not valid:
        return False, {}, err

    headers = {'User-Agent': USER_AGENT}
    session = requests.Session()
    session.max_redirects = MAX_REDIRECTS

    current_url = url
    resp = None

    try:
        # Perform request with stream=True so we only fetch headers initially
        # Try HEAD first; some servers reject HEAD with 405/403, so fallback to GET
        try:
            resp = session.head(current_url, headers=headers, timeout=DEFAULT_TIMEOUT, allow_redirects=True)
            if resp.status_code in (403, 405, 501):
                resp = session.get(current_url, headers=headers, timeout=DEFAULT_TIMEOUT, stream=True, allow_redirects=True)
        except (requests.exceptions.Timeout, requests.exceptions.TooManyRedirects):
            raise
        except requests.exceptions.RequestException:
            resp = session.get(current_url, headers=headers, timeout=DEFAULT_TIMEOUT, stream=True, allow_redirects=True)

        if resp.status_code >= 400:
            return False, {}, f'Remote server returned error {resp.status_code}: {resp.reason}'

        # Check final URL in case of redirects to verify SSRF
        final_url = resp.url
        valid_final, err_final = validate_safe_url(final_url)
        if not valid_final:
            return False, {}, f'Redirect target rejected: {err_final}'

        content_type_header = resp.headers.get('Content-Type', '').split(';')[0].strip().lower()
        content_length_header = resp.headers.get('Content-Length')

        content_length = None
        if content_length_header and content_length_header.isdigit():
            content_length = int(content_length_header)

        # Check path extension as a hint
        path_name = urlparse(final_url).path
        ext = path_name.rsplit('.', 1)[-1].lower() if '.' in path_name else ''

        # Classification
        media_category = 'unsupported'
        detected_mime = content_type_header or 'application/octet-stream'

        if detected_mime in SUPPORTED_IMAGE_MIMES or (detected_mime.startswith('image/') and ext in {'jpg', 'jpeg', 'png', 'webp'}):
            media_category = 'image'
        elif detected_mime in SUPPORTED_VIDEO_MIMES or (detected_mime.startswith('video/') and ext in {'mp4', 'mov', 'avi', 'mkv'}):
            media_category = 'video'
        elif detected_mime in WEBPAGE_MIMES or detected_mime.startswith('text/'):
            media_category = 'webpage'

        # Infer filename
        cd = resp.headers.get('Content-Disposition', '')
        filename = None
        if 'filename=' in cd:
            match = re.search(r'filename=["\']?([^"\';]+)["\']?', cd)
            if match:
                filename = match.group(1).strip()

        if not filename and path_name and '/' in path_name:
            candidate = path_name.rsplit('/', 1)[-1].strip()
            if candidate and '.' in candidate:
                filename = candidate

        if not filename:
            if media_category == 'image':
                ext_suffix = SUPPORTED_IMAGE_MIMES.get(detected_mime, 'jpg')
                filename = f'remote_image.{ext_suffix}'
            elif media_category == 'video':
                ext_suffix = SUPPORTED_VIDEO_MIMES.get(detected_mime, 'mp4')
                filename = f'remote_video.{ext_suffix}'
            else:
                filename = 'webpage.html'

        filename = secure_filename(filename) or 'media_file'

        info = {
            'url': final_url,
            'original_url': url,
            'status_code': resp.status_code,
            'content_type': detected_mime,
            'content_length': content_length,
            'media_category': media_category,
            'filename': filename,
        }
        return True, info, ''

    except requests.exceptions.Timeout:
        return False, {}, 'Connection to the provided URL timed out.'
    except requests.exceptions.TooManyRedirects:
        return False, {}, 'Too many redirects encountered while fetching URL.'
    except requests.exceptions.RequestException as e:
        logger.warning(f'Error fetching URL {url}: {e}')
        return False, {}, f'Failed to connect to the provided URL: {str(e)}'
    finally:
        if resp:
            try:
                resp.close()
            except Exception:
                pass


def download_media_from_url(
    url: str,
    max_size_bytes: int = DEFAULT_MAX_BYTES,
    timeout: int = DEFAULT_TIMEOUT
) -> tuple[bool, str, str, str, str]:
    """
    Safely downloads media from a validated URL.
    Enforces size limits and verifies magic bytes.

    Returns:
        (success, file_path, filename, media_category, error_message)
    """
    valid, info, err = inspect_and_classify_url(url)
    if not valid:
        return False, '', '', '', err

    if info['media_category'] not in ('image', 'video'):
        return False, '', '', info['media_category'], f'URL is a {info["media_category"]} ({info["content_type"]}), not a supported direct media file.'

    if info['content_length'] and info['content_length'] > max_size_bytes:
        return False, '', '', info['media_category'], f'Media file size ({info["content_length"] / (1024*1024):.1f} MB) exceeds maximum allowed limit ({max_size_bytes / (1024*1024):.1f} MB).'

    upload_folder = current_app.config.get('UPLOAD_FOLDER', 'storage/uploads')
    os.makedirs(upload_folder, exist_ok=True)

    file_ext = info['filename'].rsplit('.', 1)[-1].lower() if '.' in info['filename'] else 'bin'
    storage_name = f'{uuid.uuid4().hex}.{file_ext}'
    local_path = os.path.join(upload_folder, storage_name)

    headers = {'User-Agent': USER_AGENT}
    downloaded_bytes = 0

    try:
        with requests.get(url, headers=headers, stream=True, timeout=timeout) as r:
            r.raise_for_status()
            with open(local_path, 'wb') as f:
                for chunk in r.iter_content(chunk_size=65536):
                    if chunk:
                        downloaded_bytes += len(chunk)
                        if downloaded_bytes > max_size_bytes:
                            f.close()
                            if os.path.exists(local_path):
                                os.remove(local_path)
                            return False, '', '', info['media_category'], 'Media file exceeded maximum permitted size during download.'
                        f.write(chunk)

        # Validate magic bytes of the downloaded file
        with open(local_path, 'rb') as f:
            header = f.read(512)

        actual_category, actual_mime = _verify_magic_bytes(header)
        if actual_category == 'unknown' or actual_category != info['media_category']:
            if os.path.exists(local_path):
                os.remove(local_path)
            return False, '', '', 'unsupported', f'Downloaded file content does not match a valid {info["media_category"]} format.'

        logger.info(f'Successfully downloaded media from URL: {url} -> {storage_name} ({downloaded_bytes} bytes)')
        return True, local_path, info['filename'], actual_category, ''

    except Exception as e:
        if os.path.exists(local_path):
            os.remove(local_path)
        logger.exception(f'Failed to download media from URL {url}: {e}')
        return False, '', '', '', f'Failed to download media: {str(e)}'


def _verify_magic_bytes(header: bytes) -> tuple[str, str]:
    """
    Inspect magic bytes to confirm media format.
    Returns (category, mime_type) where category is 'image', 'video', or 'unknown'.
    """
    if not header or len(header) < 4:
        return 'unknown', 'application/octet-stream'

    # JPEG
    if header[:3] == b'\xff\xd8\xff':
        return 'image', 'image/jpeg'

    # PNG
    if header[:8] == b'\x89PNG\r\n\x1a\n':
        return 'image', 'image/png'

    # WebP (RIFF....WEBP)
    if header[:4] == b'RIFF' and len(header) >= 12 and header[8:12] == b'WEBP':
        return 'image', 'image/webp'

    # MP4 / MOV (ftyp box)
    if len(header) >= 12 and header[4:8] == b'ftyp':
        return 'video', 'video/mp4'

    # AVI (RIFF....AVI )
    if header[:4] == b'RIFF' and len(header) >= 12 and header[8:12] == b'AVI ':
        return 'video', 'video/x-msvideo'

    # Matroska / WebM
    if header[:4] == b'\x1a\x45\xdf\xa3':
        return 'video', 'video/x-matroska'

    return 'unknown', 'application/octet-stream'
