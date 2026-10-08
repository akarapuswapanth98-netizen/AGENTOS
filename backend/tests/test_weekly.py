"""Weekly summary + PDF export tests: pure math, endpoint, prompts (offline, mock)."""
from datetime import date, timedelta

from fastapi.testclient import TestClient

import app.agents.validator as validator_mod
from app.utils.weekly import average_score, summarize_week, weakest_skill, week_range

GOOD_ANSWER = (
    "The core concept is REST API design with FastAPI. "
    "I would define Pydantic models for validation, use dependency injection "
    "for the DB session, and write a concrete example endpoint with tests for clarity."
)


def test_week_range_offsets_and_boundaries():
    """Offset 0 ends today; 1 ends 7 days back; month/year lines hold."""
    assert week_range(date(2026, 3, 10)) == (date(2026, 3, 4), date(2026, 3, 10))
    assert week_range(date(2026, 3, 10), 1) == (date(2026, 2, 25), date(2026, 3, 3))
    assert week_range(date(2026, 2, 2), 1) == (date(2026, 1, 20), date(2026, 1, 26))
    assert week_range(date(2026, 1, 3), 1) == (date(2025, 12, 21), date(2025, 12, 27))


def test_average_and_weakest():
    """None with no scores; ties break alphabetically; zeros need no errors."""
    assert average_score([]) is None
    assert average_score([80, 90]) == 85.0
    assert weakest_skill([]) is None
    assert weakest_skill([("sql", 70), ("python", 70)]) == "python"
    assert weakest_skill([("sql", 60), ("python", 90)]) == "sql"
    assert summarize_week(0, {}, 0, 0) == {
        "tasks_completed": 0, "average_score": None, "weakest_skill": None,
        "reviews_done": 0, "active_days": 0,
    }


def _summary(client: TestClient, headers: dict, offset: int = 0) -> dict:
    resp = client.get("/me/weekly-summary", headers=headers, params={"week_offset": offset})
    assert resp.status_code == 200, resp.text
    return resp.json()


def test_endpoint_counts_seeded_week(client: TestClient, auth_headers: dict, goal_id: int):
    """This week's completions, scores, and activity show up; last week is empty."""
    tasks = client.get(f"/goals/{goal_id}/tasks", headers=auth_headers).json()
    task_id = next(t["id"] for t in tasks if t["task_type"] != "remedial")
    client.post(f"/tasks/{task_id}/submit", headers=auth_headers, json={"answer_text": GOOD_ANSWER})
    body = _summary(client, auth_headers)
    assert body["tasks_completed"] == 1
    assert body["average_score"] == 85.0
    assert body["active_days"] >= 1
    assert body["coaching_note"]
    last = _summary(client, auth_headers, offset=1)
    assert last["tasks_completed"] == 0
    assert last["average_score"] is None
    assert last["weakest_skill"] is None
    assert "week_start" in last and "week_end" in last


def test_offset_validation_and_ownership(client: TestClient, make_headers, auth_headers: dict, goal_id: int):
    """Bad offsets 422; other users' data never counted."""
    assert client.get("/me/weekly-summary", headers=auth_headers, params={"week_offset": 13}).status_code == 422
    assert client.get("/me/weekly-summary", headers=auth_headers, params={"week_offset": -1}).status_code == 422
    assert client.get("/me/weekly-summary", headers=auth_headers, params={"week_offset": "abc"}).status_code == 422
    headers_b = make_headers(client)
    assert _summary(client, headers_b)["tasks_completed"] == 0
    assert client.get("/me/weekly-summary").status_code == 401


def test_coaching_mock_deterministic_and_safe(client: TestClient, auth_headers: dict, goal_id: int, monkeypatch):
    """Mock paragraph mentions numbers; bad LLM output still returns 200."""
    tasks = client.get(f"/goals/{goal_id}/tasks", headers=auth_headers).json()
    task_id = next(t["id"] for t in tasks if t["task_type"] != "remedial")
    client.post(f"/tasks/{task_id}/submit", headers=auth_headers, json={"answer_text": GOOD_ANSWER})
    note = _summary(client, auth_headers)["coaching_note"]
    assert "1" in note and "85" in note  # deterministic numbers, not prose
    monkeypatch.setattr(validator_mod, "call_llm_json", lambda *a, **k: {"bogus": True})
    monkeypatch.setattr(validator_mod, "USE_MOCK_LLM", False)
    assert _summary(client, auth_headers)["coaching_note"]


def test_coaching_prompt_has_only_numbers(client: TestClient, auth_headers: dict, goal_id: int, monkeypatch):
    """Notes and titles never enter the coaching prompt."""
    tasks = client.get(f"/goals/{goal_id}/tasks", headers=auth_headers).json()
    task = next(t for t in tasks if t["task_type"] != "remedial")
    client.put(f"/tasks/{task['id']}/note", headers=auth_headers, json={"note": "SECRETNOTE123"})
    seen = []
    monkeypatch.setattr(validator_mod, "USE_MOCK_LLM", False)

    def _spy(*args, **kwargs):
        seen.append((args, kwargs))
        return {"note": "ok note " + "x" * 700}  # also proves the ~600 cap

    monkeypatch.setattr(validator_mod, "call_llm_json", _spy)
    note = _summary(client, auth_headers)["coaching_note"]
    assert len(note) <= 600
    prompt_text = " ".join(str(x) for args, _ in seen for x in args)
    assert "SECRETNOTE123" not in prompt_text
    assert tasks[0]["title"] not in prompt_text


def test_weekly_pdf(client: TestClient, auth_headers: dict, goal_id: int):
    """Weekly PDF downloads as a real attachment."""
    resp = client.get("/me/weekly-summary/pdf", headers=auth_headers)
    assert resp.status_code == 200, resp.text
    assert resp.headers["content-type"] == "application/pdf"
    assert "attachment" in resp.headers["content-disposition"]
    assert resp.content[:5] == b"%PDF-"
    assert client.get("/me/weekly-summary/pdf").status_code == 401


def test_career_pdf(client: TestClient, auth_headers: dict, goal_id: int, make_headers):
    """Career PDF reuses report data, escapes markup, and enforces ownership."""
    evil = _summary(client, auth_headers)  # warm streaks; unrelated
    assert evil["coaching_note"]
    client.patch(f"/goals/{goal_id}", headers=auth_headers,
                 json={"title": "Dev <b>& \"quoted\" \u00e9"})
    resp = client.get("/reports/career/pdf", headers=auth_headers, params={"goal_id": goal_id})
    assert resp.status_code == 200, resp.text
    assert resp.headers["content-type"] == "application/pdf"
    assert resp.content[:5] == b"%PDF-"
    assert "career-report.pdf" in resp.headers["content-disposition"]
    assert len(resp.content) > 1000
    headers_b = make_headers(client)
    assert client.get("/reports/career/pdf", headers=headers_b, params={"goal_id": goal_id}).status_code == 404
    assert client.get("/reports/career/pdf").status_code == 401
