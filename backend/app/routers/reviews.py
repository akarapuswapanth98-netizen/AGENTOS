"""Spaced-repetition review endpoints: due items, question, answer."""
import logging
from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.agents.validator import ScoreSchemaError, generate_review_question, score_review_answer
from app.database import get_db
from app.deps import get_current_user
from app.models import ReviewItem, User
from app.schemas import (
    ReviewAnswerRequest,
    ReviewAnswerResponse,
    ReviewDueResponse,
    ReviewItemResponse,
    ReviewQuestionResponse,
)
from app.utils.badges import check_and_award_badges, record_activity_day
from app.utils.rate_limit import QuotaExceeded
from app.utils.review_schedule import next_state

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/reviews", tags=["reviews"])


def _owned_item(db: Session, item_id: int, user_id: int) -> ReviewItem:
    """Return the user's review item, else 404."""
    item = db.query(ReviewItem).filter(ReviewItem.id == item_id, ReviewItem.user_id == user_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Review item not found")
    return item


@router.get("/due", response_model=ReviewDueResponse)
def due_reviews(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> ReviewDueResponse:
    """List the user's review items due today or earlier, oldest first."""
    rows = (
        db.query(ReviewItem)
        .filter(ReviewItem.user_id == user.id, ReviewItem.due_date <= date.today())
        .order_by(ReviewItem.due_date)
        .all()
    )
    return ReviewDueResponse(items=[ReviewItemResponse.model_validate(r) for r in rows], count=len(rows))


@router.post("/{item_id}/start", response_model=ReviewQuestionResponse)
def start_review(
    item_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> ReviewQuestionResponse:
    """Generate one fresh practice question for the item's skill (not stored)."""
    item = _owned_item(db, item_id, user.id)
    try:
        question = generate_review_question(item.skill, user_id=user.id)
    except QuotaExceeded:
        raise
    except Exception as exc:  # noqa: BLE001
        logger.exception("Review question failed for item_id=%s", item_id)
        raise HTTPException(status_code=502, detail=f"Question generation failed: {exc}") from exc
    return ReviewQuestionResponse(item_id=item.id, skill=item.skill, question=question)


@router.post("/{item_id}/answer", response_model=ReviewAnswerResponse)
def answer_review(
    item_id: int,
    payload: ReviewAnswerRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ReviewAnswerResponse:
    """Score a review answer and reschedule the item. Scoring failure is safe."""
    item = _owned_item(db, item_id, user.id)
    try:
        result = score_review_answer(item.skill, payload.question_text, payload.answer_text, user_id=user.id)
    except QuotaExceeded:
        raise
    except ScoreSchemaError:
        logger.warning("Review scoring invalid for item_id=%s, recording safe zero", item_id)
        result = {"score": 0, "breakdown": {}, "missing": [], "strengths": [],
                  "recommendation": "Scoring unavailable; try again."}
    except Exception as exc:  # noqa: BLE001
        logger.exception("Review scoring failed for item_id=%s", item_id)
        raise HTTPException(status_code=502, detail=f"Review scoring failed: {exc}") from exc
    score = int(result.get("score", 0))
    stage, due = next_state(item.stage, score, date.today())
    item.stage = stage
    item.due_date = due
    item.last_score = score
    item.last_reviewed_at = datetime.now()
    db.add(item)
    db.commit()
    db.refresh(item)
    logger.info("Review item_id=%s scored %s -> stage %s due %s", item_id, score, stage, due)
    record_activity_day(db, user.id)
    newly_earned = check_and_award_badges(db, user.id)
    return ReviewAnswerResponse(
        item_id=item.id,
        score=score,
        feedback={"strengths": result.get("strengths", []), "missing": result.get("missing", []),
                  "recommendation": result.get("recommendation", "")},
        stage=stage,
        next_due_date=due,
        newly_earned_badges=newly_earned,
    )
