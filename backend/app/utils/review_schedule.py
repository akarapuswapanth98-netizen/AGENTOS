"""Spaced-repetition schedule. Pure functions only: no DB access, UTC dates.

Stages 0..3 wait INTERVALS days. A score >= 70 climbs one stage (the last
stage repeats every 14 days); below 70 falls back to stage 0. `today` is a
parameter so tests never depend on the real clock.
"""
from datetime import date, timedelta

INTERVALS = [1, 3, 7, 14]
PASS_SCORE = 70
LAST_STAGE = len(INTERVALS) - 1


def next_state(stage: int, score: int, today: date) -> tuple[int, date]:
    """Return (new_stage, new_due_date) after scoring a review."""
    if score >= PASS_SCORE:
        new_stage = min(stage + 1, LAST_STAGE)
    else:
        new_stage = 0
    return new_stage, today + timedelta(days=INTERVALS[new_stage])
