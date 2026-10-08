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


def test_manual_status_patch(client: TestClient, auth_headers: dict, goal_id: int):
    """PATCH /tasks/{id}/status sets the status, stamps completed_at, rejects junk."""
    tasks = client.get(f"/goals/{goal_id}/tasks", headers=auth_headers).json()
    task_id = next(t["id"] for t in tasks if t["task_type"] != "remedial")

    resp = client.patch(f"/tasks/{task_id}/status", headers=auth_headers, json={"status": "in_progress"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "in_progress"
    assert resp.json()["completed_at"] is None

    resp = client.patch(f"/tasks/{task_id}/status", headers=auth_headers, json={"status": "completed"})
    assert resp.status_code == 200
    assert resp.json()["completed_at"] is not None
    assert client.get(f"/tasks/{task_id}", headers=auth_headers).json()["status"] == "completed"

    # Re-opening clears the completion stamp, and a bad status is still 422.
    resp = client.patch(f"/tasks/{task_id}/status", headers=auth_headers, json={"status": "pending"})
    assert resp.status_code == 200 and resp.json()["completed_at"] is None
    assert client.patch(f"/tasks/{task_id}/status", headers=auth_headers, json={"status": "bogus"}).status_code == 422
    assert client.patch(f"/tasks/{task_id}/status", headers=auth_headers, json={}).status_code == 422
    assert client.patch(f"/tasks/{task_id}/status", json={"status": "completed"}).status_code == 401


def test_submissions_history_lists_answers(client: TestClient, auth_headers: dict, goal_id: int):
    """GET /tasks/{id}/submissions is empty, then one row per submission."""
    tasks = client.get(f"/goals/{goal_id}/tasks", headers=auth_headers).json()
    task_id = next(t["id"] for t in tasks if t["task_type"] != "remedial")

    empty = client.get(f"/tasks/{task_id}/submissions", headers=auth_headers)
    assert empty.status_code == 200 and empty.json() == []

    answer = "A concrete answer about REST design with an example endpoint and a test for each branch."
    first = client.post(f"/tasks/{task_id}/submit", headers=auth_headers, json={"answer_text": answer})
    assert first.status_code == 200
    second = client.post(f"/tasks/{task_id}/submit", headers=auth_headers, json={"answer_text": "shorter answer but real"})
    assert second.status_code == 200

    rows = client.get(f"/tasks/{task_id}/submissions", headers=auth_headers).json()
    assert len(rows) == 2
    assert {r["answer_text"] for r in rows} == {answer, "shorter answer but real"}
    assert all(isinstance(r["score"], int) and 0 <= r["score"] <= 100 for r in rows)
    assert all(r["created_at"] for r in rows)
    # The list is per task and per user.
    assert client.get(f"/tasks/{task_id}/submissions").status_code == 401
