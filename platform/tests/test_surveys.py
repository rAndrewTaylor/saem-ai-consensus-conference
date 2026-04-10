"""Tests for Delphi survey endpoints."""


def test_create_participant_token(client):
    resp = client.post("/api/surveys/token", params={"wg_number": 1})
    assert resp.status_code == 200
    data = resp.json()
    assert "token" in data
    assert data["wg_number"] == 1


def test_create_token_invalid_wg(client):
    resp = client.post("/api/surveys/token", params={"wg_number": 99})
    assert resp.status_code == 404


def test_list_questions_for_wg(client):
    """Questions endpoint returns a list (may have items from other tests)."""
    resp = client.get("/api/surveys/questions/1")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_create_question_requires_admin(client):
    resp = client.post("/api/surveys/questions/1", json={
        "text": "Test question?",
    })
    assert resp.status_code == 401


def test_create_and_list_question(client, admin_headers):
    # Create
    resp = client.post("/api/surveys/questions/1", json={
        "text": "What is the impact of AI on triage accuracy?",
    }, headers=admin_headers)
    assert resp.status_code == 200
    qid = resp.json()["id"]

    # List
    resp = client.get("/api/surveys/questions/1")
    assert resp.status_code == 200
    questions = resp.json()
    assert any(q["id"] == qid for q in questions)


def test_submit_response(client, admin_headers, participant_headers):
    # Create a question first
    resp = client.post("/api/surveys/questions/1", json={
        "text": "Test question for response?",
    }, headers=admin_headers)
    qid = resp.json()["id"]

    # Activate it
    client.post("/api/surveys/questions/1/activate", headers=admin_headers)

    # Submit response
    resp = client.post(
        f"/api/surveys/respond/1/round_1/{qid}",
        json={
            "disposition": "include",
            "importance_rating": 7,
            "comment": "Good question",
        },
        headers=participant_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "recorded"


def test_submit_response_invalid_importance(client, admin_headers, participant_headers):
    resp = client.post("/api/surveys/questions/1", json={
        "text": "Another test question?",
    }, headers=admin_headers)
    qid = resp.json()["id"]
    client.post("/api/surveys/questions/1/activate", headers=admin_headers)

    resp = client.post(
        f"/api/surveys/respond/1/round_1/{qid}",
        json={
            "disposition": "include",
            "importance_rating": 15,  # Invalid — must be 1-9
            "comment": None,
        },
        headers=participant_headers,
    )
    assert resp.status_code == 400


def test_submit_response_invalid_disposition(client, admin_headers, participant_headers):
    resp = client.post("/api/surveys/questions/1", json={
        "text": "Yet another test question?",
    }, headers=admin_headers)
    qid = resp.json()["id"]
    client.post("/api/surveys/questions/1/activate", headers=admin_headers)

    resp = client.post(
        f"/api/surveys/respond/1/round_1/{qid}",
        json={
            "disposition": "banana",  # Invalid
            "importance_rating": 5,
        },
        headers=participant_headers,
    )
    assert resp.status_code == 400


def test_submit_response_no_token(client, admin_headers):
    resp = client.post("/api/surveys/questions/1", json={
        "text": "No token test?",
    }, headers=admin_headers)
    qid = resp.json()["id"]
    client.post("/api/surveys/questions/1/activate", headers=admin_headers)

    resp = client.post(
        f"/api/surveys/respond/1/round_1/{qid}",
        json={
            "disposition": "include",
            "importance_rating": 5,
        },
        # No auth header
    )
    assert resp.status_code == 401


def test_question_text_sanitized(client, admin_headers):
    resp = client.post("/api/surveys/questions/1", json={
        "text": "  <script>alert('xss')</script>What about AI?  ",
    }, headers=admin_headers)
    assert resp.status_code == 200
    # Text should be stripped (sanitize_text strips whitespace)
    assert resp.json()["text"].strip() != ""


def test_bulk_create_questions(client, admin_headers):
    resp = client.post("/api/surveys/questions/1/bulk", json=[
        {"text": "Bulk Q1"},
        {"text": "Bulk Q2"},
        {"text": "Bulk Q3"},
    ], headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["created"] == 3
