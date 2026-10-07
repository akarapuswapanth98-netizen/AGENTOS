"""Validator agent: strictly score a user's answer."""
import logging

from app.agents.llm import call_llm_json
from app.models import Task

logger = logging.getLogger(__name__)

LOW_SCORE = {
    "score": 10,
    "breakdown": {
        "concept_understanding": 10,
        "technical_accuracy": 10,
        "example_quality": 5,
        "clarity": 15,
    },
    "missing": ["core concept explanation", "concrete example", "technical detail"],
    "strengths": ["attempted the question"],
    "recommendation": "Write at least a few sentences explaining the concept with one concrete example.",
}


class ScoreSchemaError(ValueError):
    """Raised when the model returns a score outside the 0-100 integer scale."""


def _valid_score(value) -> int | None:
    """Return the score as an int when it is already on the 0-100 scale, else None.

    Accepts ints and whole floats/strings in range; rejects bools, fractions,
    non-numeric values, and anything outside 0-100. Never rescales by guessing.
    """
    if isinstance(value, bool):
        return None
    if isinstance(value, float):
        if not value.is_integer():
            return None
        value = int(value)
    elif isinstance(value, str):
        try:
            parsed = float(value.strip())
        except (ValueError, TypeError):
            return None
        if not parsed.is_integer():
            return None
        value = int(parsed)
    if isinstance(value, int) and 0 <= value <= 100:
        return value
    return None


def run_validator(task: Task, answer_text: str, user_id: int | None = None) -> dict:
    """Score an answer 0-100 with a breakdown. Short/empty answers score low."""
    answer = (answer_text or "").strip()
    logger.info("Validator started for task_id=%s answer_len=%d", task.id, len(answer))
    if len(answer) < 30 or len(answer.split()) < 5:
        logger.info("Validator short-answer fast path for task_id=%s", task.id)
        return dict(LOW_SCORE)

    system = (
        "You are a strict but fair evaluator. "
        "SCORE MUST BE AN INTEGER FROM 0 TO 100 (never 0-10: a great answer scores in the 80s-90s). "
        "Every breakdown field is likewise an integer from 0 to 100. "
        'Respond with JSON: {"score": 0-100 integer, "breakdown": {concept_understanding: 0-100 integer, '
        "technical_accuracy: 0-100 integer, example_quality: 0-100 integer, clarity: 0-100 integer}, "
        '"missing": [string], "strengths": [string], "recommendation": string}. '
        "Reject empty or very short answers with a low score. Be consistent."
    )
    user = (
        f"Task: {task.title}\nSkill: {task.skill}\nDescription: {task.description}\n"
        f"User answer:\n{answer}\nScore it."
    )
    data = call_llm_json(
        system, user, agent="validator", fallback_context={"answer_text": answer}, user_id=user_id
    )
    score = _valid_score(data.get("score"))
    if score is None:
        logger.warning("Validator score off-scale for task_id=%s, retrying once with correction", task.id)
        data = call_llm_json(
            system,
            user + "\nCorrection: your score MUST be an integer from 0 to 100 (not 0-10). Reply with the fixed JSON only.",
            agent="validator",
            fallback_context={"answer_text": answer},
            user_id=user_id,
        )
        score = _valid_score(data.get("score"))
    if score is None:
        raise ScoreSchemaError(
            "Validator model returned a score outside the 0-100 integer scale twice; "
            'expected {"score": 0-100 integer, ...}. Not rescaling by guessing.'
        )
    data["score"] = score
    data.setdefault("breakdown", {})
    data.setdefault("missing", [])
    data.setdefault("strengths", [])
    data.setdefault("recommendation", "")
    logger.info("Validator done for task_id=%s score=%s", task.id, data["score"])
    return data
