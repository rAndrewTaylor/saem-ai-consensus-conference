"""Tests for authentication and authorization."""


def test_admin_login_success(client):
    resp = client.post("/api/admin/login", json={
        "email": "admin@test.com",
        "password": "test-admin-password",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_admin_login_wrong_password(client):
    resp = client.post("/api/admin/login", json={
        "email": "admin@test.com",
        "password": "wrong-password",
    })
    assert resp.status_code == 401


def test_admin_me_authenticated(client, admin_headers):
    resp = client.get("/api/admin/me", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["email"] == "admin@test.com"


def test_admin_me_unauthenticated(client):
    resp = client.get("/api/admin/me")
    assert resp.status_code == 401


def test_admin_me_invalid_token(client):
    resp = client.get("/api/admin/me", headers={"Authorization": "Bearer garbage"})
    assert resp.status_code == 401


def test_dashboard_requires_auth(client):
    resp = client.get("/api/admin/dashboard")
    assert resp.status_code == 401


def test_dashboard_with_auth(client, admin_headers):
    resp = client.get("/api/admin/dashboard", headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "working_groups" in data
    assert len(data["working_groups"]) == 5
