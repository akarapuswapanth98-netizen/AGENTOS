"""Tutor agent: explain a task with examples and practice questions."""
import logging

from app.agents.llm import call_llm_json
from app.models import Task

logger = logging.getLogger(__name__)


def run_tutor(task: Task, user_id: int | None = None) -> dict:
    """Return explanation/example/questions/hints for a task."""
    logger.info("Tutor started for task_id=%s", task.id)
    system = (
        "You are a patient tutor. Explain the topic simply with one concrete example. "
        'Respond with JSON: {"explanation": string, "example": string, '
        '"practice_questions": [3 strings], "hints": [string]}.'
    )
    user = f"Task: {task.title}\nSkill: {task.skill}\nDescription: {task.description}\nTeach this topic."
    data = call_llm_json(
        system, user, agent="tutor", fallback_context={"title": task.title, "skill": task.skill},
        user_id=user_id,
    )
    result = {
        "explanation": str(data.get("explanation") or ""),
        "example": str(data.get("example") or ""),
        "practice_questions": list(data.get("practice_questions") or [])[:3],
        "hints": list(data.get("hints") or []),
    }
    while len(result["practice_questions"]) < 3:
        result["practice_questions"].append(f"Practice {task.skill}: explain the key idea in your own words ({len(result['practice_questions']) + 1}).")
    logger.info("Tutor done for task_id=%s", task.id)
    return result
