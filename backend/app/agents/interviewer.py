"""Interviewer agent: generate round-based questions and evaluate answers."""
import logging

from app.agents.llm import call_llm_json

logger = logging.getLogger(__name__)

ROUNDS = ["Python", "Machine Learning", "LLMs", "Project Discussion", "Behavioral"]
QUESTIONS_PER_ROUND = 2

LOW_SCORE = {
    "score": 25,
    "strengths": ["attempted the question"],
    "missing": ["substantive answer", "concrete example", "technical reasoning"],
    "feedback": "Your answer was too short. Write a few sentences with one concrete example.",
}


def generate_questions(role: str, skills: list[str], weak_areas: list[str], user_id: int | None = None) -> list[dict]:
    """Generate 2 questions per round, biased toward the user's weak areas.

    Returns a flat list of {round_name, question_text, order, skill}.
    """
    logger.info("Interviewer generating questions for role=%s", role)
    system = (
        "You are a hiring manager running a mock interview. Write 2 questions "
        f"for each round ({', '.join(ROUNDS)}), biased toward the candidate's weak areas. "
        'Respond with JSON: {"rounds": [{round_name, skill, questions: [string, string]}]}.'
    )
    user = (
        f"Role: {role}\nSkills: {skills}\nWeak areas (emphasize these): {weak_areas}\n"
        "Generate the interview questions."
    )
    data = call_llm_json(
        system, user, agent="interviewer_gen",
        fallback_context={"role": role, "skills": skills, "weak_areas": weak_areas},
        user_id=user_id,
    )
    out: list[dict] = []
    order = 0
    for block in data.get("rounds") or []:
        round_name = str(block.get("round_name") or "General")
        skill = str(block.get("skill") or "general")
        for q in (block.get("questions") or [])[:QUESTIONS_PER_ROUND]:
            order += 1
            out.append({"round_name": round_name, "question_text": str(q), "order": order, "skill": skill})
    # Guarantee full coverage even if the LLM returns fewer rounds:
    # pad missing slots with templated questions (no extra LLM call).
    if len(out) < len(ROUNDS) * QUESTIONS_PER_ROUND:
        logger.warning("Interviewer returned %d questions, padding to full set", len(out))
        have = len(out)
        focus = (weak_areas[0] if weak_areas else (skills[0] if skills else "core concepts"))
        for i in range(have, len(ROUNDS) * QUESTIONS_PER_ROUND):
            round_name = ROUNDS[(i // QUESTIONS_PER_ROUND) % len(ROUNDS)]
            order += 1
            out.append({
                "round_name": round_name,
                "question_text": f"[{round_name}] Explain a key concept of {focus} for the {role} role, with a concrete example.",
                "order": order,
                "skill": skills[i % len(skills)] if skills else "general",
            })
    logger.info("Interviewer generated %d questions", len(out))
    return out


def evaluate_answer(question_text: str, answer_text: str, user_id: int | None = None) -> dict:
    """Score an interview answer 0-100. Short/empty answers score low."""
    answer = (answer_text or "").strip()
    logger.info("Interviewer evaluating answer len=%d", len(answer))
    if len(answer) < 30 or len(answer.split()) < 5:
        logger.info("Interviewer short-answer fast path")
        return dict(LOW_SCORE)
    system = (
        "You are a strict interviewer. Score the candidate's answer 0-100. "
        'Respond with JSON: {"score": 0-100, "strengths": [string], '
        '"missing": [string], "feedback": string}. Be consistent.'
    )
    user = f"Question: {question_text}\nCandidate answer:\n{answer}\nScore it."
    data = call_llm_json(system, user, agent="interviewer_eval", fallback_context={"answer_text": answer}, user_id=user_id)
    try:
        score = int(data.get("score", 0))
    except (TypeError, ValueError):
        score = 0
    result = {
        "score": max(0, min(100, score)),
        "strengths": list(data.get("strengths") or []),
        "missing": list(data.get("missing") or []),
        "feedback": str(data.get("feedback") or ""),
    }
    logger.info("Interviewer scored answer=%s", result["score"])
    return result
