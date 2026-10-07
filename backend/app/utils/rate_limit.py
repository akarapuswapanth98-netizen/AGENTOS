"""In-memory per-user AI usage guard (calls per rolling hour)."""
import math
import time

from app import config

WINDOW_S = 3600

# user_id -> list of call timestamps (epoch seconds). In-memory on purpose:
# simple, explainable, and resets on restart.
_calls: dict[int, list[float]] = {}


class QuotaExceeded(Exception):
    """Raised when a user exceeds their hourly LLM quota."""

    def __init__(self, reset_minutes: int, limit: int):
        self.reset_minutes = reset_minutes
        self.limit = limit
        super().__init__(
            f"AI usage limit reached ({limit} calls/hour). Try again in ~{reset_minutes} minutes."
        )


def check_quota(user_id: int) -> None:
    """Record one LLM call for the user, or raise QuotaExceeded. Never logs keys."""
    limit = config.LLM_CALLS_PER_HOUR
    now = time.time()
    recent = [t for t in _calls.get(user_id, []) if now - t < WINDOW_S]
    if len(recent) >= limit:
        oldest = min(recent)
        reset_minutes = max(1, math.ceil((oldest + WINDOW_S - now) / 60))
        raise QuotaExceeded(reset_minutes, limit)
    recent.append(now)
    _calls[user_id] = recent


def reset_quotas() -> None:
    """Clear all counters (used in tests)."""
    _calls.clear()
