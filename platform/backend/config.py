"""Application configuration loaded from environment variables."""

import os
from dotenv import load_dotenv

load_dotenv()

# --- Database ---
DATABASE_URL: str = os.environ.get(
    "DATABASE_URL", "sqlite:///./data/consensus.db"
)

# --- API Keys ---
ANTHROPIC_API_KEY: str = os.environ.get("ANTHROPIC_API_KEY", "")

# --- Auth ---
ADMIN_SECRET: str = os.environ.get("ADMIN_SECRET", "change-me-to-a-secure-password")
JWT_SECRET: str = os.environ.get("JWT_SECRET", "change-me-to-a-random-string")
JWT_EXPIRY_HOURS: int = int(os.environ.get("JWT_EXPIRY_HOURS", "24"))
PARTICIPANT_TOKEN_EXPIRY_HOURS: int = int(
    os.environ.get("PARTICIPANT_TOKEN_EXPIRY_HOURS", "72")
)

# --- CORS ---
_origins_raw: str = os.environ.get("ALLOWED_ORIGINS", "http://localhost:8000")
ALLOWED_ORIGINS: list[str] = [o.strip() for o in _origins_raw.split(",") if o.strip()]

# --- Logging ---
LOG_LEVEL: str = os.environ.get("LOG_LEVEL", "INFO")

# --- Validation limits ---
MAX_COMMENT_LENGTH: int = 2000
MAX_QUESTION_LENGTH: int = 1000
IMPORTANCE_MIN: int = 1
IMPORTANCE_MAX: int = 9
POINT_BUDGET: int = 100
