"""Conference-day polling routes — real-time voting with offline support."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from ..database import (
    get_db, WorkingGroup, Question, Participant, ConferenceSession,
    ConferenceVote, ConferenceComment, BreakoutNote, QuestionStatus
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


# --- Session Management ---

@router.post("/sessions")
def create_session(session: SessionCreate, db: Session = Depends(get_db)):
    """Create a conference-day voting session."""
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
def start_session(session_id: int, db: Session = Depends(get_db)):
    """Activate a voting session (opens it for responses)."""
    cs = db.query(ConferenceSession).get(session_id)
    if not cs:
        raise HTTPException(404, "Session not found")
    cs.is_active = True
    cs.started_at = datetime.utcnow()
    db.commit()
    return {"session_id": cs.id, "is_active": True}


@router.post("/sessions/{session_id}/stop")
def stop_session(session_id: int, db: Session = Depends(get_db)):
    """Close a voting session."""
    cs = db.query(ConferenceSession).get(session_id)
    if not cs:
        raise HTTPException(404, "Session not found")
    cs.is_active = False
    cs.ended_at = datetime.utcnow()
    db.commit()
    return {"session_id": cs.id, "is_active": False}


@router.post("/sessions/{session_id}/phase")
def update_phase(session_id: int, phase: str, db: Session = Depends(get_db)):
    """Update the phase of a session (pre_discussion -> post_discussion)."""
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
def submit_ranking(session_id: int, vote: RankingVoteSubmit, token: str, db: Session = Depends(get_db)):
    """Submit a priority ranking (top N)."""
    cs = db.query(ConferenceSession).get(session_id)
    if not cs or not cs.is_active:
        raise HTTPException(400, "Session not active")

    participant = db.query(Participant).filter(Participant.token == token).first()
    if not participant:
        raise HTTPException(401, "Invalid token")

    for question_id, rank in vote.rankings.items():
        cv = ConferenceVote(
            session_id=session_id,
            participant_id=participant.id,
            question_id=int(question_id),
            vote_type=f"ranking_{cs.phase}",
            value=float(rank),
        )
        db.add(cv)
    db.commit()
    return {"status": "recorded", "count": len(vote.rankings)}


@router.post("/vote/{session_id}/importance")
def submit_importance(session_id: int, vote: ImportanceVoteSubmit, token: str, db: Session = Depends(get_db)):
    """Submit importance ratings (1-9)."""
    cs = db.query(ConferenceSession).get(session_id)
    if not cs or not cs.is_active:
        raise HTTPException(400, "Session not active")

    participant = db.query(Participant).filter(Participant.token == token).first()
    if not participant:
        raise HTTPException(401, "Invalid token")

    for question_id, rating in vote.ratings.items():
        cv = ConferenceVote(
            session_id=session_id,
            participant_id=participant.id,
            question_id=int(question_id),
            vote_type="importance",
            value=float(rating),
        )
        db.add(cv)
    db.commit()
    return {"status": "recorded", "count": len(vote.ratings)}


@router.post("/vote/{session_id}/allocate")
def submit_allocation(session_id: int, vote: PointAllocationSubmit, token: str, db: Session = Depends(get_db)):
    """Submit point allocation (must sum to budget)."""
    total = sum(vote.allocations.values())
    if abs(total - vote.budget) > 1.0:  # allow small rounding errors
        raise HTTPException(400, f"Points must sum to {vote.budget}, got {total}")

    cs = db.query(ConferenceSession).get(session_id)
    if not cs or not cs.is_active:
        raise HTTPException(400, "Session not active")

    participant = db.query(Participant).filter(Participant.token == token).first()
    if not participant:
        raise HTTPException(401, "Invalid token")

    for question_id, points in vote.allocations.items():
        if points > 0:
            cv = ConferenceVote(
                session_id=session_id,
                participant_id=participant.id,
                question_id=int(question_id),
                vote_type="point_allocation",
                value=float(points),
            )
            db.add(cv)
    db.commit()
    return {"status": "recorded", "total_points": total}


# --- Comments and Breakout Notes ---

@router.post("/comment/{session_id}")
def submit_comment(session_id: int, comment: CommentSubmit, token: Optional[str] = None, db: Session = Depends(get_db)):
    """Submit a conference-day comment or suggestion."""
    participant = None
    if token:
        participant = db.query(Participant).filter(Participant.token == token).first()

    cc = ConferenceComment(
        session_id=session_id,
        participant_id=participant.id if participant else None,
        comment_text=comment.comment_text,
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
        facilitator_name=note.facilitator_name,
        themes=note.themes,
        agreements=note.agreements,
        disagreements=note.disagreements,
        suggestions=note.suggestions,
        surprises=note.surprises,
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
