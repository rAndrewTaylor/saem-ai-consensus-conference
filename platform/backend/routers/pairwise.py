"""Pairwise comparison routes — Bradley-Terry ranking engine."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional
import random
import math

from ..database import (
    get_db, WorkingGroup, Question, Participant, PairwiseVote,
    PairwiseSuggestion, QuestionStatus
)
from ..validators import sanitize_text
from ..auth import verify_participant_token, get_participant_token, require_admin

router = APIRouter()


class PairwiseVoteSubmit(BaseModel):
    question_a_id: int
    question_b_id: int
    winner_id: Optional[int] = None  # null = "can't decide"
    response_time_ms: Optional[int] = None

class PairwiseSuggestionSubmit(BaseModel):
    suggestion_text: str


# --- Get a Pair ---

@router.get("/pair/{wg_number}")
def get_pair(
    wg_number: int,
    token: str = Depends(get_participant_token),
    db: Session = Depends(get_db),
):
    """Get a random pair of questions for comparison.

    Uses adaptive pairing: prefers pairs that haven't been compared as often,
    and avoids showing the same pair to the same participant.
    """
    wg = db.query(WorkingGroup).filter(WorkingGroup.number == wg_number).first()
    if not wg:
        raise HTTPException(404, "Working group not found")

    questions = db.query(Question).filter(
        Question.wg_id == wg.id,
        Question.status.in_([QuestionStatus.ACTIVE, QuestionStatus.CONFIRMED, QuestionStatus.REVISED])
    ).all()

    if len(questions) < 2:
        raise HTTPException(400, "Need at least 2 questions for pairwise comparison")

    # Get participant's previous votes to avoid repeats
    seen_pairs = set()
    if token:
        participant = db.query(Participant).filter(Participant.token == token).first()
        if participant:
            prev_votes = db.query(PairwiseVote).filter(
                PairwiseVote.participant_id == participant.id,
                PairwiseVote.wg_id == wg.id,
            ).all()
            for v in prev_votes:
                seen_pairs.add((min(v.question_a_id, v.question_b_id),
                               max(v.question_a_id, v.question_b_id)))

    # Generate candidate pairs, preferring unseen ones
    all_pairs = []
    for i, qa in enumerate(questions):
        for qb in questions[i+1:]:
            pair = (min(qa.id, qb.id), max(qa.id, qb.id))
            if pair not in seen_pairs:
                all_pairs.append((qa, qb))

    if not all_pairs:
        # All pairs seen — allow repeats but shuffle
        all_pairs = [(questions[i], questions[j])
                     for i in range(len(questions))
                     for j in range(i+1, len(questions))]

    # Pick a random pair (could be smarter — e.g., prefer pairs with fewer total votes)
    qa, qb = random.choice(all_pairs)

    # Randomize order
    if random.random() > 0.5:
        qa, qb = qb, qa

    return {
        "question_a": {"id": qa.id, "text": qa.text, "short_text": qa.short_text},
        "question_b": {"id": qb.id, "text": qb.text, "short_text": qb.short_text},
        "wg_number": wg_number,
        "wg_name": wg.name,
        "total_questions": len(questions),
    }


# --- Submit a Vote ---

@router.post("/vote/{wg_number}")
def submit_vote(
    wg_number: int, vote: PairwiseVoteSubmit,
    token: str = Depends(get_participant_token),
    db: Session = Depends(get_db),
):
    """Record a pairwise vote and update scores."""
    if not token:
        raise HTTPException(401, "Authorization header required")
    participant = verify_participant_token(token, db)

    wg = db.query(WorkingGroup).filter(WorkingGroup.number == wg_number).first()
    if not wg:
        raise HTTPException(404, "Working group not found")

    # Validate winner_id is one of the two questions or None
    if vote.winner_id is not None and vote.winner_id not in (vote.question_a_id, vote.question_b_id):
        raise HTTPException(400, "winner_id must be one of question_a_id, question_b_id, or null")

    # Normalize pair order for consistent unique constraint matching
    norm_a = min(vote.question_a_id, vote.question_b_id)
    norm_b = max(vote.question_a_id, vote.question_b_id)

    try:
        pv = PairwiseVote(
            participant_id=participant.id,
            question_a_id=norm_a,
            question_b_id=norm_b,
            winner_id=vote.winner_id,
            wg_id=wg.id,
            response_time_ms=vote.response_time_ms,
        )
        db.add(pv)
        db.flush()
    except IntegrityError:
        db.rollback()
        # UniqueConstraint hit — update the existing vote instead
        existing = db.query(PairwiseVote).filter(
            PairwiseVote.participant_id == participant.id,
            PairwiseVote.question_a_id == norm_a,
            PairwiseVote.question_b_id == norm_b,
            PairwiseVote.wg_id == wg.id,
        ).first()
        if existing:
            old_winner = existing.winner_id
            existing.winner_id = vote.winner_id
            existing.response_time_ms = vote.response_time_ms
            # Reverse the old vote's effect on win/loss counts before applying new one
            if old_winner:
                old_winner_q = db.query(Question).get(old_winner)
                old_loser_id = norm_b if old_winner == norm_a else norm_a
                old_loser_q = db.query(Question).get(old_loser_id)
                if old_winner_q:
                    old_winner_q.pairwise_wins = max((old_winner_q.pairwise_wins or 0) - 1, 0)
                if old_loser_q:
                    old_loser_q.pairwise_losses = max((old_loser_q.pairwise_losses or 0) - 1, 0)

    # Incrementally update win/loss counts for the two affected questions only
    if vote.winner_id:
        winner = db.query(Question).get(vote.winner_id)
        loser_id = norm_b if vote.winner_id == norm_a else norm_a
        loser = db.query(Question).get(loser_id)
        if winner:
            winner.pairwise_wins = (winner.pairwise_wins or 0) + 1
        if loser:
            loser.pairwise_losses = (loser.pairwise_losses or 0) + 1

    db.commit()

    # Incrementally recompute scores for only the two affected questions
    _update_scores_for_pair(norm_a, norm_b, db)

    return {"status": "recorded"}


def _update_scores_for_pair(question_a_id: int, question_b_id: int, db: Session):
    """Recompute Bradley-Terry scores for just the two questions in a pair.

    Uses Laplace-smoothed win rate: Score = (wins + 1) / (wins + losses + 2) * 100
    """
    for qid in (question_a_id, question_b_id):
        q = db.query(Question).get(qid)
        if not q:
            continue
        wins = q.pairwise_wins or 0
        losses = q.pairwise_losses or 0
        total = wins + losses
        if total == 0:
            q.pairwise_score = 50.0
        else:
            q.pairwise_score = round((wins + 1) / (total + 2) * 100, 1)

    db.commit()


# --- Rankings ---

@router.get("/rankings/{wg_number}")
def get_rankings(wg_number: int, db: Session = Depends(get_db)):
    """Get current pairwise rankings for a working group."""
    wg = db.query(WorkingGroup).filter(WorkingGroup.number == wg_number).first()
    if not wg:
        raise HTTPException(404, "Working group not found")

    questions = db.query(Question).filter(
        Question.wg_id == wg.id,
        Question.status.in_([QuestionStatus.ACTIVE, QuestionStatus.CONFIRMED, QuestionStatus.REVISED])
    ).order_by(Question.pairwise_score.desc().nullslast()).all()

    total_votes = db.query(PairwiseVote).filter(PairwiseVote.wg_id == wg.id).count()

    return {
        "wg_number": wg_number,
        "wg_name": wg.name,
        "total_votes": total_votes,
        "rankings": [{
            "rank": i + 1,
            "question_id": q.id,
            "text": q.text,
            "score": q.pairwise_score or 50.0,
            "wins": q.pairwise_wins or 0,
            "losses": q.pairwise_losses or 0,
            "total_comparisons": (q.pairwise_wins or 0) + (q.pairwise_losses or 0),
            "delphi_status": q.status.value,
        } for i, q in enumerate(questions)],
    }


# --- Suggestions ---

@router.post("/suggest/{wg_number}")
def submit_pairwise_suggestion(
    wg_number: int, suggestion: PairwiseSuggestionSubmit,
    token: str = Depends(get_participant_token),
    db: Session = Depends(get_db),
):
    """Suggest a new question via the pairwise interface."""
    if not token:
        raise HTTPException(401, "Authorization header required")
    participant = verify_participant_token(token, db)

    wg = db.query(WorkingGroup).filter(WorkingGroup.number == wg_number).first()
    if not wg:
        raise HTTPException(404, "Working group not found")
    s = PairwiseSuggestion(
        participant_id=participant.id,
        wg_id=wg.id,
        suggestion_text=sanitize_text(suggestion.suggestion_text),
    )
    db.add(s)
    db.commit()
    return {"status": "recorded"}


@router.get("/suggestions/{wg_number}")
def get_pairwise_suggestions(
    wg_number: int,
    db: Session = Depends(get_db),
    admin: dict = Depends(require_admin),
):
    """Get all pairwise suggestions for review."""
    wg = db.query(WorkingGroup).filter(WorkingGroup.number == wg_number).first()
    if not wg:
        raise HTTPException(404, "Working group not found")
    suggestions = db.query(PairwiseSuggestion).filter(PairwiseSuggestion.wg_id == wg.id).all()
    return [{
        "id": s.id,
        "suggestion_text": s.suggestion_text,
        "approved": s.approved,
        "reviewed_by": s.reviewed_by,
        "created_at": s.created_at.isoformat(),
    } for s in suggestions]


# --- Stats ---

@router.get("/stats/{wg_number}")
def get_pairwise_stats(wg_number: int, db: Session = Depends(get_db)):
    """Get participation stats for pairwise comparison."""
    wg = db.query(WorkingGroup).filter(WorkingGroup.number == wg_number).first()
    if not wg:
        raise HTTPException(404, "Working group not found")

    total_votes = db.query(PairwiseVote).filter(PairwiseVote.wg_id == wg.id).count()
    total_skips = db.query(PairwiseVote).filter(
        PairwiseVote.wg_id == wg.id,
        PairwiseVote.winner_id.is_(None)
    ).count()
    unique_participants = db.query(func.count(func.distinct(PairwiseVote.participant_id))).filter(
        PairwiseVote.wg_id == wg.id
    ).scalar()
    avg_response_time = db.query(func.avg(PairwiseVote.response_time_ms)).filter(
        PairwiseVote.wg_id == wg.id,
        PairwiseVote.response_time_ms.isnot(None)
    ).scalar()

    return {
        "wg_number": wg_number,
        "total_votes": total_votes,
        "total_skips": total_skips,
        "unique_participants": unique_participants or 0,
        "avg_response_time_ms": round(avg_response_time) if avg_response_time else None,
        "votes_per_participant": round(total_votes / unique_participants, 1) if unique_participants else 0,
    }


@router.get("/my-count/{wg_number}")
def get_my_pairwise_count(
    wg_number: int,
    token: str = Depends(get_participant_token),
    db: Session = Depends(get_db),
):
    """Return how many pairwise votes this participant has made for a WG."""
    if not token:
        return {"count": 0, "minimum": 50}
    participant = db.query(Participant).filter(Participant.token == token).first()
    if not participant:
        return {"count": 0, "minimum": 50}
    wg = db.query(WorkingGroup).filter(WorkingGroup.number == wg_number).first()
    if not wg:
        return {"count": 0, "minimum": 50}
    count = db.query(PairwiseVote).filter(
        PairwiseVote.participant_id == participant.id,
        PairwiseVote.wg_id == wg.id,
    ).count()
    return {"count": count, "minimum": 50, "complete": count >= 50}
