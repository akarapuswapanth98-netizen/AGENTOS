"""Load environment configuration for AGENTOS."""
import os

from dotenv import load_dotenv

load_dotenv()


def _str_to_bool(value: str | None, default: bool = False) -> bool:
    """Parse a truthy env string to bool."""
    if value is None:
        return default
    return value.strip().lower() in ("1", "true", "yes", "y", "on")


ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
MODEL_NAME: str = os.getenv("MODEL_NAME", "claude-sonnet-4-6")
LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "anthropic").strip().lower()
GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL_NAME: str = os.getenv("GROQ_MODEL_NAME", "openai/gpt-oss-20b")
GROQ_MAX_TOKENS: int = int(os.getenv("GROQ_MAX_TOKENS", "4000"))
GROQ_TIMEOUT_SECONDS: int = int(os.getenv("GROQ_TIMEOUT_SECONDS", "90"))
GROQ_REASONING_EFFORT: str = os.getenv("GROQ_REASONING_EFFORT", "low").strip().lower()
USE_MOCK_LLM: bool = _str_to_bool(os.getenv("USE_MOCK_LLM", "true"), default=False)
DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./agentos.db")
SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-secret-change-me")
ACCESS_TOKEN_MINUTES: int = int(os.getenv("ACCESS_TOKEN_MINUTES", "60"))
LLM_CALLS_PER_HOUR: int = int(os.getenv("LLM_CALLS_PER_HOUR", "60"))
CORS_ORIGINS: list[str] = [
    o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",") if o.strip()
]
