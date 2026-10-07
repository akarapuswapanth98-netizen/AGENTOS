"""Analyst agent: assess current level, gaps, and difficulty."""
import logging
from datetime import datetime

from sqlalchemy.orm import Session

from app.agents.llm import call_llm_json
from app.models import Goal, SkillScore

logger = logging.getLogger(__name__)


def run_analyst(db: Session, goal: Goal, user_id: int | None = None) -> dict:
    """Run skill-gap analysis for a goal, persist it, init SkillScore rows."""
    logger.info("Analyst started for goal_id=%s", goal.id)
    system = (
        "You are a career analyst. Assess the user's skills for the target role. "
        'Respond with JSON: {"current_level": {skill: 0-100}, "gaps": [string], '
        '"difficulty": "easy|medium|hard", "summary": string}.'
    )
    user = (
        f"Goal: {goal.title}\nTarget role: {goal.target_role}\n"
        f"Current skills: {goal.current_skills}\nTimeline: {goal.timeline_days} days.\n"
        "Estimate each known skill 0-100, list key gaps, rate difficulty, summarize."
    )
    data = call_llm_json(
        system,
        user,
        agent="analyst",
        fallback_context={"skills": goal.current_skills, "target_role": goal.target_role},
        user_id=user_id,
    )

    current_level = data.get("current_level") or {}
    if not isinstance(current_level, dict):
        current_level = {}
    # Ensure every declared skill has a score.
    for skill in goal.current_skills or []:
        if skill not in current_level:
            current_level[skill] = 50
    data["current_level"] = {k: int(v) for k, v in current_level.items()}

    goal.analysis = data
    db.add(goal)
    # (Re)initialize SkillScore rows from current_level.
    db.query(SkillScore).filter(SkillScore.goal_id == goal.id).delete()
    for skill, score in data["current_level"].items():
        db.add(SkillScore(goal_id=goal.id, skill=str(skill), score=float(score), updated_at=datetime.now()))
    db.commit()
    db.refresh(goal)
    logger.info("Analyst done for goal_id=%s difficulty=%s", goal.id, data.get("difficulty"))
    return data
