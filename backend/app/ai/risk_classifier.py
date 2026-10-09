"""
FAKENIX 2.0 — Risk Classification Module

Maps model confidence (deepfake probability 0–100%) to risk categories.
These thresholds are configurable and should be tuned with the actual model.

IMPORTANT: Confidence scores are probabilistic outputs and do NOT constitute
definitive proof that media is authentic or manipulated. Human review is
always recommended for consequential decisions.
"""
from flask import current_app


def classify_risk(confidence: float) -> str:
    """
    Map a deepfake confidence percentage to a risk level.

    Args:
        confidence: Deepfake probability as a percentage (0.0 – 100.0).

    Returns:
        Risk level string: 'low', 'medium', or 'high'.
        Returns 'critical' for confidence >= 95%.
    """
    if confidence is None:
        return 'unknown'

    # Try to use configured thresholds
    try:
        thresholds = current_app.config.get('RISK_THRESHOLDS', {})
    except RuntimeError:
        # Outside app context — use defaults
        thresholds = {}

    # Critical tier (not in base config — added here)
    if confidence >= 95.0:
        return 'critical'

    low_range = thresholds.get('low', (0.0, 30.0))
    suspicious_range = thresholds.get('suspicious', (30.0, 70.0))

    if confidence < low_range[1]:
        return 'low'
    elif confidence < suspicious_range[1]:
        return 'medium'
    else:
        return 'high'


def get_result_from_risk(risk_level: str) -> str:
    """Map risk level to detection result label."""
    mapping = {
        'low': 'real',
        'medium': 'suspicious',
        'high': 'deepfake',
        'critical': 'deepfake',
    }
    return mapping.get(risk_level, 'suspicious')
