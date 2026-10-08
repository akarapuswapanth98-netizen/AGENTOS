"""Personal progress: streaks plus earned and locked badges."""
import logging
from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import ActivityDay, User, UserBadge
from app.schemas import EarnedBadge, LockedBadge, MeProgressResponse
from app.utils.badges import BADGES
from app.utils.streaks import current_streak, longest_streak

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
