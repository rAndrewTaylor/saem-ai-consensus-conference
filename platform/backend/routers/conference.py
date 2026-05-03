"""Conference-day polling routes — real-time voting with offline support."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from ..database import (
    get_db, WorkingGroup, Question, Participant, ConferenceSession,
    ConferenceVote, ConferenceComment, BreakoutNote, QuestionStatus,
    AuditLog, write_audit_log,
)
from ..auth import require_admin, get_participant_token, verify_participant_token
from ..validators import (
    validate_session_type, validate_importance, sanitize_text,
    validate_comment_type, safe_csv_value, VALID_PHASES,
)

router = APIRouter()


# --- Schemas ---

class SessionCreate(BaseModel):
    wg_number: Optional[int] = None  # null for cross-WG
    session_type: str  # "wg_presentation" or "cross_wg_prioritization"
    phase: str = "pre_discussion"

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
    """Activate a voting session (opens it for responses)."""
    cs = db.query(ConferenceSession).get(session_id)
    if not cs:
        raise HTTPException(404, "Session not found")
    cs.is_active = True
    cs.started_at = datetime.utcnow()
    db.commit()
    write_audit_log(
        db,
        user_email=admin.get("sub", "unknown"),
        action="session_start",
        detail=f"Started session {session_id} (type={cs.session_type})",
    )
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
    return {"session_id": cs.id, "is_active": False}


@router.post("/sessions/{session_id}/phase")
def update_phase(
    session_id: int,
    phase: str,
    db: Session = Depends(get_db),
    admin: dict = Depends(require_admin),
):
    """Update the phase of a session (pre_discussion -> post_discussion)."""
    _validate_phase(phase)
    cs = db.query(ConferenceSession).get(session_id)
    if not cs:
        raise HTTPException(404, "Session not found")
    cs.phase = phase
    db.commit()
    return {"session_id": cs.id, "phase": cs.phase}


@router.get("/sessions")
def list_sessions(db: Session = Depends(get_db)):
    """List all conference sessions."""
    sessions = db.query(ConferenceSession).order_by(ConferenceSession.id).all()
    return [{
        "id": s.id,
        "wg_id": s.wg_id,
        "session_type": s.session_type,
        "phase": s.phase,
        "is_active": s.is_active,
        "started_at": s.started_at.isoformat() if s.started_at else None,
        "vote_count": db.query(ConferenceVote).filter(ConferenceVote.session_id == s.id).count(),
    } for s in sessions]


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
        {"time": "2:50 PM",  "title": "Priority presentations (top 5 per WG)",   "kind": "presentation"},
        {"time": "3:20 PM",  "title": "Cross-WG consensus vote (100-point allocation)", "kind": "vote", "session_type": "cross_wg_prioritization"},
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
    """Get the questions available for voting in a session."""
    cs = db.query(ConferenceSession).get(session_id)
    if not cs:
        raise HTTPException(404, "Session not found")

    if cs.session_type == "cross_wg_prioritization":
        # All confirmed questions across all WGs
        questions = db.query(Question).filter(
            Question.status == QuestionStatus.CONFIRMED
        ).order_by(Question.wg_id, Question.id).all()
    else:
        # Questions for a specific WG
        questions = db.query(Question).filter(
            Question.wg_id == cs.wg_id,
            Question.status.in_([QuestionStatus.CONFIRMED, QuestionStatus.NEAR_CONSENSUS])
        ).order_by(Question.id).all()

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

    participant = None
    if token:
        participant = db.query(Participant).filter(Participant.token == token).first()

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
def submit_breakout_note(session_id: int, note: BreakoutNoteSubmit, db: Session = Depends(get_db)):
    """Submit facilitator notes from a breakout discussion."""
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

    aggregated = []
    for key, data in results.items():
        values = data["values"]
        q = db.query(Question).get(data["question_id"])
        aggregated.append({
            "question_id": data["question_id"],
            "question_text": q.text if q else None,
            "wg_id": q.wg_id if q else None,
            "vote_type": data["vote_type"],
            "n_votes": len(values),
            "mean": round(sum(values) / len(values), 2),
            "median": round(sorted(values)[len(values) // 2], 2),
            "sum": round(sum(values), 1),
            "min": min(values),
            "max": max(values),
        })

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
            "table": bn.table_number,
            "facilitator": bn.facilitator_name,
            "themes": bn.themes,
            "agreements": bn.agreements,
            "disagreements": bn.disagreements,
            "suggestions": bn.suggestions,
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
