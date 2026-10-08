"""Personal progress: streaks plus earned and locked badges."""
import io
import logging
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import ActivityDay, Goal, ReviewItem, Submission, Task, User, UserBadge
from app.schemas import EarnedBadge, LockedBadge, MeProgressResponse, OverdueResponse, WeeklySummaryResponse, to_task_response
from app.utils.pdf_text import esc
from app.agents.validator import _mock_coaching_note, generate_coaching_note
from app.utils.rate_limit import QuotaExceeded
from app.utils.badges import BADGES
from app.utils.streaks import current_streak, longest_streak
from app.utils.task_dates import is_overdue
from app.utils.weekly import summarize_week, week_range

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/me", tags=["me"])


@router.get("/progress", response_model=MeProgressResponse)
def my_progress(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> MeProgressResponse:
    """Current/longest streak and badges for the logged-in user only."""
    days = {r.day for r in db.query(ActivityDay.day).filter(ActivityDay.user_id == user.id).all()}
    today = date.today()
    earned_rows = db.query(UserBadge).filter(UserBadge.user_id == user.id).all()
    earned_keys = {r.badge for r in earned_rows}
    logger.info("Progress viewed user_id=%s streak=%s", user.id, current_streak(days, today))
    return MeProgressResponse(
        current_streak=current_streak(days, today),
        longest_streak=longest_streak(days),
        earned=[EarnedBadge(badge=r.badge, awarded_at=r.awarded_at) for r in earned_rows],
        locked=[LockedBadge(badge=b, hint=h) for b, h in BADGES.items() if b not in earned_keys],
    )


@router.get("/overdue", response_model=OverdueResponse)
def my_overdue(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> OverdueResponse:
    """The user's overdue incomplete tasks, most overdue first."""
    today = date.today()
    goal_ids = [g.id for g in db.query(Goal.id).filter(Goal.user_id == user.id).all()]
    tasks = db.query(Task).filter(Task.goal_id.in_(goal_ids)).all() if goal_ids else []
    overdue = sorted(
        (t for t in tasks if is_overdue(t.due_date, t.status, today)),
        key=lambda t: t.due_date or today,
    )
    return OverdueResponse(items=[to_task_response(t, today) for t in overdue], count=len(overdue))


@router.get("/weekly-summary", response_model=WeeklySummaryResponse)
def weekly_summary(
    week_offset: int = Query(default=0, ge=0, le=12),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> WeeklySummaryResponse:
    """One week's numbers plus a coaching paragraph (LLM failure never breaks it)."""
    start, end = week_range(date.today(), week_offset)
    numbers = _window_summary(db, user.id, start, end)
    days = {r.day for r in db.query(ActivityDay.day).filter(ActivityDay.user_id == user.id).all()}
    numbers["current_streak"] = current_streak(days, date.today())
    try:
        note = generate_coaching_note(numbers, user_id=user.id)
    except QuotaExceeded:
        raise
    except Exception:  # noqa: BLE001 - summary must still return 200
        logger.exception("Coaching note failed")
        note = _mock_coaching_note(numbers)
    return WeeklySummaryResponse(week_start=start, week_end=end, coaching_note=note, **numbers)


@router.get("/weekly-summary/pdf")
def weekly_summary_pdf(
    week_offset: int = Query(default=0, ge=0, le=12),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Weekly summary as a downloadable PDF (built in memory)."""
    from fastapi.responses import StreamingResponse
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import cm
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

    start, end = week_range(date.today(), week_offset)
    numbers = _window_summary(db, user.id, start, end)
    try:
        note = generate_coaching_note(numbers, user_id=user.id)
    except QuotaExceeded:
        raise
    except Exception:  # noqa: BLE001
        logger.exception("Coaching note failed")
        note = _mock_coaching_note(numbers)

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=2 * cm, bottomMargin=2 * cm)
    styles = getSampleStyleSheet()
    rows = [
        ("Tasks completed", numbers["tasks_completed"]),
        ("Average score", numbers["average_score"] if numbers["average_score"] is not None else "—"),
        ("Weakest skill", esc(numbers["weakest_skill"]) if numbers["weakest_skill"] else "—"),
        ("Reviews finished", numbers["reviews_done"]),
        ("Active days", numbers["active_days"]),
    ]
    parts = [
        Paragraph("AGENTOS Weekly Summary", styles["Title"]),
        Spacer(1, 0.4 * cm),
        Paragraph(f"{esc(user.name)} &mdash; {start} to {end}", styles["Normal"]),
        Spacer(1, 0.4 * cm),
    ]
    for label, value in rows:
        parts.append(Paragraph(f"{label}: {value}", styles["Normal"]))
    parts += [Spacer(1, 0.4 * cm), Paragraph("Coaching note", styles["Heading3"]),
              Paragraph(esc(note), styles["Normal"])]
    doc.build(parts)
    pdf = buf.getvalue()
    logger.info("Built weekly PDF user_id=%s bytes=%d", user.id, len(pdf))
    return StreamingResponse(
        io.BytesIO(pdf),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=weekly-summary.pdf"},
    )


def _window_summary(db: Session, user_id: int, start, end) -> dict:
    """Assemble one week's numbers from the user's own rows only."""
    goal_ids = [g.id for g in db.query(Goal.id).filter(Goal.user_id == user_id).all()]
    task_ids = [t.id for t in db.query(Task.id).filter(Task.goal_id.in_(goal_ids)).all()] if goal_ids else []
    completed = [t for t in db.query(Task).filter(Task.id.in_(task_ids)).all()
                 if t.status == "completed" and t.completed_at is not None
                 and start <= t.completed_at.date() <= end] if task_ids else []
    subs = (db.query(Submission, Task.skill).join(Task, Task.id == Submission.task_id)
            .filter(Submission.task_id.in_(task_ids)).all()) if task_ids else []
    in_window = [(skill, s.score) for s, skill in subs if start <= s.created_at.date() <= end]
    by_skill: dict[str, list[float]] = {}
    for skill, score in in_window:
        by_skill.setdefault(skill, []).append(float(score))
    reviews = db.query(ReviewItem).filter(
        ReviewItem.user_id == user_id, ReviewItem.last_reviewed_at.is_not(None)).all()
    reviews_done = sum(1 for r in reviews if start <= r.last_reviewed_at.date() <= end)
    active = db.query(ActivityDay).filter(
        ActivityDay.user_id == user_id, ActivityDay.day >= start, ActivityDay.day <= end).count()
    return summarize_week(len(completed), by_skill, reviews_done, active)
