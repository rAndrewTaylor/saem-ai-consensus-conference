"""Authentication and authorization for the SAEM AI Consensus Platform."""

from datetime import datetime, timedelta
from fastapi import Depends, HTTPException, Header
from fastapi.security import HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from typing import Optional

# These will be imported from config.py (which another agent is creating)
# For now use os.environ.get() directly:
import os

JWT_SECRET = os.environ.get("JWT_SECRET", "dev-secret-change-me")
ADMIN_SECRET = os.environ.get("ADMIN_SECRET", "admin")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = int(os.environ.get("JWT_EXPIRY_HOURS", "24"))
PARTICIPANT_TOKEN_EXPIRY_HOURS = int(os.environ.get("PARTICIPANT_TOKEN_EXPIRY_HOURS", "72"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)

def create_admin_token(email: str) -> str:
    """Create a JWT for an admin user."""
    expires = datetime.utcnow() + timedelta(hours=JWT_EXPIRY_HOURS)
    payload = {"sub": email, "exp": expires, "type": "admin"}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_admin_token(token: str) -> dict:
    """Verify and decode an admin JWT. Raises HTTPException on failure."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "admin":
            raise HTTPException(403, "Not an admin token")
        return payload
    except JWTError:
        raise HTTPException(401, "Invalid or expired token")

async def require_admin(authorization: Optional[str] = Header(None)) -> dict:
    """FastAPI dependency that requires a valid admin JWT in Authorization header."""
    if not authorization:
        raise HTTPException(401, "Authorization header required")
    # Support "Bearer <token>" format
    token = authorization.replace("Bearer ", "").strip()
    return verify_admin_token(token)

def verify_participant_token(token: str, db) -> "Participant":
    """Look up and validate a participant token. Returns Participant or raises."""
    from .database import Participant
    participant = db.query(Participant).filter(Participant.token == token).first()
    if not participant:
        raise HTTPException(401, "Invalid participant token")
    if not participant.is_active:
        raise HTTPException(401, "Token has been deactivated")
    if participant.expires_at and participant.expires_at < datetime.utcnow():
        raise HTTPException(401, "Token has expired")
    return participant

def get_participant_token(authorization: Optional[str] = Header(None)) -> Optional[str]:
    """Extract participant token from Authorization header. Returns None if not present."""
    if not authorization:
        return None
    return authorization.replace("Bearer ", "").strip()

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)
