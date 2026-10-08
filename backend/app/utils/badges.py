"""Activity days + badge awards. One helper records days; one check awards badges."""
import logging
from datetime import date

from sqlalchemy.orm import Session

from app.models import ActivityDay, Goal, ResumeAnalysis, ReviewItem, Submission, Task, UserBadge
from app.utils.streaks import current_streak

logger = logging.getLogger(__name__)

# Badge key -> how-to-earn hint shown for locked badges.
BADGES = {
    "first_task": "Complete your first task",
    "streak_3": "Stay active 3 days in a row",
    "streak_7": "Stay active 7 days in a row",
    "first_90": "Score 90 or more on a task or review",
    "tasks_10": "Complete 10 tasks",
    "resume_uploaded": "Upload and analyze a resume",
}


def record_activity_day(db: Session, user_id: int, day: date | None = None) -> None:
    """Record one active UTC day; recording twice is a no-op."""
    day = day or date.today()
    exists = db.query(ActivityDay).filter(ActivityDay.user_id == user_id, ActivityDay.day == day).first()
    if exists is None:
        db.add(ActivityDay(user_id=user_id, day=day))
        db.commit()


def _user_task_ids(db: Session, user_id: int) -> list[int]:
    """Task ids across all of the user's goals."""
    goal_ids = [g.id for g in db.query(Goal.id).filter(Goal.user_id == user_id).all()]
    if not goal_ids:
        return []
    return [t.id for t in db.query(Task.id).filter(Task.goal_id.in_(goal_ids)).all()]


def check_and_award_badges(db: Session, user_id: int) -> list[str]:
    """Award every newly earned badge; returns just-awarded keys (idempotent)."""
    task_ids = _user_task_ids(db, user_id)
    completed = db.query(Task).filter(Task.id.in_(task_ids), Task.status == "completed").count() if task_ids else 0
    top_task = db.query(Submission.score).filter(Submission.task_id.in_(task_ids)).order_by(Submission.score.desc()).first() if task_ids else None
    top_review = db.query(ReviewItem.last_score).filter(ReviewItem.user_id == user_id).order_by(ReviewItem.last_score.desc()).first()
    best = max(
        [top_task[0] if top_task else 0, top_review[0] if top_review and top_review[0] is not None else 0]
    )
    has_resume = db.query(ResumeAnalysis.id).filter(ResumeAnalysis.user_id == user_id).first() is not None
    days = {r.day for r in db.query(ActivityDay.day).filter(ActivityDay.user_id == user_id).all()}
    streak = current_streak(days, date.today())

    earned_now = (
        (["first_task"] if completed >= 1 else [])
        + (["tasks_10"] if completed >= 10 else [])
        + (["first_90"] if best >= 90 else [])
        + (["resume_uploaded"] if has_resume else [])
        + (["streak_3"] if streak >= 3 else [])
        + (["streak_7"] if streak >= 7 else [])
    )
    already = {r.badge for r in db.query(UserBadge.badge).filter(UserBadge.user_id == user_id).all()}
    fresh = [b for b in earned_now if b not in already]
    for badge in fresh:
        db.add(UserBadge(user_id=user_id, badge=badge))
    if fresh:
        db.commit()
        logger.info("Awarded badges user_id=%s badges=%s", user_id, fresh)
    return fresh
