"""Safe JSON extraction/repair helpers for LLM output."""
import json
import logging
import re

logger = logging.getLogger(__name__)


def extract_json(text: str) -> dict:
    """Extract the first JSON object from raw LLM text.

    Handles ```json fences, leading/trailing prose, and returns
    the parsed dict. Raises ValueError if no valid object found.
    """
    if not text or not text.strip():
        raise ValueError("Empty LLM response")
    cleaned = text.strip()
    # Strip markdown code fences.
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
    cleaned = re.sub(r"\s*```$", "", cleaned).strip()

    # Fast path: whole string is JSON.
    try:
        parsed = json.loads(cleaned)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass

    # Fallback: extract first {...} block (balanced scan).
    start = cleaned.find("{")
    if start == -1:
        raise ValueError("No JSON object found in LLM response")
    depth = 0
    in_str = False
    esc = False
    for i in range(start, len(cleaned)):
        ch = cleaned[i]
        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                in_str = False
        else:
            if ch == '"':
                in_str = True
            elif ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    candidate = cleaned[start : i + 1]
                    try:
                        parsed = json.loads(candidate)
                    except json.JSONDecodeError as exc:
                        raise ValueError(f"Invalid JSON in LLM response: {exc}") from exc
                    if not isinstance(parsed, dict):
                        raise ValueError("Top-level JSON is not an object")
                    return parsed
    raise ValueError("Unbalanced JSON in LLM response")
