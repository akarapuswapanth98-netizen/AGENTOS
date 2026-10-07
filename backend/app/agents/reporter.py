"""Reporter agent: turn readiness data into 3-5 recommended next steps."""
import logging

from app.agents.llm import call_llm_json

logger = logging.getLogger(__name__)


def generate_next_steps(
    role: str,
    categories: dict[str, float],
    weak_areas: list[str],
    strong_areas: list[str],
    avg_score: float | None,
    interview_score: int | None,
    user_id: int | None = None,
) -> list[str]:
    """Generate 3-5 concrete next steps from the goal's readiness picture."""
    logger.info("Reporter generating next steps for role=%s", role)
    system = (
        "You are a career coach. Given readiness categories, weak/strong areas, "
        "and recent scores, write 3-5 short concrete next steps. "
        'Respond with JSON: {"next_steps": [string, ...]}.'
    )
    user = (
        f"Role: {role}\nCategories: {categories}\nWeak areas: {weak_areas}\n"
        f"Strong areas: {strong_areas}\nAverage task score: {avg_score}\n"
        f"Latest interview score: {interview_score}\nList the next steps."
    )
    data = call_llm_json(
        system, user, agent="reporter",
        fallback_context={
            "role": role, "categories": categories,
            "weak_areas": weak_areas, "strong_areas": strong_areas,
        },
        user_id=user_id,
    )
    steps = [str(s).strip() for s in (data.get("next_steps") or []) if str(s).strip()]
    if len(steps) < 3:  # Guarantee a useful list even from a thin LLM reply.
        logger.warning("Reporter returned %d steps, padding to 3", len(steps))
        focus = weak_areas[0] if weak_areas else "core concepts"
        pads = [
            f"Spend 30 minutes daily on '{focus}' with one small hands-on drill.",
            "Finish one project-type task end to end and document your choices.",
            "Re-take the lowest-scoring practice task and compare with the tutor's example.",
        ]
        for p in pads:
            if p not in steps:
                steps.append(p)
            if len(steps) >= 3:
                break
    result = steps[:5]
    logger.info("Reporter produced %d next steps", len(result))
    return result
