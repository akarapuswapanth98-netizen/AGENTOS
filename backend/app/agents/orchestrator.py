"""Orchestrator: run Analyst -> Planner -> sanity check, with tracing."""
import logging
from datetime import datetime

from sqlalchemy.orm import Session

from app.agents.analyst import run_analyst
from app.agents.planner import REQUIRED_FIELDS, run_planner
from app.models import AgentTrace, Goal, SkillScore, Task

logger = logging.getLogger(__name__)


def _trace(db: Session, goal_id: int, agent_name: str, message: str, status: str) -> AgentTrace:
    """Write one AgentTrace row and commit it."""
    row = AgentTrace(goal_id=goal_id, agent_name=agent_name, message=message, status=status)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def _plan_is_valid(tasks: list[Task]) -> bool:
    """Check plan sanity: >=5 tasks with all required fields present."""
    if len(tasks) < 5:
        return False
    for t in tasks:
        for field in REQUIRED_FIELDS:
            if getattr(t, field, None) in (None, ""):
                return False
    return True


def run_goal_pipeline(db: Session, goal: Goal, user_id: int | None = None) -> tuple[dict, list[Task]]:
    """Run the full Analyst->Planner pipeline for a goal.

    Raises RuntimeError (after tracing the error) if a step fails twice.
    """
    # --- Analyst ---
    _trace(db, goal.id, "orchestrator", "Starting Analyst", "running")
    try:
        analysis = run_analyst(db, goal, user_id=user_id)
        _trace(db, goal.id, "analyst", f"Analysis complete (difficulty={analysis.get('difficulty')})", "done")
    except Exception as exc:  # noqa: BLE001
        logger.exception("Analyst failed for goal_id=%s", goal.id)
        _trace(db, goal.id, "analyst", f"Analyst failed: {exc}", "error")
        raise RuntimeError(f"Analyst failed: {exc}") from exc

    # --- Planner (with one regeneration retry) ---
    _trace(db, goal.id, "orchestrator", "Starting Planner", "running")
    try:
        tasks = run_planner(db, goal, analysis, user_id=user_id)
        if not _plan_is_valid(tasks):
            logger.warning("Plan sanity check failed for goal_id=%s, regenerating once", goal.id)
            _trace(db, goal.id, "planner", "Plan sanity check failed, regenerating once", "running")
            tasks = run_planner(db, goal, analysis, user_id=user_id)
        if not _plan_is_valid(tasks):
            raise ValueError("Generated plan failed sanity check (need >=5 complete tasks)")
        _trace(db, goal.id, "planner", f"Plan complete with {len(tasks)} tasks", "done")
    except Exception as exc:  # noqa: BLE001
        logger.exception("Planner failed for goal_id=%s", goal.id)
        _trace(db, goal.id, "planner", f"Planner failed: {exc}", "error")
        raise RuntimeError(f"Planner failed: {exc}") from exc

    return analysis, tasks


def run_replan_pipeline(db: Session, goal: Goal, user_id: int | None = None) -> tuple[dict, list[Task]]:
    """Re-run Analyst -> Planner keeping completed tasks and learned skill scores.

    Learned SkillScores survive as the higher of old vs fresh estimates, so
    progress is never erased by a replan. Raises RuntimeError on failure.
    """
    learned = {r.skill: float(r.score) for r in db.query(SkillScore).filter(SkillScore.goal_id == goal.id).all()}
    kept = db.query(Task).filter(Task.goal_id == goal.id, Task.status == "completed").count()
    _trace(db, goal.id, "orchestrator", f"Starting replan (keeping {kept} completed tasks)", "running")
    try:
        analysis = run_analyst(db, goal, user_id=user_id)
        _trace(db, goal.id, "analyst", f"Re-analysis complete (difficulty={analysis.get('difficulty')})", "done")
        # run_analyst reseeds scores: restore the higher learned value per skill.
        for skill, score in learned.items():
            row = db.query(SkillScore).filter(SkillScore.goal_id == goal.id, SkillScore.skill == skill).first()
            if row is None:
                db.add(SkillScore(goal_id=goal.id, skill=skill, score=score))
            elif score > float(row.score):
                row.score = score
                db.add(row)
        db.commit()
    except Exception as exc:  # noqa: BLE001
        logger.exception("Replan analyst failed for goal_id=%s", goal.id)
        _trace(db, goal.id, "analyst", f"Replan analyst failed: {exc}", "error")
        raise RuntimeError(f"Replan analyst failed: {exc}") from exc

    try:
        tasks = run_planner(db, goal, analysis, user_id=user_id, keep_completed=True, start_from=datetime.now())
        if not _plan_is_valid(tasks):
            logger.warning("Replan sanity check failed for goal_id=%s, regenerating once", goal.id)
            _trace(db, goal.id, "planner", "Replan sanity check failed, regenerating once", "running")
            tasks = run_planner(db, goal, analysis, user_id=user_id, keep_completed=True, start_from=datetime.now())
        if not _plan_is_valid(tasks):
            raise ValueError("Replanned tasks failed sanity check (need >=5 complete tasks)")
        replaced = sum(1 for t in tasks if t.status != "completed")
        _trace(db, goal.id, "planner", f"Replan complete: kept {kept} completed, {replaced} fresh tasks", "done")
    except Exception as exc:  # noqa: BLE001
        logger.exception("Replan planner failed for goal_id=%s", goal.id)
        _trace(db, goal.id, "planner", f"Replan planner failed: {exc}", "error")
        raise RuntimeError(f"Replan planner failed: {exc}") from exc

    return analysis, db.query(Task).filter(Task.goal_id == goal.id).order_by(Task.week, Task.order).all()
