"""Planner agent: turn analysis into an ordered task list."""
import logging
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.agents.llm import call_llm_json
from app.models import Goal, Task

logger = logging.getLogger(__name__)

REQUIRED_FIELDS = ("title", "description", "week", "order", "task_type", "skill")
VALID_TYPES = {"learn", "practice", "project", "remedial"}


def _coerce_tasks(raw: list[dict]) -> list[dict]:
    """Fill defaults and normalize one task dict list."""
    cleaned: list[dict] = []
    for i, item in enumerate(raw):
        if not isinstance(item, dict):
            continue
        title = str(item.get("title") or f"Task {i + 1}").strip()
        cleaned.append(
            {
                "title": title[:255],
                "description": str(item.get("description") or "").strip(),
                "week": int(item.get("week") or 1),
                "order": int(item.get("order") or (i + 1)),
                "task_type": str(item.get("task_type") or "learn").strip().lower(),
                "skill": str(item.get("skill") or "general").strip() or "general",
            }
        )
        if cleaned[-1]["task_type"] not in VALID_TYPES:
            cleaned[-1]["task_type"] = "learn"
        if cleaned[-1]["week"] < 1:
            cleaned[-1]["week"] = 1
    return cleaned


def run_planner(
    db: Session,
    goal: Goal,
    analysis: dict,
    user_id: int | None = None,
    keep_completed: bool = False,
    start_from: datetime | None = None,
) -> list[Task]:
    """Generate tasks from analysis and save them as Task rows.

    With keep_completed=True only pending/in_progress tasks are replaced;
    completed ones are kept and new tasks continue their order numbering.
    """
    logger.info("Planner started for goal_id=%s", goal.id)
    system = (
        "You are a curriculum planner. Create a step-by-step plan closing the biggest gaps first. "
        'Respond with JSON: {"tasks": [{title, description, week, order, task_type, skill}]}. '
        "task_type must be learn|practice|project. Generate 10-16 tasks spread across weeks."
    )
    user = (
        f"Goal: {goal.title}\nTarget role: {goal.target_role}\n"
        f"Timeline: {goal.timeline_days} days\nAnalysis: {analysis}\n"
        "Generate 10-16 tasks ordered by gap priority."
    )
    data = call_llm_json(
        system,
        user,
        agent="planner",
        fallback_context={
            "skills": goal.current_skills,
            "gaps": (analysis or {}).get("gaps", []),
            "timeline_days": goal.timeline_days,
            "target_role": goal.target_role,
        },
        user_id=user_id,
    )
    raw_tasks = data.get("tasks") or []
    task_dicts = _coerce_tasks(raw_tasks)

    base_order = 0
    if keep_completed:
        # Replace only open tasks (including pending remedial ones).
        db.query(Task).filter(Task.goal_id == goal.id, Task.status != "completed").delete(synchronize_session=False)
        kept_orders = [t.order for t in db.query(Task.order).filter(Task.goal_id == goal.id).all()]
        base_order = max(kept_orders) if kept_orders else 0
    else:
        # Remove any stale tasks (orchestrator runs once per goal, but be safe).
        db.query(Task).filter(Task.goal_id == goal.id).delete()
    start = start_from or goal.created_at or datetime.now()
    rows = [
        Task(
            goal_id=goal.id,
            title=t["title"],
            description=t["description"],
            week=t["week"],
            order=base_order + i + 1,
            task_type=t["task_type"],
            skill=t["skill"],
            due_date=start + timedelta(weeks=t["week"]),
        )
        for i, t in enumerate(task_dicts)
    ]
    db.add_all(rows)
    db.commit()
    for r in rows:
        db.refresh(r)
    logger.info("Planner done for goal_id=%s tasks=%d", goal.id, len(rows))
    return rows
