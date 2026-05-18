"""Round 2 report — data aggregation.

Lean compared to Round 1 (no embeddings, no AI clustering). The R2
narrative is mostly:
  - which questions are still in play after the revise pass
  - the R1 → R2 deliberation shift per question
  - the pairwise leaderboard (when available)
  - per-WG response rates so the chair knows where coverage is thin
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from ...database import (
    DelphiResponse,
    DelphiRound,
    PairwiseVote,
    Participant,
    Question,
    QuestionStatus,
    WorkingGroup,
)


# --- Helpers --------------------------------------------------------------


def _r2_participants(db: Session) -> dict[int, dict]:
    """For each participant who submitted any R2 response, return a
    summary keyed by participant_id."""
    rows = (
        db.query(
            DelphiResponse.participant_id,
            func.count(func.distinct(DelphiResponse.question_id)).label("n"),
            func.max(DelphiResponse.created_at).label("last_at"),
        )
        .filter(DelphiResponse.round == DelphiRound.ROUND_2)
        .group_by(DelphiResponse.participant_id)
        .all()
    )
    return {r.participant_id: {"n_questions": int(r.n), "last_at": r.last_at} for r in rows}


# --- Overall + per-WG -----------------------------------------------------


def overall_summary(db: Session) -> dict:
    """Headline numbers for the report header."""
    total_questions = db.query(func.count(Question.id)).scalar() or 0

    active_statuses = [QuestionStatus.ACTIVE, QuestionStatus.REVISED, QuestionStatus.CONFIRMED]
    active_q = (
        db.query(func.count(Question.id))
        .filter(Question.status.in_(active_statuses))
        .scalar() or 0
    )
    removed_q = (
        db.query(func.count(Question.id))
        .filter(Question.status == QuestionStatus.REMOVED)
        .scalar() or 0
    )

    n_wg = db.query(func.count(WorkingGroup.id)).scalar() or 0

    # R2 response coverage
    r2_responses = (
        db.query(func.count(DelphiResponse.id))
        .filter(DelphiResponse.round == DelphiRound.ROUND_2)
        .scalar() or 0
    )
    r2_unique_participants = (
        db.query(func.count(func.distinct(DelphiResponse.participant_id)))
        .filter(DelphiResponse.round == DelphiRound.ROUND_2)
        .scalar() or 0
    )
    r1_unique_participants = (
        db.query(func.count(func.distinct(DelphiResponse.participant_id)))
        .filter(DelphiResponse.round == DelphiRound.ROUND_1)
        .scalar() or 0
    )

    # Active named participants (the "denominator" for response rate)
    eligible = (
        db.query(func.count(Participant.id))
        .filter(
            Participant.is_active == True,  # noqa: E712
            Participant.name.isnot(None),
        )
        .scalar() or 0
    )

    return {
        "snapshot_at": datetime.utcnow().isoformat(),
        "n_working_groups": int(n_wg),
        "n_questions_total": int(total_questions),
        "n_questions_active": int(active_q),
        "n_questions_removed": int(removed_q),
        "r2_responses": int(r2_responses),
        "r2_unique_participants": int(r2_unique_participants),
        "r1_unique_participants": int(r1_unique_participants),
        "n_eligible_participants": int(eligible),
        "r2_response_rate": (r2_unique_participants / eligible) if eligible else None,
    }


def per_wg_summary(db: Session) -> list[dict]:
    """One row per WG: counts, response coverage, mean stats."""
    active_statuses = [QuestionStatus.ACTIVE, QuestionStatus.REVISED, QuestionStatus.CONFIRMED]
    wgs = db.query(WorkingGroup).order_by(WorkingGroup.number).all()
    out = []
    for wg in wgs:
        # Active question count (those carried into R2)
        active_q = (
            db.query(func.count(Question.id))
            .filter(Question.wg_id == wg.id, Question.status.in_(active_statuses))
            .scalar() or 0
        )
        # R2 responses for this WG (joined through participants)
        r2_resp = (
            db.query(func.count(DelphiResponse.id))
            .join(Participant, DelphiResponse.participant_id == Participant.id)
            .filter(
                Participant.wg_id == wg.id,
                DelphiResponse.round == DelphiRound.ROUND_2,
            )
            .scalar() or 0
        )
        r2_responders = (
            db.query(func.count(func.distinct(DelphiResponse.participant_id)))
            .join(Participant, DelphiResponse.participant_id == Participant.id)
            .filter(
                Participant.wg_id == wg.id,
                DelphiResponse.round == DelphiRound.ROUND_2,
            )
            .scalar() or 0
        )
        eligible_in_wg = (
            db.query(func.count(Participant.id))
            .filter(
                Participant.wg_id == wg.id,
                Participant.is_active == True,  # noqa: E712
                Participant.name.isnot(None),
            )
            .scalar() or 0
        )
        # Mean importance / include% across the WG's active R2 questions
        avg = (
            db.query(
                func.avg(Question.r2_include_pct),
                func.avg(Question.r2_importance_mean),
            )
            .filter(Question.wg_id == wg.id, Question.status.in_(active_statuses))
            .one()
        )
        avg_inc, avg_imp = avg[0], avg[1]

        # Pairwise comparisons
        n_pairwise = (
            db.query(func.count(PairwiseVote.id))
            .filter(PairwiseVote.wg_id == wg.id)
            .scalar() or 0
        )

        out.append({
            "wg_id": wg.id,
            "wg_number": wg.number,
            "name": wg.name,
            "short_name": wg.short_name,
            "pillar": wg.pillar,
            "n_questions_active": int(active_q),
            "n_eligible": int(eligible_in_wg),
            "r2_responders": int(r2_responders),
            "r2_response_rate": (r2_responders / eligible_in_wg) if eligible_in_wg else None,
            "r2_responses": int(r2_resp),
            "avg_r2_include_pct": float(avg_inc) if avg_inc is not None else None,
            "avg_r2_importance": float(avg_imp) if avg_imp is not None else None,
            "n_pairwise_comparisons": int(n_pairwise),
        })
    return out


# --- Per-question detail --------------------------------------------------


def per_question_rows(db: Session) -> list[dict]:
    """Every active question with the R1 → R2 shift and pairwise score."""
    active_statuses = [QuestionStatus.ACTIVE, QuestionStatus.REVISED, QuestionStatus.CONFIRMED]
    wg_lookup = {w.id: w for w in db.query(WorkingGroup).all()}

    qs = (
        db.query(Question)
        .filter(Question.status.in_(active_statuses))
        .order_by(Question.wg_id, Question.id)
        .all()
    )
    out = []
    for q in qs:
        wg = wg_lookup.get(q.wg_id)
        r1_imp = q.r1_importance_mean
        r2_imp = q.r2_importance_mean
        shift = (r2_imp - r1_imp) if (r1_imp is not None and r2_imp is not None) else None
        out.append({
            "question_id": q.id,
            "wg_id": q.wg_id,
            "wg_number": wg.number if wg else None,
            "wg_short_name": wg.short_name if wg else None,
            "text": q.text,
            "short_text": q.short_text,
            "status": q.status.value if q.status else None,
            "r1_include_pct": q.r1_include_pct,
            "r1_modify_pct": q.r1_modify_pct,
            "r1_exclude_pct": q.r1_exclude_pct,
            "r1_importance_mean": r1_imp,
            "r2_include_pct": q.r2_include_pct,
            "r2_exclude_pct": q.r2_exclude_pct,
            "r2_importance_mean": r2_imp,
            "importance_shift": shift,
            "pairwise_score": q.pairwise_score,
            "featured_in_panel": bool(q.featured_in_panel),
            "featured_in_cross_wg": bool(q.featured_in_cross_wg),
        })
    return out


def top_shifts(rows: list[dict], n: int = 10) -> list[dict]:
    """Largest |shift| questions — useful for the headline 'deliberation moved'."""
    shifted = [r for r in rows if r["importance_shift"] is not None]
    shifted.sort(key=lambda r: abs(r["importance_shift"]), reverse=True)
    return shifted[:n]


def pairwise_leaders(rows: list[dict], n: int = 10) -> list[dict]:
    """Top pairwise scores across the whole conference."""
    with_pair = [r for r in rows if r["pairwise_score"] is not None and r["pairwise_score"] > 0]
    with_pair.sort(key=lambda r: r["pairwise_score"], reverse=True)
    return with_pair[:n]
