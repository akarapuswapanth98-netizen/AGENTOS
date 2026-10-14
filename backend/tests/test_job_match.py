"""Tests for job-match router: evidence-based matching of role and skills."""
from fastapi.testclient import TestClient


def test_job_match_unauthenticated(client: TestClient):
    """POST /job-match/analyze requires authorization."""
    res = client.post("/job-match/analyze", json={"target_role": "Software Engineer"})
    assert res.status_code == 401


def test_job_match_basic(client: TestClient, auth_headers: dict):
    """POST /job-match/analyze returns matched and missing requirements."""
    payload = {
        "target_role": "Full Stack Python Developer",
        "job_description": "Looking for a Python and FastAPI engineer with React frontend skills and SQL experience.",
        "candidate_skills": ["Python", "FastAPI", "React", "Docker"],
    }
    res = client.post("/job-match/analyze", headers=auth_headers, json=payload)
    assert res.status_code == 200
    data = res.json()

    assert data["target_role"] == "Full Stack Python Developer"
    assert "match_score" in data
    assert "ats_score" in data
    assert 0 <= data["match_score"] <= 100
    assert 0 <= data["ats_score"] <= 100
    assert len(data["matched_requirements"]) > 0
    assert len(data["key_strengths"]) > 0
    assert "summary" in data


def test_job_match_with_goal(client: TestClient, auth_headers: dict, goal_id: int):
    """POST /job-match/analyze extracts skills from the user's goal."""
    payload = {
        "goal_id": goal_id,
        "target_role": "Backend Architect",
        "job_description": "We need someone with strong database and container skills.",
        "candidate_skills": [],
    }
    res = client.post("/job-match/analyze", headers=auth_headers, json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["match_score"] >= 35
