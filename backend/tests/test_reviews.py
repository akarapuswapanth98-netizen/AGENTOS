"""Spaced-repetition tests: schedule math, review flow, ownership (offline, mock)."""
from datetime import date, timedelta

from fastapi.testclient import TestClient

import app.agents.validator as validator_mod
from app.utils.review_schedule import INTERVALS, next_state

GOOD_ANSWER = (
    "The core concept is REST API design with FastAPI. "
    "I would define Pydantic models for validation, use dependency injection "
    "for the DB session, and write a concrete example endpoint with tests for clarity."
)


def test_intervals_per_stage():
    """A passing score climbs one stage and waits the NEW stage's interval."""
    day = date(2026, 3, 10)
    assert next_state(0, 80, day) == (1, day + timedelta(days=3))
    assert next_state(1, 80, day) == (2, day + timedelta(days=7))
    assert next_state(2, 80, day) == (3, day + timedelta(days=14))


def test_bad_score_resets_to_stage_zero():
    """Anything below 70 falls back to stage 0, due tomorrow."""
    day = date(2026, 3, 10)
    assert next_state(3, 40, day) == (0, day + timedelta(days=1))
    assert next_state(2, 69, day) == (0, day + timedelta(days=1))
    assert next_state(2, 70, day) == (3, day + timedelta(days=INTERVALS[3]))


def test_last_stage_repeats():
    """Stage 3 stays at 3 and repeats every 14 days."""
    day = date(2026, 3, 10)
    assert next_state(3, 95, day) == (3, day + timedelta(days=14))


def test_due_dates_across_boundaries():
    """Fixed 'today' values prove month- and year-boundary math."""
    assert next_state(1, 80, date(2026, 1, 30))[1] == date(2026, 2, 6)  # stage 2: +7 days
    assert next_state(2, 80, date(2026, 12, 28))[1] == date(2027, 1, 11)  # stage 3: +14 days
    assert next_state(3, 80, date(2026, 12, 20))[1] == date(2027, 1, 3)  # repeat: +14 days
    assert next_state(0, 80, date(2026, 1, 30))[1] == date(2026, 2, 2)  # stage 1: +3 days


def _submit(client: TestClient, headers: dict, task_id: int, answer: str) -> dict:
    resp = client.post(f"/tasks/{task_id}/submit", headers=headers, json={"answer_text": answer})
    assert resp.status_code == 200, resp.text
    return resp.json()


def _goal_items(db_session, goal_id: int) -> list:
    """All review items for a goal (new items are due tomorrow, not today)."""
    from app.models import ReviewItem

    return db_session.query(ReviewItem).filter(ReviewItem.goal_id == goal_id).order_by(ReviewItem.id).all()


def _backdate(db_session, item_id: int) -> None:
    """Make one item due today so /due returns it."""
    from app.models import ReviewItem

    row = db_session.query(ReviewItem).filter(ReviewItem.id == item_id).first()
    row.due_date = date.today()
    db_session.add(row)
    db_session.commit()


def test_low_task_score_creates_exactly_one_item(client: TestClient, auth_headers: dict, goal_id: int, db_session):
    """A sub-70 submission creates one review item; a repeat resets, not duplicates."""
    tasks = client.get(f"/goals/{goal_id}/tasks", headers=auth_headers).json()
    task_id = next(t["id"] for t in tasks if t["task_type"] != "remedial")
    _submit(client, auth_headers, task_id, "idk")
    items = _goal_items(db_session, goal_id)
    assert len(items) == 1
    assert items[0].stage == 0
    assert items[0].due_date == date.today() + timedelta(days=1)  # stage 0: due tomorrow
    # Second low score for the same skill resets the same row.
    _submit(client, auth_headers, task_id, "nope")
    items2 = _goal_items(db_session, goal_id)
    assert len(items2) == 1
    assert items2[0].id == items[0].id
    _backdate(db_session, items2[0].id)
    assert client.get("/reviews/due", headers=auth_headers).json()["count"] == 1


def test_high_task_score_creates_none(client: TestClient, auth_headers: dict, goal_id: int):
    """Scores >= 70 schedule nothing."""
    tasks = client.get(f"/goals/{goal_id}/tasks", headers=auth_headers).json()
    task_id = next(t["id"] for t in tasks if t["task_type"] != "remedial")
    _submit(client, auth_headers, task_id, GOOD_ANSWER)
    assert client.get("/reviews/due", headers=auth_headers).json()["count"] == 0


def test_due_returns_only_due_items(client: TestClient, auth_headers: dict, goal_id: int, db_session):
    """Future items stay hidden until their due date."""
    from app.models import ReviewItem

    tasks = client.get(f"/goals/{goal_id}/tasks", headers=auth_headers).json()
    task_id = next(t["id"] for t in tasks if t["task_type"] != "remedial")
    _submit(client, auth_headers, task_id, "idk")
    item_id = _goal_items(db_session, goal_id)[0].id
    _backdate(db_session, item_id)
    assert client.get("/reviews/due", headers=auth_headers).json()["count"] == 1
    row = db_session.query(ReviewItem).filter(ReviewItem.id == item_id).first()
    row.due_date = date.today() + timedelta(days=30)
    db_session.add(row)
    db_session.commit()
    assert client.get("/reviews/due", headers=auth_headers).json()["count"] == 0


def test_answer_updates_stage_and_due_date(client: TestClient, auth_headers: dict, goal_id: int, db_session):
    """A good review answer climbs a stage and pushes the due date out."""
    tasks = client.get(f"/goals/{goal_id}/tasks", headers=auth_headers).json()
    task_id = next(t["id"] for t in tasks if t["task_type"] != "remedial")
    _submit(client, auth_headers, task_id, "idk")
    item_id = _goal_items(db_session, goal_id)[0].id
    _backdate(db_session, item_id)
    started = client.post(f"/reviews/{item_id}/start", headers=auth_headers)
    assert started.status_code == 200, started.text
    assert started.json()["question"]
    answered = client.post(f"/reviews/{item_id}/answer", headers=auth_headers,
                           json={"question_text": started.json()["question"], "answer_text": GOOD_ANSWER})
    assert answered.status_code == 200, answered.text
    body = answered.json()
    assert body["score"] >= 70
    assert body["stage"] == 1
    assert body["next_due_date"] == str(date.today() + timedelta(days=INTERVALS[1]))


def test_invalid_llm_json_falls_back_safely(client: TestClient, auth_headers: dict, goal_id: int, db_session, monkeypatch):
    """Garbage scorer output records a safe zero at stage 0 instead of crashing."""
    tasks = client.get(f"/goals/{goal_id}/tasks", headers=auth_headers).json()
    task_id = next(t["id"] for t in tasks if t["task_type"] != "remedial")
    _submit(client, auth_headers, task_id, "idk")
    item_id = _goal_items(db_session, goal_id)[0].id
    _backdate(db_session, item_id)
    monkeypatch.setattr(validator_mod, "call_llm_json", lambda *a, **k: {"bogus": 1})
    resp = client.post(f"/reviews/{item_id}/answer", headers=auth_headers,
                       json={"question_text": "q", "answer_text": GOOD_ANSWER})
    assert resp.status_code == 200, resp.text
    assert resp.json()["score"] == 0
    assert resp.json()["stage"] == 0


def test_ownership_and_login(client: TestClient, make_headers, auth_headers: dict, goal_id: int, db_session):
    """User B gets 404 on user A's items; anonymous gets 401."""
    tasks = client.get(f"/goals/{goal_id}/tasks", headers=auth_headers).json()
    task_id = next(t["id"] for t in tasks if t["task_type"] != "remedial")
    _submit(client, auth_headers, task_id, "idk")
    item_id = _goal_items(db_session, goal_id)[0].id
    headers_b = make_headers(client)
    assert client.post(f"/reviews/{item_id}/start", headers=headers_b).status_code == 404
    assert client.post(f"/reviews/{item_id}/answer", headers=headers_b,
                       json={"question_text": "q", "answer_text": "a"}).status_code == 404
    assert client.get("/reviews/due").status_code == 401


def test_goal_delete_cascades_reviews(client: TestClient, auth_headers: dict, goal_id: int, db_session):
    """Deleting a goal removes its review items."""
    tasks = client.get(f"/goals/{goal_id}/tasks", headers=auth_headers).json()
    task_id = next(t["id"] for t in tasks if t["task_type"] != "remedial")
    _submit(client, auth_headers, task_id, "idk")
    assert len(_goal_items(db_session, goal_id)) == 1
    assert client.delete(f"/goals/{goal_id}", headers=auth_headers).status_code == 204
    assert len(_goal_items(db_session, goal_id)) == 0
