"""Review-item persistence: create-or-reset after low scores."""
from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.models import ReviewItem
from app.utils.review_schedule import INTERVALS


def upsert_review_item(db: Session, user_id: int, goal_id: int | None, skill: str) -> ReviewItem:
    """Create a stage-0 review item, or reset the existing one (no duplicates)."""
    item = (
        db.query(ReviewItem)
        .filter(ReviewItem.user_id == user_id, ReviewItem.skill == skill, ReviewItem.goal_id == goal_id)
        .first()
    )
    due = date.today() + timedelta(days=INTERVALS[0])
    if item is None:
        item = ReviewItem(user_id=user_id, goal_id=goal_id, skill=skill, stage=0, due_date=due)
    else:
        item.stage = 0
        item.due_date = due
    db.add(item)
    db.commit()
    db.refresh(item)
    return item
