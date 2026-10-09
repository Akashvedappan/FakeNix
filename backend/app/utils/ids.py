"""
FAKENIX 2.0 — Sequential identifier helpers
"""
import re

from app.extensions import db


def next_sequential_id(column, prefix: str, width: int) -> str:
    """
    Return the next ID of the form f'{prefix}{number:0{width}d}' for `column`.

    Uses the highest number already in use (not the row count), so IDs stay unique
    after records are deleted and never collide with seeded IDs.
    """
    pattern = re.compile(rf'^{re.escape(prefix)}(\d+)$')
    highest = 0
    for (value,) in db.session.query(column).filter(column.like(f'{prefix}%')):
        match = pattern.match(value or '')
        if match:
            highest = max(highest, int(match.group(1)))
    return f'{prefix}{highest + 1:0{width}d}'
