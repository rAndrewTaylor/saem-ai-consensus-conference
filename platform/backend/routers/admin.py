"""Admin routes — dashboard data, exports, working group management."""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, case
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
    DispositionVote, HumanDecision, AuditLog, write_audit_log,
)
from ..auth import require_admin
from ..validators import safe_csv_value

router = APIRouter()


# --- Dashboard ---

@router.get("/dashboard")
def dashboard_data(
    db: Session = Depends(get_db),
    admin: dict = Depends(require_admin),
):
    """Get overview data for the admin dashboard."""
    wgs = db.query(WorkingGroup).order_by(WorkingGroup.number).all()

    # --- Batch-load question counts per WG using GROUP BY ---
    question_counts = (
        db.query(
            Question.wg_id,
            func.count(Question.id).label("total"),
            func.sum(case((Question.status == QuestionStatus.CONFIRMED, 1), else_=0)).label("confirmed"),
            func.sum(case((Question.status == QuestionStatus.ACTIVE, 1), else_=0)).label("active"),
            func.sum(case((Question.status == QuestionStatus.REMOVED, 1), else_=0)).label("removed"),
        )
        .group_by(Question.wg_id)
        .all()
    )
    q_map = {
        row.wg_id: {
            "total": row.total,
            "confirmed": int(row.confirmed or 0),
            "active": int(row.active or 0),
            "removed": int(row.removed or 0),
        }
        for row in question_counts
    }

    # --- Batch-load R1/R2 response counts per WG using GROUP BY ---
    r1_counts = (
        db.query(
            Question.wg_id,
            func.count(DelphiResponse.id).label("responses"),
            func.count(func.distinct(DelphiResponse.participant_id)).label("participants"),
        )
        .join(Question, DelphiResponse.question_id == Question.id)
        .filter(DelphiResponse.round == DelphiRound.ROUND_1)
        .group_by(Question.wg_id)
        .all()
    )
    r1_map = {
        row.wg_id: {"responses": row.responses, "participants": row.participants}
        for row in r1_counts
    }

    r2_counts = (
        db.query(
            Question.wg_id,
            func.count(DelphiResponse.id).label("responses"),
        )
        .join(Question, DelphiResponse.question_id == Question.id)
        .filter(DelphiResponse.round == DelphiRound.ROUND_2)
        .group_by(Question.wg_id)
        .all()
    )
    r2_map = {row.wg_id: row.responses for row in r2_counts}

    # --- Batch-load pairwise vote counts per WG ---
    pw_counts = (
        db.query(
            PairwiseVote.wg_id,
            func.count(PairwiseVote.id).label("votes"),
        )
        .group_by(PairwiseVote.wg_id)
        .all()
    )
    pw_map = {row.wg_id: row.votes for row in pw_counts}

    wg_summaries = []
    for wg in wgs:
        qdata = q_map.get(wg.id, {"total": 0, "confirmed": 0, "active": 0, "removed": 0})
        r1 = r1_map.get(wg.id, {"responses": 0, "participants": 0})
        wg_summaries.append({
            "wg_number": wg.number,
            "name": wg.name,
            "short_name": wg.short_name,
            "pillar": wg.pillar,
            "total_questions": qdata["total"],
            "confirmed": qdata["confirmed"],
            "active": qdata["active"],
            "removed": qdata["removed"],
            "r1_responses": r1["responses"],
            "r1_participants": r1["participants"],
            "r2_responses": r2_map.get(wg.id, 0),
            "pairwise_votes": pw_map.get(wg.id, 0),
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

    # Top-level aggregates for the overview stat cards
    total_questions = sum(s["total_questions"] for s in wg_summaries)
    total_confirmed = sum(s["confirmed"] for s in wg_summaries)
    total_active = sum(s["active"] for s in wg_summaries)
    total_removed = sum(s["removed"] for s in wg_summaries)
    total_r1_participants = max((s["r1_participants"] for s in wg_summaries), default=0)
    pending_ai_review = total_items - reviewed_items

    return {
        "total_questions": total_questions,
        "confirmed": total_confirmed,
        "r1_participants": sum(s["r1_participants"] for s in wg_summaries),
        "pending_ai_review": pending_ai_review,
        "status_breakdown": {
            "active": total_active,
            "confirmed": total_confirmed,
            "removed": total_removed,
        },
        "working_groups": wg_summaries,
        "ai_synthesis": {
            "total_runs": total_runs,
            "total_items": total_items,
            "reviewed_items": reviewed_items,
            "pending_review": pending_ai_review,
        },
        "conference": {
            "sessions": conference_sessions,
            "total_votes": conference_votes,
        },
        "timestamp": datetime.utcnow().isoformat(),
    }


# --- Data Export ---

@router.get("/export/delphi/{wg_number}/{round_name}")
def export_delphi_data(
    wg_number: int,
    round_name: str,
    db: Session = Depends(get_db),
    admin: dict = Depends(require_admin),
):
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
            safe_csv_value(str(r.question_id)),
            safe_csv_value(r.question.text),
            safe_csv_value(str(r.participant_id)),
            safe_csv_value(r.disposition.value),
            safe_csv_value(str(r.importance_rating) if r.importance_rating is not None else ""),
            safe_csv_value(r.comment or ""),
            safe_csv_value(r.created_at.isoformat()),
        ])

    write_audit_log(
        db,
        user_email=admin.get("sub", "unknown"),
        action="export_delphi",
        detail=f"Exported delphi WG{wg_number} {round_name} ({len(responses)} rows)",
    )

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=delphi_wg{wg_number}_{round_name}.csv"}
    )


@router.get("/export/pairwise/{wg_number}")
def export_pairwise_data(
    wg_number: int,
    db: Session = Depends(get_db),
    admin: dict = Depends(require_admin),
):
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
            safe_csv_value(str(v.id)),
            safe_csv_value(str(v.participant_id)),
            safe_csv_value(str(v.question_a_id)),
            safe_csv_value(str(v.question_b_id)),
            safe_csv_value(str(v.winner_id) if v.winner_id else "skip"),
            safe_csv_value(str(v.response_time_ms) if v.response_time_ms else ""),
            safe_csv_value(v.created_at.isoformat()),
        ])

    write_audit_log(
        db,
        user_email=admin.get("sub", "unknown"),
        action="export_pairwise",
        detail=f"Exported pairwise WG{wg_number} ({len(votes)} rows)",
    )

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=pairwise_wg{wg_number}.csv"}
    )


@router.get("/export/conference/{session_id}")
def export_conference_data(
    session_id: int,
    db: Session = Depends(get_db),
    admin: dict = Depends(require_admin),
):
    """Export conference-day voting data as CSV."""
    votes = db.query(ConferenceVote).filter(ConferenceVote.session_id == session_id).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "vote_id", "participant_id", "question_id", "vote_type", "value", "timestamp"
    ])
    for v in votes:
        writer.writerow([
            safe_csv_value(str(v.id)),
            safe_csv_value(str(v.participant_id)),
            safe_csv_value(str(v.question_id)),
            safe_csv_value(v.vote_type),
            safe_csv_value(str(v.value)),
            safe_csv_value(v.created_at.isoformat()),
        ])

    write_audit_log(
        db,
        user_email=admin.get("sub", "unknown"),
        action="export_conference",
        detail=f"Exported conference session {session_id} ({len(votes)} rows)",
    )

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=conference_session_{session_id}.csv"}
    )


@router.get("/export/ai-synthesis")
def export_ai_synthesis_log(
    db: Session = Depends(get_db),
    admin: dict = Depends(require_admin),
):
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

    write_audit_log(
        db,
        user_email=admin.get("sub", "unknown"),
        action="export_ai_synthesis",
        detail=f"Exported AI synthesis audit log ({len(runs)} runs)",
    )

    return StreamingResponse(
        iter([json.dumps(export, indent=2)]),
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=ai_synthesis_audit_log.json"}
    )


@router.get("/export/full-results")
def export_full_results(
    db: Session = Depends(get_db),
    admin: dict = Depends(require_admin),
):
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

    write_audit_log(
        db,
        user_email=admin.get("sub", "unknown"),
        action="export_full_results",
        detail=f"Exported full results ({len(wgs)} working groups)",
    )

    return results
