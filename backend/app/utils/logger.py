"""
FAKENIX 2.0 — Application Logger
"""
import logging
import os


def get_logger(name: str) -> logging.Logger:
    """Get a named logger for a module."""
    logger = logging.getLogger(f'fakenix.{name}')
    return logger
