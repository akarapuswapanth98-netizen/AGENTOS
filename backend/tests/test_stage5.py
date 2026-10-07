"""Stage 5 tests: replan, goal edit, delete account, rate limit (mock LLM)."""
import pytest
from fastapi.testclient import TestClient

import app.agents.llm as llm_module
import app.config as config_module
from app.utils.rate_limit import reset_quotas

GOOD_ANSWER = (
    "The core concept is REST API design with FastAPI. "
    "I would define Pydantic models for validation, use dependency injection "
    "for the DB session, and write a concrete example endpoint with tests for clarity."
)


@pytest.fixture(autouse=True)
def _clean_quotas():
    """Quota counters are global; reset them around every Stage 5 test."""
    reset_quotas()
    yield
    reset_quotas()


def _complete_first_task(client: TestClient, headers: dict, goal_id: int) -> int:
    """Complete one task with a good answer; return its id."""
    tasks = client.get(f"/goals/{goal_id}/tasks", headers=headers).json()
    task_id = next(t["id"] for t in tasks if t["task_type"] != "remedial")
    resp = client.post(f"/tasks/{task_id}/submit", headers=headers, json={"answer_text": GOOD_ANSWER})
    assert resp.status_code == 200, resp.text
    assert resp.json()["task_status"] == "completed"
    return task_id


def test_replan_keeps_completed_replaces_pending(client: TestClient, auth_headers: dict, goal_id: int):
    """Replan preserves completed tasks and swaps out pending ones."""
    from datetime import datetime

    done_id = _complete_first_task(client, auth_headers, goal_id)
    replan_start = datetime.now()

    resp = client.post(f"/goals/{goal_id}/replan", headers=auth_headers)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert len(body["tasks"]) >= 5

    # Completed task survived untouched.
    kept = next(t for t in body["tasks"] if t["id"] == done_id)
    assert kept["status"] == "completed"
    # Every open task is freshly generated (SQLite may reuse freed row ids,
    # so compare by creation time, not by id).
    assert all(t["created_at"] > replan_start.isoformat() for t in body["tasks"] if t["status"] != "completed")
    # Fresh due dates were recomputed.
    assert all(t["due_date"] for t in body["tasks"])
    # Trace shows each replan step.
    messages = " ".join(t["message"] for t in body["trace"])
    assert "replan" in messages.lower()


def test_goal_edit_validation(client: TestClient, auth_headers: dict, goal_id: int):
    """PATCH validates fields and updates the goal."""
    assert client.patch(f"/goals/{goal_id}", headers=auth_headers, json={}).status_code == 422
    assert client.patch(f"/goals/{goal_id}", headers=auth_headers, json={"timeline_days": 0}).status_code == 422
    assert client.patch(f"/goals/{goal_id}", headers=auth_headers, json={"title": ""}).status_code == 422
    resp = client.patch(f"/goals/{goal_id}", headers=auth_headers,
                        json={"title": "New title", "timeline_days": 60})
    assert resp.status_code == 200, resp.text
    assert resp.json()["title"] == "New title"
    assert resp.json()["timeline_days"] == 60


def test_user_b_cannot_replan_or_edit(client: TestClient, make_headers, auth_headers: dict, goal_id: int):
    """User B gets 404 on replan and edit of user A's goal."""
    headers_b = make_headers(client)
    assert client.post(f"/goals/{goal_id}/replan", headers=headers_b).status_code == 404
    assert client.patch(f"/goals/{goal_id}", headers=headers_b, json={"title": "Hijack"}).status_code == 404


def test_delete_account_removes_everything(client: TestClient, make_headers):
    """DELETE /auth/me wipes all user data and blocks later login."""
    headers = make_headers(client, email="goodbye@test.dev")
    resp = client.post("/goals", headers=headers,
                       json={"title": "Temp", "target_role": "Dev", "timeline_days": 14, "current_skills": ["python"]})
    assert resp.status_code == 201
    goal_id = resp.json()["goal"]["id"]
    assert len(client.get("/goals", headers=headers).json()) == 1

    bad = client.request("DELETE", "/auth/me", headers=headers, json={"password": "wrongpass1"})
    assert bad.status_code == 400

    gone = client.request("DELETE", "/auth/me", headers=headers, json={"password": "password123"})
    assert gone.status_code == 204, gone.text
    # Token now belongs to nobody; login with the old credential fails too.
    assert client.get("/goals", headers=headers).status_code == 401
    assert client.post("/auth/login", json={"email": "goodbye@test.dev", "password": "password123"}).status_code == 401
    # A fresh user sees none of the deleted data.
    fresh = make_headers(client)
    assert client.get("/goals", headers=fresh).json() == []
    assert client.get(f"/goals/{goal_id}", headers=fresh).status_code == 404


class _FakeTutorClient:
    """Minimal fake Groq client returning valid tutor JSON (no network)."""

    def __init__(self, *args, **kwargs):
        self.chat = self

    @property
    def completions(self):
        return self

    def create(self, **kwargs):
        return type("R", (), {"choices": [type("C", (), {"message": type("M", (), {
            "content": '{"explanation": "E", "example": "X", "practice_questions": ["Q1", "Q2", "Q3"], "hints": ["H]}',
        })()})()]})()


def test_rate_limit_returns_429(client: TestClient, auth_headers: dict, goal_id: int, monkeypatch):
    """After LLM_CALLS_PER_HOUR real calls, the next one gets 429 with reset time."""
    monkeypatch.setattr(config_module, "LLM_CALLS_PER_HOUR", 2)
    monkeypatch.setattr(llm_module, "USE_MOCK_LLM", False)
    monkeypatch.setattr(llm_module, "LLM_PROVIDER", "groq")
    monkeypatch.setattr(llm_module, "OpenAI", _FakeTutorClient)

    tasks = client.get(f"/goals/{goal_id}/tasks", headers=auth_headers).json()
    task_id = tasks[0]["id"]
    assert client.post(f"/tasks/{task_id}/tutor", headers=auth_headers).status_code == 200
    assert client.post(f"/tasks/{task_id}/tutor", headers=auth_headers).status_code == 200
    limited = client.post(f"/tasks/{task_id}/tutor", headers=auth_headers)
    assert limited.status_code == 429, limited.text
    assert "minutes" in limited.json()["detail"]
