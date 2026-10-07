"""Shared pytest fixtures: isolated SQLite DB + TestClient + user helpers."""
import itertools
import os

os.environ["USE_MOCK_LLM"] = "true"
os.environ["SECRET_KEY"] = "test-secret-key-that-is-long-enough-32"

import pathlib

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.models import AgentTrace, Goal, InterviewQuestion, InterviewSession, SkillScore, Submission, Task, User  # noqa: F401
from app.main import app

TEST_DB = pathlib.Path(__file__).parent / "test_agentos.db"
if TEST_DB.exists():
    TEST_DB.unlink()
TEST_URL = f"sqlite:///{TEST_DB.resolve()}"

test_engine = create_engine(TEST_URL, connect_args={"check_same_thread": False}, poolclass=StaticPool)
TestingSession = sessionmaker(bind=test_engine, autoflush=False, autocommit=False, expire_on_commit=False)
Base.metadata.create_all(bind=test_engine)


def _override_db():
    db = TestingSession()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def db_session():
    """Direct DB session for test setup (e.g. tweaking due dates)."""
    db = TestingSession()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = _override_db

_email_counter = itertools.count(1)


@pytest.fixture
def client() -> TestClient:
    """TestClient with the test DB wired in."""
    return TestClient(app)


def _register(client: TestClient, email: str, password: str = "password123") -> dict[str, str]:
    """Register a user via the API and return auth headers."""
    resp = client.post("/auth/register", json={"name": "Test", "email": email, "password": password})
    assert resp.status_code == 201, resp.text
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def make_headers():
    """Factory returning fresh auth headers for a new user each call."""

    def _make(client: TestClient, email: str | None = None) -> dict[str, str]:
        n = next(_email_counter)
        return _register(client, email or f"user{n}@test.dev")

    return _make


@pytest.fixture
def auth_headers(client: TestClient, make_headers) -> dict[str, str]:
    """Auth headers for one fresh user."""
    return make_headers(client)


@pytest.fixture
def goal_id(client: TestClient, auth_headers: dict[str, str]) -> int:
    """Create one goal via the API and return its id."""
    resp = client.post(
        "/goals",
        headers=auth_headers,
        json={
            "title": "Become backend developer",
            "target_role": "Backend Developer",
            "timeline_days": 28,
            "current_skills": ["python", "sql"],
        },
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["goal"]["analysis"] is not None
    assert len(body["tasks"]) >= 5
    return body["goal"]["id"]
