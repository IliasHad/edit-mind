"""Throttled progress reporter — avoids flooding the DB with duplicate updates."""
import time
from typing import Callable, Optional


class ThrottledProgress:
    """
    Wraps a progress callback and suppresses calls where:
    - the integer percentage hasn't changed, AND
    - less than `min_interval_s` seconds have elapsed since the last call.

    This keeps UI updates feeling live (≥1 update/second) without hammering
    Postgres with hundreds of identical writes per job.
    """

    def __init__(self, callback: Callable, min_interval_s: float = 1.0):
        self._callback = callback
        self._min_interval = min_interval_s
        self._last_percent: Optional[int] = None
        self._last_sent_at: float = 0.0

    def update(self, percent: float, *args) -> None:
        now = time.monotonic()
        rounded = int(percent)
        elapsed = now - self._last_sent_at

        percent_changed = rounded != self._last_percent
        interval_elapsed = elapsed >= self._min_interval

        if not (percent_changed or interval_elapsed):
            return

        self._last_percent = rounded
        self._last_sent_at = now
        self._callback(percent, *args)

    def force(self, percent: float, *args) -> None:
        """Always send — use for the final 100% update."""
        self._last_percent = int(percent)
        self._last_sent_at = time.monotonic()
        self._callback(percent, *args)
