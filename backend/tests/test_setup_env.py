"""Offline tests for scripts/setup_env.py (tmp_path only, never the real .env)."""
import importlib.util
import re
from pathlib import Path

SCRIPT = Path(__file__).parent.parent / "scripts" / "setup_env.py"

FAKE_KEY = "sk-fake-key-for-tests-only-00000"
FAKE_ENV = (
    "# AGENTOS env\n"
    "LLM_PROVIDER=anthropic\n"
    "GROQ_MODEL_NAME=llama-3.3-70b-versatile\n"
    "GROQ_API_KEY=" + FAKE_KEY + "\n"
    "USE_MOCK_LLM=true\n"
    "SECRET_KEY=change-me-to-a-long-random-string\n"
)


def _load(tmp_path: Path):
    """Load setup_env with its paths pointed at tmp_path (real .env untouched)."""
    spec = importlib.util.spec_from_file_location("setup_env_under_test", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    # Patch AFTER exec: executing the module rebinds its own constants.
    module.ENV_PATH = tmp_path / ".env"
    module.BAK_PATH = tmp_path / ".env.bak"
    module.EXAMPLE_PATH = tmp_path / ".env.example"
    return module


def test_configure_updates_names_keeps_key(tmp_path: Path, capsys):
    """Key line passes through byte-identical; only names are printed."""
    (tmp_path / ".env").write_text(FAKE_ENV)
    module = _load(tmp_path)
    assert module.main() == 0
    out = capsys.readouterr().out

    body = (tmp_path / ".env").read_text()
    assert f"GROQ_API_KEY={FAKE_KEY}\n" in body  # key line unchanged
    assert "LLM_PROVIDER=groq" in body
    assert "GROQ_MODEL_NAME=openai/gpt-oss-20b" in body
    assert "USE_MOCK_LLM=false" in body
    assert FAKE_KEY not in out  # value never appears in output
    assert "updated: LLM_PROVIDER" in out
    assert "SECRET_KEY" in out  # placeholder was rotated
    assert "GROQ_API_KEY: filled" in out
    assert re.fullmatch(r"SECRET_KEY=[0-9a-f]{64}\n", [ln for ln in body.splitlines(keepends=True) if ln.startswith("SECRET_KEY=")][0])
    assert body.startswith("# AGENTOS env\n")  # comments and order preserved
    assert (tmp_path / ".env.bak").read_text() == FAKE_ENV  # backup is pre-write state


def test_missing_env_created_from_example(tmp_path: Path):
    """A missing .env is created from the example, then configured."""
    (tmp_path / ".env.example").write_text("LLM_PROVIDER=anthropic\nGROQ_API_KEY=\nSECRET_KEY=change-me-to-a-long-random-string\n")
    module = _load(tmp_path)
    module.main()
    body = (tmp_path / ".env").read_text()
    assert "LLM_PROVIDER=groq" in body
    assert "GROQ_API_KEY=\n" in body
