"""Co-lead routes — each working group's two co-leads get an invite link that
signs them into a scoped Lead Dashboard showing their WG's questions,
participants, responses, and suggestions.
"""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional
import secrets

from ..database import (
    get_db, WorkingGroup, CoLead, Question, Participant,
    DelphiResponse, DelphiSuggestion, PairwiseVote, PairwiseSuggestion,
    QuestionStatus, DelphiRound, write_audit_log,
)
from ..auth import require_admin

router = APIRouter()


def _get_co_lead_from_token(token: Optional[str], db: Session) -> CoLead:
    """Validate a co-lead invite token. Raises 401 on failure."""
    if not token:
        raise HTTPException(401, "Co-lead token required")
    cl = db.query(CoLead).filter(CoLead.invite_token == token).first()
    if not cl:
        raise HTTPException(401, "Invalid co-lead token")
    if cl.is_active is False:
        raise HTTPException(410, "Co-lead access has been deactivated")
    return cl


# --- Public (token-gated) ---

@router.get("/claim")
def claim_co_lead(token: str, db: Session = Depends(get_db)):
    """Public: validate a co-lead invite and mark it claimed on first use."""
    cl = db.query(CoLead).filter(CoLead.invite_token == token).first()
    if not cl:
        raise HTTPException(404, "Invalid invite link")
    if cl.is_active is False:
        raise HTTPException(410, "This co-lead invite has been deactivated.")
    if cl.claimed_at is None:
        cl.claimed_at = datetime.utcnow()
        db.commit()
    wg = cl.working_group
    return {
        "name": cl.name,
        "email": cl.email,
        "institution": cl.institution,
        "token": cl.invite_token,
        "wg_number": wg.number if wg else None,
        "wg_name": wg.name if wg else None,
        "wg_short_name": wg.short_name if wg else None,
        "claimed_at": cl.claimed_at.isoformat() if cl.claimed_at else None,
    }


@router.get("/me")
def co_lead_me(token: str, db: Session = Depends(get_db)):
    """Public: look up co-lead identity by token."""
    cl = db.query(CoLead).filter(CoLead.invite_token == token).first()
    if not cl or cl.is_active is False:
        return {"name": None, "wg_number": None}
    return {
        "name": cl.name,
        "wg_number": cl.working_group.number if cl.working_group else None,
        "wg_short_name": cl.working_group.short_name if cl.working_group else None,
    }


@router.get("/wg-summary")
def wg_summary(token: str, db: Session = Depends(get_db)):
    """Return a WG-scoped dashboard for the authenticated co-lead.

    Shows only the lead's own working group — never cross-WG data.
    """
    cl = _get_co_lead_from_token(token, db)
    wg = cl.working_group
    if not wg:
        raise HTTPException(404, "Co-lead is not linked to a working group")

    # --- Questions: counts by status + round results ---
    questions = (
        db.query(Question)
        .filter(Question.wg_id == wg.id)
        .order_by(Question.pairwise_score.desc().nullslast(), Question.id)
        .all()
    )
    by_status = {
        "draft": 0, "active": 0, "confirmed": 0,
        "near_consensus": 0, "revised": 0, "removed": 0,
    }
    for q in questions:
        key = q.status.value if q.status else "draft"
        by_status[key] = by_status.get(key, 0) + 1

    # --- Participants in this WG ---
    participants = (
        db.query(Participant)
        .filter(Participant.wg_id == wg.id)
        .all()
    )
    named = [p for p in participants if p.name]
    claimed = [p for p in participants if p.claimed_at is not None]
    # Delphi response counts per participant (for the top of this WG)
    r1_count = (
        db.query(func.count(DelphiResponse.id))
        .join(Question, DelphiResponse.question_id == Question.id)
        .filter(Question.wg_id == wg.id, DelphiResponse.round == DelphiRound.ROUND_1)
        .scalar() or 0
    )
    r2_count = (
        db.query(func.count(DelphiResponse.id))
        .join(Question, DelphiResponse.question_id == Question.id)
        .filter(Question.wg_id == wg.id, DelphiResponse.round == DelphiRound.ROUND_2)
        .scalar() or 0
    )
    r1_unique = (
        db.query(func.count(func.distinct(DelphiResponse.participant_id)))
        .join(Question, DelphiResponse.question_id == Question.id)
        .filter(Question.wg_id == wg.id, DelphiResponse.round == DelphiRound.ROUND_1)
        .scalar() or 0
    )

    pairwise_total = (
        db.query(func.count(PairwiseVote.id))
        .filter(PairwiseVote.wg_id == wg.id)
        .scalar() or 0
    )
    pairwise_participants = (
        db.query(func.count(func.distinct(PairwiseVote.participant_id)))
        .filter(PairwiseVote.wg_id == wg.id)
        .scalar() or 0
    )

    # --- Pending suggestions for review ---
    delphi_suggestions = (
        db.query(DelphiSuggestion)
        .filter(DelphiSuggestion.wg_id == wg.id)
        .order_by(DelphiSuggestion.created_at.desc())
        .limit(20)
        .all()
    )
    pairwise_suggestions = (
        db.query(PairwiseSuggestion)
        .filter(PairwiseSuggestion.wg_id == wg.id)
        .order_by(PairwiseSuggestion.created_at.desc())
        .limit(20)
        .all()
    )

    # --- Other co-leads on this WG ---
    co_leads = (
        db.query(CoLead)
        .filter(CoLead.wg_id == wg.id)
        .order_by(CoLead.id)
        .all()
    )

    return {
        "co_lead": {"name": cl.name, "email": cl.email},
        "wg": {
            "number": wg.number,
            "name": wg.name,
            "short_name": wg.short_name,
            "pillar": wg.pillar,
            "scope": wg.scope,
        },
        "co_leads": [{"name": c.name, "institution": c.institution, "claimed": c.claimed_at is not None} for c in co_leads],
        "questions": {
            "total": len(questions),
            "by_status": by_status,
            "top": [
                {
                    "id": q.id,
                    "text": q.text,
                    "status": q.status.value if q.status else None,
                    "pairwise_score": q.pairwise_score,
                    "pairwise_wins": q.pairwise_wins or 0,
                    "pairwise_losses": q.pairwise_losses or 0,
                    "r1_importance_mean": q.r1_importance_mean,
                    "r1_include_pct": q.r1_include_pct,
                    "r2_importance_mean": q.r2_importance_mean,
                }
                for q in questions[:20]
            ],
        },
        "participants": {
            "total": len(participants),
            "named": len(named),
            "claimed": len(claimed),
        },
        "activity": {
            "r1_responses": r1_count,
            "r1_unique_participants": r1_unique,
            "r2_responses": r2_count,
            "pairwise_votes": pairwise_total,
            "pairwise_participants": pairwise_participants,
        },
        "suggestions": {
            "delphi": [
                {
                    "id": s.id,
                    "text": s.suggestion_text,
                    "general_comment": s.general_comment,
                    "round": s.round.value if s.round else None,
                    "created_at": s.created_at.isoformat() if s.created_at else None,
                    "ai_category": s.ai_category,
                    "human_decision": s.human_decision.value if s.human_decision else None,
                }
                for s in delphi_suggestions
            ],
            "pairwise": [
                {
                    "id": s.id,
                    "text": s.suggestion_text,
                    "approved": s.approved,
                    "created_at": s.created_at.isoformat() if s.created_at else None,
                }
                for s in pairwise_suggestions
            ],
        },
    }


# --- Admin: list, regenerate, edit ---

class CoLeadUpdate(BaseModel):
    email: Optional[str] = None
    institution: Optional[str] = None


@router.get("")
def list_co_leads(
    db: Session = Depends(get_db),
    admin: dict = Depends(require_admin),
):
    """Admin: list all co-leads with invite links and claim status."""
    co_leads = (
        db.query(CoLead)
        .order_by(CoLead.wg_id, CoLead.id)
        .all()
    )
    return [
        {
            "id": cl.id,
            "name": cl.name,
            "email": cl.email,
            "institution": cl.institution,
            "wg_number": cl.working_group.number if cl.working_group else None,
            "wg_short_name": cl.working_group.short_name if cl.working_group else None,
            "invite_token": cl.invite_token,
            "is_active": cl.is_active,
            "claimed_at": cl.claimed_at.isoformat() if cl.claimed_at else None,
        }
        for cl in co_leads
    ]


@router.patch("/{co_lead_id}")
def update_co_lead(
    co_lead_id: int,
    body: CoLeadUpdate,
    db: Session = Depends(get_db),
    admin: dict = Depends(require_admin),
):
    """Admin: update a co-lead's email or institution."""
    cl = db.query(CoLead).filter(CoLead.id == co_lead_id).first()
    if not cl:
        raise HTTPException(404, "Co-lead not found")
    if body.email is not None:
        cl.email = body.email.strip() or None
    if body.institution is not None:
        cl.institution = body.institution.strip() or None
    db.commit()
    write_audit_log(
        db, admin.get("sub", "admin"),
        "co_lead_update",
        f"Updated co-lead {cl.id} ({cl.name})",
    )
    return {"ok": True, "id": cl.id}


@router.post("/{co_lead_id}/rotate-token")
def rotate_token(
    co_lead_id: int,
    db: Session = Depends(get_db),
    admin: dict = Depends(require_admin),
):
    """Admin: generate a fresh invite token for a co-lead (invalidates the old
    link). Use if a link leaks or someone needs a new one.
    """
    cl = db.query(CoLead).filter(CoLead.id == co_lead_id).first()
    if not cl:
        raise HTTPException(404, "Co-lead not found")
    cl.invite_token = secrets.token_urlsafe(24)
    cl.claimed_at = None
    db.commit()
    write_audit_log(
        db, admin.get("sub", "admin"),
        "co_lead_rotate_token",
        f"Rotated invite token for {cl.name}",
    )
    return {"ok": True, "id": cl.id, "invite_token": cl.invite_token}
