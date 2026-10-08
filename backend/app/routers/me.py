"""Personal progress: streaks plus earned and locked badges."""
import logging
from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import ActivityDay, Goal, Task, User, UserBadge
from app.schemas import EarnedBadge, LockedBadge, MeProgressResponse, OverdueResponse, to_task_response
from app.utils.badges import BADGES
from app.utils.streaks import current_streak, longest_streak
from app.utils.task_dates import is_overdue

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
