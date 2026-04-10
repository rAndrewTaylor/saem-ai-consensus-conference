"""Tests for health check and basic app functionality."""


def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] in ("ok", "degraded")
    assert "database" in data
    assert data["platform"] == "SAEM AI Consensus"


def test_home_page(client):
    resp = client.get("/")
    assert resp.status_code == 200


def test_dashboard_page(client):
    resp = client.get("/dashboard")
    assert resp.status_code == 200


def test_survey_page(client):
    resp = client.get("/survey/1/round_1")
    assert resp.status_code == 200


def test_pairwise_page(client):
    resp = client.get("/rank/1")
    assert resp.status_code == 200


def test_results_page(client):
    resp = client.get("/results/1")
    assert resp.status_code == 200
