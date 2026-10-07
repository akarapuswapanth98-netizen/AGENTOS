"""Interview simulator endpoints: start, list, answer, complete."""
import logging
from collections import Counter
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.agents.interviewer import evaluate_answer, generate_questions
from app.database import get_db
from app.deps import get_current_user, get_owned_goal, get_owned_question, get_owned_session
from app.models import AgentTrace, InterviewQuestion, InterviewSession, SkillScore, User
from app.schemas import (
    InterviewAnswerRequest,
    InterviewAnswerResponse,
    InterviewCreateRequest,
    InterviewQuestionResponse,
    InterviewSessionResponse,
)
from app.utils.rate_limit import QuotaExceeded
from app.utils.readiness import record_snapshot

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/interviews", tags=["interviews"])


def _round_scores(questions: list[InterviewQuestion]) -> dict[str, float]:
    """Per-round average over answered questions; rounds with no answers omitted."""
    totals: dict[str, list[int]] = {}
    for q in questions:
        if q.score is not None:
            totals.setdefault(q.round_name, []).append(int(q.score))
    return {name: round(sum(scores) / len(scores), 1) for name, scores in totals.items()}


def _session_response(session: InterviewSession, questions: list[InterviewQuestion]) -> InterviewSessionResponse:
    """Build the full session payload with questions in order."""
    ordered = sorted(questions, key=lambda q: q.order)
    return InterviewSessionResponse(
        id=session.id,
        goal_id=session.goal_id,
        role=session.role,
        status=session.status,
        overall_score=session.overall_score,
        created_at=session.created_at,
        completed_at=session.completed_at,
        questions=[InterviewQuestionResponse.model_validate(q) for q in ordered],
        round_scores=_round_scores(ordered),
    )


def _questions_for(db: Session, session_id: int) -> list[InterviewQuestion]:
    """Return a session's questions ordered by their sequence number."""
    return (
        db.query(InterviewQuestion)
        .filter(InterviewQuestion.session_id == session_id)
        .order_by(InterviewQuestion.order)
        .all()
    )


@router.post("", response_model=InterviewSessionResponse, status_code=status.HTTP_201_CREATED)
def start_interview(
    payload: InterviewCreateRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> InterviewSessionResponse:
    """Start an interview session for a goal (2 questions per round)."""
    goal = get_owned_goal(db, payload.goal_id, user.id)
    weak = [r.skill for r in db.query(SkillScore).filter(SkillScore.goal_id == goal.id, SkillScore.score < 60).all()]
    try:
        generated = generate_questions(goal.target_role, list(goal.current_skills or []), weak, user_id=user.id)
    except QuotaExceeded:
        raise
    except Exception as exc:  # noqa: BLE001
        logger.exception("Question generation failed for goal_id=%s", goal.id)
        raise HTTPException(status_code=502, detail=f"Question generation failed: {exc}") from exc
    session = InterviewSession(user_id=user.id, goal_id=goal.id, role=goal.target_role, status="in_progress")
    db.add(session)
    db.commit()
    db.refresh(session)
    db.add_all([InterviewQuestion(session_id=session.id, **g) for g in generated])
    db.commit()
    logger.info("Started interview session_id=%s goal_id=%s", session.id, goal.id)
    return _session_response(session, _questions_for(db, session.id))


@router.get("", response_model=list[InterviewSessionResponse])
def list_interviews(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> list[InterviewSessionResponse]:
    """List the current user's interview sessions, newest first."""
    sessions = (
        db.query(InterviewSession).filter(InterviewSession.user_id == user.id).order_by(InterviewSession.id.desc()).all()
    )
    return [_session_response(s, _questions_for(db, s.id)) for s in sessions]


@router.get("/{session_id}", response_model=InterviewSessionResponse)
def get_interview(
    session_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> InterviewSessionResponse:
    """Return one interview session with its questions."""
    session = get_owned_session(db, session_id, user.id)
    return _session_response(session, _questions_for(db, session.id))


@router.post("/{session_id}/questions/{question_id}/answer", response_model=InterviewAnswerResponse)
def answer_question(
    session_id: int,
    question_id: int,
    payload: InterviewAnswerRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> InterviewAnswerResponse:
    """Evaluate one interview answer and store the score + feedback."""
    question = get_owned_question(db, session_id, question_id, user.id)
    session = get_owned_session(db, session_id, user.id)
    if session.status == "completed":
        raise HTTPException(status_code=400, detail="Interview already completed")
    try:
        result = evaluate_answer(question.question_text, payload.answer_text, user_id=user.id)
    except QuotaExceeded:
        raise
    except Exception as exc:  # noqa: BLE001
        logger.exception("Answer evaluation failed for question_id=%s", question_id)
        raise HTTPException(status_code=502, detail=f"Evaluation failed: {exc}") from exc
    question.answer_text = payload.answer_text or ""
    question.score = result["score"]
    question.feedback = {"strengths": result["strengths"], "missing": result["missing"], "feedback": result["feedback"]}
    db.add(question)
    db.commit()
    return InterviewAnswerResponse(question_id=question.id, **result)


@router.post("/{session_id}/complete", response_model=InterviewSessionResponse)
def complete_interview(
    session_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> InterviewSessionResponse:
    """Score each round (unanswered = 0), set the overall score, update skills."""
    session = get_owned_session(db, session_id, user.id)
    questions = _questions_for(db, session.id)
    if session.status == "completed":
        return _session_response(session, questions)

    # Per-round average, counting unanswered questions as 0.
    by_round: dict[str, list[int]] = {}
    for q in questions:
        by_round.setdefault(q.round_name, []).append(int(q.score) if q.score is not None else 0)
    round_avgs = {name: round(sum(scores) / len(scores), 1) for name, scores in by_round.items()}
    overall = int(round(sum(round_avgs.values()) / len(round_avgs))) if round_avgs else 0

    session.status = "completed"
    session.overall_score = overall
    session.completed_at = datetime.now()
    db.add(session)

    # Fold each round's score into its dominant skill (weighted moving average).
    for round_name, avg in round_avgs.items():
        round_skills = [q.skill for q in questions if q.round_name == round_name]
        skill = Counter(round_skills).most_common(1)[0][0] if round_skills else "general"
        row = db.query(SkillScore).filter(SkillScore.goal_id == session.goal_id, SkillScore.skill == skill).first()
        if row is None:
            row = SkillScore(goal_id=session.goal_id, skill=skill, score=float(avg))
        else:
            row.score = round(0.6 * float(row.score) + 0.4 * float(avg), 2)
            row.updated_at = datetime.now()
        db.add(row)

    msg = f"Interview {session.id} completed: overall {overall}, rounds {round_avgs}"
    db.add(AgentTrace(goal_id=session.goal_id, agent_name="interviewer", message=msg, status="done"))
    db.commit()
    db.refresh(session)
    logger.info(msg)
    record_snapshot(db, session.goal_id)
    return _session_response(session, questions)
