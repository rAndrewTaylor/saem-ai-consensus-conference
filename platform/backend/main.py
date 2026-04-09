"""SAEM AI Consensus Conference Platform — Main Application."""

from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
import os

from .database import init_db, get_db, seed_working_groups, SessionLocal
from .routers import surveys, pairwise, conference, analysis, admin

app = FastAPI(
    title="SAEM AI Consensus Platform",
    description="AI-Enhanced Consensus Building for the 2026 SAEM AI Consensus Conference",
    version="1.0.0",
)

# CORS — allow all for local development and conference day
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files and templates
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")
app.mount("/static", StaticFiles(directory=os.path.join(FRONTEND_DIR, "static")), name="static")
templates = Jinja2Templates(directory=os.path.join(FRONTEND_DIR, "templates"))

# Include routers
app.include_router(surveys.router, prefix="/api/surveys", tags=["Delphi Surveys"])
app.include_router(pairwise.router, prefix="/api/pairwise", tags=["Pairwise Comparison"])
app.include_router(conference.router, prefix="/api/conference", tags=["Conference Day"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["AI Analysis"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])


@app.on_event("startup")
def startup():
    init_db()
    db = SessionLocal()
    try:
        seed_working_groups(db)
    finally:
        db.close()


# --- Page Routes ---

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


@app.get("/health")
async def health():
    return {"status": "ok", "platform": "SAEM AI Consensus", "version": "1.0.0"}
