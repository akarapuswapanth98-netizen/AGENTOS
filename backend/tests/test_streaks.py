"""Streaks + badges tests: pure math, awards, isolation (offline, mock)."""
from datetime import date, timedelta

from fastapi.testclient import TestClient

import app.agents.validator as validator_mod
from app.models import ActivityDay, UserBadge
from app.utils.streaks import current_streak, longest_streak

GOOD_ANSWER = (
    "The core concept is REST API design with FastAPI. "
    "I would define Pydantic models for validation, use dependency injection "
    "for the DB session, and write a concrete example endpoint with tests for clarity."
)
TODAY = date(2026, 3, 10)


def test_streak_math():
    """Empty, single, pair, gap, yesterday-alive, longest."""
    assert current_streak(set(), TODAY) == 0
    assert current_streak({TODAY}, TODAY) == 1
    assert current_streak({TODAY - timedelta(days=1), TODAY}, TODAY) == 2
    assert current_streak({TODAY - timedelta(days=2), TODAY}, TODAY) == 1  # gap: only today counts
    assert current_streak({TODAY - timedelta(days=1)}, TODAY) == 1  # yesterday keeps it alive
    assert current_streak({TODAY - timedelta(days=2)}, TODAY) == 0
    assert longest_streak({TODAY}) == 1
    assert longest_streak({TODAY - timedelta(days=5), TODAY - timedelta(days=4), TODAY}) == 2


def test_streak_boundaries():
    """Month, year, and midnight boundaries with fixed dates."""
    assert current_streak({date(2026, 1, 31), date(2026, 2, 1)}, date(2026, 2, 1)) == 2
    assert current_streak({date(2025, 12, 31), date(2026, 1, 1)}, date(2026, 1, 1)) == 2
    assert current_streak({date(2026, 3, 9), date(2026, 3, 10)}, date(2026, 3, 10)) == 2
    assert longest_streak({date(2025, 12, 30), date(2025, 12, 31), date(2026, 1, 1)}) == 3


def _good_task(client: TestClient, headers: dict, goal_id: int, index: int = 0) -> dict:
    """Complete the nth non-remedial task with a good answer."""
    tasks = client.get(f"/goals/{goal_id}/tasks", headers=headers).json()
    task_id = [t["id"] for t in tasks if t["task_type"] != "remedial"][index]
    resp = client.post(f"/tasks/{task_id}/submit", headers=headers, json={"answer_text": GOOD_ANSWER})
    assert resp.status_code == 200, resp.text
    return resp.json()


def _progress(client: TestClient, headers: dict) -> dict:
    resp = client.get("/me/progress", headers=headers)
    assert resp.status_code == 200, resp.text
    return resp.json()


def _backdate_days(db_session, user_id: int, days_ago: list[int]) -> None:
    """Insert activity rows N days back for streak tests."""
    for n in days_ago:
        db_session.add(ActivityDay(user_id=user_id, day=date.today() - timedelta(days=n)))
    db_session.commit()


def _user_id(client: TestClient, headers: dict) -> int:
    return client.get("/auth/me", headers=headers).json()["id"]


def test_first_task_badge_and_single_day_row(client: TestClient, auth_headers: dict, goal_id: int, db_session):
    """First completion records one day row and awards first_task (with toast payload)."""
    assert _progress(client, auth_headers)["current_streak"] == 0
    body = _good_task(client, auth_headers, goal_id)
    assert "first_task" in body["newly_earned_badges"]
    assert _progress(client, auth_headers)["current_streak"] == 1
    # Same day twice records one row.
    _good_task(client, auth_headers, goal_id, index=1)
    uid = _user_id(client, auth_headers)
    assert db_session.query(ActivityDay).filter(ActivityDay.user_id == uid).count() == 1


def test_tasks_10_boundary(client: TestClient, auth_headers: dict, goal_id: int):
    """9 completions earn nothing; the 10th earns tasks_10."""
    for i in range(9):
        assert "tasks_10" not in _good_task(client, auth_headers, goal_id, index=i)["newly_earned_badges"]
    assert "tasks_10" in _good_task(client, auth_headers, goal_id, index=9)["newly_earned_badges"]


def test_first_90_boundary(client: TestClient, auth_headers: dict, goal_id: int, monkeypatch):
    """89 earns nothing; 90 earns first_90 (controlled scorer)."""
    tasks = client.get(f"/goals/{goal_id}/tasks", headers=auth_headers).json()
    task_id = next(t["id"] for t in tasks if t["task_type"] != "remedial")

    def _scored(score: int):
        monkeypatch.setattr(validator_mod, "call_llm_json",
                            lambda *a, **k: {"score": score, "breakdown": {}, "missing": [],
                                             "strengths": [], "recommendation": ""})
        resp = client.post(f"/tasks/{task_id}/submit", headers=auth_headers, json={"answer_text": GOOD_ANSWER})
        assert resp.status_code == 200, resp.text
        return resp.json()

    assert "first_90" not in _scored(89)["newly_earned_badges"]
    assert "first_90" in _scored(90)["newly_earned_badges"]


def test_resume_uploaded_badge(client: TestClient, auth_headers: dict):
    """A successful resume analysis awards resume_uploaded."""
    assert all(b["badge"] != "resume_uploaded" for b in _progress(client, auth_headers)["earned"])
    resp = client.post("/resume/analyze", headers=auth_headers,
                       files={"file": ("r.txt", b"Python developer", "text/plain")})
    assert resp.status_code == 200, resp.text
    assert any(b["badge"] == "resume_uploaded" for b in _progress(client, auth_headers)["earned"])


def test_streak_badges_from_backdated_days(client: TestClient, auth_headers: dict, goal_id: int, db_session):
    """3- and 7-day streaks award exactly when reached."""
    uid = _user_id(client, auth_headers)
    _backdate_days(db_session, uid, [1, 2])
    body = _good_task(client, auth_headers, goal_id)  # today makes 3
    assert "streak_3" in body["newly_earned_badges"]
    assert "streak_7" not in body["newly_earned_badges"]
    _backdate_days(db_session, uid, [3, 4, 5, 6])
    body2 = _good_task(client, auth_headers, goal_id, index=1)
    assert "streak_7" in body2["newly_earned_badges"]


def test_awarding_twice_creates_no_duplicates(client: TestClient, auth_headers: dict, goal_id: int, db_session):
    """Repeat activity never duplicates badges."""
    uid = _user_id(client, auth_headers)
    _good_task(client, auth_headers, goal_id)
    _good_task(client, auth_headers, goal_id, index=1)
    rows = db_session.query(UserBadge).filter(UserBadge.user_id == uid).all()
    assert len(rows) == len({r.badge for r in rows})


def test_quiz_attempts_do_not_extend_streak(client: TestClient, auth_headers: dict):
    """Quiz play leaves streak and badges untouched."""
    started = client.post("/quizzes/start", headers=auth_headers, json={"skill": "python"}).json()
    client.post(f"/quizzes/{started['id']}/submit", headers=auth_headers, json={"answers": [0, 1, 2, 3, 0]})
    progress = _progress(client, auth_headers)
    assert progress["current_streak"] == 0
    assert progress["earned"] == []


def test_ownership_and_login(client: TestClient, make_headers, auth_headers: dict, goal_id: int):
    """Users see only their own progress; anonymous gets 401."""
    _good_task(client, auth_headers, goal_id)
    headers_b = make_headers(client)
    assert _progress(client, headers_b)["current_streak"] == 0
    assert _progress(client, headers_b)["earned"] == []
    assert client.get("/me/progress").status_code == 401


def test_delete_user_cascades_streak_tables(client: TestClient, auth_headers: dict, goal_id: int, db_session):
    """Account deletion wipes activity days and badges."""
    _good_task(client, auth_headers, goal_id)
    uid = _user_id(client, auth_headers)
    assert db_session.query(ActivityDay).filter(ActivityDay.user_id == uid).count() == 1
    assert client.request("DELETE", "/auth/me", headers=auth_headers, json={"password": "password123"}).status_code == 204
    db_session.expire_all()
    assert db_session.query(ActivityDay).filter(ActivityDay.user_id == uid).count() == 0
    assert db_session.query(UserBadge).filter(UserBadge.user_id == uid).count() == 0


def test_locked_badges_carry_hints(client: TestClient, auth_headers: dict):
    """Locked badges explain how to earn them."""
    progress = _progress(client, auth_headers)
    assert len(progress["earned"]) + len(progress["locked"]) == 6
    assert all(b["hint"] for b in progress["locked"])
