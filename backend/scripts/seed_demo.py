"""Seed a lively demo account. Run manually, never from pytest.

Usage (from backend/):  USE_MOCK_LLM=true python scripts/seed_demo.py

Creates demo@agentos.dev / demo12345 with one goal, a finished plan, scored
submissions (one low score that spawned a remedial task), a completed
interview, and 14 days of rising readiness snapshots. Idempotent: an existing
demo user has only their own data reset. Uses the real API stack with the
mock LLM, so no network calls happen.
"""
import os
import sys
from datetime import date, timedelta
from pathlib import Path

os.environ["USE_MOCK_LLM"] = "true"
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient  # noqa: E402  (after bootstrap)

from app.database import Base, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models import (  # noqa: E402
    AgentTrace,
    Goal,
    InterviewQuestion,
    InterviewSession,
    ReadinessSnapshot,
    SkillScore,
    Submission,
    Task,
    User,
)
from app.database import SessionLocal  # noqa: E402

DEMO_EMAIL = "demo@agentos.dev"
DEMO_PASSWORD = "demo12345"

GOOD_ANSWER = (
    "The core concept is REST API design with FastAPI. "
    "I would define Pydantic models for validation, use dependency injection "
    "for the DB session, and write a concrete example endpoint with tests for clarity."
)
INTERVIEW_ANSWER = (
    "I would explain the concept step by step with a concrete example, "
    "discuss the trade-offs involved, and describe how I applied it on a past project."
)


def _wipe_demo_data(db, user: User) -> None:
    """Delete everything owned by the demo user (their data only)."""
    goal_ids = [g.id for g in db.query(Goal.id).filter(Goal.user_id == user.id).all()]
    if goal_ids:
        task_ids = [t.id for t in db.query(Task.id).filter(Task.goal_id.in_(goal_ids)).all()]
        session_ids = [s.id for s in db.query(InterviewSession.id).filter(InterviewSession.goal_id.in_(goal_ids)).all()]
        if session_ids:
            db.query(InterviewQuestion).filter(InterviewQuestion.session_id.in_(session_ids)).delete(synchronize_session=False)
        db.query(InterviewSession).filter(InterviewSession.goal_id.in_(goal_ids)).delete(synchronize_session=False)
        db.query(ReadinessSnapshot).filter(ReadinessSnapshot.goal_id.in_(goal_ids)).delete(synchronize_session=False)
        if task_ids:
            db.query(Submission).filter(Submission.task_id.in_(task_ids)).delete(synchronize_session=False)
            db.query(Task).filter(Task.id.in_(task_ids)).delete(synchronize_session=False)
        db.query(AgentTrace).filter(AgentTrace.goal_id.in_(goal_ids)).delete(synchronize_session=False)
        db.query(SkillScore).filter(SkillScore.goal_id.in_(goal_ids)).delete(synchronize_session=False)
        db.query(Goal).filter(Goal.id.in_(goal_ids)).delete(synchronize_session=False)
    db.query(User).filter(User.id == user.id).delete(synchronize_session=False)
    db.commit()


def main() -> int:
    """Build the demo world through the real API (mock LLM, no network)."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == DEMO_EMAIL).first()
        if existing is not None:
            _wipe_demo_data(db, existing)
            print("reset existing demo user data")
    finally:
        db.close()

    client = TestClient(app)
    reg = client.post("/auth/register", json={"name": "Demo", "email": DEMO_EMAIL, "password": DEMO_PASSWORD})
    assert reg.status_code == 201, reg.text
    headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}

    goal = client.post("/goals", headers=headers, json={
        "title": "Become a backend developer",
        "target_role": "Backend Developer",
        "timeline_days": 28,
        "current_skills": ["python", "sql"],
    }).json()
    goal_id = goal["goal"]["id"]
    tasks = client.get(f"/goals/{goal_id}/tasks", headers=headers).json()

    # Two strong submissions, one weak one (spawns the remedial task).
    client.post(f"/tasks/{tasks[0]['id']}/submit", headers=headers, json={"answer_text": GOOD_ANSWER})
    client.post(f"/tasks/{tasks[1]['id']}/submit", headers=headers, json={"answer_text": GOOD_ANSWER})
    bad = client.post(f"/tasks/{tasks[2]['id']}/submit", headers=headers, json={"answer_text": "idk"}).json()
    assert bad["remedial_task"] is not None
    client.post(f"/tasks/{bad['remedial_task']['id']}/submit", headers=headers, json={"answer_text": GOOD_ANSWER})

    session = client.post("/interviews", headers=headers, json={"goal_id": goal_id}).json()
    for q in session["questions"]:
        client.post(f"/interviews/{session['id']}/questions/{q['id']}/answer",
                    headers=headers, json={"answer_text": INTERVIEW_ANSWER})
    done = client.post(f"/interviews/{session['id']}/complete", headers=headers).json()
    assert done["status"] == "completed"

    # 14-day upward readiness trend (overwrites today's auto-snapshot).
    db = SessionLocal()
    try:
        db.query(ReadinessSnapshot).filter(ReadinessSnapshot.goal_id == goal_id).delete(synchronize_session=False)
        today = date.today()
        for i in range(14):
            db.add(ReadinessSnapshot(goal_id=goal_id, date=today - timedelta(days=13 - i), score=25 + i * 4))
        db.commit()
        counts = {
            "tasks": db.query(Task).filter(Task.goal_id == goal_id).count(),
            "submissions": db.query(Submission).join(Task, Task.id == Submission.task_id).filter(Task.goal_id == goal_id).count(),
            "snapshots": db.query(ReadinessSnapshot).filter(ReadinessSnapshot.goal_id == goal_id).count(),
        }
    finally:
        db.close()

    print(f"demo ready: {DEMO_EMAIL} goal={goal_id} interview={done['overall_score']} {counts}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
