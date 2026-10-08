"""Deploy-readiness tests: prod guards, CORS parsing, health, repo hygiene (offline)."""
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

import app.config as config_mod
from app.config import _parse_origins, validate_production_config

ROOT = Path(__file__).parent.parent.parent


def test_production_refuses_bad_jwt(monkeypatch):
    """Missing, placeholder, or short JWT_SECRET blocks production startup."""
    monkeypatch.setattr(config_mod, "ENVIRONMENT", "production")
    monkeypatch.setattr(config_mod, "CORS_ORIGINS", ["http://x.example"])
    for bad in ("change-me-to-anything", "short"):
        monkeypatch.setattr(config_mod, "JWT_SECRET", bad)
        with pytest.raises(RuntimeError) as exc:
            validate_production_config()
        # Fixed message text: the secret value appears nowhere in it.
        assert str(exc.value).startswith("Refusing production start: JWT_SECRET")
    monkeypatch.setattr(config_mod, "JWT_SECRET", "")
    with pytest.raises(RuntimeError):
        validate_production_config()
    monkeypatch.setattr(config_mod, "JWT_SECRET", "a-strong-random-secret-32-chars!!")
    validate_production_config()  # valid config passes


def test_production_refuses_star_cors(monkeypatch):
    """A wildcard origin blocks production startup."""
    monkeypatch.setattr(config_mod, "ENVIRONMENT", "production")
    monkeypatch.setattr(config_mod, "JWT_SECRET", "a-strong-random-secret-32-chars!!")
    monkeypatch.setattr(config_mod, "CORS_ORIGINS", ["http://x.example", "*"])
    with pytest.raises(RuntimeError):
        validate_production_config()


def test_dev_mode_stays_permissive(monkeypatch):
    """Dev mode never refuses to start, whatever the values."""
    monkeypatch.setattr(config_mod, "ENVIRONMENT", "dev")
    monkeypatch.setattr(config_mod, "JWT_SECRET", "")
    monkeypatch.setattr(config_mod, "CORS_ORIGINS", ["*"])
    validate_production_config()


def test_cors_parsing():
    """Spaces, trailing commas, and empties are cleaned up."""
    assert _parse_origins(" http://a ,http://b, ") == ["http://a", "http://b"]
    assert _parse_origins("") == []
    assert _parse_origins(None) == []
    assert _parse_origins(",,,") == []


def test_health_ok_and_anonymous(client: TestClient):
    """Health is 200 with a working DB and needs no login."""
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_health_degraded_on_db_failure(client: TestClient):
    """A dead database yields 503 degraded with no details leaked."""
    from sqlalchemy.exc import OperationalError

    from app.database import get_db
    from app.main import app

    class _DeadDB:
        """Session stand-in whose queries always fail (no real connection)."""

        def execute(self, *args, **kwargs):
            raise OperationalError("SELECT 1", {}, Exception("connection refused"))

    original = app.dependency_overrides.get(get_db)
    app.dependency_overrides[get_db] = lambda: _DeadDB()
    try:
        resp = client.get("/health")
    finally:
        # Restore conftest's override: deleting it would leak later tests
        # onto the real dev database for the rest of the pytest process.
        if original is None:
            app.dependency_overrides.pop(get_db, None)
        else:
            app.dependency_overrides[get_db] = original
    assert resp.status_code == 503
    assert resp.json() == {"status": "degraded"}


def test_repo_files_have_no_secrets():
    """Dockerfiles, compose, workflow, and docs carry no keys or live placeholders."""
    targets = [
        ROOT / "backend" / "Dockerfile",
        ROOT / "frontend" / "Dockerfile",
        ROOT / "docker-compose.yml",
        ROOT / ".github" / "workflows" / "ci.yml",
        ROOT / "README.md",
        ROOT / "backend" / "README.md",
        ROOT / "frontend" / "README.md",
    ]
    targets += sorted((ROOT / "docs").glob("*.md"))
    patterns = ("gsk_", "sk-ant-", "AKIA", "BEGIN RSA PRIVATE KEY", "BEGIN OPENSSH PRIVATE KEY")
    for path in targets:
        assert path.exists(), path
        text = path.read_text()
        for marker in patterns:
            assert marker not in text, f"{path.name} leaks a secret-like value"
        assert "change-me" not in text, f"{path.name} uses a placeholder as a real value"


def test_dockerignore_covers_secrets_and_dbs():
    """Both .dockerignore files exclude env files and databases."""
    for service in ("backend", "frontend"):
        text = (ROOT / service / ".dockerignore").read_text()
        assert ".env" in text
    assert "*.db" in (ROOT / "backend" / ".dockerignore").read_text()
