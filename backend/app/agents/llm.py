"""LLM client wrapper with strict JSON parsing and mock fallback."""
import logging
import time
from typing import Any

from openai import OpenAI

from app.config import (
    ANTHROPIC_API_KEY,
    GROQ_API_KEY,
    GROQ_MAX_TOKENS,
    GROQ_MODEL_NAME,
    GROQ_REASONING_EFFORT,
    GROQ_TIMEOUT_SECONDS,
    LLM_PROVIDER,
    MODEL_NAME,
    USE_MOCK_LLM,
)
from app.utils.json_utils import extract_json
from app.utils.rate_limit import QuotaExceeded, check_quota

logger = logging.getLogger(__name__)

MAX_TOKENS = 2000
TIMEOUT_S = 30
GROQ_BASE_URL = "https://api.groq.com/openai/v1"
GROQ_RETRY_DELAY_S = 2

# Last real-call failure that triggered a mock fallback. Shape:
# {"category": ..., "type": ..., "status": ...}. Never holds prompts,
# bodies, keys, or headers. Scripts read this to explain fallbacks.
last_llm_failure: dict[str, Any] | None = None

# Lifetime counters for real-vs-mock detection. Scripts snapshot both around
# a call: "real" means live_call_success_count grew and mock_fallback_count
# did not. Quota rejections touch neither (no call made, no mock returned).
live_call_success_count = 0
mock_fallback_count = 0


def _mock_output(agent: str, context: dict[str, Any] | None) -> dict[str, Any]:
    """Return realistic hardcoded output per agent so demos never break."""
    ctx = context or {}
    if agent == "analyst":
        skills: list[str] = list(ctx.get("skills") or ["python", "sql"])
        if not skills:
            skills = ["python", "sql"]
        current_level = {s: 50 for s in skills}
        gaps = [f"Advanced {s}" for s in skills] + ["System design fundamentals"]
        return {
            "current_level": current_level,
            "gaps": gaps,
            "difficulty": "medium",
            "summary": f"Target role '{ctx.get('target_role', 'developer')}' requires deeper "
            f"skills in {', '.join(skills)}. Plan focuses on closing those gaps.",
        }
    if agent == "planner":
        skills: list[str] = list(ctx.get("skills") or ["python", "sql"])
        gaps: list[str] = list(ctx.get("gaps") or [f"Advanced {s}" for s in skills])
        timeline_days: int = int(ctx.get("timeline_days") or 28)
        target_role: str = str(ctx.get("target_role") or "developer")
        weeks = max(1, min(8, (timeline_days + 6) // 7))
        task_types = ["learn", "practice", "project"]
        base_titles = [
            (f"{target_role} fundamentals", "Core concepts and terminology"),
            ("Core skill drill", "Hands-on exercises"),
            ("Guided mini-project", "Build a small end-to-end piece"),
            ("Code review practice", "Read and critique real-world code"),
            ("Debugging workshop", "Diagnose and fix common bugs"),
            ("Testing essentials", "Write unit tests for your code"),
            ("Data handling", "Work with files, APIs, and databases"),
            ("Performance basics", "Measure and improve your solution"),
            ("Capstone planning", "Scope a portfolio-ready project"),
            ("Capstone build", "Implement the capstone project"),
            ("Docs and presentation", "Document and present your work"),
            ("Mock interview prep", "Answer role-style questions"),
        ]
        tasks = []
        total = 12
        for i, (t, d) in enumerate(base_titles[:total]):
            skill = skills[i % len(skills)]
            gap = gaps[i % len(gaps)] if gaps else skill
            tasks.append(
                {
                    "title": f"{t} ({skill})",
                    "description": f"Address gap '{gap}': {d} for the {target_role} path.",
                    "week": (i * weeks // total) + 1,
                    "order": i + 1,
                    "task_type": task_types[i % len(task_types)],
                    "skill": skill,
                }
            )
        return {"tasks": tasks}
    if agent == "tutor":
        title = str(ctx.get("title") or "lesson")
        skill = str(ctx.get("skill") or "general")
        return {
            "explanation": f"This lesson teaches {skill} via '{title}'. Key ideas build step by step with checks.",
            "example": f"Example: a short {skill} walkthrough showing a correct solution and why it works.",
            "practice_questions": [
                f"What is the core idea of {skill} in '{title}'?",
                f"Solve a small {skill} exercise related to '{title}'.",
                f"Explain a common mistake in {skill} and how to avoid it.",
            ],
            "hints": [f"Break '{title}' into smaller {skill} steps and test each one."],
        }
    if agent == "validator":
        answer: str = str(ctx.get("answer_text") or "")
        word_count = len(answer.split())
        if word_count < 5 or len(answer.strip()) < 30:
            return {
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
        return {
            "score": 85,
            "breakdown": {
                "concept_understanding": 85,
                "technical_accuracy": 84,
                "example_quality": 82,
                "clarity": 88,
            },
            "missing": [],
            "strengths": ["clear explanation", "good technical detail", "relevant example"],
            "recommendation": "Nice work. Try a harder follow-up exercise to deepen mastery.",
        }
    if agent == "interviewer_gen":
        role = str(ctx.get("role") or "developer")
        skills: list[str] = list(ctx.get("skills") or ["python"])
        weak: list[str] = list(ctx.get("weak_areas") or [])
        focus = weak[0] if weak else (skills[0] if skills else "core concepts")
        rounds = [
            ("Python", "Explain list comprehensions vs generator expressions in Python, with an example where each is better."),
            ("Python", "How does Python's GIL affect multithreaded programs, and what would you do instead for CPU-bound work?"),
            ("Machine Learning", "Explain bias vs variance and how you diagnose which one hurts your model."),
            ("Machine Learning", "Walk through how you would build and validate a classifier on imbalanced data."),
            ("LLMs", "Explain how retrieval-augmented generation works and when it beats fine-tuning."),
            ("LLMs", "How do you reduce hallucinations in an LLM-powered feature? Name two concrete techniques."),
            ("Project Discussion", "Describe the hardest bug you fixed on a recent project and how you found it."),
            ("Project Discussion", "Walk through the architecture of a project you built: components, data flow, trade-offs."),
            ("Behavioral", "Tell me about a time you disagreed with a teammate and how you resolved it."),
            ("Behavioral", "Describe a tight deadline you faced and how you prioritized the work."),
        ]
        out = []
        order = 0
        for i, (round_name, base_q) in enumerate(rounds):
            order += 1
            skill = skills[i % len(skills)] if skills else "general"
            out.append({
                "round_name": round_name,
                "skill": skill,
                "questions": [f"{base_q} (Relate it to {focus} for the {role} role.)"],
            })
        # Regroup into rounds of 2 questions each.
        result_rounds = []
        for idx in range(0, len(out), 2):
            chunk = out[idx : idx + 2]
            result_rounds.append({
                "round_name": chunk[0]["round_name"],
                "skill": skills[(idx // 2) % len(skills)] if skills else "general",
                "questions": [c["questions"][0] for c in chunk],
            })
        return {"rounds": result_rounds}
    if agent == "interviewer_eval":
        answer: str = str(ctx.get("answer_text") or "")
        if len(answer.split()) < 5 or len(answer.strip()) < 30:
            return {
                "score": 25,
                "strengths": ["attempted the question"],
                "missing": ["substantive answer", "concrete example", "technical reasoning"],
                "feedback": "Your answer was too short. Write a few sentences with one concrete example.",
            }
        return {
            "score": 80,
            "strengths": ["clear structure", "relevant example", "good technical reasoning"],
            "missing": [],
            "feedback": "Strong answer. To reach top marks, add a trade-off or failure mode you considered.",
        }
    if agent == "reporter":
        cats: dict = dict(ctx.get("categories") or {})
        weak: list = list(ctx.get("weak_areas") or ["core concepts"])
        strong: list = list(ctx.get("strong_areas") or [])
        role = str(ctx.get("role") or "developer")
        steps = [
            f"Spend 30 minutes daily on '{weak[0]}' with one small hands-on drill for the {role} path.",
            "Finish one project-type task end to end and write a short README explaining your choices.",
            "Re-take the lowest-scoring practice task and compare your new answer with the tutor's example.",
        ]
        if strong:
            steps.append(f"Use your strength in '{strong[0]}' to mentor-style explain a hard topic in writing.")
        steps.append("Book a mock interview round focused on your two weakest categories, then review the feedback.")
        return {"next_steps": steps[:5]}
    return {"ok": True}


def _is_rate_limit(exc: Exception) -> bool:
    """True when the error is an HTTP 429 (inspects status only, never headers)."""
    if getattr(exc, "status_code", None) == 429:
        return True
    return "ratelimit" in type(exc).__name__.lower()


def _is_model_not_found(exc: Exception) -> bool:
    """True on HTTP 404 / 'model not found' errors (status only, never headers)."""
    if getattr(exc, "status_code", None) == 404:
        return True
    text = type(exc).__name__.lower()
    return "notfound" in text


def _failure_reason(exc: Exception) -> dict[str, Any]:
    """Classify a real-call failure. Never includes prompts, bodies, keys, or headers."""
    name = type(exc).__name__
    status = getattr(exc, "status_code", None)
    lowered = name.lower()
    if "timeout" in lowered or "timedout" in lowered:
        category = "timeout"
    elif "ratelimit" in lowered or status == 429:
        category = "rate_limit"
    elif isinstance(exc, ValueError):
        category = "invalid_json"
    elif status is not None or "api" in lowered or "http" in lowered:
        category = "http_error"
    else:
        category = "schema"
    return {"category": category, "type": name, "status": status}


def _call_anthropic_text(client: Any, model: str, system: str, user: str) -> str:
    """One Anthropic call, returning the concatenated text blocks."""
    resp = client.messages.create(model=model, max_tokens=MAX_TOKENS, system=system,
                                  messages=[{"role": "user", "content": user}])
    return "".join(block.text for block in resp.content if getattr(block, "type", "") == "text")


def _groq_complete(client: OpenAI, system: str, user: str) -> str:
    """One Groq chat completion with JSON mode, returning the message text."""
    kwargs: dict[str, Any] = {
        "model": GROQ_MODEL_NAME,
        "max_tokens": GROQ_MAX_TOKENS,
        "response_format": {"type": "json_object"},
        "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
    }
    # Groq documents reasoning_effort (none/low/medium/high) for its reasoning
    # models such as gpt-oss. Sent only when configured; unset it for
    # non-reasoning models.
    if (GROQ_REASONING_EFFORT or "").strip():
        kwargs["reasoning_effort"] = GROQ_REASONING_EFFORT.strip()
    resp = client.chat.completions.create(**kwargs)
    return resp.choices[0].message.content or ""


def _call_groq_text(system: str, user: str) -> str:
    """Call Groq once; on a 429 wait briefly and retry once, then raise."""
    client = OpenAI(api_key=GROQ_API_KEY or None, base_url=GROQ_BASE_URL,
                    timeout=GROQ_TIMEOUT_SECONDS, max_retries=0)
    try:
        return _groq_complete(client, system, user)
    except Exception as exc:
        if _is_model_not_found(exc):
            # Log model name + status only: never the key or headers.
            logger.warning("Model not found (model=%s status=404). "
                           "Update GROQ_MODEL_NAME in backend/.env (see console.groq.com/docs/models)",
                           GROQ_MODEL_NAME)
        if not _is_rate_limit(exc):
            raise
        logger.warning("Groq rate limit hit for model=%s, retrying once after a short wait", GROQ_MODEL_NAME)
        time.sleep(GROQ_RETRY_DELAY_S)
        return _groq_complete(client, system, user)


def call_llm_json_live(
    system_prompt: str,
    user_prompt: str,
    agent: str = "generic",
    user_id: int | None = None,
) -> dict[str, Any]:
    """Call the real provider and return parsed JSON. Never falls back to mocks.

    Raises QuotaExceeded when the user's hourly budget is spent, or the
    provider's exception on API/parse failure (after one JSON-repair retry).
    """
    if user_id is not None:
        check_quota(user_id)

    provider = (LLM_PROVIDER or "anthropic").strip().lower()
    logger.info("LIVE LLM call agent=%s provider=%s", agent, provider)
    full_system = system_prompt + "\nReturn ONLY valid JSON, no markdown fences or preamble."
    if provider == "groq":
        text = _call_groq_text(full_system, user_prompt)
    else:
        from anthropic import Anthropic

        client = Anthropic(api_key=ANTHROPIC_API_KEY or None, timeout=TIMEOUT_S)
        text = _call_anthropic_text(client, MODEL_NAME, full_system, user_prompt)
    try:
        out = extract_json(text)
    except ValueError:
        logger.warning("LLM JSON parse failed for agent=%s, retrying with repair prompt", agent)
        repair_user = f"Your previous reply was not valid JSON. Fix it and return ONLY the JSON object:\n{text}"
        if provider == "groq":
            text2 = _call_groq_text("Return ONLY valid JSON, no markdown fences or preamble.", repair_user)
        else:
            from anthropic import Anthropic

            client = Anthropic(api_key=ANTHROPIC_API_KEY or None, timeout=TIMEOUT_S)
            repair = client.messages.create(
                model=MODEL_NAME,
                max_tokens=MAX_TOKENS,
                system="Return ONLY valid JSON, no markdown fences or preamble.",
                messages=[{"role": "user", "content": repair_user}],
            )
            text2 = "".join(block.text for block in repair.content if getattr(block, "type", "") == "text")
        out = extract_json(text2)
    global live_call_success_count
    live_call_success_count += 1
    return out


def call_llm_json(
    system_prompt: str,
    user_prompt: str,
    agent: str = "generic",
    fallback_context: dict[str, Any] | None = None,
    user_id: int | None = None,
) -> dict[str, Any]:
    """Call the LLM and return parsed JSON.

    Provider is chosen by LLM_PROVIDER ("anthropic" or "groq").
    Mock calls are never counted; real calls count against the user's hourly
    quota (QuotaExceeded propagates to a 429 via the app exception handler).
    Returns mock output when USE_MOCK_LLM is set or the API call fails.
    Retries once with a JSON-repair prompt if parsing fails.
    """
    if USE_MOCK_LLM:
        logger.info("Using mock LLM output for agent=%s", agent)
        global mock_fallback_count
        mock_fallback_count += 1
        return _mock_output(agent, fallback_context)

    try:
        return call_llm_json_live(system_prompt, user_prompt, agent=agent, user_id=user_id)
    except QuotaExceeded:
        raise
    except Exception as exc:  # noqa: BLE001 - must never break a demo
        # Never log keys, headers, prompts, or bodies: category/type/status only.
        global last_llm_failure
        provider = (LLM_PROVIDER or "anthropic").strip().lower()
        last_llm_failure = _failure_reason(exc)
        mock_fallback_count += 1
        logger.error("LLM call failed for agent=%s provider=%s reason=%s (%s, status=%s). Using mock fallback.",
                     agent, provider, last_llm_failure["category"], last_llm_failure["type"],
                     last_llm_failure["status"])
        return _mock_output(agent, fallback_context)
