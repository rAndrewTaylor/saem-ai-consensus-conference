"""Shared test fixtures for the SAEM AI Consensus Platform."""

import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Use in-memory SQLite for tests
os.environ["DATABASE_URL"] = "sqlite:///./test_consensus.db"
os.environ["ADMIN_SECRET"] = "test-admin-password"
os.environ["JWT_SECRET"] = "test-jwt-secret"
os.environ["ANTHROPIC_API_KEY"] = "test-key"
os.environ["ALLOWED_ORIGINS"] = "http://localhost:8000"
os.environ["ALLOW_ANONYMOUS_TOKENS"] = "1"
os.environ["ALLOW_PUBLIC_SIGNUP"] = "1"

from backend.database import Base, get_db, seed_working_groups
from backend.main import app, limiter


@pytest.fixture(scope="session")
def engine():
    eng = create_engine(
        "sqlite:///./test_consensus.db",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(eng)
    return eng


@pytest.fixture
def db_session(engine):
    Session = sessionmaker(bind=engine)
    session = Session()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


@pytest.fixture
def client(engine):
    """TestClient with database override."""
    Session = sessionmaker(bind=engine)

    def override_get_db():
        session = Session()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db

    # Disable rate limiting in tests
    limiter.enabled = False

    # Seed working groups
    session = Session()
    seed_working_groups(session)
    session.close()

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()


@pytest.fixture
def admin_token(client):
    """Get a valid admin JWT."""
    resp = client.post("/api/admin/login", json={
        "email": "admin@test.com",
        "password": "test-admin-password",
    })
    assert resp.status_code == 200
    return resp.json()["access_token"]


@pytest.fixture
def admin_headers(admin_token):
    """Authorization headers for admin endpoints."""
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture
def participant_token(client):
    """Create a participant token for WG 1."""
    resp = client.post("/api/surveys/token", params={"wg_number": 1})
    assert resp.status_code == 200
    return resp.json()["token"]


@pytest.fixture
def participant_headers(participant_token):
    return {"Authorization": f"Bearer {participant_token}"}


def pytest_sessionfinish(session, exitstatus):
    """Clean up test database."""
    try:
        os.remove("./test_consensus.db")
    except FileNotFoundError:
        pass
