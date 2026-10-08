"""Answer payload validation: blank answers are refused, short ones still score.

Offline and mock-LLM only. Covers the three endpoints that take a written
answer: task submit, interview question answer, and review answer.
"""
from fastapi.testclient import TestClient

from app.models import ReviewItem

BLANK_CASES = ({}, {"answer_text": ""}, {"answer_text": "   "})


def _task_id(client: TestClient, headers: dict, goal_id: int) -> int:
    """First planned (non-remedial) task of a goal."""
    tasks = client.get(f"/goals/{goal_id}/tasks", headers=headers).json()
    return next(t["id"] for t in tasks if t["task_type"] != "remedial")


def _start_interview(client: TestClient, headers: dict, goal_id: int) -> dict:
    resp = client.post("/interviews", headers=headers, json={"goal_id": goal_id})
    assert resp.status_code == 201, resp.text
    return resp.json()


def _review_item(db_session, goal_id: int) -> ReviewItem:
    """The review item created by a low-scoring submission for this goal."""
    return db_session.query(ReviewItem).filter(ReviewItem.goal_id == goal_id).order_by(ReviewItem.id).first()


def test_task_submit_rejects_missing_and_blank(client: TestClient, auth_headers: dict, goal_id: int):
    """No answer_text, an empty string, or only spaces are all 422."""
    task_id = _task_id(client, auth_headers, goal_id)
    for payload in BLANK_CASES:
        resp = client.post(f"/tasks/{task_id}/submit", headers=auth_headers, json=payload)
        assert resp.status_code == 422, f"{payload} -> {resp.status_code} {resp.text}"


def test_task_submit_still_accepts_a_short_answer(client: TestClient, auth_headers: dict, goal_id: int):
    """'idk' is real input: it is accepted and simply scores low."""
    task_id = _task_id(client, auth_headers, goal_id)
    resp = client.post(f"/tasks/{task_id}/submit", headers=auth_headers, json={"answer_text": "idk"})
    assert resp.status_code == 200, resp.text
    assert resp.json()["score"] < 70


def test_interview_answer_rejects_missing_and_blank(client: TestClient, auth_headers: dict, goal_id: int):
    """A blank interview answer is 422 and no score is stored."""
    body = _start_interview(client, auth_headers, goal_id)
    url = f"/interviews/{body['id']}/questions/{body['questions'][0]['id']}/answer"
    for payload in BLANK_CASES:
        resp = client.post(url, headers=auth_headers, json=payload)
        assert resp.status_code == 422, f"{payload} -> {resp.status_code} {resp.text}"
    detail = client.get(f"/interviews/{body['id']}", headers=auth_headers).json()
    assert all(q["score"] is None for q in detail["questions"])


def test_interview_answer_still_accepts_a_short_answer(client: TestClient, auth_headers: dict, goal_id: int):
    """A one-word answer is valid input for an interview question."""
    body = _start_interview(client, auth_headers, goal_id)
    resp = client.post(f"/interviews/{body['id']}/questions/{body['questions'][0]['id']}/answer",
                       headers=auth_headers, json={"answer_text": "idk"})
    assert resp.status_code == 200, resp.text
    assert resp.json()["score"] < 70


def test_review_answer_rejects_missing_and_blank(client: TestClient, auth_headers: dict, goal_id: int, db_session):
    """A blank review answer is 422 and the item keeps its current stage."""
    task_id = _task_id(client, auth_headers, goal_id)
    client.post(f"/tasks/{task_id}/submit", headers=auth_headers, json={"answer_text": "idk"})
    item = _review_item(db_session, goal_id)
    assert item is not None
    for payload in BLANK_CASES:
        resp = client.post(f"/reviews/{item.id}/answer", headers=auth_headers, json=payload)
        assert resp.status_code == 422, f"{payload} -> {resp.status_code} {resp.text}"
    db_session.expire_all()
    assert db_session.query(ReviewItem).filter(ReviewItem.id == item.id).first().last_score is None


def test_review_answer_still_accepts_a_short_answer(client: TestClient, auth_headers: dict, goal_id: int, db_session):
    """'idk' is scored and reschedules the item, as before."""
    task_id = _task_id(client, auth_headers, goal_id)
    client.post(f"/tasks/{task_id}/submit", headers=auth_headers, json={"answer_text": "idk"})
    item = _review_item(db_session, goal_id)
    assert item is not None
    resp = client.post(f"/reviews/{item.id}/answer", headers=auth_headers,
                       json={"question_text": "Explain it", "answer_text": "idk"})
    assert resp.status_code == 200, resp.text
    assert resp.json()["score"] < 70
    assert resp.json()["next_due_date"]