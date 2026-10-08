"""Resume upload over real multipart, on an isolated tmp_path SQLite database.

Offline and mock-LLM only: no network, no backend/.env, no shared test DB. The
conftest suite covers the same behaviour on the shared engine; this module
re-proves the multipart contract (happy path plus every 4xx branch and the
cross-user boundary) against its own throwaway database file, and checks that a
blank task answer never becomes a 500.
"""
import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Mock mode before the app is imported anywhere in this module.
os.environ.setdefault("USE_MOCK_LLM", "true")
os.environ.setdefault("LLM_MOCK", "true")

from app.database import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402

RESUME_TXT = "Jane Doe\nBackend developer with 5 years of Python and SQL. Built FastAPI services with Docker."
BIG = b"a" * (2 * 1024 * 1024 + 1)


@pytest.fixture
def isolated_client(tmp_path):
    """TestClient wired to a SQLite file under tmp_path; restores conftest's override."""
    db_file = tmp_path / "resume_multipart.db"
    engine = create_engine(f"sqlite:///{db_file.as_posix()}", connect_args={"check_same_thread": False},
                           poolclass=StaticPool)
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)

    def _override_db():
        session = Session()
        try:
            yield session
        finally:
            session.close()

    previous = app.dependency_overrides.get(get_db)
    app.dependency_overrides[get_db] = _override_db
    try:
        yield TestClient(app)
    finally:
        # Put back exactly what conftest installed so later tests are unaffected.
        if previous is None:
            app.dependency_overrides.pop(get_db, None)
        else:
            app.dependency_overrides[get_db] = previous
        engine.dispose()


def _register(client: TestClient, email: str) -> dict[str, str]:
    resp = client.post("/auth/register", json={"name": "Iso", "email": email, "password": "password123"})
    assert resp.status_code == 201, resp.text
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


def _goal(client: TestClient, headers: dict) -> dict:
    resp = client.post("/goals", headers=headers, json={
        "title": "Become backend developer", "target_role": "Backend Developer",
        "timeline_days": 28, "current_skills": ["python", "sql"],
    })
    assert resp.status_code == 201, resp.text
    return resp.json()


def _upload(client: TestClient, headers: dict | None, filename: str, content: bytes,
            goal_id: int | None = None, ctype: str = "text/plain"):
    """POST one resume as multipart/form-data with part name 'file'."""
    data = {} if headers is None or goal_id is None else {"goal_id": str(goal_id)}
    request_headers = {} if headers is None else headers
    return client.post("/resume/analyze", headers=request_headers, data=data,
                       files={"file": (filename, content, ctype)})


def test_mock_mode_is_active():
    """Guard: this module must never reach a real provider."""
    from app.agents import llm as llm_mod

    assert llm_mod.USE_MOCK_LLM is True


def test_multipart_txt_upload_returns_200(isolated_client: TestClient):
    """A small .txt resume uploaded as multipart returns 200 with a full body."""
    client = isolated_client
    headers_a = _register(client, "iso-a@multipart.dev")
    goal = _goal(client, headers_a)

    resp = _upload(client, headers_a, "cv.txt", RESUME_TXT.encode(), goal_id=goal["goal"]["id"])
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert set(body) == {"id", "score", "detected_skills", "skill_gaps", "feedback", "goal_id", "created_at"}
    assert "python" in body["detected_skills"]
    assert isinstance(body["score"], int) and 0 <= body["score"] <= 100
    assert isinstance(body["feedback"], list) and body["feedback"]
    assert body["goal_id"] == goal["goal"]["id"]

    # The stored analysis is retrievable, and the upload really was multipart.
    latest = client.get("/resume/latest", headers=headers_a)
    assert latest.status_code == 200
    assert latest.json()["id"] == body["id"]
    assert resp.request.headers["content-type"].startswith("multipart/form-data; boundary=")


def test_multipart_error_branches_are_4xx(isolated_client: TestClient):
    """Oversized, wrong type, and empty uploads are clear 4xx, never 500."""
    client = isolated_client
    headers = _register(client, "iso-errors@multipart.dev")

    cases = [
        ("oversized .txt", _upload(client, headers, "big.txt", BIG), 413),
        ("wrong extension", _upload(client, headers, "cv.exe", b"MZ\x90\x00", ctype="application/octet-stream"), 415),
        ("fake pdf", _upload(client, headers, "cv.pdf", b"this is not a pdf", ctype="application/pdf"), 415),
        ("empty file", _upload(client, headers, "cv.txt", b""), 400),
        ("no file part at all", client.post("/resume/analyze", headers=headers), 422),
    ]
    for label, resp, expected in cases:
        assert resp.status_code == expected, f"{label}: {resp.status_code} {resp.text[:200]}"
        assert resp.status_code < 500, f"{label} produced a server error"
        assert resp.json()["detail"], f"{label} has no explanation"


def test_upload_requires_a_token(isolated_client: TestClient):
    """No token means 401, and the body never reaches the analyzer."""
    client = isolated_client
    assert client.get("/resume/latest").status_code == 401
    resp = _upload(client, None, "cv.txt", RESUME_TXT.encode())
    assert resp.status_code == 401
    assert client.get("/resume/latest").status_code == 401  # still nothing stored


def test_user_b_cannot_read_user_a_resume(isolated_client: TestClient):
    """User B sees no analysis until B uploads one of their own."""
    client = isolated_client
    headers_a = _register(client, "iso-owner@multipart.dev")
    headers_b = _register(client, "iso-other@multipart.dev")

    assert client.get("/resume/latest", headers=headers_b).status_code == 404
    resp = _upload(client, headers_a, "cv.txt", RESUME_TXT.encode())
    assert resp.status_code == 200

    assert client.get("/resume/latest", headers=headers_b).status_code == 404
    assert client.get("/resume/latest", headers=headers_a).status_code == 200
    # A garbage token is refused too.
    assert client.get("/resume/latest", headers={"Authorization": "Bearer not.a.token"}).status_code == 401


def test_blank_task_answer_is_a_clear_4xx_not_500(isolated_client: TestClient):
    """Missing, empty, and whitespace-only answers never reach the validator."""
    client = isolated_client
    headers = _register(client, "iso-blank@multipart.dev")
    goal = _goal(client, headers)
    task_id = next(t["id"] for t in client.get(f"/goals/{goal['goal']['id']}/tasks", headers=headers).json()
                   if t["task_type"] != "remedial")

    for label, payload in (("missing", {}), ("empty", {"answer_text": ""}), ("spaces", {"answer_text": "   "})):
        resp = client.post(f"/tasks/{task_id}/submit", headers=headers, json=payload)
        assert resp.status_code in (400, 422), f"{label}: {resp.status_code} {resp.text[:200]}"
        assert resp.status_code < 500

    # Nothing was stored, and a real short answer is still accepted and scores low.
    assert client.get(f"/tasks/{task_id}/submissions", headers=headers).json() == []
    ok = client.post(f"/tasks/{task_id}/submit", headers=headers, json={"answer_text": "idk"})
    assert ok.status_code == 200, ok.text
    assert ok.json()["score"] < 70