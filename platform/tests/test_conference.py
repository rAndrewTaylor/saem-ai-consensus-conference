"""Tests for conference-day voting endpoints."""


def test_create_session_requires_admin(client):
    resp = client.post("/api/conference/sessions", json={
        "wg_number": 1,
        "session_type": "wg_presentation",
    })
    assert resp.status_code == 401


def test_session_lifecycle(client, admin_headers):
    # Create
    resp = client.post("/api/conference/sessions", json={
        "wg_number": 1,
        "session_type": "wg_presentation",
        "phase": "pre_discussion",
    }, headers=admin_headers)
    assert resp.status_code == 200
    sid = resp.json()["session_id"]

    # Start
    resp = client.post(f"/api/conference/sessions/{sid}/start", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["is_active"] is True

    # Stop
    resp = client.post(f"/api/conference/sessions/{sid}/stop", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["is_active"] is False


def test_create_session_invalid_type(client, admin_headers):
    resp = client.post("/api/conference/sessions", json={
        "session_type": "invalid_type",
    }, headers=admin_headers)
    assert resp.status_code == 400


def test_list_sessions(client, admin_headers):
    # Create a session first
    client.post("/api/conference/sessions", json={
        "session_type": "wg_presentation",
        "wg_number": 1,
    }, headers=admin_headers)

    resp = client.get("/api/conference/sessions")
    assert resp.status_code == 200
    sessions = resp.json()
    assert len(sessions) >= 1


def test_vote_on_inactive_session(client, admin_headers, participant_headers):
    # Create session but don't start it
    resp = client.post("/api/conference/sessions", json={
        "wg_number": 1,
        "session_type": "wg_presentation",
    }, headers=admin_headers)
    sid = resp.json()["session_id"]

    resp = client.post(f"/api/conference/vote/{sid}/importance", json={
        "ratings": {"1": 7},
    }, headers=participant_headers)
    assert resp.status_code == 400


def test_submit_comment(client, admin_headers, participant_headers):
    resp = client.post("/api/conference/sessions", json={
        "wg_number": 1,
        "session_type": "wg_presentation",
    }, headers=admin_headers)
    sid = resp.json()["session_id"]
    client.post(f"/api/conference/sessions/{sid}/start", headers=admin_headers)

    resp = client.post(f"/api/conference/comment/{sid}", json={
        "comment_text": "Great discussion!",
        "comment_type": "general",
    }, headers=participant_headers)
    assert resp.status_code == 200
