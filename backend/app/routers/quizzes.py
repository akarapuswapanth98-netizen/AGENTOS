"""Practice quiz endpoints: start, submit, history, detail."""
import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.agents.validator import generate_quiz_questions
from app.database import get_db
from app.deps import get_current_user, get_owned_goal
from app.models import QuizAttempt, User
from app.schemas import (
    QuizAttemptResponse,
    QuizHistoryItem,
    QuizQuestionPublic,
    QuizResultItem,
    QuizStartRequest,
    QuizStartResponse,
    QuizSubmitRequest,
    QuizSubmitResponse,
)
from app.utils.rate_limit import QuotaExceeded
from app.utils.review_items import upsert_review_item

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/quizzes", tags=["quizzes"])

TIME_LIMIT_S = 5 * 60
GRACE_S = 30


def _owned_attempt(db: Session, attempt_id: int, user_id: int) -> QuizAttempt:
    """Return the user's quiz attempt, else 404."""
    attempt = db.query(QuizAttempt).filter(QuizAttempt.id == attempt_id, QuizAttempt.user_id == user_id).first()
    if attempt is None:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return attempt


def _public_questions(attempt: QuizAttempt) -> list[QuizQuestionPublic]:
    """Questions stripped of answers and explanations."""
    return [QuizQuestionPublic(question=q["question"], options=q["options"]) for q in attempt.questions]


@router.post("/start", response_model=QuizStartResponse, status_code=status.HTTP_201_CREATED)
def start_quiz(
    payload: QuizStartRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> QuizStartResponse:
    """Generate 5 validated questions; answers never leave the server yet."""
    skill = payload.skill.strip()
    if payload.goal_id is not None:
        get_owned_goal(db, payload.goal_id, user.id)
    try:
        questions = generate_quiz_questions(skill, user_id=user.id)
    except QuotaExceeded:
        raise
    except Exception as exc:  # noqa: BLE001
        logger.exception("Quiz generation failed")
        raise HTTPException(status_code=502, detail=f"Quiz generation failed: {exc}") from exc
    attempt = QuizAttempt(user_id=user.id, goal_id=payload.goal_id, skill=skill,
                          questions=questions, status="in_progress", started_at=datetime.now())
    db.add(attempt)
    db.commit()
    db.refresh(attempt)
    logger.info("Started quiz id=%s skill_len=%d", attempt.id, len(skill))
    return QuizStartResponse(id=attempt.id, skill=skill, questions=_public_questions(attempt),
                             time_limit_seconds=TIME_LIMIT_S)


@router.post("/{attempt_id}/submit", response_model=QuizSubmitResponse)
def submit_quiz(
    attempt_id: int,
    payload: QuizSubmitRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> QuizSubmitResponse:
    """Score once against stored answers; server-side clock decides timeouts."""
    attempt = _owned_attempt(db, attempt_id, user.id)
    if attempt.status == "submitted":
        raise HTTPException(status_code=409, detail="Quiz already submitted")
    elapsed = int((datetime.now() - attempt.started_at).total_seconds())
    timed_out = elapsed > TIME_LIMIT_S + GRACE_S
    results = []
    correct = 0
    for stored, given in zip(attempt.questions, payload.answers):
        ok = given is not None and given == stored["correct_index"]
        correct += 1 if ok else 0
        results.append(QuizResultItem(question=stored["question"], options=stored["options"],
                                      your_answer=given, correct_index=stored["correct_index"],
                                      correct=ok, explanation=stored["explanation"]))
    score = round(correct / len(attempt.questions) * 100)
    attempt.answers = list(payload.answers)
    attempt.score = score
    attempt.status = "submitted"
    attempt.submitted_at = datetime.now()
    attempt.elapsed_seconds = elapsed
    attempt.timed_out = timed_out
    db.add(attempt)
    review_created = False
    if score < 70:
        upsert_review_item(db, user.id, attempt.goal_id, attempt.skill)
        review_created = True
    db.commit()
    db.refresh(attempt)
    logger.info("Quiz id=%s scored %s timed_out=%s", attempt.id, score, timed_out)
    return QuizSubmitResponse(id=attempt.id, score=score, results=results,
                              timed_out=timed_out, elapsed_seconds=elapsed, review_created=review_created)


@router.get("/history", response_model=list[QuizHistoryItem])
def quiz_history(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> list[QuizHistoryItem]:
    """Submitted attempts only, newest first."""
    rows = (
        db.query(QuizAttempt)
        .filter(QuizAttempt.user_id == user.id, QuizAttempt.status == "submitted")
        .order_by(QuizAttempt.id.desc())
        .all()
    )
    return [QuizHistoryItem(id=r.id, skill=r.skill, score=r.score or 0, elapsed_seconds=r.elapsed_seconds or 0,
                            timed_out=r.timed_out, submitted_at=r.submitted_at) for r in rows]


@router.get("/{attempt_id}", response_model=QuizAttemptResponse)
def get_quiz(
    attempt_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> QuizAttemptResponse:
    """One attempt; correct answers shown only after submission."""
    attempt = _owned_attempt(db, attempt_id, user.id)
    if attempt.status == "submitted":
        return QuizAttemptResponse.model_validate(attempt)
    public = QuizAttemptResponse.model_validate(attempt)
    public.questions = [{"question": q["question"], "options": q["options"]} for q in attempt.questions]
    return public
