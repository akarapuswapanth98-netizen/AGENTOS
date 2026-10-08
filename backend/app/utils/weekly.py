"""Weekly summary math. Pure functions only: UTC dates in, values out."""
from datetime import date, timedelta


def week_range(today: date, week_offset: int = 0) -> tuple[date, date]:
    """7-day window ending today (inclusive); offset 1 = previous 7 days."""
    end = today - timedelta(days=7 * week_offset)
    return end - timedelta(days=6), end


def average_score(scores: list[float]) -> float | None:
    """Mean score, None when there are no scores (never divides by zero)."""
    return round(sum(scores) / len(scores), 1) if scores else None


def weakest_skill(pairs: list[tuple[str, float]]) -> str | None:
    """Skill with the lowest average score; ties break alphabetically."""
    if not pairs:
        return None
    totals: dict[str, list[float]] = {}
    for skill, score in pairs:
        totals.setdefault(skill, []).append(score)
    avgs = {skill: sum(values) / len(values) for skill, values in totals.items()}
    return sorted(avgs, key=lambda s: (avgs[s], s))[0]


def summarize_week(tasks_completed: int, scores_by_skill: dict[str, list[float]],
                   reviews_done: int, active_days: int) -> dict:
    """Assemble one week's summary numbers from plain inputs."""
    pairs = [(skill, score) for skill, values in scores_by_skill.items() for score in values]
    flat = [score for _, values in scores_by_skill.items() for score in values]
    return {
        "tasks_completed": tasks_completed,
        "average_score": average_score(flat),
        "weakest_skill": weakest_skill(pairs),
        "reviews_done": reviews_done,
        "active_days": active_days,
    }
