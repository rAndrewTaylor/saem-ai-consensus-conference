"""Tests for pairwise comparison endpoints."""


def _seed_questions(client, admin_headers, n=5):
    """Create and activate N questions for WG 1."""
    questions = []
    for i in range(n):
        resp = client.post("/api/surveys/questions/1", json={
            "text": f"Pairwise test question {i+1}",
        }, headers=admin_headers)
        questions.append(resp.json()["id"])
    client.post("/api/surveys/questions/1/activate", headers=admin_headers)
    return questions


def test_get_pair(client, admin_headers, participant_headers):
    _seed_questions(client, admin_headers, 3)
    resp = client.get("/api/pairwise/pair/1", headers=participant_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "question_a" in data
    assert "question_b" in data
    assert data["question_a"]["id"] != data["question_b"]["id"]


def test_get_pair_insufficient_questions(client):
    # WG 2 has no questions
    resp = client.get("/api/pairwise/pair/2")
    assert resp.status_code == 400


def test_submit_vote(client, admin_headers, participant_headers):
    qids = _seed_questions(client, admin_headers, 3)
    resp = client.post("/api/pairwise/vote/1", json={
        "question_a_id": qids[0],
        "question_b_id": qids[1],
        "winner_id": qids[0],
        "response_time_ms": 1500,
    }, headers=participant_headers)
    assert resp.status_code == 200


def test_submit_vote_invalid_winner(client, admin_headers, participant_headers):
    qids = _seed_questions(client, admin_headers, 3)
    resp = client.post("/api/pairwise/vote/1", json={
        "question_a_id": qids[0],
        "question_b_id": qids[1],
        "winner_id": 99999,  # Not one of the pair
    }, headers=participant_headers)
    assert resp.status_code == 400


def test_submit_vote_skip(client, admin_headers, participant_headers):
    qids = _seed_questions(client, admin_headers, 3)
    resp = client.post("/api/pairwise/vote/1", json={
        "question_a_id": qids[0],
        "question_b_id": qids[1],
        "winner_id": None,  # Skip
    }, headers=participant_headers)
    assert resp.status_code == 200


def test_rankings(client, admin_headers, participant_headers):
    qids = _seed_questions(client, admin_headers, 3)
    # Submit a vote
    client.post("/api/pairwise/vote/1", json={
        "question_a_id": qids[0],
        "question_b_id": qids[1],
        "winner_id": qids[0],
    }, headers=participant_headers)

    resp = client.get("/api/pairwise/rankings/1")
    assert resp.status_code == 200
    data = resp.json()
    assert "rankings" in data
    assert data["total_votes"] >= 1


def test_submit_suggestion_requires_token(client):
    resp = client.post("/api/pairwise/suggest/1", json={
        "suggestion_text": "New question idea",
    })
    assert resp.status_code == 401
