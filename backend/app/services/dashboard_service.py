"""
FAKENIX 2.0 — Dashboard Service
Aggregates detection metrics over dynamic calendar date ranges with database-backed grouping.
"""
from datetime import datetime, date, time, timedelta, timezone
from sqlalchemy import func

from app.extensions import db
from app.models.detection import Detection
from app.utils.logger import get_logger

logger = get_logger('dashboard_service')


def normalize_detection_result(result_str: str | None) -> str:
    """
    Normalize detection result string to one of standard categories:
    'real', 'deepfake', 'suspicious'.
    Handles case-insensitivity and known aliases.
    """
    if not result_str:
        return 'suspicious'

    r = str(result_str).strip().lower()
    if r in ('real', 'genuine', 'authentic', 'original'):
        return 'real'
    elif r in ('deepfake', 'fake', 'manipulated', 'synthetic'):
        return 'deepfake'
    elif r in ('suspicious', 'uncertain', 'flagged', 'anomaly'):
        return 'suspicious'
    return 'suspicious'


def get_detection_trend(
    user_id: int | None = None,
    days: int = 11,
    reference_date: date | None = None,
    tz_name: str = 'UTC'
) -> dict:
    """
    Calculate detection counts grouped by calendar date for the last `days` consecutive days.
    
    Args:
        user_id: ID of the user for data isolation. If None, queries all records.
        days: Number of calendar days to include up to today (1 to 90, default 11).
        reference_date: End date for the trend (defaults to today in UTC/configured date).
        tz_name: Timezone identifier string for reference.
    
    Returns:
        Dict with range information and trend list of exactly `days` items with zero-filled counts.
    """
    # Clamp days between 1 and 90
    days = max(1, min(90, int(days)))

    # Determine end and start dates
    if reference_date is None:
        end_date = datetime.now(timezone.utc).date()
    elif isinstance(reference_date, datetime):
        end_date = reference_date.date()
    else:
        end_date = reference_date

    start_date = end_date - timedelta(days=days - 1)

    # Generate all consecutive calendar dates in the window [start_date, end_date]
    consecutive_dates = [start_date + timedelta(days=i) for i in range(days)]

    # Initialize trend dictionary with zero counts for all calendar days
    trend_dict = {
        d.strftime('%Y-%m-%d'): {
            'date': d.strftime('%Y-%m-%d'),
            'real': 0,
            'deepfake': 0,
            'suspicious': 0,
            'total': 0
        }
        for d in consecutive_dates
    }

    # Build start and end datetime boundaries in UTC
    start_dt = datetime.combine(start_date, time.min).replace(tzinfo=timezone.utc)
    end_dt = datetime.combine(end_date, time.max).replace(tzinfo=timezone.utc)

    try:
        # Portable SQL date extraction: func.date() works in both MySQL and SQLite
        date_col = func.date(Detection.created_at)

        query = (
            db.session.query(
                date_col.label('det_date'),
                Detection.result,
                func.count(Detection.id).label('cnt')
            )
            .filter(
                Detection.created_at >= start_dt,
                Detection.created_at <= end_dt
            )
        )

        if user_id is not None:
            query = query.filter(Detection.user_id == user_id)

        query = query.group_by(date_col, Detection.result)
        rows = query.all()

        for row in rows:
            raw_date = row.det_date
            if raw_date is None:
                continue

            if hasattr(raw_date, 'strftime'):
                d_str = raw_date.strftime('%Y-%m-%d')
            else:
                d_str = str(raw_date)[:10]

            if d_str in trend_dict:
                category = normalize_detection_result(row.result)
                count = int(row.cnt or 0)
                trend_dict[d_str][category] += count
                trend_dict[d_str]['total'] += count

    except Exception as e:
        logger.exception(f'Error aggregating detection trend from database: {e}')
        # In case of DB query exception, fallback to iterating over in-range detection records safely
        try:
            db_query = db.session.query(Detection).filter(
                Detection.created_at >= start_dt,
                Detection.created_at <= end_dt
            )
            if user_id is not None:
                db_query = db_query.filter(Detection.user_id == user_id)

            detections = db_query.all()
            for d in detections:
                if d.created_at:
                    d_str = d.created_at.strftime('%Y-%m-%d')
                    if d_str in trend_dict:
                        category = normalize_detection_result(d.result)
                        trend_dict[d_str][category] += 1
                        trend_dict[d_str]['total'] += 1
        except Exception as inner_e:
            logger.error(f'Fallback aggregation also encountered error: {inner_e}')

    # Produce ordered trend list matching the chronological sequence
    trend_list = [trend_dict[d.strftime('%Y-%m-%d')] for d in consecutive_dates]

    return {
        'range': {
            'start': start_date.strftime('%Y-%m-%d'),
            'end': end_date.strftime('%Y-%m-%d'),
            'days': days,
        },
        'trend': trend_list,
        'timezone': tz_name,
    }
