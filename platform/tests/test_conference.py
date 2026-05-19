"""Tests for conference-day voting endpoints."""

from backend.database import ConferenceVote, Question, QuestionStatus, WorkingGroup


def _seed_questions(db_session, wg_number=1, count=5):
    wg = db_session.query(WorkingGroup).filter(WorkingGroup.number == wg_number).one()
    questions = []
    for i in range(count):
        q = Question(
            wg_id=wg.id,
            text=f"WG{wg_number} conference question {i + 1}",
            status=QuestionStatus.ACTIVE,
            r2_include_pct=90 - i,
            r2_importance_mean=8 - (i * 0.1),
        )
        db_session.add(q)
        questions.append(q)
    db_session.commit()
    return questions


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


def test_phase_toggle_accepts_json_body(client, admin_headers):
    resp = client.post("/api/conference/sessions", json={
        "wg_number": 1,
        "session_type": "wg_presentation",
        "phase": "pre_discussion",
    }, headers=admin_headers)
    sid = resp.json()["session_id"]

    resp = client.post(
        f"/api/conference/sessions/{sid}/phase",
        json={"phase": "post_discussion"},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["phase"] == "post_discussion"


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


def test_multi_question_ranking_records_one_row_per_question(client, db_session, admin_headers, participant_headers):
    questions = _seed_questions(db_session, count=5)
    resp = client.post("/api/conference/sessions", json={
        "wg_number": 1,
        "session_type": "wg_presentation",
        "phase": "pre_discussion",
    }, headers=admin_headers)
    sid = resp.json()["session_id"]
    client.post(f"/api/conference/sessions/{sid}/start", headers=admin_headers)

    rankings = {str(q.id): i + 1 for i, q in enumerate(questions[:5])}
    resp = client.post(
        f"/api/conference/vote/{sid}/ranking",
        json={"rankings": rankings},
        headers=participant_headers,
    )

    assert resp.status_code == 200
    assert resp.json()["count"] == 5
    rows = db_session.query(ConferenceVote).filter(
        ConferenceVote.session_id == sid,
        ConferenceVote.vote_type == "ranking_pre_discussion",
    ).all()
    assert len(rows) == 5


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
