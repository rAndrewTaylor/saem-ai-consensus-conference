"""Pairwise comparison routes — Bradley-Terry ranking engine."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional
import random
import math

from ..database import (
    get_db, WorkingGroup, Question, Participant, PairwiseVote,
    PairwiseSuggestion, QuestionStatus, AuditLog, DelphiRound,
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
    if not _pairwise_voting_open(wg):
        raise HTTPException(
            409,
            f"Pairwise voting is paused for WG{wg_number} — no Delphi round is currently open.",
        )

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
    if not _pairwise_voting_open(wg):
        raise HTTPException(
            409,
            f"Pairwise voting is paused for WG{wg_number} — no Delphi round is currently open.",
        )

    # Validate winner_id is one of the two questions or None
    if vote.winner_id is not None and vote.winner_id not in (vote.question_a_id, vote.question_b_id):
        raise HTTPException(400, "winner_id must be one of question_a_id, question_b_id, or null")

    # Normalize pair order for consistent unique constraint matching
    norm_a = min(vote.question_a_id, vote.question_b_id)
    norm_b = max(vote.question_a_id, vote.question_b_id)

    current_round = _current_round_for_wg(db, wg_number)

    try:
        pv = PairwiseVote(
            participant_id=participant.id,
            question_a_id=norm_a,
            question_b_id=norm_b,
            winner_id=vote.winner_id,
            wg_id=wg.id,
            response_time_ms=vote.response_time_ms,
            round=current_round,
        )
        db.add(pv)
        db.flush()
    except IntegrityError:
        db.rollback()
        # UniqueConstraint hit — update the existing vote (same round only).
        existing = db.query(PairwiseVote).filter(
            PairwiseVote.participant_id == participant.id,
            PairwiseVote.question_a_id == norm_a,
            PairwiseVote.question_b_id == norm_b,
            PairwiseVote.wg_id == wg.id,
            PairwiseVote.round == current_round,
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
def get_rankings(
    wg_number: int,
    round_name: Optional[str] = Query(None, alias="round"),
    db: Session = Depends(get_db),
):
    """Get pairwise rankings for a working group, scoped to a single round.

    Query param `round_name` (alias `round`) accepts "round_1" / "round_2"
    (also "1" / "2"). If omitted, defaults to the WG's current round (R2
    once transitioned). Wins/losses/score are computed on the fly from the
    round-filtered pairwise_votes so historical R1 rankings remain
    queryable even after a WG has transitioned to R2.
    """
    wg = db.query(WorkingGroup).filter(WorkingGroup.number == wg_number).first()
    if not wg:
        raise HTTPException(404, "Working group not found")

    if round_name in ("round_1", "1"):
        target_round = DelphiRound.ROUND_1
    elif round_name in ("round_2", "2"):
        target_round = DelphiRound.ROUND_2
    else:
        target_round = _current_round_for_wg(db, wg_number)

    # Question pool depends on round: R2 → currently-active questions; R1 →
    # everything that existed in R1 (including REMOVED questions, with their
    # R1 stats preserved).
    q_query = db.query(Question).filter(Question.wg_id == wg.id)
    if target_round == DelphiRound.ROUND_2:
        q_query = q_query.filter(Question.status.in_([
            QuestionStatus.ACTIVE, QuestionStatus.CONFIRMED, QuestionStatus.REVISED
        ]))
    else:
        q_query = q_query.filter(
            (Question.source == None) | (Question.source != "chair_round_2")
        )
    questions = q_query.all()

    # Compute round-scoped wins/losses per question on the fly.
    qids = [q.id for q in questions]
    wins_map = dict(
        db.query(PairwiseVote.winner_id, func.count(PairwiseVote.id))
        .filter(
            PairwiseVote.wg_id == wg.id,
            PairwiseVote.round == target_round,
            PairwiseVote.winner_id.in_(qids),
        )
        .group_by(PairwiseVote.winner_id)
        .all()
    )
    # Losses: vote where this question was a loser (in the pair, not the winner, winner_id IS NOT NULL)
    losses_rows_a = (
        db.query(PairwiseVote.question_a_id, func.count(PairwiseVote.id))
        .filter(
            PairwiseVote.wg_id == wg.id,
            PairwiseVote.round == target_round,
            PairwiseVote.question_a_id.in_(qids),
            PairwiseVote.winner_id.isnot(None),
            PairwiseVote.winner_id != PairwiseVote.question_a_id,
        )
        .group_by(PairwiseVote.question_a_id)
        .all()
    )
    losses_rows_b = (
        db.query(PairwiseVote.question_b_id, func.count(PairwiseVote.id))
        .filter(
            PairwiseVote.wg_id == wg.id,
            PairwiseVote.round == target_round,
            PairwiseVote.question_b_id.in_(qids),
            PairwiseVote.winner_id.isnot(None),
            PairwiseVote.winner_id != PairwiseVote.question_b_id,
        )
        .group_by(PairwiseVote.question_b_id)
        .all()
    )
    losses_map: dict[int, int] = {}
    for qid, n in losses_rows_a:
        losses_map[qid] = losses_map.get(qid, 0) + n
    for qid, n in losses_rows_b:
        losses_map[qid] = losses_map.get(qid, 0) + n

    enriched = []
    for q in questions:
        w = wins_map.get(q.id, 0)
        l = losses_map.get(q.id, 0)
        total = w + l
        if total > 0:
            score_val = round((w + 1) / (total + 2) * 100, 1)
        else:
            score_val = 50.0
        enriched.append({
            "question_id": q.id,
            "text": q.text,
            "score": score_val,
            "wins": w,
            "losses": l,
            "total_comparisons": total,
            "delphi_status": q.status.value if q.status else None,
        })
    enriched.sort(key=lambda r: r["score"], reverse=True)
    for i, r in enumerate(enriched):
        r["rank"] = i + 1

    total_votes = db.query(PairwiseVote).filter(
        PairwiseVote.wg_id == wg.id,
        PairwiseVote.round == target_round,
    ).count()

    return {
        "wg_number": wg_number,
        "wg_name": wg.name,
        "round": target_round.value,
        "total_votes": total_votes,
        "rankings": enriched,
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


def _r2_started_at(db: Session, wg_number: int):
    """Return the timestamp the R2 transition first ran for a WG, or None."""
    row = (
        db.query(func.min(AuditLog.created_at))
        .filter(AuditLog.action.like(f"wg{wg_number}_r2_%"))
        .scalar()
    )
    return row


def _current_round_for_wg(db: Session, wg_number: int) -> DelphiRound:
    """Return the current Delphi round for a WG (R2 if it's transitioned, else R1)."""
    return (
        DelphiRound.ROUND_2
        if _r2_started_at(db, wg_number) is not None
        else DelphiRound.ROUND_1
    )


def _pairwise_voting_open(wg) -> bool:
    """Pairwise is collectable when at least one round is currently open."""
    return wg.r1_status == "open" or wg.r2_status == "open"


@router.get("/my-count/{wg_number}")
def get_my_pairwise_count(
    wg_number: int,
    token: str = Depends(get_participant_token),
    db: Session = Depends(get_db),
):
    """Return how many pairwise votes this participant has made for the
    current round of a WG.

    If the WG has transitioned to R2, the count is restricted to votes cast
    after the transition timestamp so participants see fresh progress against
    the 50-vote target instead of a cumulative R1+R2 number.
    """
    if not token:
        return {"count": 0, "minimum": 50}
    participant = db.query(Participant).filter(Participant.token == token).first()
    if not participant:
        return {"count": 0, "minimum": 50}
    wg = db.query(WorkingGroup).filter(WorkingGroup.number == wg_number).first()
    if not wg:
        return {"count": 0, "minimum": 50}

    current_round = _current_round_for_wg(db, wg_number)
    count = db.query(PairwiseVote).filter(
        PairwiseVote.participant_id == participant.id,
        PairwiseVote.wg_id == wg.id,
        PairwiseVote.round == current_round,
    ).count()

    # Cumulative across rounds — useful if the UI ever wants to show "you've
    # voted N times in this WG over both rounds".
    total = db.query(PairwiseVote).filter(
        PairwiseVote.participant_id == participant.id,
        PairwiseVote.wg_id == wg.id,
    ).count()

    return {
        "count": count,
        "minimum": 50,
        "complete": count >= 50,
        "round": current_round.value,
        "total_all_rounds": total,
    }
