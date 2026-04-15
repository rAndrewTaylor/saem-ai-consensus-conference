"""SAEM AI Consensus Conference Platform — Main Application."""

import asyncio
import json

from dotenv import load_dotenv

load_dotenv()

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address
from sqlalchemy import text
import os

from .config import ADMIN_SECRET, ALLOWED_ORIGINS
from .logging_config import get_logger
from .middleware import RequestLoggingMiddleware
from .database import init_db, get_db, seed_working_groups, SessionLocal, engine
from .auth import create_admin_token, require_admin
from .routers import surveys, pairwise, conference, analysis, admin, participants

logger = get_logger(__name__)

# ---------------------------------------------------------------------------
# Rate limiter
# ---------------------------------------------------------------------------
limiter = Limiter(key_func=get_remote_address, default_limits=["60/minute"])

# ---------------------------------------------------------------------------
# Application
# ---------------------------------------------------------------------------
app = FastAPI(
    title="SAEM AI Consensus Platform",
    description="AI-Enhanced Consensus Building for the 2026 SAEM AI Consensus Conference",
    version="1.0.0",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ---------------------------------------------------------------------------
# Middleware (order matters — outermost first)
# ---------------------------------------------------------------------------
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Global exception handler — return JSON, never HTML
# ---------------------------------------------------------------------------

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    if isinstance(exc, HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
        )
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )

# ---------------------------------------------------------------------------
# Static files — serve React build if available, fall back to legacy templates
# ---------------------------------------------------------------------------
REACT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend-react", "dist")
LEGACY_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")
USE_REACT = os.path.isdir(REACT_DIR) and os.path.isfile(os.path.join(REACT_DIR, "index.html"))

if USE_REACT:
    # Serve React build assets
    app.mount("/assets", StaticFiles(directory=os.path.join(REACT_DIR, "assets")), name="assets")
    logger.info("Serving React frontend from %s", REACT_DIR)
else:
    # Legacy Jinja2 templates
    app.mount("/static", StaticFiles(directory=os.path.join(LEGACY_DIR, "static")), name="static")
    logger.info("Serving legacy Jinja2 frontend from %s", LEGACY_DIR)

from fastapi.templating import Jinja2Templates
templates = Jinja2Templates(directory=os.path.join(LEGACY_DIR, "templates")) if not USE_REACT else None

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(surveys.router, prefix="/api/surveys", tags=["Delphi Surveys"])
app.include_router(pairwise.router, prefix="/api/pairwise", tags=["Pairwise Comparison"])
app.include_router(conference.router, prefix="/api/conference", tags=["Conference Day"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["AI Analysis"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(participants.router, prefix="/api/participants", tags=["Participants"])

# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------

@app.on_event("startup")
def startup():
    logger.info("Starting SAEM AI Consensus Platform")
    init_db()
    db = SessionLocal()
    try:
        seed_working_groups(db)
    finally:
        db.close()
    logger.info("Database initialised and working groups seeded")


# ---------------------------------------------------------------------------
# Page Routes — legacy Jinja2 (only used when React build is not present)
# ---------------------------------------------------------------------------

if not USE_REACT:
    @app.get("/")
    async def home(request: Request):
        return templates.TemplateResponse(request, "index.html")

    @app.get("/survey/{wg_number}/{round_name}")
    async def survey_page(request: Request, wg_number: int, round_name: str):
        return templates.TemplateResponse(request, "survey.html", {
            "wg_number": wg_number,
            "round_name": round_name,
        })

    @app.get("/rank/{wg_number}")
    async def pairwise_page(request: Request, wg_number: int):
        return templates.TemplateResponse(request, "pairwise.html", {
            "wg_number": wg_number,
        })

    @app.get("/vote/{session_id}")
    async def conference_vote_page(request: Request, session_id: int):
        return templates.TemplateResponse(request, "conference.html", {
            "session_id": session_id,
        })

    @app.get("/dashboard")
    async def admin_dashboard(request: Request):
        return templates.TemplateResponse(request, "dashboard.html")

    @app.get("/results/{wg_number}")
    async def results_page(request: Request, wg_number: int):
        return templates.TemplateResponse(request, "results.html", {
            "wg_number": wg_number,
        })


# ---------------------------------------------------------------------------
# Health check — verifies database connectivity
# ---------------------------------------------------------------------------

@app.get("/health")
async def health():
    db_ok = False
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        logger.warning("Health check: database connectivity failed")
    return {
        "status": "ok" if db_ok else "degraded",
        "database": "connected" if db_ok else "unreachable",
        "platform": "SAEM AI Consensus",
        "version": "1.0.0",
    }


# ---------------------------------------------------------------------------
# Admin auth endpoints
# ---------------------------------------------------------------------------

class AdminLoginRequest(BaseModel):
    email: str
    password: str


@app.post("/api/admin/login")
@limiter.limit("5/minute")
async def admin_login(request: Request, body: AdminLoginRequest):
    """Authenticate with the shared admin secret and receive a JWT."""
    if body.password != ADMIN_SECRET:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_admin_token(body.email)
    return {"access_token": token, "token_type": "bearer"}


@app.get("/api/admin/me")
async def admin_me(admin: dict = Depends(require_admin)):
    """Return the currently authenticated admin's token claims."""
    return {"email": admin.get("sub"), "type": admin.get("type")}


# ---------------------------------------------------------------------------
# SSE — live conference voting updates
# ---------------------------------------------------------------------------

# Simple in-memory pub/sub per session (replaced by Redis in production)
_session_queues: dict[int, list[asyncio.Queue]] = {}


def publish_vote_event(session_id: int, data: dict):
    """Push an event to all listeners for a given conference session."""
    for q in _session_queues.get(session_id, []):
        q.put_nowait(data)


@app.get("/api/events/{session_id}")
async def sse_conference_events(request: Request, session_id: int):
    """Server-Sent Events stream for live conference voting updates."""
    queue: asyncio.Queue = asyncio.Queue()
    _session_queues.setdefault(session_id, []).append(queue)

    async def event_generator():
        try:
            # Send an initial keepalive so the client knows the connection is live
            yield f"event: connected\ndata: {json.dumps({'session_id': session_id})}\n\n"
            while True:
                # Check if the client has disconnected
                if await request.is_disconnected():
                    break
                try:
                    data = await asyncio.wait_for(queue.get(), timeout=30.0)
                    yield f"data: {json.dumps(data)}\n\n"
                except asyncio.TimeoutError:
                    # Send keepalive comment to prevent proxy timeouts
                    yield ": keepalive\n\n"
        finally:
            _session_queues.get(session_id, []).remove(queue)
            if not _session_queues.get(session_id):
                _session_queues.pop(session_id, None)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ---------------------------------------------------------------------------
# SPA catch-all — MUST be last route (after all API/health/SSE routes)
# ---------------------------------------------------------------------------

if USE_REACT:
    from fastapi.responses import FileResponse

    _react_index = os.path.join(REACT_DIR, "index.html")

    @app.get("/{full_path:path}")
    async def serve_react(request: Request, full_path: str):
        """Serve React SPA index.html for all client-side routes."""
        return FileResponse(_react_index)
