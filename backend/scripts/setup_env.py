"""Configure backend/.env for Groq. The runner executes this, not pytest.

Usage (from backend/):  python scripts/setup_env.py

Creates backend/.env from backend/.env.example when missing, backs the
pre-write file up to backend/.env.bak, then updates ONLY these variables:
LLM_PROVIDER, GROQ_MODEL_NAME, USE_MOCK_LLM, and SECRET_KEY (only when empty
or still the placeholder, using secrets.token_hex(32)).

API key lines are copied through byte-for-byte: never read for content beyond
an empty/filled check, never stored, never printed. Only variable NAMES are
printed, plus whether GROQ_API_KEY is empty or filled.
"""
import re
import secrets
import shutil
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BACKEND_DIR / ".env"
EXAMPLE_PATH = BACKEND_DIR / ".env.example"
BAK_PATH = BACKEND_DIR / ".env.bak"

SECRET_PLACEHOLDER = "change-me-to-a-long-random-string"

FIXED_UPDATES = {
    "LLM_PROVIDER": "groq",
    "GROQ_MODEL_NAME": "openai/gpt-oss-20b",
    "USE_MOCK_LLM": "false",
}


def _replace_value(line: str, name: str, value: str) -> str | None:
    """Return the line with its value replaced, or None when not a match.

    Matches only real assignments (`NAME=...`, optional indent); commented
    lines like `# NAME=...` never match. The newline style is preserved.
    """
    ending = "\n" if line.endswith("\n") else ""
    match = re.match(rf"^(\s*{re.escape(name)}=).*$", line.rstrip("\r\n"))
    if not match:
        return None
    return f"{match.group(1)}{value}{ending}"


def _is_empty_assignment(line: str, name: str) -> bool | None:
    """True if the line assigns an empty value, False if filled, None if no match."""
    ending_stripped = line.rstrip("\r\n")
    match = re.match(rf"^\s*{re.escape(name)}=(.*)$", ending_stripped)
    if not match:
        return None
    return match.group(1).strip() == ""


def configure_env(env_path: Path = ENV_PATH, example_path: Path = EXAMPLE_PATH,
                  bak_path: Path = BAK_PATH) -> tuple[list[str], bool]:
    """Configure the env file. Returns (changed variable names, key filled)."""
    if not env_path.exists():
        shutil.copyfile(example_path, env_path)
    # Back up the exact pre-write state before touching anything.
    shutil.copyfile(env_path, bak_path)

    lines = env_path.read_text().splitlines(keepends=True)
    changed: list[str] = []
    out: list[str] = []
    for line in lines:
        replaced = False
        for name, value in FIXED_UPDATES.items():
            new_line = _replace_value(line, name, value)
            if new_line is not None and new_line != line:
                out.append(new_line)
                changed.append(name)
                replaced = True
                break
        if replaced:
            continue
        secret_empty = _is_empty_assignment(line, "SECRET_KEY")
        if secret_empty is None:
            out.append(line)  # API key lines and everything else pass through untouched.
        elif secret_empty or line.rstrip("\r\n").split("=", 1)[1].strip() == SECRET_PLACEHOLDER:
            out.append(f"SECRET_KEY={secrets.token_hex(32)}\n")
            changed.append("SECRET_KEY")
        else:
            out.append(line)
    env_path.write_text("".join(out))

    key_filled = False
    for line in out:
        empty = _is_empty_assignment(line, "GROQ_API_KEY")
        if empty is not None:
            key_filled = not empty
            break
    return changed, key_filled


def main() -> int:
    """Run the configuration and print names only (never values)."""
    changed, key_filled = configure_env(ENV_PATH, EXAMPLE_PATH, BAK_PATH)
    print(f"updated: {', '.join(changed) if changed else 'nothing'}")
    print(f"GROQ_API_KEY: {'filled' if key_filled else 'empty'}")
    if not key_filled:
        print("Now open backend/.env and paste your Groq key after GROQ_API_KEY= (no quotes, no spaces).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
