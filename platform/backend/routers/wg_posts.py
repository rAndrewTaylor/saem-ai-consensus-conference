"""WG Posts — co-leads share meeting notes, discussion summaries, and links."""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from ..database import get_db, WorkingGroup, CoLead, WGPost
from ..validators import sanitize_text

router = APIRouter()

MAX_BODY = 5000
MAX_TITLE = 300
MAX_LINKS = 10


def _get_co_lead(token: str, db: Session) -> CoLead:
    if not token:
        raise HTTPException(401, "Co-lead token required")
    cl = db.query(CoLead).filter(CoLead.invite_token == token).first()
    if not cl:
        raise HTTPException(401, "Invalid co-lead token")
    if cl.is_active is False:
        raise HTTPException(410, "Co-lead access deactivated")
    return cl


def _validate_links(links):
    if links is None:
        return None
    if not isinstance(links, list) or len(links) > MAX_LINKS:
        raise HTTPException(400, f"Links must be a list of at most {MAX_LINKS}")
    out = []
    for lnk in links:
        if not isinstance(lnk, dict) or "url" not in lnk:
            raise HTTPException(400, "Each link needs a 'url'")
        url = lnk["url"].strip()
        if not url.startswith(("http://", "https://")):
            raise HTTPException(400, f"Invalid URL: {url}")
        label = sanitize_text(lnk.get("label", url), max_length=200)
        out.append({"label": label, "url": url})
    return out


# --- Schemas ---

class PostCreate(BaseModel):
    title: str
    body: str
    links: Optional[list[dict]] = None
    pinned: Optional[bool] = False


class PostUpdate(BaseModel):
    title: Optional[str] = None
    body: Optional[str] = None
    links: Optional[list[dict]] = None
    pinned: Optional[bool] = None


# --- Co-lead endpoints (token-gated) ---

@router.post("")
def create_post(body: PostCreate, token: str = "", db: Session = Depends(get_db)):
    cl = _get_co_lead(token, db)
    title = sanitize_text(body.title, max_length=MAX_TITLE)
    text = sanitize_text(body.body, max_length=MAX_BODY)
    links = _validate_links(body.links)
    post = WGPost(
        wg_id=cl.wg_id,
        author_id=cl.id,
        title=title,
        body=text,
        links=links,
        pinned=body.pinned or False,
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return {"id": post.id, "title": post.title}


@router.get("")
def list_posts(token: str = "", db: Session = Depends(get_db)):
    cl = _get_co_lead(token, db)
    posts = (
        db.query(WGPost)
        .filter(WGPost.wg_id == cl.wg_id)
        .order_by(WGPost.pinned.desc(), WGPost.created_at.desc())
        .all()
    )
    return [_post_to_dict(p) for p in posts]


@router.patch("/{post_id}")
def update_post(post_id: int, body: PostUpdate, token: str = "", db: Session = Depends(get_db)):
    cl = _get_co_lead(token, db)
    post = db.query(WGPost).filter(WGPost.id == post_id, WGPost.wg_id == cl.wg_id).first()
    if not post:
        raise HTTPException(404, "Post not found")
    if body.title is not None:
        post.title = sanitize_text(body.title, max_length=MAX_TITLE)
    if body.body is not None:
        post.body = sanitize_text(body.body, max_length=MAX_BODY)
    if body.links is not None:
        post.links = _validate_links(body.links)
    if body.pinned is not None:
        post.pinned = body.pinned
    post.updated_at = datetime.utcnow()
    db.commit()
    return {"ok": True, "id": post.id}


@router.delete("/{post_id}")
def delete_post(post_id: int, token: str = "", db: Session = Depends(get_db)):
    cl = _get_co_lead(token, db)
    post = db.query(WGPost).filter(WGPost.id == post_id, WGPost.wg_id == cl.wg_id).first()
    if not post:
        raise HTTPException(404, "Post not found")
    db.delete(post)
    db.commit()
    return {"ok": True}


# --- Public (any WG member can view) ---

@router.get("/public/{wg_number}")
def public_posts(wg_number: int, db: Session = Depends(get_db)):
    wg = db.query(WorkingGroup).filter(WorkingGroup.number == wg_number).first()
    if not wg:
        raise HTTPException(404, "Working group not found")
    posts = (
        db.query(WGPost)
        .filter(WGPost.wg_id == wg.id)
        .order_by(WGPost.pinned.desc(), WGPost.created_at.desc())
        .all()
    )
    return [_post_to_dict(p) for p in posts]


def _post_to_dict(p: WGPost) -> dict:
    return {
        "id": p.id,
        "title": p.title,
        "body": p.body,
        "links": p.links or [],
        "pinned": p.pinned,
        "author": p.author.name if p.author else None,
        "created_at": p.created_at.isoformat() if p.created_at else None,
        "updated_at": p.updated_at.isoformat() if p.updated_at else None,
    }
