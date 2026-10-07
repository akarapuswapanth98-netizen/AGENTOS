"""Interview simulator tests (mock LLM, auth required)."""
from fastapi.testclient import TestClient

GOOD_ANSWER = (
    "I would explain the concept step by step with a concrete example, "
    "discuss the trade-offs involved, and describe how I applied it on a past project."
)


def _start(client: TestClient, headers: dict, goal_id: int) -> dict:
    """Start an interview session and return its payload."""
    resp = client.post("/interviews", headers=headers, json={"goal_id": goal_id})
    assert resp.status_code == 201, resp.text
    return resp.json()


def test_start_session_has_ten_questions(client: TestClient, auth_headers: dict, goal_id: int):
    """POST /interviews creates 5 rounds x 2 questions."""
    body = _start(client, auth_headers, goal_id)
    assert body["status"] == "in_progress"
    assert len(body["questions"]) == 10
    rounds = {q["round_name"] for q in body["questions"]}
    assert rounds == {"Python", "Machine Learning", "LLMs", "Project Discussion", "Behavioral"}


def test_answer_question_stores_score(client: TestClient, auth_headers: dict, goal_id: int):
    """Answering a question stores its score and feedback."""
    body = _start(client, auth_headers, goal_id)
    qid = body["questions"][0]["id"]
    resp = client.post(f"/interviews/{body['id']}/questions/{qid}/answer", headers=auth_headers,
                       json={"answer_text": GOOD_ANSWER})
    assert resp.status_code == 200
    assert resp.json()["score"] >= 60
    detail = client.get(f"/interviews/{body['id']}", headers=auth_headers).json()
    stored = next(q for q in detail["questions"] if q["id"] == qid)
    assert stored["score"] is not None
    assert stored["answer_text"] == GOOD_ANSWER


def test_complete_updates_scores_and_skills(client: TestClient, auth_headers: dict, goal_id: int):
    """Completing stores overall score, updates SkillScores, writes a trace."""
    body = _start(client, auth_headers, goal_id)
    for q in body["questions"]:
        client.post(f"/interviews/{body['id']}/questions/{q['id']}/answer", headers=auth_headers,
                    json={"answer_text": GOOD_ANSWER})
    resp = client.post(f"/interviews/{body['id']}/complete", headers=auth_headers)
    assert resp.status_code == 200
    done = resp.json()
    assert done["status"] == "completed"
    assert done["overall_score"] is not None and done["overall_score"] >= 60
    assert len(done["round_scores"]) == 5
    # SkillScores moved up from the 50 baseline via the WMA update.
    progress = client.get(f"/goals/{goal_id}/progress", headers=auth_headers).json()
    assert any(s["score"] > 50 for s in progress["skill_scores"])
    trace = client.get(f"/goals/{goal_id}/trace", headers=auth_headers).json()
    assert any(t["agent_name"] == "interviewer" for t in trace)


def test_user_b_cannot_touch_user_a_session(client: TestClient, make_headers, goal_id: int, auth_headers: dict):
    """Ownership is enforced on answer and complete endpoints (404)."""
    body = _start(client, auth_headers, goal_id)
    qid = body["questions"][0]["id"]
    headers_b = make_headers(client)
    assert client.post(f"/interviews/{body['id']}/questions/{qid}/answer", headers=headers_b,
                       json={"answer_text": GOOD_ANSWER}).status_code == 404
    assert client.post(f"/interviews/{body['id']}/complete", headers=headers_b).status_code == 404
    assert client.get(f"/interviews/{body['id']}", headers=headers_b).status_code == 404


def test_interview_list(client: TestClient, auth_headers: dict, goal_id: int):
    """GET /interviews lists the user's sessions."""
    _start(client, auth_headers, goal_id)
    resp = client.get("/interviews", headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.json()) >= 1
