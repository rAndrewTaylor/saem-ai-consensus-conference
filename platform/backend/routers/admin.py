"""Admin routes — dashboard data, exports, working group management."""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import csv
import io
import json

from ..database import (
    get_db, WorkingGroup, Question, Participant, DelphiResponse,
    DelphiSuggestion, PairwiseVote, ConferenceVote, ConferenceSession,
    AISynthesisRun, AISynthesisItem, QuestionStatus, DelphiRound,
    DispositionVote, HumanDecision
)

router = APIRouter()


# --- Dashboard ---

@router.get("/dashboard")
def dashboard_data(db: Session = Depends(get_db)):
    """Get overview data for the admin dashboard."""
    wgs = db.query(WorkingGroup).order_by(WorkingGroup.number).all()

    wg_summaries = []
    for wg in wgs:
        questions = db.query(Question).filter(Question.wg_id == wg.id).all()
        total_q = len(questions)
        confirmed = sum(1 for q in questions if q.status == QuestionStatus.CONFIRMED)
        active = sum(1 for q in questions if q.status == QuestionStatus.ACTIVE)
        removed = sum(1 for q in questions if q.status == QuestionStatus.REMOVED)

        r1_responses = db.query(DelphiResponse).join(Question).filter(
            Question.wg_id == wg.id,
            DelphiResponse.round == DelphiRound.ROUND_1,
        ).count()
        r2_responses = db.query(DelphiResponse).join(Question).filter(
            Question.wg_id == wg.id,
            DelphiResponse.round == DelphiRound.ROUND_2,
        ).count()

        r1_participants = db.query(func.count(func.distinct(DelphiResponse.participant_id))).join(Question).filter(
            Question.wg_id == wg.id,
            DelphiResponse.round == DelphiRound.ROUND_1,
        ).scalar() or 0

        pairwise_votes = db.query(PairwiseVote).filter(PairwiseVote.wg_id == wg.id).count()

        wg_summaries.append({
            "wg_number": wg.number,
            "name": wg.name,
            "short_name": wg.short_name,
            "pillar": wg.pillar,
            "total_questions": total_q,
            "confirmed": confirmed,
            "active": active,
            "removed": removed,
            "r1_responses": r1_responses,
            "r1_participants": r1_participants,
            "r2_responses": r2_responses,
            "pairwise_votes": pairwise_votes,
            "co_leads": [{"name": cl.name, "email": cl.email} for cl in wg.co_leads],
        })

    # AI synthesis stats
    total_runs = db.query(AISynthesisRun).count()
    total_items = db.query(AISynthesisItem).count()
    reviewed_items = db.query(AISynthesisItem).filter(
        AISynthesisItem.human_decision != HumanDecision.PENDING
    ).count()

    # Conference day stats
    conference_sessions = db.query(ConferenceSession).count()
    conference_votes = db.query(ConferenceVote).count()

    return {
        "working_groups": wg_summaries,
        "ai_synthesis": {
            "total_runs": total_runs,
            "total_items": total_items,
            "reviewed_items": reviewed_items,
            "pending_review": total_items - reviewed_items,
        },
        "conference": {
            "sessions": conference_sessions,
            "total_votes": conference_votes,
        },
        "timestamp": datetime.utcnow().isoformat(),
    }


# --- Data Export ---

@router.get("/export/delphi/{wg_number}/{round_name}")
def export_delphi_data(wg_number: int, round_name: str, db: Session = Depends(get_db)):
    """Export Delphi responses as CSV."""
    wg = db.query(WorkingGroup).filter(WorkingGroup.number == wg_number).first()
    if not wg:
        raise HTTPException(404, "Working group not found")

    delphi_round = DelphiRound.ROUND_1 if round_name == "round_1" else DelphiRound.ROUND_2
    responses = db.query(DelphiResponse).join(Question).filter(
        Question.wg_id == wg.id,
        DelphiResponse.round == delphi_round,
    ).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "question_id", "question_text", "participant_id", "disposition",
        "importance_rating", "comment", "timestamp"
    ])
    for r in responses:
        writer.writerow([
            r.question_id, r.question.text, r.participant_id,
            r.disposition.value, r.importance_rating, r.comment or "",
            r.created_at.isoformat()
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=delphi_wg{wg_number}_{round_name}.csv"}
    )


@router.get("/export/pairwise/{wg_number}")
def export_pairwise_data(wg_number: int, db: Session = Depends(get_db)):
    """Export pairwise comparison data as CSV."""
    wg = db.query(WorkingGroup).filter(WorkingGroup.number == wg_number).first()
    if not wg:
        raise HTTPException(404, "Working group not found")

    votes = db.query(PairwiseVote).filter(PairwiseVote.wg_id == wg.id).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "vote_id", "participant_id", "question_a_id", "question_b_id",
        "winner_id", "response_time_ms", "timestamp"
    ])
    for v in votes:
        writer.writerow([
            v.id, v.participant_id, v.question_a_id, v.question_b_id,
            v.winner_id or "skip", v.response_time_ms or "", v.created_at.isoformat()
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=pairwise_wg{wg_number}.csv"}
    )


@router.get("/export/conference/{session_id}")
def export_conference_data(session_id: int, db: Session = Depends(get_db)):
    """Export conference-day voting data as CSV."""
    votes = db.query(ConferenceVote).filter(ConferenceVote.session_id == session_id).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "vote_id", "participant_id", "question_id", "vote_type", "value", "timestamp"
    ])
    for v in votes:
        writer.writerow([
            v.id, v.participant_id, v.question_id, v.vote_type,
            v.value, v.created_at.isoformat()
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=conference_session_{session_id}.csv"}
    )


@router.get("/export/ai-synthesis")
def export_ai_synthesis_log(db: Session = Depends(get_db)):
    """Export full AI synthesis audit log as JSON."""
    runs = db.query(AISynthesisRun).order_by(AISynthesisRun.created_at).all()
    export = []
    for run in runs:
        export.append({
            "run_id": run.id,
            "type": run.synthesis_type.value,
            "wg_id": run.wg_id,
            "round": run.round.value if run.round else None,
            "model": run.model_name,
            "model_version": run.model_version,
            "prompt": run.prompt_text,
            "input_data": run.input_data,
            "output": run.raw_output,
            "created_at": run.created_at.isoformat(),
            "items": [{
                "id": i.id,
                "type": i.item_type,
                "content": i.content,
                "human_decision": i.human_decision.value if i.human_decision else None,
                "reviewer": i.human_reviewer,
                "notes": i.human_notes,
                "reviewed_at": i.reviewed_at.isoformat() if i.reviewed_at else None,
            } for i in run.items],
        })

    return StreamingResponse(
        iter([json.dumps(export, indent=2)]),
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=ai_synthesis_audit_log.json"}
    )


@router.get("/export/full-results")
def export_full_results(db: Session = Depends(get_db)):
    """Export the complete results summary — all WGs, all methods."""
    wgs = db.query(WorkingGroup).order_by(WorkingGroup.number).all()

    results = {"exported_at": datetime.utcnow().isoformat(), "working_groups": []}

    for wg in wgs:
        questions = db.query(Question).filter(Question.wg_id == wg.id).order_by(Question.id).all()
        wg_data = {
            "wg_number": wg.number,
            "name": wg.name,
            "questions": [{
                "id": q.id,
                "text": q.text,
                "status": q.status.value,
                "version": q.version,
                "source": q.source,
                "r1_include_pct": q.r1_include_pct,
                "r1_modify_pct": q.r1_modify_pct,
                "r1_exclude_pct": q.r1_exclude_pct,
                "r1_importance_mean": q.r1_importance_mean,
                "r1_importance_median": q.r1_importance_median,
                "r2_include_pct": q.r2_include_pct,
                "r2_exclude_pct": q.r2_exclude_pct,
                "r2_importance_mean": q.r2_importance_mean,
                "r2_importance_median": q.r2_importance_median,
                "pairwise_score": q.pairwise_score,
                "pairwise_wins": q.pairwise_wins,
                "pairwise_losses": q.pairwise_losses,
            } for q in questions],
        }
        results["working_groups"].append(wg_data)

    return results
