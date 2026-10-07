"""Progress + readiness history endpoints (no LLM)."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, get_owned_goal
from app.models import ReadinessSnapshot, SkillScore, Task, User
from app.schemas import ProgressResponse, SkillScoreItem, SnapshotResponse
from app.utils.readiness import compute_categories, projected_readiness, readiness_from

router = APIRouter(prefix="/goals", tags=["progress"])


@router.get("/{goal_id}/progress", response_model=ProgressResponse)
def get_progress(
    goal_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> ProgressResponse:
    """Compute progress stats, five readiness categories, and ML projection."""
    get_owned_goal(db, goal_id, user.id)

    tasks = db.query(Task).filter(Task.goal_id == goal_id).all()
    total = len(tasks)
    completed = sum(1 for t in tasks if t.status == "completed")
    pending = total - completed
    completion_pct = round(completed / total * 100, 1) if total else 0.0

    scored = [t.score for t in tasks if t.score is not None]
    avg_score: float | None = round(sum(scored) / len(scored), 1) if scored else None

    skill_rows = db.query(SkillScore).filter(SkillScore.goal_id == goal_id).all()
    skill_scores = [SkillScoreItem(skill=r.skill, score=round(float(r.score), 1)) for r in skill_rows]
    weak = [s.skill for s in skill_scores if s.score < 60]
    strong = [s.skill for s in skill_scores if s.score >= 75]

    categories = compute_categories(db, goal_id)
    readiness = readiness_from(categories)

    return ProgressResponse(
        completion_pct=completion_pct,
        tasks_total=total,
        tasks_completed=completed,
        tasks_pending=pending,
        avg_score=avg_score,
        skill_scores=skill_scores,
        weak_areas=weak,
        strong_areas=strong,
        readiness_score=readiness,
        categories=categories,
        projected_readiness=projected_readiness(categories),
    )


@router.get("/{goal_id}/history", response_model=list[SnapshotResponse])
def get_history(
    goal_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> list[SnapshotResponse]:
    """Return daily readiness snapshots for the trend chart, oldest first."""
    get_owned_goal(db, goal_id, user.id)
    rows = (
        db.query(ReadinessSnapshot)
        .filter(ReadinessSnapshot.goal_id == goal_id)
        .order_by(ReadinessSnapshot.date)
        .all()
    )
    return [SnapshotResponse.model_validate(r) for r in rows]
