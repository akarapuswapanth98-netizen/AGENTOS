"""Load environment configuration for AGENTOS."""
import os

from dotenv import load_dotenv

load_dotenv()


def _str_to_bool(value: str | None, default: bool = False) -> bool:
    """Parse a truthy env string to bool."""
    if value is None:
        return default
    return value.strip().lower() in ("1", "true", "yes", "y", "on")


def _first_set(*names: str) -> str | None:
    """First set (non-None) env value among the names, for legacy fallbacks."""
    for name in names:
        value = os.getenv(name)
        if value is not None:
            return value
    return None


def _parse_origins(raw: str | None) -> list[str]:
    """Split comma-separated origins, dropping blanks (spaces, trailing commas)."""
    if not raw:
        return []
    return [o.strip() for o in raw.split(",") if o.strip()]


ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
MODEL_NAME: str = os.getenv("MODEL_NAME", "claude-sonnet-4-6")
LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "anthropic").strip().lower()
GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL_NAME: str = os.getenv("GROQ_MODEL_NAME", "openai/gpt-oss-20b")
GROQ_MAX_TOKENS: int = int(os.getenv("GROQ_MAX_TOKENS", "4000"))
GROQ_TIMEOUT_SECONDS: int = int(os.getenv("GROQ_TIMEOUT_SECONDS", "90"))
GROQ_REASONING_EFFORT: str = os.getenv("GROQ_REASONING_EFFORT", "low").strip().lower()
ENVIRONMENT: str = os.getenv("ENVIRONMENT", "dev").strip().lower()
DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./agentos.db")
# Canonical names first, legacy names as fallbacks (old .env files keep working).
LLM_MOCK: bool = _str_to_bool(_first_set("LLM_MOCK", "USE_MOCK_LLM") or "true")
USE_MOCK_LLM: bool = LLM_MOCK  # legacy alias
JWT_SECRET: str = _first_set("JWT_SECRET", "SECRET_KEY") or "dev-secret-change-me"
SECRET_KEY: str = JWT_SECRET  # legacy alias
JWT_EXPIRE_MINUTES: int = int(_first_set("JWT_EXPIRE_MINUTES", "ACCESS_TOKEN_MINUTES") or "60")
ACCESS_TOKEN_MINUTES: int = JWT_EXPIRE_MINUTES  # legacy alias
LLM_CALLS_PER_HOUR: int = int(os.getenv("LLM_CALLS_PER_HOUR", "60"))
CORS_ORIGINS: list[str] = _parse_origins(
    os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000")
)


def validate_production_config() -> None:
    """Refuse production startup on unsafe config. Messages never include values."""
    if ENVIRONMENT != "production":
        return
    if not JWT_SECRET or "change-me" in JWT_SECRET or len(JWT_SECRET) < 32:
        raise RuntimeError(
            "Refusing production start: JWT_SECRET is missing, a placeholder, or shorter than 32 characters."
        )
    if "*" in CORS_ORIGINS:
        raise RuntimeError('Refusing production start: CORS_ORIGINS must not contain "*".')
