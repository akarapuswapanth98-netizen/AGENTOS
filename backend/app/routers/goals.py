"""Goal endpoints: create (runs orchestrator), list, detail, delete, trace, tasks."""
import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.agents.orchestrator import run_goal_pipeline, run_replan_pipeline
from app.database import get_db
from app.deps import get_current_user, get_owned_goal
from app.models import AgentTrace, Goal, InterviewQuestion, InterviewSession, ReadinessSnapshot, ResumeAnalysis, ReviewItem, SkillScore, Submission, Task, User
from app.schemas import (
    GoalCreate,
    GoalDetailResponse,
    GoalResponse,
    GoalUpdate,
    GoalWithPlanResponse,
    TaskResponse,
    TraceResponse,
)
from app.utils.readiness import record_snapshot

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/goals", tags=["goals"])


@router.post("", response_model=GoalWithPlanResponse, status_code=status.HTTP_201_CREATED)
def create_goal(
    payload: GoalCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> GoalWithPlanResponse:
    """Create a goal, run Analyst->Planner, and return goal + tasks + trace."""
    goal = Goal(
        user_id=user.id,
        title=payload.title,
        target_role=payload.target_role,
        timeline_days=payload.timeline_days,
        current_skills=payload.current_skills,
        status="active",
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)
    try:
        run_goal_pipeline(db, goal, user_id=user.id)
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    db.refresh(goal)
    tasks = db.query(Task).filter(Task.goal_id == goal.id).order_by(Task.week, Task.order).all()
    trace = db.query(AgentTrace).filter(AgentTrace.goal_id == goal.id).order_by(AgentTrace.id).all()
    return GoalWithPlanResponse(
        goal=GoalResponse.model_validate(goal),
        tasks=[TaskResponse.model_validate(t) for t in tasks],
        trace=[TraceResponse.model_validate(t) for t in trace],
    )


@router.get("", response_model=list[GoalResponse])
def list_goals(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> list[GoalResponse]:
    """List the current user's goals, newest last."""
    goals = db.query(Goal).filter(Goal.user_id == user.id).order_by(Goal.id).all()
    return [GoalResponse.model_validate(g) for g in goals]


@router.get("/{goal_id}", response_model=GoalDetailResponse)
def get_goal(goal_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> GoalDetailResponse:
    """Return a goal with its analysis and tasks."""
    goal = get_owned_goal(db, goal_id, user.id)
    tasks = db.query(Task).filter(Task.goal_id == goal.id).order_by(Task.week, Task.order).all()
    return GoalDetailResponse(
        goal=GoalResponse.model_validate(goal),
        tasks=[TaskResponse.model_validate(t) for t in tasks],
    )


@router.patch("/{goal_id}", response_model=GoalResponse)
def update_goal(
    goal_id: int,
    payload: GoalUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> GoalResponse:
    """Edit a goal's title, target role, or timeline (at least one field)."""
    goal = get_owned_goal(db, goal_id, user.id)
    if payload.title is None and payload.target_role is None and payload.timeline_days is None:
        raise HTTPException(status_code=422, detail="Nothing to update")
    if payload.title is not None:
        goal.title = payload.title.strip()
    if payload.target_role is not None:
        goal.target_role = payload.target_role.strip()
    if payload.timeline_days is not None:
        goal.timeline_days = payload.timeline_days
    db.add(goal)
    db.commit()
    db.refresh(goal)
    logger.info("Updated goal_id=%s", goal_id)
    return GoalResponse.model_validate(goal)


@router.post("/{goal_id}/replan", response_model=GoalWithPlanResponse)
def replan_goal(
    goal_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> GoalWithPlanResponse:
    """Re-run Analyst->Planner keeping completed tasks; open tasks are replaced."""
    goal = get_owned_goal(db, goal_id, user.id)
    try:
        run_replan_pipeline(db, goal, user_id=user.id)
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    db.refresh(goal)
    record_snapshot(db, goal.id)
    tasks = db.query(Task).filter(Task.goal_id == goal.id).order_by(Task.week, Task.order).all()
    trace = db.query(AgentTrace).filter(AgentTrace.goal_id == goal.id).order_by(AgentTrace.id).all()
    return GoalWithPlanResponse(
        goal=GoalResponse.model_validate(goal),
        tasks=[TaskResponse.model_validate(t) for t in tasks],
        trace=[TraceResponse.model_validate(t) for t in trace],
    )


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_goal(goal_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> None:
    """Delete a goal and all related rows."""
    goal = get_owned_goal(db, goal_id, user.id)
    task_ids = [t.id for t in db.query(Task.id).filter(Task.goal_id == goal_id).all()]
    if task_ids:
        db.query(Submission).filter(Submission.task_id.in_(task_ids)).delete(synchronize_session=False)
    session_ids = [s.id for s in db.query(InterviewSession.id).filter(InterviewSession.goal_id == goal_id).all()]
    if session_ids:
        db.query(InterviewQuestion).filter(InterviewQuestion.session_id.in_(session_ids)).delete(synchronize_session=False)
    db.query(InterviewSession).filter(InterviewSession.goal_id == goal_id).delete(synchronize_session=False)
    db.query(Task).filter(Task.goal_id == goal_id).delete(synchronize_session=False)
    db.query(AgentTrace).filter(AgentTrace.goal_id == goal_id).delete(synchronize_session=False)
    db.query(SkillScore).filter(SkillScore.goal_id == goal_id).delete(synchronize_session=False)
    db.query(ReadinessSnapshot).filter(ReadinessSnapshot.goal_id == goal_id).delete(synchronize_session=False)
    db.query(ReviewItem).filter(ReviewItem.goal_id == goal_id).delete(synchronize_session=False)
    db.query(ResumeAnalysis).filter(ResumeAnalysis.goal_id == goal_id).update(
        {ResumeAnalysis.goal_id: None}, synchronize_session=False
    )
    db.delete(goal)
    db.commit()
    logger.info("Deleted goal_id=%s", goal_id)


@router.get("/{goal_id}/trace", response_model=list[TraceResponse])
def get_trace(
    goal_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> list[TraceResponse]:
    """Return agent trace entries for a goal, in order."""
    get_owned_goal(db, goal_id, user.id)
    rows = db.query(AgentTrace).filter(AgentTrace.goal_id == goal_id).order_by(AgentTrace.id).all()
    return [TraceResponse.model_validate(r) for r in rows]


@router.get("/{goal_id}/tasks", response_model=list[TaskResponse])
def list_goal_tasks(
    goal_id: int,
    status: str | None = Query(default=None, description="Filter by pending|in_progress|completed"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[TaskResponse]:
    """List tasks for a goal, optionally filtered by status."""
    get_owned_goal(db, goal_id, user.id)
    q = db.query(Task).filter(Task.goal_id == goal_id)
    if status is not None:
        if status not in ("pending", "in_progress", "completed"):
            raise HTTPException(status_code=422, detail="Invalid status filter")
        q = q.filter(Task.status == status)
    rows = q.order_by(Task.week, Task.order).all()
    return [TaskResponse.model_validate(r) for r in rows]
