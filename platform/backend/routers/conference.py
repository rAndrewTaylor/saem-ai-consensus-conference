"""Conference-day polling routes — real-time voting with offline support."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from fastapi import Header

from ..database import (
    get_db, WorkingGroup, Question, Participant, ConferenceSession,
    ConferenceVote, ConferenceComment, BreakoutNote, QuestionStatus,
    ConferenceChatMessage, ConferenceChatUpvote, ConferenceDisplayMode,
    AuditLog, CoLead, write_audit_log,
)
from ..auth import (
    require_admin, get_participant_token, verify_participant_token,
    verify_admin_token,
)
from ..validators import (
    validate_session_type, validate_importance, sanitize_text,
    validate_comment_type, safe_csv_value, VALID_PHASES,
)

router = APIRouter()


def _publish_day(event: str, payload: dict) -> None:
    """Best-effort notification on the global day-state SSE channel.
    Imported lazily to avoid a circular import with backend.main."""
    try:
        from ..main import publish_day_event
        publish_day_event({"event": event, **payload})
    except Exception:
        pass


def _publish_vote(session_id: int, payload: dict) -> None:
    """Best-effort notification on the session-specific voting SSE channel."""
    try:
        from ..main import publish_vote_event
        publish_vote_event(session_id, {"event": "vote_update", **payload})
    except Exception:
        pass


async def require_chair(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> dict:
    """Auth dependency: accept admin token OR any active co-lead invite
    token. Endpoints that need per-WG scoping should call
    `_assert_chair_scope(actor, wg_number)` after this dependency runs.
    Returns `{actor, email, wg_number}` (wg_number is None for admin,
    set for co-leads to their assigned WG).
    """
    if not authorization:
        raise HTTPException(401, "Authorization header required")
    token = authorization.replace("Bearer ", "").strip()
    try:
        payload = verify_admin_token(token)
        return {"actor": "admin", "email": payload.get("sub", "admin"), "wg_number": None}
    except HTTPException:
        pass
    cl = db.query(CoLead).filter(CoLead.invite_token == token).first()
    if not cl or cl.is_active is False:
        raise HTTPException(401, "Invalid or expired token")
    wg = db.query(WorkingGroup).get(cl.wg_id) if cl.wg_id else None
    return {
        "actor": "co_lead",
        "email": cl.email or cl.name,
        "wg_number": wg.number if wg else None,
    }


def _assert_chair_scope(actor: dict, wg_number: int) -> None:
    """For per-WG chair actions: admin always allowed; co-lead must match WG."""
    if actor["actor"] == "admin":
        return
    if actor["wg_number"] != wg_number:
        raise HTTPException(403, f"Not authorized for WG{wg_number}")


# --- Schemas ---

class SessionCreate(BaseModel):
    wg_number: Optional[int] = None  # null for cross-WG
    session_type: str  # "wg_presentation" or "cross_wg_prioritization"
    phase: str = "pre_discussion"

class PhaseUpdate(BaseModel):
    phase: str

class RankingVoteSubmit(BaseModel):
    """Submit a ranking of top-N questions."""
    rankings: dict[int, int]  # question_id -> rank (1 = highest)

class ImportanceVoteSubmit(BaseModel):
    """Submit importance ratings for questions."""
    ratings: dict[int, int]  # question_id -> rating (1-9)

class PointAllocationSubmit(BaseModel):
    """Submit point allocation across questions (must sum to budget)."""
    allocations: dict[int, float]  # question_id -> points
    budget: float = 100.0

class CommentSubmit(BaseModel):
    comment_text: str
    comment_type: str = "general"  # "new_question", "modification", "general"

class BreakoutNoteSubmit(BaseModel):
    table_number: int
    facilitator_name: str
    themes: Optional[str] = None
    agreements: Optional[str] = None
    disagreements: Optional[str] = None
    suggestions: Optional[str] = None
    surprises: Optional[str] = None


# --- Helpers ---

def _validate_phase(phase: str) -> str:
    """Validate phase value against allowed set."""
    if phase not in VALID_PHASES:
        raise HTTPException(400, f"Invalid phase: {phase}. Must be one of: {VALID_PHASES}")
    return phase


def _validate_session_question_ids(session_id: int, db: Session, question_ids) -> None:
    """Reject votes for questions outside the session's configured pool."""
    allowed = {int(q["id"]) for q in get_session_questions(session_id, db)["questions"]}
    submitted = {int(qid) for qid in question_ids}
    unknown = sorted(submitted - allowed)
    if unknown:
        raise HTTPException(400, f"Questions are not in this session: {unknown}")


def _upsert_votes(
    db: Session,
    session_id: int,
    participant_id: int,
    vote_type: str,
    votes: list[ConferenceVote],
):
    """Delete existing votes for (session, participant, vote_type) then insert new ones.

    Handles the UniqueConstraint on ConferenceVote by replacing rather than
    duplicating.  Wrapped in the caller's transaction so the delete+insert is
    atomic.
    """
    db.query(ConferenceVote).filter(
        ConferenceVote.session_id == session_id,
        ConferenceVote.participant_id == participant_id,
        ConferenceVote.vote_type == vote_type,
    ).delete(synchronize_session="fetch")
    for v in votes:
        db.add(v)


# --- Session Management (admin-only) ---

@router.post("/sessions")
def create_session(
    session: SessionCreate,
    db: Session = Depends(get_db),
    admin: dict = Depends(require_admin),
):
    """Create a conference-day voting session."""
    validate_session_type(session.session_type)
    _validate_phase(session.phase)

    wg = None
    if session.wg_number:
        wg = db.query(WorkingGroup).filter(WorkingGroup.number == session.wg_number).first()
        if not wg:
            raise HTTPException(404, "Working group not found")

    cs = ConferenceSession(
        wg_id=wg.id if wg else None,
        session_type=session.session_type,
        phase=session.phase,
        is_active=False,
    )
    db.add(cs)
    db.commit()
    db.refresh(cs)
    return {"session_id": cs.id, "session_type": cs.session_type, "phase": cs.phase}


@router.post("/sessions/{session_id}/start")
def start_session(
    session_id: int,
    db: Session = Depends(get_db),
    admin: dict = Depends(require_admin),
):
    """Activate a voting session (opens it for responses).

    Idempotent: re-calling on an already-active session is a no-op and
    does NOT overwrite `started_at`. Prevents the double-click race
    where a second POST silently shifts the start clock.
    """
    cs = db.query(ConferenceSession).get(session_id)
    if not cs:
        raise HTTPException(404, "Session not found")
    if cs.is_active:
        # Already running — return current state without touching DB or
        # publishing a spurious `session_started` event.
        return {"session_id": cs.id, "is_active": True}
    db.query(ConferenceSession).filter(
        ConferenceSession.id != session_id,
        ConferenceSession.is_active == True,  # noqa: E712
    ).update({
        ConferenceSession.is_active: False,
        ConferenceSession.ended_at: datetime.utcnow(),
    })
    cs.is_active = True
    cs.started_at = datetime.utcnow()
    db.commit()
    write_audit_log(
        db,
        user_email=admin.get("sub", "unknown"),
        action="session_start",
        detail=f"Started session {session_id} (type={cs.session_type})",
    )
    _publish_day("session_started",
                  {"session_id": cs.id, "session_type": cs.session_type,
                   "phase": cs.phase, "wg_id": cs.wg_id})
    return {"session_id": cs.id, "is_active": True}


@router.post("/sessions/{session_id}/stop")
def stop_session(
    session_id: int,
    db: Session = Depends(get_db),
    admin: dict = Depends(require_admin),
):
    """Close a voting session."""
    cs = db.query(ConferenceSession).get(session_id)
    if not cs:
        raise HTTPException(404, "Session not found")
    cs.is_active = False
    cs.ended_at = datetime.utcnow()
    db.commit()
    write_audit_log(
        db,
        user_email=admin.get("sub", "unknown"),
        action="session_stop",
        detail=f"Stopped session {session_id} (type={cs.session_type})",
    )
    _publish_day("session_stopped",
                  {"session_id": cs.id, "session_type": cs.session_type})
    return {"session_id": cs.id, "is_active": False}


@router.post("/sessions/{session_id}/phase")
def update_phase(
    session_id: int,
    body: PhaseUpdate,
    db: Session = Depends(get_db),
    admin: dict = Depends(require_admin),
):
    """Update the phase of a session (pre_discussion -> post_discussion)."""
    phase = body.phase
    _validate_phase(phase)
    cs = db.query(ConferenceSession).get(session_id)
    if not cs:
        raise HTTPException(404, "Session not found")
    cs.phase = phase
    db.commit()
    _publish_day("phase_changed", {"session_id": cs.id, "phase": cs.phase})
    return {"session_id": cs.id, "phase": cs.phase}


@router.get("/sessions")
def list_sessions(db: Session = Depends(get_db)):
    """List all conference sessions."""
    sessions = db.query(ConferenceSession).order_by(ConferenceSession.id).all()
    wg_lookup = {w.id: w.number for w in db.query(WorkingGroup).all()}
    return [{
        "id": s.id,
        "wg_id": s.wg_id,
        "wg_number": wg_lookup.get(s.wg_id) if s.wg_id else None,
        "session_type": s.session_type,
        "phase": s.phase,
        "is_active": s.is_active,
        "started_at": s.started_at.isoformat() if s.started_at else None,
        "created_at": s.created_at.isoformat() if s.created_at else None,
        "vote_count": db.query(ConferenceVote).filter(ConferenceVote.session_id == s.id).count(),
    } for s in sessions]


@router.get("/me/contributions")
def my_contributions(
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(get_participant_token),
):
    """Per-participant rollup of conference-day activity. Returns empty
    structure when no token is present so the page can render before
    sign-in."""
    if not token:
        return {"signed_in": False, "sessions": [], "total_votes": 0,
                 "total_comments": 0}
    p = verify_participant_token(token, db)
    sessions = db.query(ConferenceSession).order_by(ConferenceSession.id).all()
    out = []
    total_votes = 0
    total_comments = 0
    for s in sessions:
        vote_count = (
            db.query(ConferenceVote)
            .filter(ConferenceVote.session_id == s.id,
                    ConferenceVote.participant_id == p.id)
            .count()
        )
        comment_count = (
            db.query(ConferenceComment)
            .filter(ConferenceComment.session_id == s.id,
                    ConferenceComment.participant_id == p.id)
            .count()
        )
        if vote_count or comment_count:
            out.append({
                "session_id": s.id,
                "session_type": s.session_type,
                "wg_id": s.wg_id,
                "phase": s.phase,
                "vote_count": vote_count,
                "comment_count": comment_count,
            })
        total_votes += vote_count
        total_comments += comment_count
    return {
        "signed_in": True,
        "participant_id": p.id,
        "name": p.name,
        "sessions": out,
        "total_votes": total_votes,
        "total_comments": total_comments,
    }


@router.get("/public-stats")
def public_stats(db: Session = Depends(get_db)):
    """Lightweight public counts for the stage idle carousel + welcome deck.

    Numbers only — no participant identifiers. Cached implicitly because
    the underlying tables don't change quickly during conference day.
    """
    n_participants = db.query(func.count(Participant.id)).filter(
        Participant.is_active == True,  # noqa: E712
        Participant.name.isnot(None),
    ).scalar() or 0
    n_questions = db.query(func.count(Question.id)).filter(
        Question.status.in_([QuestionStatus.ACTIVE, QuestionStatus.REVISED, QuestionStatus.CONFIRMED])
    ).scalar() or 0
    n_wgs = db.query(func.count(WorkingGroup.id)).scalar() or 0
    return {
        "n_participants": int(n_participants),
        "n_active_questions": int(n_questions),
        "n_working_groups": int(n_wgs),
    }


@router.get("/day-state")
def day_state(db: Session = Depends(get_db)):
    """Single endpoint that powers the conference-day landing page.

    Returns every session, the active session (if any), live vote/comment
    counts, and a static agenda block. Public — no auth — so the page
    can poll without admin/participant credentials. Voting itself still
    requires a participant token.
    """
    # All sessions enriched with WG metadata + counts
    sessions = db.query(ConferenceSession).order_by(ConferenceSession.id).all()
    wgs = {w.id: w for w in db.query(WorkingGroup).all()}
    out_sessions: list[dict] = []
    active_id: Optional[int] = None
    for s in sessions:
        wg = wgs.get(s.wg_id) if s.wg_id else None
        vc = db.query(ConferenceVote).filter(ConferenceVote.session_id == s.id).count()
        cc = db.query(ConferenceComment).filter(ConferenceComment.session_id == s.id).count()
        unique_voters = (
            db.query(func.count(func.distinct(ConferenceVote.participant_id)))
            .filter(ConferenceVote.session_id == s.id)
            .scalar()
        ) or 0
        if s.is_active and active_id is None:
            active_id = s.id
        out_sessions.append({
            "id": s.id,
            "wg_id": s.wg_id,
            "wg_number": wg.number if wg else None,
            "wg_short_name": wg.short_name if wg else None,
            "wg_pillar": wg.pillar if wg else None,
            "session_type": s.session_type,
            "phase": s.phase,
            "is_active": bool(s.is_active),
            "started_at": s.started_at.isoformat() if s.started_at else None,
            "ended_at": s.ended_at.isoformat() if s.ended_at else None,
            "vote_count": vc,
            "comment_count": cc,
            "unique_voters": int(unique_voters),
        })

    # Static agenda — drives the timeline view. Times are local Atlanta
    # (Eastern). Order matters — the frontend treats this as the
    # canonical sequence.
    agenda = [
        {"time": "7:30 AM",  "title": "Coffee & networking",                     "kind": "break"},
        {"time": "8:00 AM",  "title": "Welcome and conference goals",            "kind": "welcome"},
        {"time": "8:20 AM",  "title": "Panel 1 — Clinical Practice & Operations","kind": "panel", "wg": 1},
        {"time": "9:00 AM",  "title": "Panel 2 — Infrastructure & Data",         "kind": "panel", "wg": 2},
        {"time": "9:40 AM",  "title": "Table Reactions: Technology",             "kind": "reaction", "block": "technology"},
        {"time": "9:55 AM",  "title": "Break",                                   "kind": "break"},
        {"time": "10:15 AM", "title": "Panel 3 — Education & Training",          "kind": "panel", "wg": 3},
        {"time": "10:55 AM", "title": "Panel 4 — Human-AI Interaction",          "kind": "panel", "wg": 4},
        {"time": "11:35 AM", "title": "Panel 5 — Ethics & Legal",                "kind": "panel", "wg": 5},
        {"time": "12:15 PM", "title": "Table Reactions: People",                 "kind": "reaction", "block": "people"},
        {"time": "12:30 PM", "title": "Networking lunch",                        "kind": "break"},
        {"time": "1:30 PM",  "title": "World Café — three rotations",            "kind": "world_cafe"},
        {"time": "2:30 PM",  "title": "Break",                                   "kind": "break"},
        {"time": "2:50 PM",  "title": "Priority presentations (top 4 per WG)",   "kind": "presentation"},
        {"time": "3:35 PM",  "title": "Cross-WG consensus vote (drag to rank)",  "kind": "vote", "session_type": "cross_wg_prioritization"},
        {"time": "4:05 PM",  "title": "Final results & synthesis",               "kind": "results"},
        {"time": "4:35 PM",  "title": "Summary & next steps",                    "kind": "wrap"},
        {"time": "5:00 PM",  "title": "Adjourn",                                 "kind": "end"},
    ]

    return {
        "now": datetime.utcnow().isoformat(),
        "active_session_id": active_id,
        "sessions": out_sessions,
        "agenda": agenda,
        "conference_date": "2026-05-21",
        "venue": "Atlanta Marriott Marquis",
    }


@router.get("/sessions/{session_id}/questions")
def get_session_questions(session_id: int, db: Session = Depends(get_db)):
    """Get the questions available for voting in a session.

    Uses R2 include% + importance to surface the top questions for each
    panel, even before the formal R2-to-CONFIRMED promotion has run.
    """
    cs = db.query(ConferenceSession).get(session_id)
    if not cs:
        raise HTTPException(404, "Session not found")

    if cs.session_type == "cross_wg_prioritization":
        # If the chair has explicitly featured questions for the cross-WG
        # round (via /cross-wg/feature), use only those. Otherwise fall
        # back to top-N R2 questions per WG so the session still works
        # before the funnel has been run. WG5 enters with a thematically-
        # categorized question set and surfaces all 5; other WGs cap at 4
        # to match the documented "top 4 per WG" advancement rule.
        featured = (
            db.query(Question)
            .filter(
                Question.featured_in_cross_wg == True,  # noqa: E712
                Question.status.in_([
                    QuestionStatus.ACTIVE, QuestionStatus.REVISED, QuestionStatus.CONFIRMED
                ]),
            )
            .order_by(Question.wg_id, Question.id)
            .all()
        )
        if featured:
            questions = featured
        else:
            questions = []
            for wg in db.query(WorkingGroup).order_by(WorkingGroup.number).all():
                per_wg_limit = 5 if wg.number == 5 else 4
                top = (
                    db.query(Question)
                    .filter(
                        Question.wg_id == wg.id,
                        Question.status.in_([
                            QuestionStatus.ACTIVE, QuestionStatus.REVISED, QuestionStatus.CONFIRMED
                        ]),
                    )
                    .order_by(
                        Question.r2_include_pct.desc().nullslast(),
                        Question.r1_include_pct.desc().nullslast(),
                        Question.r2_importance_mean.desc().nullslast(),
                        Question.r1_importance_mean.desc().nullslast(),
                    )
                    .limit(per_wg_limit)
                    .all()
                )
                questions.extend(top)
    else:
        # Panel pool: prefer the chair-curated `featured_in_panel` set when
        # any are set for this WG, otherwise default to all active R2
        # questions ordered by include% + importance.
        curated = (
            db.query(Question)
            .filter(
                Question.wg_id == cs.wg_id,
                Question.featured_in_panel == True,  # noqa: E712
                Question.status.in_([
                    QuestionStatus.ACTIVE, QuestionStatus.REVISED, QuestionStatus.CONFIRMED
                ]),
            )
            .order_by(
                Question.r2_include_pct.desc().nullslast(),
                Question.r2_importance_mean.desc().nullslast(),
                Question.id,
            )
            .all()
        )
        if curated:
            questions = curated
        else:
            questions = (
                db.query(Question)
                .filter(
                    Question.wg_id == cs.wg_id,
                    Question.status.in_([
                        QuestionStatus.ACTIVE, QuestionStatus.REVISED, QuestionStatus.CONFIRMED
                    ]),
                )
                .order_by(
                    Question.r2_include_pct.desc().nullslast(),
                    Question.r1_include_pct.desc().nullslast(),
                    Question.r2_importance_mean.desc().nullslast(),
                    Question.r1_importance_mean.desc().nullslast(),
                )
                .all()
            )

    # Resolve wg_number per question so projector/audience can colour-code by WG
    wg_id_to_number = {wg.id: wg.number for wg in db.query(WorkingGroup).all()}
    return {
        "session_id": session_id,
        "session_type": cs.session_type,
        "phase": cs.phase,
        "is_active": cs.is_active,
        "questions": [{
            "id": q.id,
            "text": q.text,
            "short_text": q.short_text,
            "wg_id": q.wg_id,
            "wg_number": wg_id_to_number.get(q.wg_id),
            "r2_include_pct": q.r2_include_pct,
            "r2_importance_mean": q.r2_importance_mean,
            "pairwise_score": q.pairwise_score,
        } for q in questions],
    }


# --- Voting ---

@router.post("/vote/{session_id}/ranking")
def submit_ranking(
    session_id: int,
    vote: RankingVoteSubmit,
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(get_participant_token),
):
    """Submit a priority ranking (top N)."""
    cs = db.query(ConferenceSession).get(session_id)
    if not cs or not cs.is_active:
        raise HTTPException(400, "Session not active")

    participant = verify_participant_token(token, db)
    _validate_session_question_ids(session_id, db, vote.rankings.keys())

    vote_type = f"ranking_{cs.phase}"
    new_votes = [
        ConferenceVote(
            session_id=session_id,
            participant_id=participant.id,
            question_id=int(question_id),
            vote_type=vote_type,
            value=float(rank),
        )
        for question_id, rank in vote.rankings.items()
    ]

    _upsert_votes(db, session_id, participant.id, vote_type, new_votes)
    db.commit()
    _publish_day("vote_cast", {"session_id": session_id, "vote_type": vote_type})
    _publish_vote(session_id, {"vote_type": vote_type})
    return {"status": "recorded", "count": len(vote.rankings)}


@router.post("/vote/{session_id}/importance")
def submit_importance(
    session_id: int,
    vote: ImportanceVoteSubmit,
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(get_participant_token),
):
    """Submit importance ratings (1-9)."""
    cs = db.query(ConferenceSession).get(session_id)
    if not cs or not cs.is_active:
        raise HTTPException(400, "Session not active")

    participant = verify_participant_token(token, db)
    _validate_session_question_ids(session_id, db, vote.ratings.keys())

    # Validate every rating
    for rating in vote.ratings.values():
        validate_importance(rating)

    new_votes = [
        ConferenceVote(
            session_id=session_id,
            participant_id=participant.id,
            question_id=int(question_id),
            vote_type="importance",
            value=float(rating),
        )
        for question_id, rating in vote.ratings.items()
    ]

    _upsert_votes(db, session_id, participant.id, "importance", new_votes)
    db.commit()
    _publish_day("vote_cast", {"session_id": session_id, "vote_type": "importance"})
    _publish_vote(session_id, {"vote_type": "importance"})
    return {"status": "recorded", "count": len(vote.ratings)}


@router.post("/vote/{session_id}/allocate")
def submit_allocation(
    session_id: int,
    vote: PointAllocationSubmit,
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(get_participant_token),
):
    """Submit point allocation (must sum to budget)."""
    # Validate non-negative values
    for qid, points in vote.allocations.items():
        if points < 0:
            raise HTTPException(400, f"Allocation for question {qid} must be non-negative")

    total = sum(vote.allocations.values())
    if abs(total - vote.budget) > 1.0:  # allow small rounding errors
        raise HTTPException(400, f"Points must sum to {vote.budget}, got {total}")

    cs = db.query(ConferenceSession).get(session_id)
    if not cs or not cs.is_active:
        raise HTTPException(400, "Session not active")

    participant = verify_participant_token(token, db)
    _validate_session_question_ids(session_id, db, vote.allocations.keys())

    new_votes = [
        ConferenceVote(
            session_id=session_id,
            participant_id=participant.id,
            question_id=int(question_id),
            vote_type="point_allocation",
            value=float(points),
        )
        for question_id, points in vote.allocations.items()
        if points > 0
    ]

    _upsert_votes(db, session_id, participant.id, "point_allocation", new_votes)
    db.commit()
    _publish_day("vote_cast", {"session_id": session_id, "vote_type": "point_allocation"})
    _publish_vote(session_id, {"vote_type": "point_allocation"})
    return {"status": "recorded", "total_points": total}


# --- Comments and Breakout Notes ---

@router.post("/comment/{session_id}")
def submit_comment(
    session_id: int,
    comment: CommentSubmit,
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(get_participant_token),
):
    """Submit a conference-day comment or suggestion."""
    validate_comment_type(comment.comment_type)
    sanitized_text = sanitize_text(comment.comment_text)
    if not sanitized_text:
        raise HTTPException(400, "Comment text must not be empty")

    cs = db.query(ConferenceSession).get(session_id)
    if not cs:
        raise HTTPException(404, "Session not found")

    participant = None
    if token:
        participant = verify_participant_token(token, db)

    cc = ConferenceComment(
        session_id=session_id,
        participant_id=participant.id if participant else None,
        comment_text=sanitized_text,
        comment_type=comment.comment_type,
    )
    db.add(cc)
    db.commit()
    return {"status": "recorded"}


@router.post("/breakout/{session_id}")
def submit_breakout_note(
    session_id: int,
    note: BreakoutNoteSubmit,
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(get_participant_token),
):
    """Submit facilitator notes from a breakout discussion."""
    verify_participant_token(token, db)
    cs = db.query(ConferenceSession).get(session_id)
    if not cs:
        raise HTTPException(404, "Session not found")
    bn = BreakoutNote(
        session_id=session_id,
        table_number=note.table_number,
        facilitator_name=sanitize_text(note.facilitator_name, max_length=200),
        themes=sanitize_text(note.themes) if note.themes else None,
        agreements=sanitize_text(note.agreements) if note.agreements else None,
        disagreements=sanitize_text(note.disagreements) if note.disagreements else None,
        suggestions=sanitize_text(note.suggestions) if note.suggestions else None,
        surprises=sanitize_text(note.surprises) if note.surprises else None,
    )
    db.add(bn)
    db.commit()
    return {"status": "recorded"}


# --- Results ---

@router.get("/results/{session_id}")
def get_session_results(session_id: int, db: Session = Depends(get_db)):
    """Get aggregated results for a conference session."""
    cs = db.query(ConferenceSession).get(session_id)
    if not cs:
        raise HTTPException(404, "Session not found")

    votes = db.query(ConferenceVote).filter(ConferenceVote.session_id == session_id).all()
    comments = db.query(ConferenceComment).filter(ConferenceComment.session_id == session_id).all()
    breakout_notes = db.query(BreakoutNote).filter(BreakoutNote.session_id == session_id).all()

    # Aggregate votes by type and question
    results = {}
    for v in votes:
        key = (v.vote_type, v.question_id)
        if key not in results:
            results[key] = {"question_id": v.question_id, "vote_type": v.vote_type, "values": []}
        results[key]["values"].append(v.value)

    wg_id_to_number = {wg.id: wg.number for wg in db.query(WorkingGroup).all()}
    aggregated = []
    for key, data in results.items():
        values = data["values"]
        q = db.query(Question).get(data["question_id"])
        row = {
            "question_id": data["question_id"],
            "id": data["question_id"],
            "question_text": q.text if q else None,
            "text": q.text if q else None,
            "wg_id": q.wg_id if q else None,
            "wg_number": wg_id_to_number.get(q.wg_id) if q else None,
            "vote_type": data["vote_type"],
            "n_votes": len(values),
            "mean": round(sum(values) / len(values), 2),
            "median": round(sorted(values)[len(values) // 2], 2),
            "sum": round(sum(values), 1),
            "min": min(values),
            "max": max(values),
        }
        if "ranking" in data["vote_type"]:
            row["avg_rank"] = row["mean"]
        elif data["vote_type"] == "importance":
            row["importance_mean"] = row["mean"]
        elif data["vote_type"] == "point_allocation":
            row["points"] = row["sum"]
        aggregated.append(row)

    # Sort by mean for rankings, by sum for allocations
    aggregated.sort(key=lambda x: x["mean"] if "ranking" in x["vote_type"] else -x["sum"])

    unique_voters = len(set(v.participant_id for v in votes))

    return {
        "session_id": session_id,
        "session_type": cs.session_type,
        "phase": cs.phase,
        "unique_voters": unique_voters,
        "total_votes": len(votes),
        "results": aggregated,
        "comments": [{
            "text": c.comment_text,
            "type": c.comment_type,
        } for c in comments],
        "breakout_notes": [{
            # Use the same field names the model uses (and the frontend
            # expects): table_number, facilitator_name. The old shape
            # ("table"/"facilitator", missing id + surprises) made every
            # projector card render blank — see TableReactionsStage.
            "id": bn.id,
            "table_number": bn.table_number,
            "facilitator_name": bn.facilitator_name,
            "themes": bn.themes,
            "agreements": bn.agreements,
            "disagreements": bn.disagreements,
            "suggestions": bn.suggestions,
            "surprises": bn.surprises,
            "created_at": bn.created_at.isoformat() if bn.created_at else None,
        } for bn in breakout_notes],
    }


@router.get("/deliberation-shift/{wg_number}")
def get_deliberation_shift(wg_number: int, db: Session = Depends(get_db)):
    """Compare pre- and post-discussion rankings for a WG."""
    wg = db.query(WorkingGroup).filter(WorkingGroup.number == wg_number).first()
    if not wg:
        raise HTTPException(404, "Working group not found")

    sessions = db.query(ConferenceSession).filter(
        ConferenceSession.wg_id == wg.id,
        ConferenceSession.session_type == "wg_presentation"
    ).all()

    pre_votes = []
    post_votes = []
    for s in sessions:
        votes = db.query(ConferenceVote).filter(ConferenceVote.session_id == s.id).all()
        for v in votes:
            if "pre_discussion" in v.vote_type:
                pre_votes.append(v)
            elif "post_discussion" in v.vote_type:
                post_votes.append(v)

    # Compute average rank per question, pre and post
    def avg_rank(votes_list):
        by_question = {}
        for v in votes_list:
            if v.question_id not in by_question:
                by_question[v.question_id] = []
            by_question[v.question_id].append(v.value)
        return {qid: round(sum(vals) / len(vals), 2) for qid, vals in by_question.items()}

    pre_ranks = avg_rank(pre_votes)
    post_ranks = avg_rank(post_votes)

    shifts = []
    all_qids = set(list(pre_ranks.keys()) + list(post_ranks.keys()))
    for qid in all_qids:
        q = db.query(Question).get(qid)
        pre = pre_ranks.get(qid)
        post = post_ranks.get(qid)
        shift = round(pre - post, 2) if pre and post else None  # positive = moved up
        shifts.append({
            "question_id": qid,
            "question_text": q.text if q else None,
            "pre_avg_rank": pre,
            "post_avg_rank": post,
            "shift": shift,
            "direction": "up" if shift and shift > 0 else "down" if shift and shift < 0 else "unchanged",
        })

    shifts.sort(key=lambda x: x["shift"] or 0, reverse=True)
    return {"wg_number": wg_number, "shifts": shifts}


# --- Live chat (anonymous, post-hoc moderation) ---------------------------

class ChatMessageSubmit(BaseModel):
    body: str


def _chat_message_to_dict(m: ConferenceChatMessage, has_upvoted: bool = False) -> dict:
    """Public chat shape — author identity NEVER exposed."""
    return {
        "id": m.id,
        "session_id": m.session_id,
        "body": m.body,
        "upvote_count": m.upvote_count,
        "hidden": m.hidden,
        "has_upvoted": has_upvoted,
        "created_at": m.created_at.isoformat() if m.created_at else None,
    }


@router.post("/chat/{session_id}")
def post_chat_message(
    session_id: int,
    body: ChatMessageSubmit,
    token: str = Depends(get_participant_token),
    db: Session = Depends(get_db),
):
    """Submit an anonymous chat message tied to a conference session."""
    if not token:
        raise HTTPException(401, "Authorization header required")
    participant = verify_participant_token(token, db)

    session = db.query(ConferenceSession).get(session_id)
    if not session:
        raise HTTPException(404, "Conference session not found")

    text = sanitize_text(body.body or "", max_length=500).strip()
    if not text:
        raise HTTPException(400, "Empty message")

    m = ConferenceChatMessage(
        session_id=session_id,
        participant_id=participant.id,
        body=text,
    )
    db.add(m)
    db.commit()
    db.refresh(m)

    _publish_day("chat_message_new", {"session_id": session_id, "message": _chat_message_to_dict(m)})
    return _chat_message_to_dict(m)


@router.get("/chat/{session_id}")
def list_chat_messages(
    session_id: int,
    sort: str = "top",
    include_hidden: bool = False,
    token: Optional[str] = Depends(get_participant_token),
    db: Session = Depends(get_db),
):
    """List chat messages for a session. Default sort: top (by upvotes, then recency).

    Audience clients pass their token so the response can mark which
    messages they've already upvoted.
    """
    session = db.query(ConferenceSession).get(session_id)
    if not session:
        raise HTTPException(404, "Conference session not found")

    q = db.query(ConferenceChatMessage).filter(ConferenceChatMessage.session_id == session_id)
    if not include_hidden:
        q = q.filter(ConferenceChatMessage.hidden == False)  # noqa: E712
    if sort == "new":
        q = q.order_by(ConferenceChatMessage.created_at.desc())
    else:
        q = q.order_by(
            ConferenceChatMessage.upvote_count.desc(),
            ConferenceChatMessage.created_at.desc(),
        )
    messages = q.limit(500).all()

    # Mark which messages this token has upvoted
    upvoted_ids: set[int] = set()
    if token:
        p = db.query(Participant).filter(Participant.token == token).first()
        if p:
            rows = (
                db.query(ConferenceChatUpvote.message_id)
                .filter(
                    ConferenceChatUpvote.participant_id == p.id,
                    ConferenceChatUpvote.message_id.in_([m.id for m in messages] or [0]),
                )
                .all()
            )
            upvoted_ids = {r.message_id for r in rows}

    return {
        "session_id": session_id,
        "sort": sort,
        "messages": [_chat_message_to_dict(m, m.id in upvoted_ids) for m in messages],
    }


@router.post("/chat/{message_id}/upvote")
def toggle_chat_upvote(
    message_id: int,
    token: str = Depends(get_participant_token),
    db: Session = Depends(get_db),
):
    """Toggle this participant's upvote on a message. Returns the new count and state."""
    if not token:
        raise HTTPException(401, "Authorization header required")
    participant = verify_participant_token(token, db)

    m = db.query(ConferenceChatMessage).get(message_id)
    if not m:
        raise HTTPException(404, "Message not found")
    if m.hidden:
        raise HTTPException(410, "Message is hidden")

    existing = (
        db.query(ConferenceChatUpvote)
        .filter(
            ConferenceChatUpvote.message_id == message_id,
            ConferenceChatUpvote.participant_id == participant.id,
        )
        .first()
    )
    if existing:
        db.delete(existing)
        m.upvote_count = max(0, (m.upvote_count or 0) - 1)
        has_upvoted = False
    else:
        try:
            db.add(ConferenceChatUpvote(message_id=message_id, participant_id=participant.id))
            db.flush()
            m.upvote_count = (m.upvote_count or 0) + 1
            has_upvoted = True
        except IntegrityError:
            db.rollback()
            has_upvoted = True

    db.commit()
    db.refresh(m)

    _publish_day("chat_upvote_changed", {
        "session_id": m.session_id,
        "message_id": message_id,
        "upvote_count": m.upvote_count,
    })
    return {"message_id": message_id, "upvote_count": m.upvote_count, "has_upvoted": has_upvoted}


@router.post("/chat/{message_id}/hide")
def admin_hide_chat_message(
    message_id: int,
    db: Session = Depends(get_db),
    admin: dict = Depends(require_admin),
):
    """Admin: hide a chat message (post-hoc moderation)."""
    m = db.query(ConferenceChatMessage).get(message_id)
    if not m:
        raise HTTPException(404, "Message not found")
    m.hidden = True
    db.commit()
    _publish_day("chat_message_hidden", {"session_id": m.session_id, "message_id": message_id})
    write_audit_log(db, admin.get("email", "admin"), "chat_message_hidden",
                    f"Hid message {message_id} on session {m.session_id}: {m.body[:80]}")
    db.commit()
    return {"ok": True, "message_id": message_id}


@router.post("/chat/{message_id}/unhide")
def admin_unhide_chat_message(
    message_id: int,
    db: Session = Depends(get_db),
    admin: dict = Depends(require_admin),
):
    """Admin: restore a previously-hidden chat message."""
    m = db.query(ConferenceChatMessage).get(message_id)
    if not m:
        raise HTTPException(404, "Message not found")
    m.hidden = False
    db.commit()
    _publish_day("chat_message_unhidden", {"session_id": m.session_id, "message_id": message_id})
    return {"ok": True, "message_id": message_id}


# --- Display mode (singleton — what the projector view is showing) -------

class DisplayModeUpdate(BaseModel):
    mode: str
    slide_index: Optional[int] = None
    panel_tab: Optional[str] = None


@router.get("/display-mode")
def get_display_mode(db: Session = Depends(get_db)):
    """Current display mode for the projector view. Public."""
    row = db.query(ConferenceDisplayMode).get(1)
    if not row:
        return {"mode": "idle", "slide_index": None, "panel_tab": None, "updated_at": None}
    return {
        "mode": row.mode,
        "slide_index": row.slide_index,
        "panel_tab": row.panel_tab,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }


@router.post("/display-mode")
def set_display_mode(
    body: DisplayModeUpdate,
    db: Session = Depends(get_db),
    admin: dict = Depends(require_admin),
):
    """Admin: set the current projector display mode.

    Mode values:
      - 'idle' — auto-rotating dashboard carousel
      - 'welcome' — slide deck (use slide_index 0..N)
      - 'panel:1' .. 'panel:5' — per-WG panel mode (use panel_tab: results|vote|comparison)
      - 'table_reactions' — breakout table grid
      - 'cross_wg' — final cross-WG prioritization
    """
    row = db.query(ConferenceDisplayMode).get(1)
    if not row:
        row = ConferenceDisplayMode(id=1, mode=body.mode)
        db.add(row)
    else:
        row.mode = body.mode
    # Patch semantics: only overwrite slide_index / panel_tab if the
    # client explicitly set them. Otherwise leave the previous value.
    # Avoids the foot-gun where `setDisplay({ mode: 'panel:3' })` silently
    # wipes the panel_tab that another tab just selected.
    fields_set = body.model_fields_set if hasattr(body, "model_fields_set") else set(body.dict(exclude_unset=True).keys())  # noqa: B009
    if "slide_index" in fields_set:
        row.slide_index = body.slide_index
    if "panel_tab" in fields_set:
        row.panel_tab = body.panel_tab
    db.commit()

    _publish_day("display_mode_changed", {
        "mode": row.mode,
        "slide_index": row.slide_index,
        "panel_tab": row.panel_tab,
    })
    return {"mode": row.mode, "slide_index": row.slide_index, "panel_tab": row.panel_tab}


# --- Cross-WG funnel (which questions advance to the closing round) ------

class FeatureRequest(BaseModel):
    question_ids: list[int]
    replace: bool = True  # If true, clears all existing featured flags first.


@router.get("/cross-wg/candidates")
def cross_wg_candidates(db: Session = Depends(get_db)):
    """For each WG, return its top 5 questions by panel-vote average rank.

    Pulls from ConferenceVote rows on wg_presentation sessions. If a WG's
    panel hasn't been voted on yet, falls back to its top R2 questions.
    Returned together with the currently-featured set so the chair can
    one-click "auto-advance top 4" or fine-tune by hand (e.g., WG5's
    5-themed structure may want all 5 surfaced).
    """
    wgs = db.query(WorkingGroup).order_by(WorkingGroup.number).all()
    out_groups: list[dict] = []
    CANDIDATES_PER_WG = 5
    for wg in wgs:
        session = (
            db.query(ConferenceSession)
            .filter(
                ConferenceSession.wg_id == wg.id,
                ConferenceSession.session_type == "wg_presentation",
            )
            .order_by(ConferenceSession.id.desc())
            .first()
        )
        suggested: list[dict] = []
        if session:
            # Average rank per question across all voters in this session.
            # Lower avg_rank = higher priority. Prefer post-discussion
            # rankings (chair's final signal); fall back to pre if no
            # post votes have arrived yet.
            def _rank_query(vote_type: str):
                return (
                    db.query(
                        ConferenceVote.question_id,
                        func.avg(ConferenceVote.value).label("avg_rank"),
                        func.count(func.distinct(ConferenceVote.participant_id)).label("n"),
                    )
                    .filter(
                        ConferenceVote.session_id == session.id,
                        ConferenceVote.vote_type == vote_type,
                    )
                    .group_by(ConferenceVote.question_id)
                    .order_by("avg_rank")
                    .limit(CANDIDATES_PER_WG)
                    .all()
                )
            rows = _rank_query("ranking_post_discussion") or _rank_query("ranking_pre_discussion")
            for r in rows:
                q = db.query(Question).get(int(r.question_id))
                if not q:
                    continue
                suggested.append({
                    "question_id": q.id,
                    "id": q.id,
                    "text": q.text,
                    "r2_include_pct": q.r2_include_pct,
                    "r2_importance_mean": q.r2_importance_mean,
                    "r1_include_pct": q.r1_include_pct,
                    "r1_importance_mean": q.r1_importance_mean,
                    "avg_rank": float(r.avg_rank) if r.avg_rank is not None else None,
                    "n_voters": int(r.n or 0),
                    "is_featured": bool(q.featured_in_cross_wg),
                })
        # Fallback: top N R2 questions if no panel votes yet
        if not suggested:
            fallback = (
                db.query(Question)
                .filter(
                    Question.wg_id == wg.id,
                    Question.status.in_([
                        QuestionStatus.ACTIVE, QuestionStatus.REVISED, QuestionStatus.CONFIRMED
                    ]),
                )
                .order_by(
                    Question.r2_include_pct.desc().nullslast(),
                    Question.r2_importance_mean.desc().nullslast(),
                )
                .limit(CANDIDATES_PER_WG)
                .all()
            )
            suggested = [
                {
                    "question_id": q.id,
                    "id": q.id,
                    "text": q.text,
                    "r2_include_pct": q.r2_include_pct,
                    "r2_importance_mean": q.r2_importance_mean,
                    "r1_include_pct": q.r1_include_pct,
                    "r1_importance_mean": q.r1_importance_mean,
                    "avg_rank": None,
                    "n_voters": 0,
                    "is_featured": bool(q.featured_in_cross_wg),
                    "fallback": True,
                }
                for q in fallback
            ]
        out_groups.append({
            "wg_number": wg.number,
            "wg_name": wg.name,
            "panel_session_id": session.id if session else None,
            "candidates": suggested,
        })

    featured_total = (
        db.query(func.count(Question.id))
        .filter(Question.featured_in_cross_wg == True)  # noqa: E712
        .scalar() or 0
    )
    return {"groups": out_groups, "featured_total": int(featured_total)}


@router.post("/cross-wg/feature")
def cross_wg_feature(
    body: FeatureRequest,
    db: Session = Depends(get_db),
    admin: dict = Depends(require_admin),
):
    """Mark the given question_ids as featured for the cross-WG round.

    When `replace=True` (default), clears the featured flag from all
    questions first — single source of truth for the closing-round pool.
    When `replace=False`, additively adds to the existing featured set.
    """
    if body.replace:
        db.query(Question).filter(
            Question.featured_in_cross_wg == True  # noqa: E712
        ).update({Question.featured_in_cross_wg: False})
    qs = (
        db.query(Question)
        .filter(Question.id.in_(body.question_ids))
        .all()
    )
    for q in qs:
        q.featured_in_cross_wg = True
    db.commit()
    write_audit_log(
        db, admin.get("email", "admin"), "cross_wg_feature",
        f"replace={body.replace} ids={body.question_ids}",
    )
    db.commit()

    _publish_day("cross_wg_features_changed", {"question_ids": body.question_ids})
    return {
        "ok": True,
        "featured": [q.id for q in qs],
        "total_featured": int(
            db.query(func.count(Question.id))
            .filter(Question.featured_in_cross_wg == True)  # noqa: E712
            .scalar() or 0
        ),
    }


# --- Per-WG panel pool (the 6-8 questions each panel votes on) -----------

class PanelPoolRequest(BaseModel):
    wg_number: int
    question_ids: list[int]
    replace: bool = True


@router.get("/panel/{wg_number}/candidates")
def panel_candidates(wg_number: int, db: Session = Depends(get_db)):
    """List the candidate questions a chair can pick for a WG's panel pool.

    Returns every active R2 question for the WG with R1/R2 stats, plus
    a flag noting whether it's currently featured in the panel. The
    chair UI uses this to pick ~6-8 questions per WG.
    """
    wg = db.query(WorkingGroup).filter(WorkingGroup.number == wg_number).first()
    if not wg:
        raise HTTPException(404, "Working group not found")
    qs = (
        db.query(Question)
        .filter(
            Question.wg_id == wg.id,
            Question.status.in_([
                QuestionStatus.ACTIVE, QuestionStatus.REVISED, QuestionStatus.CONFIRMED
            ]),
        )
        .order_by(
            Question.r2_include_pct.desc().nullslast(),
            Question.r2_importance_mean.desc().nullslast(),
            Question.id,
        )
        .all()
    )
    return {
        "wg_number": wg.number,
        "wg_name": wg.name,
        "n_featured": sum(1 for q in qs if q.featured_in_panel),
        "questions": [{
            "id": q.id,
            "text": q.text,
            "status": q.status.value if q.status else None,
            "r2_include_pct": q.r2_include_pct,
            "r2_importance_mean": q.r2_importance_mean,
            "r1_include_pct": q.r1_include_pct,
            "r1_importance_mean": q.r1_importance_mean,
            "pairwise_score": q.pairwise_score,
            "is_featured": bool(q.featured_in_panel),
        } for q in qs],
    }


@router.post("/panel/feature")
def panel_feature(
    body: PanelPoolRequest,
    db: Session = Depends(get_db),
    actor: dict = Depends(require_chair),
):
    """Set the panel pool for a WG. Accepts admin OR the WG's co-lead.

    When `replace=True` (default), clears every featured_in_panel flag
    for this WG first, then sets the given question_ids. When False,
    adds additively.
    """
    _assert_chair_scope(actor, body.wg_number)
    wg = db.query(WorkingGroup).filter(WorkingGroup.number == body.wg_number).first()
    if not wg:
        raise HTTPException(404, "Working group not found")

    if body.replace:
        db.query(Question).filter(
            Question.wg_id == wg.id,
            Question.featured_in_panel == True,  # noqa: E712
        ).update({Question.featured_in_panel: False})

    qs = (
        db.query(Question)
        .filter(
            Question.id.in_(body.question_ids),
            Question.wg_id == wg.id,
        )
        .all()
    )
    for q in qs:
        q.featured_in_panel = True
    db.commit()
    write_audit_log(
        db, actor.get("email", "chair"), "panel_pool_feature",
        f"WG{body.wg_number} replace={body.replace} ids={[q.id for q in qs]} actor={actor['actor']}",
    )
    _publish_day("panel_pool_changed", {"wg_number": body.wg_number, "ids": [q.id for q in qs]})
    return {
        "ok": True,
        "wg_number": body.wg_number,
        "featured_ids": [q.id for q in qs],
    }


@router.post("/panel/{wg_number}/auto-feature")
def panel_auto_feature(
    wg_number: int,
    n: int = 8,
    db: Session = Depends(get_db),
    actor: dict = Depends(require_chair),
):
    """One-click: feature the top N questions (by R2 include% + importance)
    for the given WG's panel starter pool. Chair OR the WG's co-lead can
    call this. Default 8 = upper bound of the 6–8 starter pool per WG."""
    _assert_chair_scope(actor, wg_number)
    wg = db.query(WorkingGroup).filter(WorkingGroup.number == wg_number).first()
    if not wg:
        raise HTTPException(404, "Working group not found")
    top = (
        db.query(Question)
        .filter(
            Question.wg_id == wg.id,
            Question.status.in_([
                QuestionStatus.ACTIVE, QuestionStatus.REVISED, QuestionStatus.CONFIRMED
            ]),
        )
        .order_by(
            Question.r2_include_pct.desc().nullslast(),
            Question.r2_importance_mean.desc().nullslast(),
        )
        .limit(max(1, min(n, 10)))
        .all()
    )
    return panel_feature(
        PanelPoolRequest(wg_number=wg_number, question_ids=[q.id for q in top], replace=True),
        db, actor,
    )


@router.post("/panel/{wg_number}/reset")
def panel_reset(
    wg_number: int,
    db: Session = Depends(get_db),
    actor: dict = Depends(require_chair),
):
    """Clear all featured_in_panel flags for a given WG."""
    _assert_chair_scope(actor, wg_number)
    wg = db.query(WorkingGroup).filter(WorkingGroup.number == wg_number).first()
    if not wg:
        raise HTTPException(404, "Working group not found")
    n = (
        db.query(Question)
        .filter(
            Question.wg_id == wg.id,
            Question.featured_in_panel == True,  # noqa: E712
        )
        .update({Question.featured_in_panel: False})
    )
    db.commit()
    write_audit_log(
        db, actor.get("email", "chair"), "panel_pool_reset",
        f"WG{wg_number} cleared={n} actor={actor['actor']}",
    )
    _publish_day("panel_pool_changed", {"wg_number": wg_number, "ids": []})
    return {"ok": True, "wg_number": wg_number, "cleared": n}


@router.post("/cross-wg/reset")
def cross_wg_reset(
    db: Session = Depends(get_db),
    admin: dict = Depends(require_admin),
):
    """Clear all featured_in_cross_wg flags. Admin-only."""
    n = (
        db.query(Question)
        .filter(Question.featured_in_cross_wg == True)  # noqa: E712
        .update({Question.featured_in_cross_wg: False})
    )
    db.commit()
    write_audit_log(
        db, admin.get("sub", "admin"), "cross_wg_reset", f"cleared={n}"
    )
    _publish_day("cross_wg_changed", {"ids": []})
    return {"ok": True, "cleared": n}


@router.post("/cross-wg/auto-feature")
def cross_wg_auto_feature(
    n: int = 4,
    wg5_all: bool = True,
    db: Session = Depends(get_db),
    admin: dict = Depends(require_admin),
):
    """Convenience: clears featured flags, then features the top N per WG.

    WG5 enters with a thematically-categorized question set (Arwen's
    structure) that we want to surface in full, so `wg5_all=True` (the
    default) features every WG5 candidate rather than capping at N.
    Result: 4×4 + 5 = 21 questions in the closing round.
    """
    candidates = cross_wg_candidates(db)
    ids: list[int] = []
    for grp in candidates["groups"]:
        take = len(grp["candidates"]) if (wg5_all and grp.get("wg_number") == 5) else n
        for c in grp["candidates"][:take]:
            ids.append(int(c["question_id"]))
    return cross_wg_feature(FeatureRequest(question_ids=ids, replace=True), db, admin)


# --- AI prompt suggestion (chair-triggered) -------------------------------

@router.post("/ai/suggest-prompts")
async def ai_suggest_prompts(
    session_id: int,
    n: int = 3,
    db: Session = Depends(get_db),
    actor: dict = Depends(require_chair),
):
    """Synthesize the panel's audience chat into N new discussion prompts.

    Chair-triggered (the button on /command). Pulls the last ~30
    non-hidden chat messages plus the WG's R2 starter questions, sends
    them to Claude with a moderator-coaching prompt, and returns the
    raw suggestions. The model is constrained to neutral, dialog-
    deepening questions — chair previews before reading aloud.
    """
    from ..services.ai_synthesis import suggest_discussion_prompts

    cs = db.query(ConferenceSession).get(session_id)
    if not cs:
        raise HTTPException(404, "Session not found")
    if cs.session_type != "wg_presentation":
        raise HTTPException(400, "AI prompts are only available for WG panel sessions")

    wg = db.query(WorkingGroup).get(cs.wg_id) if cs.wg_id else None
    if not wg:
        raise HTTPException(404, "WG not found for this session")
    if actor["actor"] == "co_lead":
        _assert_chair_scope(actor, wg.number)

    # Last ~30 visible audience messages, oldest→newest reversed so the
    # model sees the freshest context first.
    messages = (
        db.query(ConferenceChatMessage)
        .filter(
            ConferenceChatMessage.session_id == session_id,
            ConferenceChatMessage.hidden == False,  # noqa: E712
        )
        .order_by(ConferenceChatMessage.created_at.desc())
        .limit(30)
        .all()
    )
    chat_bodies = [m.body for m in messages if m.body]

    # Starter questions: the curated panel pool if set, else top R2
    pool = (
        db.query(Question)
        .filter(
            Question.wg_id == wg.id,
            Question.featured_in_panel == True,  # noqa: E712
        )
        .all()
    )
    if not pool:
        pool = (
            db.query(Question)
            .filter(
                Question.wg_id == wg.id,
                Question.status.in_([
                    QuestionStatus.ACTIVE, QuestionStatus.REVISED, QuestionStatus.CONFIRMED
                ]),
            )
            .order_by(
                Question.r2_include_pct.desc().nullslast(),
                Question.r2_importance_mean.desc().nullslast(),
            )
            .limit(6)
            .all()
        )
    starter_qs = [q.text for q in pool]

    try:
        prompts = await suggest_discussion_prompts(
            wg_name=wg.name or f"Working Group {wg.number}",
            starter_questions=starter_qs,
            chat_messages=chat_bodies,
            n=max(1, min(n, 5)),
        )
    except RuntimeError as e:
        raise HTTPException(503, f"AI suggestion failed: {e}")

    write_audit_log(
        db, actor.get("email", "chair"), "ai_prompt_suggest",
        f"WG{wg.number} session={session_id} n_chat={len(chat_bodies)} n_returned={len(prompts)}",
    )

    return {
        "session_id": session_id,
        "wg_number": wg.number,
        "n_messages_used": len(chat_bodies),
        "suggestions": prompts,
    }


# --- Push AI prompts to projector ---------------------------------------

import json as _json


def _load_session_ai_prompts(cs) -> list[str]:
    if not getattr(cs, "ai_prompts", None):
        return []
    try:
        arr = _json.loads(cs.ai_prompts)
        return [str(s) for s in arr if isinstance(s, str)] if isinstance(arr, list) else []
    except Exception:
        return []


class AiPromoteBody(BaseModel):
    session_id: int
    prompt: str


class AiClearBody(BaseModel):
    session_id: int


@router.get("/ai/prompts/{session_id}")
def ai_get_promoted_prompts(session_id: int, db: Session = Depends(get_db)):
    """Public: return the AI prompts the chair has promoted onto the
    projector for this session. Used by /stage's PanelStage to render
    them alongside the static discussion prompts."""
    cs = db.query(ConferenceSession).get(session_id)
    if not cs:
        raise HTTPException(404, "Session not found")
    return {"session_id": session_id, "prompts": _load_session_ai_prompts(cs)}


@router.post("/ai/promote-prompt")
def ai_promote_prompt(
    body: AiPromoteBody,
    db: Session = Depends(get_db),
    actor: dict = Depends(require_chair),
):
    """Append an AI-suggested prompt to the session's promoted list."""
    cs = db.query(ConferenceSession).get(body.session_id)
    if not cs:
        raise HTTPException(404, "Session not found")
    wg = db.query(WorkingGroup).get(cs.wg_id) if cs.wg_id else None
    if wg and actor["actor"] == "co_lead":
        _assert_chair_scope(actor, wg.number)
    text = (body.prompt or "").strip()
    if not text:
        raise HTTPException(400, "Empty prompt")
    if len(text) > 500:
        text = text[:500]
    current = _load_session_ai_prompts(cs)
    # Cap at 3 promoted prompts; FIFO out the oldest if needed
    current.append(text)
    if len(current) > 3:
        current = current[-3:]
    cs.ai_prompts = _json.dumps(current)
    db.commit()
    write_audit_log(
        db, actor.get("email", "chair"), "ai_prompt_promote",
        f"session={body.session_id} prompt={text[:80]!r}",
    )
    _publish_day("ai_prompts_changed", {"session_id": body.session_id, "prompts": current})
    return {"session_id": body.session_id, "prompts": current}


@router.post("/ai/clear-prompts")
def ai_clear_prompts(
    body: AiClearBody,
    db: Session = Depends(get_db),
    actor: dict = Depends(require_chair),
):
    """Clear all promoted AI prompts for a session."""
    cs = db.query(ConferenceSession).get(body.session_id)
    if not cs:
        raise HTTPException(404, "Session not found")
    wg = db.query(WorkingGroup).get(cs.wg_id) if cs.wg_id else None
    if wg and actor["actor"] == "co_lead":
        _assert_chair_scope(actor, wg.number)
    cs.ai_prompts = None
    db.commit()
    write_audit_log(
        db, actor.get("email", "chair"), "ai_prompt_clear",
        f"session={body.session_id}",
    )
    _publish_day("ai_prompts_changed", {"session_id": body.session_id, "prompts": []})
    return {"session_id": body.session_id, "prompts": []}
