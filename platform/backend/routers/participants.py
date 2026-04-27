"""Participant invite management — admin creates invites, participants claim them via URL."""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel, Field, EmailStr
from typing import Optional
import secrets
import os

from ..database import (
    get_db, WorkingGroup, Participant, DelphiResponse, PairwiseVote,
    write_audit_log,
)
from ..auth import require_admin
from ..validators import sanitize_text

# Suffix used to tag self-service tester accounts (distinct from pre-seeded demo data)
TESTER_EMAIL_SUFFIX = "@tester.saem-ai.test"
DEMO_EMAIL_SUFFIX = "@demo.saem-ai.test"

router = APIRouter()


# --- Schemas ---

VALID_ROLES = {"wg_lead", "planning_committee", "wg_member", "participant"}
SELF_SELECTABLE_ROLES = {"wg_member", "participant"}


def _shared_join_token() -> str:
    return (os.environ.get("SHARED_JOIN_TOKEN") or "").strip()


def _is_valid_shared_join_token(token: str) -> bool:
    configured = _shared_join_token()
    provided = (token or "").strip()
    if not configured or not provided:
        return False
    return secrets.compare_digest(configured, provided)


class InviteeCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    email: Optional[str] = Field(None, max_length=200)


class ParticipantCreate(InviteeCreate):
    wg_number: int = Field(..., ge=1, le=5)


class ParticipantRegister(BaseModel):
    """Public self-registration schema."""
    name: str = Field(..., min_length=1, max_length=200)
    email: Optional[str] = Field(None, max_length=200)
    wg_number: int = Field(..., ge=1, le=5)
    role: str = Field("participant")  # wg_lead | planning_committee | wg_member | participant


class InviteRegister(BaseModel):
    token: str = Field(..., min_length=12, max_length=200)
    name: str = Field(..., min_length=1, max_length=200)
    email: Optional[str] = Field(None, max_length=200)
    role: str = Field("participant")  # restricted: wg_member | participant


class SharedRegister(BaseModel):
    access_token: str = Field(..., min_length=8, max_length=200)
    name: str = Field(..., min_length=1, max_length=200)
    email: Optional[str] = Field(None, max_length=200)
    wg_number: int = Field(..., ge=1, le=5)
    role: str = Field("participant")  # restricted: wg_member | participant


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


# --- Public self-registration ---

@router.post("/register")
def register_participant(
    body: ParticipantRegister,
    db: Session = Depends(get_db),
):
    """Public: self-service registration. Creates a named participant with
    a chosen WG and role. Returns a token the frontend stores in localStorage.
    """
    if os.environ.get("ALLOW_PUBLIC_SIGNUP", "0") != "1":
        raise HTTPException(403, "Public signup is disabled. Use your invite email link.")
    if body.role not in VALID_ROLES:
        raise HTTPException(400, f"Invalid role. Choose one of: {VALID_ROLES}")

    wg = db.query(WorkingGroup).filter(WorkingGroup.number == body.wg_number).first()
    if not wg:
        raise HTTPException(404, "Working group not found")

    name = sanitize_text(body.name, max_length=200)
    email = sanitize_text(body.email, max_length=200) if body.email else None

    p = Participant(
        token=_new_token(),
        wg_id=wg.id,
        name=name,
        email=email,
        role=body.role,
        is_active=True,
        claimed_at=datetime.utcnow(),  # self-registered = already claimed
    )
    db.add(p)
    db.commit()
    db.refresh(p)

    return {
        "token": p.token,
        "name": p.name,
        "email": p.email,
        "role": p.role,
        "wg_number": wg.number,
        "wg_name": wg.name,
        "wg_short_name": wg.short_name,
    }


@router.post("/register-invite")
def register_from_invite(
    body: InviteRegister,
    db: Session = Depends(get_db),
):
    """Invite-only registration/update. Requires a valid emailed token."""
    if body.role not in SELF_SELECTABLE_ROLES:
        raise HTTPException(400, f"Invalid role. Choose one of: {SELF_SELECTABLE_ROLES}")

    p = db.query(Participant).filter(Participant.token == body.token).first()
    if not p:
        raise HTTPException(404, "Invalid invite link")
    if not p.is_active:
        raise HTTPException(410, "This invite has been deactivated. Contact the chair.")
    if not p.working_group:
        raise HTTPException(400, "Invite is missing working group assignment")

    p.name = sanitize_text(body.name, max_length=200)
    p.email = sanitize_text(str(body.email), max_length=200) if body.email else None
    p.role = body.role
    if p.claimed_at is None:
        p.claimed_at = datetime.utcnow()
    db.commit()
    db.refresh(p)

    wg = p.working_group
    return {
        "token": p.token,
        "name": p.name,
        "email": p.email,
        "role": p.role,
        "wg_number": wg.number if wg else None,
        "wg_name": wg.name if wg else None,
        "wg_short_name": wg.short_name if wg else None,
    }


@router.get("/shared-access/validate")
def validate_shared_access(token: str):
    """Validate whether a shared join token is currently accepted."""
    if not _shared_join_token():
        raise HTTPException(403, "Shared join link is not configured")
    if not _is_valid_shared_join_token(token):
        raise HTTPException(403, "Invalid shared join link")
    return {"ok": True}


@router.post("/register-shared")
def register_from_shared_link(
    body: SharedRegister,
    db: Session = Depends(get_db),
):
    """Shared-link registration for cases where emails are unavailable."""
    if not _shared_join_token():
        raise HTTPException(403, "Shared join link is not configured")
    if not _is_valid_shared_join_token(body.access_token):
        raise HTTPException(403, "Invalid shared join link")
    if body.role not in SELF_SELECTABLE_ROLES:
        raise HTTPException(400, f"Invalid role. Choose one of: {SELF_SELECTABLE_ROLES}")

    wg = db.query(WorkingGroup).filter(WorkingGroup.number == body.wg_number).first()
    if not wg:
        raise HTTPException(404, "Working group not found")

    name = sanitize_text(body.name, max_length=200)
    email = sanitize_text(body.email, max_length=200) if body.email else None
    p = Participant(
        token=_new_token(),
        wg_id=wg.id,
        name=name,
        email=email,
        role=body.role,
        is_active=True,
        claimed_at=datetime.utcnow(),
    )
    db.add(p)
    db.commit()
    db.refresh(p)

    return {
        "token": p.token,
        "name": p.name,
        "email": p.email,
        "role": p.role,
        "wg_number": wg.number,
        "wg_name": wg.name,
        "wg_short_name": wg.short_name,
    }


# --- Returning user login (email-based, no password) ---

class ParticipantLogin(BaseModel):
    email: str = Field(..., min_length=3, max_length=200)


@router.post("/login")
def login_participant(
    body: ParticipantLogin,
    db: Session = Depends(get_db),
):
    """Public: email-based login for returning participants.

    Looks up the most recent active participant with this email.
    No password — appropriate for a closed academic conference.
    """
    email = body.email.strip().lower()
    p = (
        db.query(Participant)
        .filter(
            func.lower(Participant.email) == email,
            Participant.is_active == True,  # noqa: E712
        )
        .order_by(Participant.claimed_at.desc().nullslast())
        .first()
    )
    if not p:
        raise HTTPException(404, "No account found with that email. Check the address or register using your invite link.")

    wg = p.working_group
    return {
        "token": p.token,
        "name": p.name,
        "email": p.email,
        "role": p.role,
        "wg_number": wg.number if wg else None,
        "wg_name": wg.name if wg else None,
        "wg_short_name": wg.short_name if wg else None,
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
    is_demo = bool(p.email and p.email.endswith(DEMO_EMAIL_SUFFIX))
    is_tester = bool(p.email and p.email.endswith(TESTER_EMAIL_SUFFIX))
    return {
        "name": p.name,
        "wg_number": p.working_group.number if p.working_group else None,
        "wg_short_name": p.working_group.short_name if p.working_group else None,
        "is_demo": is_demo,
        "is_tester": is_tester,
    }


# --- Demo lobby (public, for group testing before real rollout) ---

@router.post("/demo/ensure-seeded")
def ensure_demo_seeded(db: Session = Depends(get_db)):
    """Public: idempotently seed demo data if none exists.

    Also runs the additive-column migration first (belt-and-suspenders) in
    case the startup migration didn't complete — makes this endpoint a
    reliable self-heal from the /try lobby.
    """
    from ..database import _apply_additive_migrations
    from ..demo_seed import seed_demo_data

    # Re-run the migration to be safe — no-op if columns already exist
    try:
        _apply_additive_migrations()
    except Exception as e:
        raise HTTPException(500, f"Schema migration failed: {e!r}")

    try:
        existing = (
            db.query(Participant)
            .filter(Participant.email.like(f"%{DEMO_EMAIL_SUFFIX}"))
            .count()
        )
    except Exception as e:
        raise HTTPException(500, f"Count query failed (schema issue?): {e!r}")

    if existing > 0:
        return {"already_seeded": True, "demo_participants": existing}

    try:
        summary = seed_demo_data(db)
    except Exception as e:
        raise HTTPException(500, f"Seed failed: {e!r}")
    return {"already_seeded": False, "created": summary}


@router.get("/demo/personas")
def list_demo_personas(db: Session = Depends(get_db)):
    """Public: list every pre-seeded demo persona so testers can step
    into one of them. Intended for the /try lobby during internal
    testing — remove demo data before real rollout to hide this list.
    """
    personas = (
        db.query(Participant)
        .filter(
            Participant.email.like(f"%{DEMO_EMAIL_SUFFIX}"),
            Participant.is_active == True,  # noqa: E712
        )
        .order_by(Participant.wg_id, Participant.name)
        .all()
    )
    return [
        {
            "name": p.name,
            "wg_number": p.working_group.number if p.working_group else None,
            "wg_short_name": p.working_group.short_name if p.working_group else None,
            "token": p.token,
            "claimed": p.claimed_at is not None,
        }
        for p in personas
    ]


class TesterCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    wg_number: int = Field(..., ge=1, le=5)


@router.post("/demo/tester")
def create_tester(body: TesterCreate, db: Session = Depends(get_db)):
    """Public: create a self-service tester account for group walkthroughs.

    Tester accounts are tagged with @tester.saem-ai.test so admins can
    distinguish them from real invites and clear them before real rollout.
    """
    wg = db.query(WorkingGroup).filter(WorkingGroup.number == body.wg_number).first()
    if not wg:
        raise HTTPException(404, "Working group not found")
    name = sanitize_text(body.name, max_length=200)
    # Slug the name for a readable email stub (e.g., "Jane Doe" -> "jane.doe.abc123")
    slug = "".join(c.lower() if c.isalnum() else "." for c in name).strip(".")
    email = f"{slug}.{secrets.token_hex(3)}{TESTER_EMAIL_SUFFIX}"
    p = Participant(
        token=secrets.token_urlsafe(24),
        wg_id=wg.id,
        name=name,
        email=email,
        is_active=True,
        claimed_at=datetime.utcnow(),
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return {
        "name": p.name,
        "token": p.token,
        "wg_number": wg.number,
        "wg_short_name": wg.short_name,
    }
