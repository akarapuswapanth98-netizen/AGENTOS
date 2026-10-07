"""Auth tests: register, login, guards, and cross-user isolation."""
from fastapi.testclient import TestClient


def test_register_and_me(client: TestClient):
    """Register returns a token and /auth/me returns the profile."""
    resp = client.post("/auth/register", json={"name": "Ada", "email": "ada@test.dev", "password": "password123"})
    assert resp.status_code == 201
    headers = {"Authorization": f"Bearer {resp.json()['access_token']}"}
    me = client.get("/auth/me", headers=headers)
    assert me.status_code == 200
    assert me.json()["email"] == "ada@test.dev"


def test_register_duplicate_email(client: TestClient, make_headers):
    """Registering the same email twice is rejected."""
    make_headers(client, email="dupe@test.dev")
    resp = client.post("/auth/register", json={"name": "X", "email": "dupe@test.dev", "password": "password123"})
    assert resp.status_code == 400


def test_register_short_password_rejected(client: TestClient):
    """Passwords shorter than 8 chars are rejected with 422."""
    resp = client.post("/auth/register", json={"name": "X", "email": "short@test.dev", "password": "abc"})
    assert resp.status_code == 422


def test_login_wrong_password(client: TestClient, make_headers):
    """Login with a bad password returns 401."""
    make_headers(client, email="bob@test.dev")
    resp = client.post("/auth/login", json={"email": "bob@test.dev", "password": "wrongpass1"})
    assert resp.status_code == 401


def test_access_without_token_is_401(client: TestClient):
    """Protected routes require a Bearer token."""
    assert client.get("/goals").status_code == 401
    assert client.get("/auth/me").status_code == 401


def test_user_cannot_read_other_users_goal(client: TestClient, make_headers):
    """User A cannot read user B's goal (404, not 403, to avoid leaking)."""
    headers_a = make_headers(client, email="alice@test.dev")
    resp = client.post(
        "/goals",
        headers=headers_a,
        json={"title": "A goal", "target_role": "Dev", "timeline_days": 14, "current_skills": ["python"]},
    )
    assert resp.status_code == 201
    other_goal_id = resp.json()["goal"]["id"]

    headers_b = make_headers(client, email="mallory@test.dev")
    assert client.get(f"/goals/{other_goal_id}", headers=headers_b).status_code == 404
    assert client.get(f"/goals/{other_goal_id}/progress", headers=headers_b).status_code == 404
    tasks = client.get(f"/goals/{other_goal_id}/tasks", headers=headers_a).json()
    assert client.get(f"/tasks/{tasks[0]['id']}", headers=headers_b).status_code == 404


def test_update_name_and_change_password(client: TestClient, make_headers):
    """PATCH /auth/me renames; change-password rotates the credential."""
    headers = make_headers(client, email="carol@test.dev")
    me = client.patch("/auth/me", headers=headers, json={"name": "Carol New"})
    assert me.status_code == 200
    assert me.json()["name"] == "Carol New"

    bad = client.post("/auth/change-password", headers=headers,
                      json={"current_password": "nope12345", "new_password": "newpassword1"})
    assert bad.status_code == 400

    ok = client.post("/auth/change-password", headers=headers,
                     json={"current_password": "password123", "new_password": "newpassword1"})
    assert ok.status_code == 200
    login = client.post("/auth/login", json={"email": "carol@test.dev", "password": "newpassword1"})
    assert login.status_code == 200
