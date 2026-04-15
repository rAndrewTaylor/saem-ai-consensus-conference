"""Participant invite management — admin creates invites, participants claim them via URL."""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel, Field, EmailStr
from typing import Optional
import secrets

from ..database import (
    get_db, WorkingGroup, Participant, DelphiResponse, PairwiseVote,
    write_audit_log,
)
from ..auth import require_admin
from ..validators import sanitize_text

router = APIRouter()


# --- Schemas ---

class InviteeCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    email: Optional[str] = Field(None, max_length=200)


class ParticipantCreate(InviteeCreate):
    wg_number: int = Field(..., ge=1, le=5)


class BulkInviteCreate(BaseModel):
    wg_number: int = Field(..., ge=1, le=5)
    invitees: list[InviteeCreate] = Field(..., min_length=1, max_length=200)


def _new_token() -> str:
    """24-char url-safe base64 token (~144 bits of entropy)."""
    return secrets.token_urlsafe(24)


def _participant_to_dict(p: Participant, response_counts: dict | None = None) -> dict:
    counts = response_counts or {}
    return {
        "id": p.id,
        "name": p.name,
        "email": p.email,
        "wg_number": p.working_group.number if p.working_group else None,
        "token": p.token,
        "created_at": p.created_at.isoformat() if p.created_at else None,
        "claimed_at": p.claimed_at.isoformat() if p.claimed_at else None,
        "is_active": p.is_active,
        "delphi_response_count": counts.get("delphi", 0),
        "pairwise_vote_count": counts.get("pairwise", 0),
    }


# --- Admin endpoints (auth enforced via require_admin dependency) ---

@router.post("")
def create_participant(
    body: ParticipantCreate,
    db: Session = Depends(get_db),
    admin: dict = Depends(require_admin),
):
    """Admin: create a single named invitee. Returns the invite token."""
    wg = db.query(WorkingGroup).filter(WorkingGroup.number == body.wg_number).first()
    if not wg:
        raise HTTPException(404, "Working group not found")

    name = sanitize_text(body.name, max_length=200) if body.name else None
    email = sanitize_text(body.email, max_length=200) if body.email else None

    p = Participant(
        token=_new_token(),
        wg_id=wg.id,
        name=name,
        email=email,
        is_active=True,
    )
    db.add(p)
    db.commit()
    db.refresh(p)

    write_audit_log(
        db, admin.get("sub", "admin"),
        "participant_invite_create",
        f"Created invite for {name} (WG {body.wg_number})",
    )
    return _participant_to_dict(p)


@router.post("/bulk")
def bulk_create_participants(
    body: BulkInviteCreate,
    db: Session = Depends(get_db),
    admin: dict = Depends(require_admin),
):
    """Admin: create many invitees for one working group in one call."""
    wg = db.query(WorkingGroup).filter(WorkingGroup.number == body.wg_number).first()
    if not wg:
        raise HTTPException(404, "Working group not found")

    created = []
    for inv in body.invitees:
        name = sanitize_text(inv.name, max_length=200) if inv.name else None
        email = sanitize_text(inv.email, max_length=200) if inv.email else None
        p = Participant(
            token=_new_token(),
            wg_id=wg.id,
            name=name,
            email=email,
            is_active=True,
        )
        db.add(p)
        created.append(p)

    db.commit()
    for p in created:
        db.refresh(p)

    write_audit_log(
        db, admin.get("sub", "admin"),
        "participant_invite_bulk",
        f"Bulk-created {len(created)} invites (WG {body.wg_number})",
    )
    return [_participant_to_dict(p) for p in created]


@router.get("")
def list_participants(
    wg_number: Optional[int] = None,
    db: Session = Depends(get_db),
    admin: dict = Depends(require_admin),
):
    """Admin: list all named invitees, optionally scoped to one WG.

    Anonymous participants (no name) are excluded from this roster view.
    """
    q = (
        db.query(Participant)
        .filter(Participant.name.isnot(None))
        .order_by(Participant.wg_id, Participant.created_at.desc())
    )
    if wg_number is not None:
        wg = db.query(WorkingGroup).filter(WorkingGroup.number == wg_number).first()
        if not wg:
            raise HTTPException(404, "Working group not found")
        q = q.filter(Participant.wg_id == wg.id)
    participants = q.all()

    if not participants:
        return []

    # Batch-load response counts
    pids = [p.id for p in participants]
    delphi_counts = dict(
        db.query(DelphiResponse.participant_id, func.count(DelphiResponse.id))
        .filter(DelphiResponse.participant_id.in_(pids))
        .group_by(DelphiResponse.participant_id)
        .all()
    )
    pairwise_counts = dict(
        db.query(PairwiseVote.participant_id, func.count(PairwiseVote.id))
        .filter(PairwiseVote.participant_id.in_(pids))
        .group_by(PairwiseVote.participant_id)
        .all()
    )

    return [
        _participant_to_dict(
            p,
            {
                "delphi": delphi_counts.get(p.id, 0),
                "pairwise": pairwise_counts.get(p.id, 0),
            },
        )
        for p in participants
    ]


@router.delete("/{participant_id}")
def deactivate_participant(
    participant_id: int,
    db: Session = Depends(get_db),
    admin: dict = Depends(require_admin),
):
    """Admin: deactivate an invite. Their token stops working immediately.
    Existing response data is preserved.
    """
    p = db.query(Participant).filter(Participant.id == participant_id).first()
    if not p:
        raise HTTPException(404, "Participant not found")
    p.is_active = False
    db.commit()

    write_audit_log(
        db, admin.get("sub", "admin"),
        "participant_deactivate",
        f"Deactivated participant {p.id} ({p.name})",
    )
    return {"ok": True, "id": p.id}


# --- Public endpoints (used by the invite-claim flow) ---

@router.get("/claim")
def claim_invite(token: str, db: Session = Depends(get_db)):
    """Public: validate an invite token and mark it claimed on first use.

    Returns the participant's name + WG info so the frontend can show
    a personalized welcome and redirect to the right WG hub.
    """
    p = db.query(Participant).filter(Participant.token == token).first()
    if not p:
        raise HTTPException(404, "Invalid invite link")
    if not p.is_active:
        raise HTTPException(410, "This invite has been deactivated. Contact the chair.")

    # Mark claimed on first click; subsequent clicks are no-ops
    if p.claimed_at is None:
        p.claimed_at = datetime.utcnow()
        db.commit()

    wg = p.working_group
    return {
        "name": p.name,
        "email": p.email,
        "token": p.token,
        "wg_number": wg.number if wg else None,
        "wg_name": wg.name if wg else None,
        "wg_short_name": wg.short_name if wg else None,
        "claimed_at": p.claimed_at.isoformat() if p.claimed_at else None,
        "first_time": p.claimed_at is not None and (datetime.utcnow() - p.claimed_at).total_seconds() < 5,
    }


@router.get("/me")
def participant_me(token: str, db: Session = Depends(get_db)):
    """Public: look up a participant by their token. Used by the frontend
    to show 'Signed in as [name]' indicators without re-claiming."""
    p = db.query(Participant).filter(Participant.token == token).first()
    if not p or not p.is_active:
        # Be quiet for anonymous/invalid tokens — this just means "no name to show"
        return {"name": None, "wg_number": None}
    return {
        "name": p.name,
        "wg_number": p.working_group.number if p.working_group else None,
        "wg_short_name": p.working_group.short_name if p.working_group else None,
    }
