"""Streak math. Pure functions only: UTC dates in, ints out, no clock reads."""
from datetime import date, timedelta


def current_streak(days: set[date], today: date) -> int:
    """Consecutive active days ending today (or yesterday if today is quiet)."""
    cursor = today if today in days else today - timedelta(days=1)
    streak = 0
    while cursor in days:
        streak += 1
        cursor -= timedelta(days=1)
    return streak


def longest_streak(days: set[date]) -> int:
    """Longest run of consecutive active days, anywhere in the set."""
    best = 0
    for day in days:
        if day - timedelta(days=1) not in days:  # run starts here
            length = 1
            while day + timedelta(days=length) in days:
                length += 1
            best = max(best, length)
    return best
