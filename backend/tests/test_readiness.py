"""Readiness engine tests: category math, dashboard, snapshots (mock LLM)."""
from datetime import date, datetime, timedelta

from fastapi.testclient import TestClient

from app.models import Task

GOOD_ANSWER = (
    "The core concept is REST API design with FastAPI. "
    "I would define Pydantic models for validation, use dependency injection "
    "for the DB session, and write a concrete example endpoint with tests for clarity."
)

WEIGHTS = {"technical_skills": 0.30, "projects": 0.20, "problem_solving": 0.20,
           "interview": 0.20, "communication": 0.10}


def _progress(client: TestClient, headers: dict, goal_id: int) -> dict:
    """Fetch the progress payload for a goal."""
    resp = client.get(f"/goals/{goal_id}/progress", headers=headers)
    assert resp.status_code == 200, resp.text
    return resp.json()


def _complete_task_of_type(client: TestClient, headers: dict, goal_id: int, task_type: str) -> dict:
    """Submit a good answer to the first task of the given type."""
    tasks = client.get(f"/goals/{goal_id}/tasks", headers=headers).json()
    task_id = next(t["id"] for t in tasks if t["task_type"] == task_type)
    resp = client.post(f"/tasks/{task_id}/submit", headers=headers, json={"answer_text": GOOD_ANSWER})
    assert resp.status_code == 200, resp.text
    return resp.json()


def test_fresh_goal_scores_zero_with_projection(client: TestClient, auth_headers: dict, goal_id: int):
    """A new goal has baseline skill estimates, no progress, and a model projection."""
    body = _progress(client, auth_headers, goal_id)
    assert set(body["categories"]) == set(WEIGHTS)
    # Analyst seeds every skill at 50; nothing else has happened yet.
    assert body["categories"]["technical_skills"] == 50.0
    assert body["categories"]["projects"] == 0
    assert body["categories"]["problem_solving"] == 0
    assert body["categories"]["interview"] == 0
    assert body["categories"]["communication"] == 0
    assert body["readiness_score"] == int(round(50 * WEIGHTS["technical_skills"]))
    # The demo model file ships with the repo, so a projection is returned.
    assert isinstance(body["projected_readiness"], int)


def test_category_math_matches_weights(client: TestClient, auth_headers: dict, goal_id: int):
    """Projects/problem-solving/communication reflect completed work; readiness is weighted."""
    _complete_task_of_type(client, auth_headers, goal_id, "project")
    _complete_task_of_type(client, auth_headers, goal_id, "practice")
    body = _progress(client, auth_headers, goal_id)

    tasks = client.get(f"/goals/{goal_id}/tasks", headers=auth_headers).json()
    project_tasks = [t for t in tasks if t["task_type"] == "project"]
    done_projects = sum(1 for t in project_tasks if t["status"] == "completed")
    assert body["categories"]["projects"] == round(done_projects / len(project_tasks) * 100, 1)
    assert body["categories"]["problem_solving"] == 85.0  # mock validator score
    assert body["categories"]["communication"] == 88.0  # mock validator clarity
    assert body["categories"]["interview"] == 0.0  # no interview yet
    expected = int(round(sum(body["categories"][k] * w for k, w in WEIGHTS.items())))
    assert body["readiness_score"] == expected


def test_interview_feeds_readiness(client: TestClient, auth_headers: dict, goal_id: int):
    """A completed interview sets the interview category to its overall score."""
    assert _progress(client, auth_headers, goal_id)["categories"]["interview"] == 0.0
    resp = client.post("/interviews", headers=auth_headers, json={"goal_id": goal_id})
    session = resp.json()
    for q in session["questions"]:
        client.post(f"/interviews/{session['id']}/questions/{q['id']}/answer",
                    headers=auth_headers, json={"answer_text": GOOD_ANSWER})
    done = client.post(f"/interviews/{session['id']}/complete", headers=auth_headers).json()
    assert _progress(client, auth_headers, goal_id)["categories"]["interview"] == float(done["overall_score"])


def test_dashboard_endpoint(client: TestClient, auth_headers: dict, goal_id: int):
    """Dashboard returns tasks, counts, streak, and the active goal summary."""
    resp = client.get("/dashboard", headers=auth_headers)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    for key in ("today_tasks", "overdue_tasks", "overdue_count", "completed_this_week", "streak_days", "active_goal"):
        assert key in body
    assert body["active_goal"]["id"] == goal_id
    assert body["overdue_count"] == 0
    assert body["streak_days"] == 0

    _complete_task_of_type(client, auth_headers, goal_id, "learn")
    body = client.get("/dashboard", headers=auth_headers).json()
    assert body["completed_this_week"] >= 1
    assert body["streak_days"] >= 1  # completed a task today


def test_overdue_count(client: TestClient, auth_headers: dict, goal_id: int, db_session):
    """A task due yesterday shows up as overdue."""
    tasks = client.get(f"/goals/{goal_id}/tasks", headers=auth_headers).json()
    row = db_session.query(Task).filter(Task.id == tasks[0]["id"]).first()
    row.due_date = datetime.now() - timedelta(days=1)
    db_session.add(row)
    db_session.commit()
    body = client.get("/dashboard", headers=auth_headers).json()
    assert body["overdue_count"] == 1
    assert body["overdue_tasks"][0]["id"] == tasks[0]["id"]


def test_snapshot_history(client: TestClient, auth_headers: dict, goal_id: int):
    """Progress changes record one snapshot per day; history is ordered."""
    assert client.get(f"/goals/{goal_id}/history", headers=auth_headers).json() == []
    _complete_task_of_type(client, auth_headers, goal_id, "learn")
    history = client.get(f"/goals/{goal_id}/history", headers=auth_headers).json()
    assert len(history) == 1
    assert history[0]["date"] == date.today().isoformat()
    assert history[0]["score"] == _progress(client, auth_headers, goal_id)["readiness_score"]
    # A second change the same day updates the row instead of adding one.
    _complete_task_of_type(client, auth_headers, goal_id, "practice")
    assert len(client.get(f"/goals/{goal_id}/history", headers=auth_headers).json()) == 1
