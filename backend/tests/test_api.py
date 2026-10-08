"""Core API tests (mock LLM, auth required)."""
from fastapi.testclient import TestClient


def test_create_goal_runs_orchestrator(client: TestClient, auth_headers: dict, goal_id: int):
    """Create goal returns analysis, tasks, and trace entries."""
    resp = client.get(f"/goals/{goal_id}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["goal"]["analysis"]["difficulty"] in ("easy", "medium", "hard")
    trace = client.get(f"/goals/{goal_id}/trace", headers=auth_headers)
    assert trace.status_code == 200
    assert len(trace.json()) >= 2


def test_list_tasks(client: TestClient, auth_headers: dict, goal_id: int):
    """Tasks endpoint lists tasks and supports ?status= filter."""
    resp = client.get(f"/goals/{goal_id}/tasks", headers=auth_headers)
    assert resp.status_code == 200
    tasks = resp.json()
    assert len(tasks) >= 5
    pending = client.get(f"/goals/{goal_id}/tasks", params={"status": "pending"}, headers=auth_headers)
    assert pending.status_code == 200
    assert all(t["status"] == "pending" for t in pending.json())


def test_list_tasks_status_all_returns_everything(client: TestClient, auth_headers: dict, goal_id: int):
    """?status=all means "no filter": every task comes back, and junk is still 422."""
    every = client.get(f"/goals/{goal_id}/tasks", headers=auth_headers).json()
    resp = client.get(f"/goals/{goal_id}/tasks", params={"status": "all"}, headers=auth_headers)
    assert resp.status_code == 200
    assert [t["id"] for t in resp.json()] == [t["id"] for t in every]
    assert len(resp.json()) >= 5
    assert client.get(f"/goals/{goal_id}/tasks", params={"status": "bogus"}, headers=auth_headers).status_code == 422


def test_submit_low_score_creates_remedial(client: TestClient, auth_headers: dict, goal_id: int):
    """A low score leaves the task in_progress and creates ONE remedial task."""
    tasks = client.get(f"/goals/{goal_id}/tasks", headers=auth_headers).json()
    task_id = tasks[0]["id"]
    before = len(client.get(f"/goals/{goal_id}/tasks", headers=auth_headers).json())

    resp = client.post(f"/tasks/{task_id}/submit", headers=auth_headers, json={"answer_text": "idk"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["score"] < 60
    assert body["task_status"] == "in_progress"
    assert body["remedial_task"] is not None
    assert body["remedial_task"]["task_type"] == "remedial"

    after = len(client.get(f"/goals/{goal_id}/tasks", headers=auth_headers).json())
    assert after == before + 1

    # Second low score must NOT create another remedial task.
    resp2 = client.post(f"/tasks/{task_id}/submit", headers=auth_headers, json={"answer_text": "no"})
    assert resp2.status_code == 200
    assert resp2.json()["remedial_task"] is None
    assert len(client.get(f"/goals/{goal_id}/tasks", headers=auth_headers).json()) == after


def test_submit_high_score_completes_task(client: TestClient, auth_headers: dict, goal_id: int):
    """A thorough answer scores >=60 and completes the task."""
    tasks = client.get(f"/goals/{goal_id}/tasks", headers=auth_headers).json()
    # Pick a non-remedial task to avoid interference.
    task_id = next(t["id"] for t in tasks if t["task_type"] != "remedial")
    good_answer = (
        "The core concept is REST API design with FastAPI. "
        "I would define Pydantic models for validation, use dependency injection "
        "for the DB session, and write a concrete example endpoint with tests for clarity."
    )
    resp = client.post(f"/tasks/{task_id}/submit", headers=auth_headers, json={"answer_text": good_answer})
    assert resp.status_code == 200
    body = resp.json()
    assert body["score"] >= 60
    assert body["task_status"] == "completed"
    assert client.get(f"/tasks/{task_id}", headers=auth_headers).json()["status"] == "completed"


def test_progress_endpoint(client: TestClient, auth_headers: dict, goal_id: int):
    """Progress returns completion %, skill scores, and readiness."""
    resp = client.get(f"/goals/{goal_id}/progress", headers=auth_headers)
    assert resp.status_code == 200
    body = resp.json()
    for key in ("completion_pct", "tasks_total", "tasks_completed", "tasks_pending",
                "avg_score", "skill_scores", "weak_areas", "strong_areas", "readiness_score"):
        assert key in body
    assert body["tasks_total"] >= 5
    assert 0 <= body["readiness_score"] <= 100
