"""Due-date tests: pure logic, PATCH, /me/overdue (offline, mock)."""
from datetime import date, timedelta

from fastapi.testclient import TestClient

from app.utils.task_dates import days_overdue, default_due_date, is_overdue

TODAY = date(2026, 3, 10)


def test_pure_overdue_rules():
    """Yesterday yes, today/tomorrow/None/completed no."""
    assert is_overdue(TODAY - timedelta(days=1), "pending", TODAY) is True
    assert is_overdue(TODAY, "pending", TODAY) is False
    assert is_overdue(TODAY + timedelta(days=1), "pending", TODAY) is False
    assert is_overdue(None, "pending", TODAY) is False
    assert is_overdue(TODAY - timedelta(days=9), "completed", TODAY) is False
    assert is_overdue(TODAY - timedelta(days=9), "in_progress", TODAY) is True


def test_pure_boundaries_and_days():
    """Month/year boundaries and non-negative day counts."""
    assert is_overdue(date(2026, 1, 31), "pending", date(2026, 2, 1)) is True
    assert is_overdue(date(2025, 12, 31), "pending", date(2026, 1, 1)) is True
    assert days_overdue(TODAY - timedelta(days=3), TODAY) == 3
    assert days_overdue(TODAY, TODAY) == 0
    assert days_overdue(None, TODAY) == 0


def test_default_due_date():
    """Week N lands 7*N days after the start, across month lines."""
    start = date(2026, 1, 28)
    assert default_due_date(1, start) == date(2026, 2, 4)
    assert default_due_date(2, start) == date(2026, 2, 11)


def _first_task(client: TestClient, headers: dict, goal_id: int) -> dict:
    tasks = client.get(f"/goals/{goal_id}/tasks", headers=headers).json()
    return next(t for t in tasks if t["task_type"] != "remedial")


def test_plan_and_remedial_due_dates(client: TestClient, auth_headers: dict, goal_id: int):
    """Plan tasks carry due dates; remedial tasks land ~3 days out."""
    task = _first_task(client, auth_headers, goal_id)
    assert task["due_date"] is not None
    bad = client.post(f"/tasks/{task['id']}/submit", headers=auth_headers, json={"answer_text": "idk"})
    assert bad.status_code == 200, bad.text
    remedial = bad.json()["remedial_task"]
    assert remedial is not None
    due_day = remedial["due_date"][:10]
    assert due_day == str(date.today() + timedelta(days=3))


def test_patch_due_date(client: TestClient, auth_headers: dict, goal_id: int, make_headers):
    """Valid date sticks, null clears, bad format 422s, others' tasks 404."""
    task = _first_task(client, auth_headers, goal_id)
    ok = client.patch(f"/tasks/{task['id']}/due-date", headers=auth_headers, json={"due_date": "2026-04-01"})
    assert ok.status_code == 200, ok.text
    assert ok.json()["due_date"].startswith("2026-04-01")
    cleared = client.patch(f"/tasks/{task['id']}/due-date", headers=auth_headers, json={"due_date": None})
    assert cleared.status_code == 200
    assert cleared.json()["due_date"] is None
    assert client.patch(f"/tasks/{task['id']}/due-date", headers=auth_headers,
                        json={"due_date": "next Friday"}).status_code == 422
    headers_b = make_headers(client)
    assert client.patch(f"/tasks/{task['id']}/due-date", headers=headers_b,
                        json={"due_date": "2026-04-01"}).status_code == 404
    assert client.patch(f"/tasks/{task['id']}/due-date", json={"due_date": "2026-04-01"}).status_code == 401


def test_overdue_endpoint(client: TestClient, auth_headers: dict, goal_id: int, make_headers):
    """Only the caller's overdue incomplete tasks, most overdue first."""
    tasks = client.get(f"/goals/{goal_id}/tasks", headers=auth_headers).json()
    plain = [t for t in tasks if t["task_type"] != "remedial"]
    old = plain[0]["id"]
    mid = plain[1]["id"]
    client.patch(f"/tasks/{old}/due-date", headers=auth_headers, json={"due_date": str(date.today() - timedelta(days=5))})
    client.patch(f"/tasks/{mid}/due-date", headers=auth_headers, json={"due_date": str(date.today() - timedelta(days=1))})
    body = client.get("/me/overdue", headers=auth_headers).json()
    assert body["count"] >= 2
    ids = [t["id"] for t in body["items"]]
    assert ids.index(old) < ids.index(mid)  # most overdue first
    first = body["items"][0]
    assert first["is_overdue"] is True
    assert first["days_overdue"] == 5
    # Another user sees nothing of this.
    headers_b = make_headers(client)
    assert client.get("/me/overdue", headers=headers_b).json() == {"items": [], "count": 0}
    assert client.get("/me/overdue").status_code == 401


def test_null_due_dates_never_overdue(client: TestClient, auth_headers: dict, goal_id: int):
    """Old tasks without dates appear in no overdue list."""
    task = _first_task(client, auth_headers, goal_id)
    client.patch(f"/tasks/{task['id']}/due-date", headers=auth_headers, json={"due_date": None})
    body = client.get("/me/overdue", headers=auth_headers).json()
    assert all(t["id"] != task["id"] for t in body["items"])
