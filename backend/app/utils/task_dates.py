"""Task due-date logic. Pure functions only: UTC dates in, values out.

A task is overdue only when it has a due date strictly before today and is
not complete. Due-today is never overdue. NULL dates are never overdue.
"""
from datetime import date, datetime, timedelta


def _as_date(value: date | datetime | None) -> date | None:
    """Normalize a Date, datetime, or None to a plain date (or None)."""
    if value is None:
        return None
    return value.date() if isinstance(value, datetime) else value


def is_overdue(due_date: date | datetime | None, status: str, today: date) -> bool:
    """True only for incomplete tasks due strictly before today."""
    day = _as_date(due_date)
    return day is not None and day < today and status != "completed"


def days_overdue(due_date: date | datetime | None, today: date) -> int:
    """Whole days past due; 0 when not overdue (never negative)."""
    day = _as_date(due_date)
    if day is None or day >= today:
        return 0
    return (today - day).days


def default_due_date(week_number: int, start_date: date | datetime) -> date:
    """Plan-generation rule: week N lands 7*N days after the start (week 1 = +7)."""
    start = _as_date(start_date) or date.today()
    return start + timedelta(days=7 * max(1, week_number))
