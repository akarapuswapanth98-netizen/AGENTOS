"""Final end-to-end check: one journey across tasks, reviews, quiz, notes, week, PDF."""
from datetime import date

from fastapi.testclient import TestClient

from app.models import ReviewItem

GOOD_ANSWER = (
    "The core concept is REST API design with FastAPI. "
    "I would define Pydantic models for validation, use dependency injection "
    "for the DB session, and write a concrete example endpoint with tests for clarity."
)


def test_final_journey(client: TestClient, make_headers, db_session):
    """Register to career PDF in one flow, touching every Phase 5-9 surface."""
    headers = make_headers(client, email="final@test.dev")

    # Goal with a dated plan.
    created = client.post("/goals", headers=headers, json={
        "title": "Final check", "target_role": "Backend Developer",
        "timeline_days": 28, "current_skills": ["python", "sql"],
    })
    assert created.status_code == 201, created.text
    goal_id = created.json()["goal"]["id"]
    tasks = client.get(f"/goals/{goal_id}/tasks", headers=headers).json()
    assert all(t["due_date"] for t in tasks)
    weak_id = next(t["id"] for t in tasks if t["task_type"] != "remedial")

    # Low score: remedial appears and exactly one review item exists.
    bad = client.post(f"/tasks/{weak_id}/submit", headers=headers, json={"answer_text": "idk"})
    assert bad.json()["task_status"] == "in_progress"
    assert bad.json()["remedial_task"] is not None
    skill = next(t["skill"] for t in tasks if t["id"] == weak_id)
    rows = db_session.query(ReviewItem).filter(ReviewItem.goal_id == goal_id, ReviewItem.skill == skill).all()
    assert len(rows) == 1
    item_id = rows[0].id

    # Backdate to due today, answer well: stage climbs, streak and badge land.
    rows[0].due_date = date.today()
    db_session.add(rows[0])
    db_session.commit()
    assert client.get("/reviews/due", headers=headers).json()["count"] >= 1
    started = client.post(f"/reviews/{item_id}/start", headers=headers).json()
    answered = client.post(f"/reviews/{item_id}/answer", headers=headers,
                           json={"question_text": started["question"], "answer_text": GOOD_ANSWER}).json()
    assert answered["score"] >= 70
    assert answered["stage"] == 1

    # Complete a different task for the streak/badge side.
    strong_id = next(t["id"] for t in tasks if t["id"] != weak_id and t["task_type"] != "remedial")
    done = client.post(f"/tasks/{strong_id}/submit", headers=headers, json={"answer_text": GOOD_ANSWER}).json()
    assert done["task_status"] == "completed"
    assert "first_task" in done["newly_earned_badges"]
    progress = client.get("/me/progress", headers=headers).json()
    assert progress["current_streak"] >= 1

    # Fail a quiz on the same skill: still exactly one review item.
    quiz = client.post("/quizzes/start", headers=headers, json={"skill": skill, "goal_id": goal_id}).json()
    failed = client.post(f"/quizzes/{quiz['id']}/submit", headers=headers, json={"answers": [None] * 5}).json()
    assert failed["score"] == 0
    db_session.expire_all()
    assert db_session.query(ReviewItem).filter(ReviewItem.goal_id == goal_id, ReviewItem.skill == skill).count() == 1

    # Note it, find it by search.
    client.put(f"/tasks/{strong_id}/note", headers=headers, json={"note": "finalcheck memo"})
    found = client.get("/tasks/search", headers=headers, params={"q": "finalcheck"}).json()
    assert any(t["id"] == strong_id for t in found["items"])

    # Weekly summary and career PDF close the loop.
    week = client.get("/me/weekly-summary", headers=headers).json()
    assert week["tasks_completed"] >= 1
    assert week["coaching_note"]
    pdf = client.get("/reports/career/pdf", headers=headers, params={"goal_id": goal_id})
    assert pdf.status_code == 200
    assert pdf.content[:5] == b"%PDF-"
