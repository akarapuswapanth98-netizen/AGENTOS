"""Cross-goal dashboard: today's tasks, overdue, weekly wins, streak."""
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import Goal, Submission, Task, User
from app.schemas import ActiveGoalSummary, DashboardResponse, TaskResponse
from app.utils.readiness import compute_categories, readiness_from

router = APIRouter(tags=["dashboard"])


def _streak(active_days: set) -> int:
    """Consecutive active days ending today (or yesterday if today is quiet)."""
    today = date.today()
    cursor = today if today in active_days else today - timedelta(days=1)
    days = 0
    while cursor in active_days:
        days += 1
        cursor -= timedelta(days=1)
    return days


@router.get("/dashboard", response_model=DashboardResponse)
def get_dashboard(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> DashboardResponse:
    """Summarize today's work, overdue items, weekly progress, and streak."""
    goals = db.query(Goal).filter(Goal.user_id == user.id).order_by(Goal.id).all()
    goal_ids = [g.id for g in goals]
    tasks = db.query(Task).filter(Task.goal_id.in_(goal_ids)).all() if goal_ids else []

    now = datetime.now()
    today = now.date()
    open_tasks = [t for t in tasks if t.status != "completed"]
    today_tasks = sorted(
        [t for t in open_tasks if t.due_date is not None and t.due_date.date() == today],
        key=lambda t: (t.week, t.order),
    )
    overdue_tasks = sorted(
        [t for t in open_tasks if t.due_date is not None and t.due_date.date() < today],
        key=lambda t: (t.due_date or now),
    )
    week_ago = now - timedelta(days=7)
    completed_this_week = sum(1 for t in tasks if t.completed_at is not None and t.completed_at >= week_ago)

    active_days = {t.completed_at.date() for t in tasks if t.completed_at is not None}
    task_ids = [t.id for t in tasks]
    if task_ids:
        for sub in db.query(Submission.created_at).filter(Submission.task_id.in_(task_ids)).all():
            if sub.created_at:
                active_days.add(sub.created_at.date())

    active_goal = None
    if goals:
        latest = goals[-1]
        cats = compute_categories(db, latest.id)
        active_goal = ActiveGoalSummary(
            id=latest.id, title=latest.title, target_role=latest.target_role, readiness_score=readiness_from(cats)
        )

    return DashboardResponse(
        today_tasks=[TaskResponse.model_validate(t) for t in today_tasks],
        overdue_tasks=[TaskResponse.model_validate(t) for t in overdue_tasks],
        overdue_count=len(overdue_tasks),
        completed_this_week=completed_this_week,
        streak_days=_streak(active_days),
        active_goal=active_goal,
    )
