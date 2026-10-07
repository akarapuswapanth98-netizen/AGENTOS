"""Print the effective LLM configuration. Safe to run: shows no secrets.

Usage (from backend/):  python scripts/check_llm_config.py

Reads config only through app.config. Prints provider, mock flag, model name,
max_tokens, and whether the matching API key is set (boolean only).
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import app.config as config  # noqa: E402  (after sys.path bootstrap)
from app.agents.llm import MAX_TOKENS  # noqa: E402


def main() -> int:
    """Print one `key: value` line per setting. Never prints secret values."""
    provider = (config.LLM_PROVIDER or "anthropic").strip().lower()
    if provider == "groq":
        model = config.GROQ_MODEL_NAME
        max_tokens = config.GROQ_MAX_TOKENS
        timeout = config.GROQ_TIMEOUT_SECONDS
        key_set = bool(config.GROQ_API_KEY)
    else:
        model = config.MODEL_NAME
        max_tokens = MAX_TOKENS  # Anthropic path always uses the shared limit
        timeout = 30  # Anthropic path always uses the shared TIMEOUT_S
        key_set = bool(config.ANTHROPIC_API_KEY)
    print(f"provider: {provider}")
    print(f"mock: {config.USE_MOCK_LLM}")
    print(f"model: {model}")
    print(f"max_tokens: {max_tokens}")
    print(f"timeout: {timeout}")
    print(f"key: {'set' if key_set else 'missing'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
