"""Career report tests: JSON fields, PDF download, ownership (mock LLM)."""
from fastapi.testclient import TestClient


def test_report_json_fields(client: TestClient, auth_headers: dict, goal_id: int):
    """GET /goals/{id}/report returns every specified field."""
    resp = client.get(f"/goals/{goal_id}/report", headers=auth_headers)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    for key in ("readiness_score", "categories", "strong_areas", "weak_areas",
                "tasks_completed", "tasks_total", "avg_score", "latest_interview_score",
                "projected_readiness", "next_steps"):
        assert key in body, f"missing {key}"
    assert set(body["categories"]) == {"technical_skills", "projects", "problem_solving",
                                       "interview", "communication"}
    assert body["tasks_total"] >= 5
    assert 3 <= len(body["next_steps"]) <= 5
    assert 0 <= body["readiness_score"] <= 100


def test_report_pdf_download(client: TestClient, auth_headers: dict, goal_id: int):
    """PDF endpoint returns a non-empty PDF attachment."""
    resp = client.get(f"/goals/{goal_id}/report/pdf", headers=auth_headers)
    assert resp.status_code == 200, resp.text
    assert resp.headers["content-type"] == "application/pdf"
    assert "attachment" in resp.headers["content-disposition"]
    assert resp.content[:5] == b"%PDF-"  # genuine PDF magic bytes
    assert len(resp.content) > 1000


def test_user_b_cannot_read_user_a_report(client: TestClient, make_headers, auth_headers: dict, goal_id: int):
    """Ownership is enforced on both report endpoints (404)."""
    headers_b = make_headers(client)
    assert client.get(f"/goals/{goal_id}/report", headers=headers_b).status_code == 404
    assert client.get(f"/goals/{goal_id}/report/pdf", headers=headers_b).status_code == 404
