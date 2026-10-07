"""End-to-end journey test (mock LLM, no network): the full user story in one go."""
from fastapi.testclient import TestClient

GOOD_ANSWER = (
    "The core concept is REST API design with FastAPI. "
    "I would define Pydantic models for validation, use dependency injection "
    "for the DB session, and write a concrete example endpoint with tests for clarity."
)
INTERVIEW_ANSWER = (
    "I would explain the concept step by step with a concrete example, "
    "discuss the trade-offs involved, and describe how I applied it on a past project."
)


def test_full_journey(client: TestClient, make_headers):
    """register -> goal -> tutor -> bad submit (remedial) -> good submit -> interview -> report -> replan -> delete."""
    headers = make_headers(client, email="journey@test.dev")

    # Create goal with a generated plan.
    created = client.post("/goals", headers=headers, json={
        "title": "Become backend developer", "target_role": "Backend Developer",
        "timeline_days": 28, "current_skills": ["python", "sql"],
    })
    assert created.status_code == 201, created.text
    goal_id = created.json()["goal"]["id"]
    tasks = client.get(f"/goals/{goal_id}/tasks", headers=headers).json()
    assert len(tasks) >= 5
    task_id = next(t["id"] for t in tasks if t["task_type"] != "remedial")

    # Tutor explains the task.
    tutor = client.post(f"/tasks/{task_id}/tutor", headers=headers)
    assert tutor.status_code == 200, tutor.text
    assert len(tutor.json()["practice_questions"]) == 3

    # Bad submission leaves the task open and spawns exactly one remedial task.
    bad = client.post(f"/tasks/{task_id}/submit", headers=headers, json={"answer_text": "idk"})
    assert bad.status_code == 200, bad.text
    assert bad.json()["task_status"] == "in_progress"
    assert bad.json()["remedial_task"] is not None

    # Good submission completes the task.
    good = client.post(f"/tasks/{task_id}/submit", headers=headers, json={"answer_text": GOOD_ANSWER})
    assert good.status_code == 200, good.text
    assert good.json()["task_status"] == "completed"

    # Interview: answer everything, then complete.
    session = client.post("/interviews", headers=headers, json={"goal_id": goal_id}).json()
    for q in session["questions"]:
        ans = client.post(f"/interviews/{session['id']}/questions/{q['id']}/answer",
                          headers=headers, json={"answer_text": INTERVIEW_ANSWER})
        assert ans.status_code == 200, ans.text
    done = client.post(f"/interviews/{session['id']}/complete", headers=headers)
    assert done.status_code == 200, done.text
    assert done.json()["overall_score"] is not None

    # Report JSON and PDF.
    report = client.get(f"/goals/{goal_id}/report", headers=headers)
    assert report.status_code == 200, report.text
    assert len(report.json()["next_steps"]) >= 3
    pdf = client.get(f"/goals/{goal_id}/report/pdf", headers=headers)
    assert pdf.status_code == 200
    assert pdf.headers["content-type"] == "application/pdf"
    assert len(pdf.content) > 1000

    # Replan keeps the completed task.
    replan = client.post(f"/goals/{goal_id}/replan", headers=headers)
    assert replan.status_code == 200, replan.text
    assert any(t["id"] == task_id and t["status"] == "completed" for t in replan.json()["tasks"])

    # Delete account wipes everything; the token stops working.
    assert client.request("DELETE", "/auth/me", headers=headers, json={"password": "password123"}).status_code == 204
    assert client.get("/goals", headers=headers).status_code == 401
