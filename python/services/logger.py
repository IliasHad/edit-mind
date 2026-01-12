import logging
import os
import sys


def get_logger(name: str = __name__, level: int = None) -> logging.Logger:
    """Returns a configured logger instance."""
    logger = logging.getLogger(name)

    if not logger.hasHandlers():
        if level is None:
            level = os.getenv('LOG_LEVEL', 'INFO').upper()
            level = getattr(logging, level, logging.INFO)

        handler = logging.StreamHandler(sys.stderr)
        formatter = logging.Formatter(
            '%(asctime)s - %(levelname)s - %(message)s'
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        logger.setLevel(level)

    return logger
