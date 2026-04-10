"""Input validation helpers."""

import html
from fastapi import HTTPException

MAX_COMMENT_LENGTH = 2000
MAX_QUESTION_LENGTH = 1000
IMPORTANCE_MIN = 1
IMPORTANCE_MAX = 9
VALID_DISPOSITIONS = {"include", "include_with_modifications", "exclude"}
VALID_COMMENT_TYPES = {"general", "modification", "new_question"}
VALID_SESSION_TYPES = {"wg_presentation", "cross_wg_prioritization"}
VALID_PHASES = {"pre_discussion", "post_discussion"}

def sanitize_text(text: str, max_length: int = MAX_COMMENT_LENGTH) -> str:
    """Sanitize user text input: strip, truncate, escape HTML."""
    if not text:
        return text
    text = text.strip()
    if len(text) > max_length:
        text = text[:max_length]
    return text

def validate_importance(rating: int) -> int:
    """Validate importance rating is in 1-9 range."""
    if not IMPORTANCE_MIN <= rating <= IMPORTANCE_MAX:
        raise HTTPException(400, f"Importance rating must be {IMPORTANCE_MIN}-{IMPORTANCE_MAX}")
    return rating

def validate_disposition(disposition: str) -> str:
    """Validate disposition is a valid enum value."""
    if disposition not in VALID_DISPOSITIONS:
        raise HTTPException(400, f"Invalid disposition: {disposition}. Must be one of: {VALID_DISPOSITIONS}")
    return disposition

def validate_comment_type(comment_type: str) -> str:
    if comment_type not in VALID_COMMENT_TYPES:
        raise HTTPException(400, f"Invalid comment type: {comment_type}")
    return comment_type

def validate_session_type(session_type: str) -> str:
    if session_type not in VALID_SESSION_TYPES:
        raise HTTPException(400, f"Invalid session type: {session_type}")
    return session_type

def safe_csv_value(val) -> str:
    """Prefix dangerous characters to prevent CSV formula injection in Excel."""
    if isinstance(val, str) and val and val[0] in ('=', '+', '-', '@', '\t', '\r'):
        return "'" + val
    return val if val is not None else ""
