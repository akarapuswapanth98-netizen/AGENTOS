"""Task endpoints: detail, status update, tutor, submit (validator + adaptive), history."""
import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.agents.tutor import run_tutor
from app.agents.validator import run_validator
from app.database import get_db
from app.deps import get_current_user, get_owned_task
from app.models import AgentTrace, SkillScore, Submission, Task, User
from app.schemas import (
    SubmissionResponse,
    SubmitRequest,
    SubmitResponse,
    TaskResponse,
    TaskStatusUpdate,
    TutorResponse,
)
from app.utils.rate_limit import QuotaExceeded
from app.utils.readiness import record_snapshot
from app.utils.review_items import upsert_review_item
from app.utils.review_schedule import PASS_SCORE as REVIEW_PASS_SCORE

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/tasks", tags=["tasks"])

PASS_SCORE = 60


@router.get("/{task_id}", response_model=TaskResponse)
def get_task(
    task_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> TaskResponse:
    """Return a single task."""
    task, _ = get_owned_task(db, task_id, user.id)
    return TaskResponse.model_validate(task)


@router.patch("/{task_id}/status", response_model=TaskResponse)
def update_task_status(
    task_id: int,
    payload: TaskStatusUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> TaskResponse:
    """Manually update a task's status."""
    task, _ = get_owned_task(db, task_id, user.id)
    task.status = payload.status
    task.completed_at = datetime.now() if payload.status == "completed" else None
    db.add(task)
    db.commit()
    db.refresh(task)
    record_snapshot(db, task.goal_id)
    return TaskResponse.model_validate(task)


@router.post("/{task_id}/tutor", response_model=TutorResponse)
def get_tutor(
    task_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> TutorResponse:
    """Run the Tutor agent for a task."""
    task, _ = get_owned_task(db, task_id, user.id)
    try:
        content = run_tutor(task, user_id=user.id)
    except QuotaExceeded:
        raise
    except Exception as exc:  # noqa: BLE001
        logger.exception("Tutor failed for task_id=%s", task_id)
        raise HTTPException(status_code=502, detail=f"Tutor failed: {exc}") from exc
    return TutorResponse(task_id=task.id, **content)


@router.post("/{task_id}/submit", response_model=SubmitResponse, status_code=status.HTTP_200_OK)
def submit_answer(
    task_id: int,
    payload: SubmitRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SubmitResponse:
    """Validate an answer, apply adaptive logic, and maybe create a remedial task."""
    task, _ = get_owned_task(db, task_id, user.id)
    try:
        feedback = run_validator(task, payload.answer_text, user_id=user.id)
    except QuotaExceeded:
        raise
    except Exception as exc:  # noqa: BLE001
        logger.exception("Validator failed for task_id=%s", task_id)
        raise HTTPException(status_code=502, detail=f"Validator failed: {exc}") from exc

    score = int(feedback.get("score", 0))
    score = max(0, min(100, score))

    # Save submission + update task counters.
    submission = Submission(task_id=task.id, answer_text=payload.answer_text or "", score=score, feedback=feedback)
    db.add(submission)
    task.attempts = (task.attempts or 0) + 1
    task.score = score
    task.status = "completed" if score >= PASS_SCORE else "in_progress"
    task.completed_at = datetime.now() if task.status == "completed" else None
    db.add(task)
    db.commit()
    db.refresh(submission)
    db.refresh(task)

    # Weighted moving average for the skill: 0.6 old + 0.4 new.
    skill_row = db.query(SkillScore).filter(SkillScore.goal_id == task.goal_id, SkillScore.skill == task.skill).first()
    if skill_row is None:
        skill_row = SkillScore(goal_id=task.goal_id, skill=task.skill, score=float(score))
    else:
        skill_row.score = round(0.6 * float(skill_row.score) + 0.4 * float(score), 2)
        skill_row.updated_at = datetime.now()
    db.add(skill_row)
    db.commit()

    # Spaced repetition: low scores schedule the skill for review tomorrow.
    if score < REVIEW_PASS_SCORE:
        upsert_review_item(db, user.id, task.goal_id, task.skill)
        logger.info("Scheduled review for skill=%s after score=%s", task.skill, score)

    remedial: Task | None = None
    if score < PASS_SCORE:
        existing = (
            db.query(Task)
            .filter(
                Task.goal_id == task.goal_id,
                Task.skill == task.skill,
                Task.task_type == "remedial",
                Task.status.in_(["pending", "in_progress"]),
            )
            .first()
        )
        if existing is None:
            missing = feedback.get("missing") or []
            missing_str = ", ".join(missing) if missing else "the key concepts"
            remedial = Task(
                goal_id=task.goal_id,
                title=f"Review: {task.title}"[:255],
                description=f"You struggled with: {missing_str}. Revisit '{task.title}' for skill '{task.skill}' with smaller steps and one worked example.",
                week=task.week,
                order=task.order + 1,
                task_type="remedial",
                skill=task.skill,
                status="pending",
                due_date=task.due_date,
            )
            db.add(remedial)
            db.commit()
            db.refresh(remedial)
            msg = f"Low score ({score}) on task {task.id}; created remedial task {remedial.id} for skill '{task.skill}'"
        else:
            msg = f"Low score ({score}) on task {task.id}; remedial task {existing.id} already pending, skipping"
    else:
        msg = f"Score {score} on task {task.id}; marked completed; skill '{task.skill}' -> {skill_row.score:.1f}"

    db.add(AgentTrace(goal_id=task.goal_id, agent_name="orchestrator", message=msg, status="done"))
    db.commit()
    logger.info(msg)
    record_snapshot(db, task.goal_id)

    return SubmitResponse(
        submission_id=submission.id,
        task_id=task.id,
        score=score,
        feedback=feedback,
        task_status=task.status,
        remedial_task=TaskResponse.model_validate(remedial) if remedial else None,
        message=msg,
    )


@router.get("/{task_id}/submissions", response_model=list[SubmissionResponse])
def list_submissions(
    task_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> list[SubmissionResponse]:
    """Return submission history for a task, newest last."""
    task, _ = get_owned_task(db, task_id, user.id)
    rows = db.query(Submission).filter(Submission.task_id == task.id).order_by(Submission.id).all()
    return [SubmissionResponse.model_validate(r) for r in rows]
