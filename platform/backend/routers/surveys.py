"""Delphi survey routes — create surveys, collect responses, compute results."""

from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional
import secrets

from ..database import (
    get_db, WorkingGroup, Question, Participant, DelphiResponse,
    DelphiSuggestion, QuestionStatus, DelphiRound, DispositionVote, HumanDecision,
    write_audit_log,
)
from ..validators import (
    validate_importance, validate_disposition, sanitize_text, MAX_QUESTION_LENGTH,
)
from ..auth import (
    verify_participant_token, get_participant_token, require_admin,
    PARTICIPANT_TOKEN_EXPIRY_HOURS,
)

router = APIRouter()


# --- Schemas ---

class QuestionCreate(BaseModel):
    text: str
    short_text: Optional[str] = None
    source: Optional[str] = "manual"

class QuestionUpdate(BaseModel):
    text: Optional[str] = None
    short_text: Optional[str] = None
    status: Optional[str] = None

class ResponseSubmit(BaseModel):
    disposition: str  # "include", "include_with_modifications", "exclude"
    importance_rating: int  # 1-9
    comment: Optional[str] = None

class SuggestionSubmit(BaseModel):
    suggestion_text: str
    general_comment: Optional[str] = None


# --- Participant Token Management ---

@router.post("/token")
def get_or_create_token(wg_number: int, db: Session = Depends(get_db)):
    """Issue an anonymous participant token for a working group."""
    wg = db.query(WorkingGroup).filter(WorkingGroup.number == wg_number).first()
    if not wg:
        raise HTTPException(404, "Working group not found")
    token = secrets.token_urlsafe(32)
    participant = Participant(
        token=token,
        wg_id=wg.id,
        expires_at=datetime.utcnow() + timedelta(hours=PARTICIPANT_TOKEN_EXPIRY_HOURS),
    )
    db.add(participant)
    db.commit()
    return {"token": token, "wg_id": wg.id, "wg_number": wg_number}


# --- Question Management ---

@router.get("/questions/{wg_number}")
def list_questions(wg_number: int, round_name: Optional[str] = None, db: Session = Depends(get_db)):
    """List all questions for a working group, optionally filtered for a specific round."""
    wg = db.query(WorkingGroup).filter(WorkingGroup.number == wg_number).first()
    if not wg:
        raise HTTPException(404, "Working group not found")

    query = db.query(Question).filter(Question.wg_id == wg.id)

    if round_name == "round_1":
        query = query.filter(Question.status.in_([QuestionStatus.ACTIVE, QuestionStatus.CONFIRMED]))
    elif round_name == "round_2":
        # Round 2: gray zone questions (revised) + any new ones added
        query = query.filter(Question.status.in_([
            QuestionStatus.ACTIVE, QuestionStatus.REVISED
        ]))

    questions = query.order_by(Question.id).all()
    return [{
        "id": q.id,
        "text": q.text,
        "short_text": q.short_text,
        "status": q.status.value if q.status else None,
        "version": q.version,
        "source": q.source,
        "r1_include_pct": q.r1_include_pct,
        "r1_modify_pct": q.r1_modify_pct,
        "r1_exclude_pct": q.r1_exclude_pct,
        "r1_importance_mean": q.r1_importance_mean,
        "r2_include_pct": q.r2_include_pct,
        "r2_exclude_pct": q.r2_exclude_pct,
        "r2_importance_mean": q.r2_importance_mean,
        "pairwise_score": q.pairwise_score,
    } for q in questions]


@router.post("/questions/{wg_number}")
def create_question(
    wg_number: int, q: QuestionCreate,
    db: Session = Depends(get_db),
    admin: dict = Depends(require_admin),
):
    """Add a new question to a working group."""
    wg = db.query(WorkingGroup).filter(WorkingGroup.number == wg_number).first()
    if not wg:
        raise HTTPException(404, "Working group not found")

    cleaned_text = sanitize_text(q.text, max_length=MAX_QUESTION_LENGTH)
    if not cleaned_text:
        raise HTTPException(400, "Question text is required")

    question = Question(
        wg_id=wg.id,
        text=cleaned_text,
        short_text=sanitize_text(q.short_text, max_length=200) if q.short_text else cleaned_text[:200],
        source=q.source,
        status=QuestionStatus.DRAFT,
    )
    db.add(question)
    db.commit()
    db.refresh(question)

    write_audit_log(db, admin.get("sub", "unknown"), "question_create",
                    f"Created question {question.id} in WG {wg_number}")

    return {"id": question.id, "text": question.text}


@router.post("/questions/{wg_number}/bulk")
def bulk_create_questions(
    wg_number: int, questions: list[QuestionCreate],
    db: Session = Depends(get_db),
    admin: dict = Depends(require_admin),
):
    """Bulk add questions to a working group."""
    wg = db.query(WorkingGroup).filter(WorkingGroup.number == wg_number).first()
    if not wg:
        raise HTTPException(404, "Working group not found")
    created = []
    for q in questions:
        cleaned_text = sanitize_text(q.text, max_length=MAX_QUESTION_LENGTH)
        if not cleaned_text:
            continue
        question = Question(
            wg_id=wg.id,
            text=cleaned_text,
            short_text=sanitize_text(q.short_text, max_length=200) if q.short_text else cleaned_text[:200],
            source=q.source,
            status=QuestionStatus.DRAFT,
        )
        db.add(question)
        created.append(question)
    db.commit()

    write_audit_log(db, admin.get("sub", "unknown"), "question_bulk_create",
                    f"Created {len(created)} questions in WG {wg_number}")

    return {"created": len(created)}


@router.put("/questions/{question_id}")
def update_question(question_id: int, q: QuestionUpdate, db: Session = Depends(get_db)):
    """Update a question's text or status."""
    question = db.query(Question).get(question_id)
    if not question:
        raise HTTPException(404, "Question not found")
    if q.text is not None:
        question.text = sanitize_text(q.text, max_length=MAX_QUESTION_LENGTH)
        question.version += 1
    if q.short_text is not None:
        question.short_text = sanitize_text(q.short_text, max_length=200)
    if q.status is not None:
        question.status = QuestionStatus(q.status)
    db.commit()
    return {"id": question.id, "text": question.text, "status": question.status.value}


@router.post("/questions/{wg_number}/activate")
def activate_questions(
    wg_number: int,
    db: Session = Depends(get_db),
    admin: dict = Depends(require_admin),
):
    """Set all DRAFT questions for a WG to ACTIVE (ready for Delphi)."""
    wg = db.query(WorkingGroup).filter(WorkingGroup.number == wg_number).first()
    if not wg:
        raise HTTPException(404, "Working group not found")
    updated = db.query(Question).filter(
        Question.wg_id == wg.id,
        Question.status == QuestionStatus.DRAFT
    ).update({Question.status: QuestionStatus.ACTIVE})
    db.commit()

    write_audit_log(db, admin.get("sub", "unknown"), "questions_activate",
                    f"Activated {updated} questions in WG {wg_number}")

    return {"activated": updated}


# --- Response Collection ---

@router.post("/respond/{wg_number}/{round_name}/{question_id}")
def submit_response(
    wg_number: int, round_name: str, question_id: int,
    response: ResponseSubmit,
    token: str = Depends(get_participant_token),
    db: Session = Depends(get_db),
):
    """Submit a Delphi response for a question."""
    if not token:
        raise HTTPException(401, "Authorization header required")
    participant = verify_participant_token(token, db)

    question = db.query(Question).get(question_id)
    if not question:
        raise HTTPException(404, "Question not found")

    # Validate inputs
    validate_importance(response.importance_rating)
    validate_disposition(response.disposition)
    comment = sanitize_text(response.comment) if response.comment else response.comment

    delphi_round = DelphiRound.ROUND_1 if round_name == "round_1" else DelphiRound.ROUND_2

    try:
        # Attempt insert
        dr = DelphiResponse(
            question_id=question_id,
            participant_id=participant.id,
            round=delphi_round,
            disposition=DispositionVote(response.disposition),
            importance_rating=response.importance_rating,
            comment=comment,
        )
        db.add(dr)
        db.flush()
    except IntegrityError:
        db.rollback()
        # Unique constraint hit — update existing response
        existing = db.query(DelphiResponse).filter(
            DelphiResponse.question_id == question_id,
            DelphiResponse.participant_id == participant.id,
            DelphiResponse.round == delphi_round,
        ).first()
        if existing:
            existing.disposition = DispositionVote(response.disposition)
            existing.importance_rating = response.importance_rating
            existing.comment = comment

    db.commit()
    return {"status": "recorded"}


@router.post("/respond/{wg_number}/{round_name}/batch")
def submit_batch_responses(
    wg_number: int, round_name: str,
    responses: dict[int, ResponseSubmit],  # question_id -> response
    token: str = Depends(get_participant_token),
    db: Session = Depends(get_db),
):
    """Submit all responses for a round at once."""
    if not token:
        raise HTTPException(401, "Authorization header required")
    participant = verify_participant_token(token, db)

    delphi_round = DelphiRound.ROUND_1 if round_name == "round_1" else DelphiRound.ROUND_2

    for question_id, response in responses.items():
        # Validate each response
        validate_importance(response.importance_rating)
        validate_disposition(response.disposition)
        comment = sanitize_text(response.comment) if response.comment else response.comment

        existing = db.query(DelphiResponse).filter(
            DelphiResponse.question_id == int(question_id),
            DelphiResponse.participant_id == participant.id,
            DelphiResponse.round == delphi_round,
        ).first()
        if existing:
            existing.disposition = DispositionVote(response.disposition)
            existing.importance_rating = response.importance_rating
            existing.comment = comment
        else:
            dr = DelphiResponse(
                question_id=int(question_id),
                participant_id=participant.id,
                round=delphi_round,
                disposition=DispositionVote(response.disposition),
                importance_rating=response.importance_rating,
                comment=comment,
            )
            db.add(dr)
    db.commit()
    return {"status": "recorded", "count": len(responses)}


@router.post("/suggest/{wg_number}/{round_name}")
def submit_suggestion(
    wg_number: int, round_name: str,
    suggestion: SuggestionSubmit,
    token: str = Depends(get_participant_token),
    db: Session = Depends(get_db),
):
    """Submit a new question suggestion."""
    if not token:
        raise HTTPException(401, "Authorization header required")
    participant = verify_participant_token(token, db)

    wg = db.query(WorkingGroup).filter(WorkingGroup.number == wg_number).first()
    if not wg:
        raise HTTPException(404, "Working group not found")

    delphi_round = DelphiRound.ROUND_1 if round_name == "round_1" else DelphiRound.ROUND_2
    s = DelphiSuggestion(
        participant_id=participant.id,
        wg_id=wg.id,
        round=delphi_round,
        suggestion_text=sanitize_text(suggestion.suggestion_text),
        general_comment=sanitize_text(suggestion.general_comment) if suggestion.general_comment else None,
    )
    db.add(s)
    db.commit()
    return {"status": "recorded"}


# --- Results Computation ---

@router.post("/compute-results/{wg_number}/{round_name}")
def compute_round_results(
    wg_number: int, round_name: str,
    db: Session = Depends(get_db),
    admin: dict = Depends(require_admin),
):
    """Compute and store aggregate results for a round."""
    wg = db.query(WorkingGroup).filter(WorkingGroup.number == wg_number).first()
    if not wg:
        raise HTTPException(404, "Working group not found")

    delphi_round = DelphiRound.ROUND_1 if round_name == "round_1" else DelphiRound.ROUND_2
    questions = db.query(Question).filter(
        Question.wg_id == wg.id,
        Question.status.in_([QuestionStatus.ACTIVE, QuestionStatus.REVISED])
    ).all()

    results = []
    for q in questions:
        responses = db.query(DelphiResponse).filter(
            DelphiResponse.question_id == q.id,
            DelphiResponse.round == delphi_round,
        ).all()

        if not responses:
            continue

        total = len(responses)
        include_count = sum(1 for r in responses if r.disposition == DispositionVote.INCLUDE)
        modify_count = sum(1 for r in responses if r.disposition == DispositionVote.INCLUDE_WITH_MODIFICATIONS)
        exclude_count = sum(1 for r in responses if r.disposition == DispositionVote.EXCLUDE)
        importance_ratings = [r.importance_rating for r in responses if r.importance_rating]

        include_pct = round((include_count + modify_count) / total * 100, 1)
        modify_pct = round(modify_count / total * 100, 1) if round_name == "round_1" else None
        exclude_pct = round(exclude_count / total * 100, 1)
        importance_mean = round(sum(importance_ratings) / len(importance_ratings), 2) if importance_ratings else None
        importance_median = round(sorted(importance_ratings)[len(importance_ratings) // 2], 2) if importance_ratings else None

        if round_name == "round_1":
            q.r1_include_pct = include_pct
            q.r1_modify_pct = modify_pct
            q.r1_exclude_pct = exclude_pct
            q.r1_importance_mean = importance_mean
            q.r1_importance_median = importance_median
            # Apply consensus thresholds
            if include_pct >= 80:
                q.status = QuestionStatus.CONFIRMED
            elif include_pct <= 20:
                q.status = QuestionStatus.REMOVED
        else:
            q.r2_include_pct = include_pct
            q.r2_exclude_pct = exclude_pct
            q.r2_importance_mean = importance_mean
            q.r2_importance_median = importance_median
            if include_pct >= 80:
                q.status = QuestionStatus.CONFIRMED
            elif include_pct >= 60:
                q.status = QuestionStatus.NEAR_CONSENSUS
            else:
                q.status = QuestionStatus.REMOVED

        results.append({
            "question_id": q.id,
            "text": q.text,
            "status": q.status.value,
            "total_responses": total,
            "include_pct": include_pct,
            "modify_pct": modify_pct,
            "exclude_pct": exclude_pct,
            "importance_mean": importance_mean,
        })

    db.commit()

    write_audit_log(db, admin.get("sub", "unknown"), "compute_results",
                    f"Computed {round_name} results for WG {wg_number}: {len(results)} questions")

    return {"wg": wg_number, "round": round_name, "questions": results}


@router.get("/results/{wg_number}/{round_name}")
def get_round_results(wg_number: int, round_name: str, db: Session = Depends(get_db)):
    """Get computed results for a round."""
    wg = db.query(WorkingGroup).filter(WorkingGroup.number == wg_number).first()
    if not wg:
        raise HTTPException(404, "Working group not found")

    questions = db.query(Question).filter(Question.wg_id == wg.id).order_by(Question.id).all()

    return {
        "wg_number": wg_number,
        "wg_name": wg.name,
        "round": round_name,
        "questions": [{
            "id": q.id,
            "text": q.text,
            "status": q.status.value,
            "r1_include_pct": q.r1_include_pct,
            "r1_modify_pct": q.r1_modify_pct,
            "r1_exclude_pct": q.r1_exclude_pct,
            "r1_importance_mean": q.r1_importance_mean,
            "r2_include_pct": q.r2_include_pct,
            "r2_exclude_pct": q.r2_exclude_pct,
            "r2_importance_mean": q.r2_importance_mean,
            "pairwise_score": q.pairwise_score,
        } for q in questions],
    }


@router.get("/comments/{wg_number}/{round_name}")
def get_round_comments(wg_number: int, round_name: str, question_id: Optional[int] = None, db: Session = Depends(get_db)):
    """Get all anonymized comments for a round (for AI synthesis input)."""
    wg = db.query(WorkingGroup).filter(WorkingGroup.number == wg_number).first()
    if not wg:
        raise HTTPException(404, "Working group not found")

    delphi_round = DelphiRound.ROUND_1 if round_name == "round_1" else DelphiRound.ROUND_2

    query = db.query(DelphiResponse).join(Question).filter(
        Question.wg_id == wg.id,
        DelphiResponse.round == delphi_round,
        DelphiResponse.comment.isnot(None),
        DelphiResponse.comment != "",
    )
    if question_id:
        query = query.filter(DelphiResponse.question_id == question_id)

    responses = query.all()
    comments_by_question = {}
    for r in responses:
        qid = r.question_id
        if qid not in comments_by_question:
            comments_by_question[qid] = {
                "question_id": qid,
                "question_text": r.question.text,
                "comments": []
            }
        comments_by_question[qid]["comments"].append({
            "disposition": r.disposition.value,
            "importance_rating": r.importance_rating,
            "comment": r.comment,
        })

    return list(comments_by_question.values())


@router.get("/suggestions/{wg_number}/{round_name}")
def get_suggestions(wg_number: int, round_name: str, db: Session = Depends(get_db)):
    """Get all new question suggestions for a round."""
    wg = db.query(WorkingGroup).filter(WorkingGroup.number == wg_number).first()
    if not wg:
        raise HTTPException(404, "Working group not found")
    delphi_round = DelphiRound.ROUND_1 if round_name == "round_1" else DelphiRound.ROUND_2
    suggestions = db.query(DelphiSuggestion).filter(
        DelphiSuggestion.wg_id == wg.id,
        DelphiSuggestion.round == delphi_round,
    ).all()
    return [{
        "id": s.id,
        "suggestion_text": s.suggestion_text,
        "general_comment": s.general_comment,
        "ai_category": s.ai_category,
        "human_decision": s.human_decision.value if s.human_decision else None,
    } for s in suggestions]
