import logging
import sys

def get_logger(name: str = __name__, level: int = logging.DEBUG) -> logging.Logger:
    """Returns a configured logger instance."""
    logger = logging.getLogger(name)

    if not logger.hasHandlers():
        handler = logging.StreamHandler(sys.stderr)
        formatter = logging.Formatter(
            '%(asctime)s - %(levelname)s - %(message)s'
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        logger.setLevel(level)

    return logger

