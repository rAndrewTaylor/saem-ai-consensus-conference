"""Admin routes — dashboard data, exports, working group management."""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, case, or_
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from collections import defaultdict
import csv
import io
import json
import zipfile

from ..database import (
    get_db, WorkingGroup, Question, Participant, DelphiResponse,
    DelphiSuggestion, PairwiseVote, ConferenceVote, ConferenceSession,
    ConferenceComment, AISynthesisRun, AISynthesisItem, QuestionStatus,
    DelphiRound, DispositionVote, HumanDecision, AuditLog, CoLead,
    write_audit_log,
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


# --- Full backup (ZIP of everything) -----------------------------------

def _csv_bytes(header: list[str], rows: list[list]) -> bytes:
    """Render a CSV from header + rows to bytes."""
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(header)
    for r in rows:
        w.writerow([safe_csv_value(c) if isinstance(c, str) else c for c in r])
    return buf.getvalue().encode("utf-8")


@router.get("/export/backup")
def export_full_backup(
    db: Session = Depends(get_db),
    admin: dict = Depends(require_admin),
):
    """Streams a single ZIP archive with every table relevant to the
    conference — CSV per table plus a JSON manifest. Read-only; nothing
    is mutated. Suitable as a 'download a full snapshot before I touch
    anything' backup.
    """
    buf = io.BytesIO()
    timestamp = datetime.utcnow().isoformat()

    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:

        # working_groups.csv
        wgs = db.query(WorkingGroup).order_by(WorkingGroup.number).all()
        zf.writestr("working_groups.csv", _csv_bytes(
            ["id", "number", "name", "short_name", "pillar", "scope", "created_at"],
            [[w.id, w.number, w.name, w.short_name, w.pillar or "", w.scope or "",
              w.created_at.isoformat() if w.created_at else ""] for w in wgs],
        ))

        # co_leads.csv
        co_leads = db.query(CoLead).all()
        zf.writestr("co_leads.csv", _csv_bytes(
            ["id", "name", "email", "institution", "wg_id", "claimed_at",
             "is_active", "created_at"],
            [[c.id, c.name or "", c.email or "", c.institution or "",
              c.wg_id or "", c.claimed_at.isoformat() if c.claimed_at else "",
              bool(c.is_active),
              c.created_at.isoformat() if c.created_at else ""] for c in co_leads],
        ))

        # participants.csv (with response counts)
        participants = db.query(Participant).order_by(Participant.wg_id, Participant.id).all()
        delphi_counts = dict(
            db.query(DelphiResponse.participant_id, func.count(DelphiResponse.id))
            .group_by(DelphiResponse.participant_id).all()
        )
        pairwise_counts = dict(
            db.query(PairwiseVote.participant_id, func.count(PairwiseVote.id))
            .group_by(PairwiseVote.participant_id).all()
        )
        zf.writestr("participants.csv", _csv_bytes(
            ["id", "name", "email", "role", "wg_id", "is_active", "claimed_at",
             "created_at", "delphi_responses", "pairwise_votes", "token"],
            [[p.id, p.name or "", p.email or "", p.role or "", p.wg_id or "",
              bool(p.is_active),
              p.claimed_at.isoformat() if p.claimed_at else "",
              p.created_at.isoformat() if p.created_at else "",
              delphi_counts.get(p.id, 0), pairwise_counts.get(p.id, 0),
              p.token] for p in participants],
        ))

        # questions.csv (with computed stats)
        questions = db.query(Question).order_by(Question.wg_id, Question.id).all()
        zf.writestr("questions.csv", _csv_bytes(
            ["id", "wg_id", "version", "status", "source", "text", "short_text",
             "r1_include_pct", "r1_modify_pct", "r1_exclude_pct",
             "r1_importance_mean", "r1_importance_median",
             "r2_include_pct", "r2_exclude_pct",
             "r2_importance_mean", "r2_importance_median",
             "pairwise_score", "pairwise_wins", "pairwise_losses",
             "created_at", "updated_at"],
            [[q.id, q.wg_id, q.version, q.status.value if q.status else "",
              q.source or "", q.text, q.short_text or "",
              q.r1_include_pct, q.r1_modify_pct, q.r1_exclude_pct,
              q.r1_importance_mean, q.r1_importance_median,
              q.r2_include_pct, q.r2_exclude_pct,
              q.r2_importance_mean, q.r2_importance_median,
              q.pairwise_score, q.pairwise_wins, q.pairwise_losses,
              q.created_at.isoformat() if q.created_at else "",
              q.updated_at.isoformat() if q.updated_at else ""]
             for q in questions],
        ))

        # delphi_responses.csv (all rounds, all WGs)
        responses = (
            db.query(DelphiResponse, Question.wg_id)
            .join(Question, DelphiResponse.question_id == Question.id)
            .order_by(Question.wg_id, DelphiResponse.round, DelphiResponse.id)
            .all()
        )
        zf.writestr("delphi_responses.csv", _csv_bytes(
            ["id", "wg_id", "question_id", "participant_id", "round",
             "disposition", "importance_rating", "comment", "created_at"],
            [[r.id, wg_id, r.question_id, r.participant_id,
              r.round.value if r.round else "",
              r.disposition.value if r.disposition else "",
              r.importance_rating if r.importance_rating is not None else "",
              r.comment or "",
              r.created_at.isoformat() if r.created_at else ""]
             for r, wg_id in responses],
        ))

        # delphi_suggestions.csv
        suggs = db.query(DelphiSuggestion).order_by(DelphiSuggestion.id).all()
        zf.writestr("delphi_suggestions.csv", _csv_bytes(
            ["id", "wg_id", "participant_id", "round", "suggestion_text",
             "general_comment", "ai_category", "ai_maps_to_question_id",
             "ai_suggested_wording", "human_decision", "human_notes",
             "created_at"],
            [[s.id, s.wg_id, s.participant_id,
              s.round.value if s.round else "",
              s.suggestion_text, s.general_comment or "",
              s.ai_category or "", s.ai_maps_to_question_id or "",
              s.ai_suggested_wording or "",
              s.human_decision.value if s.human_decision else "",
              s.human_notes or "",
              s.created_at.isoformat() if s.created_at else ""] for s in suggs],
        ))

        # pairwise_votes.csv
        votes = db.query(PairwiseVote).order_by(PairwiseVote.wg_id, PairwiseVote.id).all()
        zf.writestr("pairwise_votes.csv", _csv_bytes(
            ["id", "wg_id", "participant_id", "question_a_id", "question_b_id",
             "winner_id", "response_time_ms", "created_at"],
            [[v.id, v.wg_id, v.participant_id, v.question_a_id, v.question_b_id,
              v.winner_id if v.winner_id else "",
              v.response_time_ms or "",
              v.created_at.isoformat() if v.created_at else ""] for v in votes],
        ))

        # conference_sessions.csv
        sessions = db.query(ConferenceSession).order_by(ConferenceSession.id).all()
        zf.writestr("conference_sessions.csv", _csv_bytes(
            ["id", "wg_id", "session_type", "phase", "is_active",
             "started_at", "ended_at", "created_at"],
            [[s.id, s.wg_id or "", s.session_type or "", s.phase or "",
              bool(s.is_active),
              s.started_at.isoformat() if s.started_at else "",
              s.ended_at.isoformat() if s.ended_at else "",
              s.created_at.isoformat() if s.created_at else ""] for s in sessions],
        ))

        # conference_votes.csv
        cvotes = db.query(ConferenceVote).order_by(ConferenceVote.session_id, ConferenceVote.id).all()
        zf.writestr("conference_votes.csv", _csv_bytes(
            ["id", "session_id", "participant_id", "question_id", "vote_type",
             "value", "created_at"],
            [[v.id, v.session_id, v.participant_id, v.question_id,
              v.vote_type or "", v.value,
              v.created_at.isoformat() if v.created_at else ""] for v in cvotes],
        ))

        # conference_comments.csv
        ccomments = db.query(ConferenceComment).order_by(ConferenceComment.id).all()
        zf.writestr("conference_comments.csv", _csv_bytes(
            ["id", "session_id", "participant_id", "comment_type",
             "comment_text", "created_at"],
            [[c.id, c.session_id, c.participant_id or "", c.comment_type or "",
              c.comment_text,
              c.created_at.isoformat() if c.created_at else ""] for c in ccomments],
        ))

        # ai_synthesis.json (full audit log)
        runs = db.query(AISynthesisRun).order_by(AISynthesisRun.created_at).all()
        ai_export = [{
            "run_id": run.id,
            "type": run.synthesis_type.value if run.synthesis_type else None,
            "wg_id": run.wg_id,
            "round": run.round.value if run.round else None,
            "model": run.model_name,
            "model_version": run.model_version,
            "prompt": run.prompt_text,
            "input_data": run.input_data,
            "output": run.raw_output,
            "created_at": run.created_at.isoformat() if run.created_at else None,
            "items": [{
                "id": i.id,
                "type": i.item_type,
                "content": i.content,
                "human_decision": i.human_decision.value if i.human_decision else None,
                "reviewer": i.human_reviewer,
                "notes": i.human_notes,
                "reviewed_at": i.reviewed_at.isoformat() if i.reviewed_at else None,
            } for i in run.items],
        } for run in runs]
        zf.writestr("ai_synthesis.json", json.dumps(ai_export, indent=2))

        # audit_log.csv
        audits = db.query(AuditLog).order_by(AuditLog.id).all()
        zf.writestr("audit_log.csv", _csv_bytes(
            ["id", "user_email", "action", "detail", "created_at"],
            [[a.id, a.user_email or "", a.action or "", a.detail or "",
              a.created_at.isoformat() if a.created_at else ""] for a in audits],
        ))

        # manifest.json
        manifest = {
            "exported_at": timestamp,
            "exported_by": admin.get("sub", "unknown"),
            "counts": {
                "working_groups": len(wgs),
                "co_leads": len(co_leads),
                "participants": len(participants),
                "questions": len(questions),
                "delphi_responses": len(responses),
                "delphi_suggestions": len(suggs),
                "pairwise_votes": len(votes),
                "conference_sessions": len(sessions),
                "conference_votes": len(cvotes),
                "conference_comments": len(ccomments),
                "ai_synthesis_runs": len(runs),
                "audit_log_entries": len(audits),
            },
            "schema_note": (
                "Each CSV mirrors the table of the same name. Foreign keys "
                "use integer ids; cross-reference participants.csv, "
                "questions.csv, working_groups.csv. Tokens are included so "
                "this archive is sufficient to reconstruct invite links."
            ),
        }
        zf.writestr("manifest.json", json.dumps(manifest, indent=2))

    write_audit_log(
        db,
        user_email=admin.get("sub", "unknown"),
        action="export_backup",
        detail=f"Exported full backup ZIP at {timestamp}",
    )

    buf.seek(0)
    safe_ts = timestamp.replace(":", "-").split(".")[0]
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="saem_consensus_backup_{safe_ts}.zip"',
        },
    )


# --- Duplicate participant detection -----------------------------------

@router.get("/participants/duplicates")
def list_duplicate_participants(
    db: Session = Depends(get_db),
    admin: dict = Depends(require_admin),
):
    """Group participants that look like duplicates of each other.

    Two heuristics, scoped within each WG (since the user said multi-WG
    membership is legitimate, e.g. Arwen in WG4 and WG5):

      - same lowercased name within the same WG
      - same lowercased email within the same WG

    Each row in a group includes data counts so an admin can decide
    which copy to keep (typically: keep the one with data; deactivate
    the empty one). Demo / tester accounts are excluded.
    """
    DEMO = "@demo.saem-ai.test"
    TESTER = "@tester.saem-ai.test"

    rows = (
        db.query(Participant)
        .filter(Participant.name.isnot(None))
        .filter(
            or_(
                Participant.email.is_(None),
                ~Participant.email.like(f"%{DEMO}"),
            )
        )
        .filter(
            or_(
                Participant.email.is_(None),
                ~Participant.email.like(f"%{TESTER}"),
            )
        )
        .all()
    )

    if not rows:
        return {"groups": []}

    pids = [p.id for p in rows]
    delphi_counts = dict(
        db.query(DelphiResponse.participant_id, func.count(DelphiResponse.id))
        .filter(DelphiResponse.participant_id.in_(pids))
        .group_by(DelphiResponse.participant_id).all()
    )
    pairwise_counts = dict(
        db.query(PairwiseVote.participant_id, func.count(PairwiseVote.id))
        .filter(PairwiseVote.participant_id.in_(pids))
        .group_by(PairwiseVote.participant_id).all()
    )
    conf_counts = dict(
        db.query(ConferenceVote.participant_id, func.count(ConferenceVote.id))
        .filter(ConferenceVote.participant_id.in_(pids))
        .group_by(ConferenceVote.participant_id).all()
    )

    wg_lookup = {
        w.id: {"number": w.number, "short_name": w.short_name}
        for w in db.query(WorkingGroup).all()
    }

    def _row_dict(p: Participant) -> dict:
        wg = wg_lookup.get(p.wg_id, {"number": None, "short_name": None})
        return {
            "id": p.id,
            "name": p.name,
            "email": p.email,
            "role": p.role,
            "is_active": bool(p.is_active),
            "claimed_at": p.claimed_at.isoformat() if p.claimed_at else None,
            "created_at": p.created_at.isoformat() if p.created_at else None,
            "wg_number": wg["number"],
            "wg_short_name": wg["short_name"],
            "delphi_responses": delphi_counts.get(p.id, 0),
            "pairwise_votes": pairwise_counts.get(p.id, 0),
            "conference_votes": conf_counts.get(p.id, 0),
        }

    # Group by (wg_id, normalized_name) and (wg_id, normalized_email)
    by_name: dict = defaultdict(list)
    by_email: dict = defaultdict(list)
    for p in rows:
        key_name = (p.wg_id, (p.name or "").strip().lower())
        if key_name[1]:
            by_name[key_name].append(p)
        if p.email:
            key_email = (p.wg_id, p.email.strip().lower())
            by_email[key_email].append(p)

    groups: list[dict] = []
    seen_pair_sets: set = set()  # dedupe groups that match on both name and email

    def _emit(reason: str, members: list[Participant]):
        # Only flag groups where 2+ members are still ACTIVE — once a
        # cleanup has deactivated all but one, the group is no longer
        # actionable and shouldn't clutter the admin panel.
        active_members = [m for m in members if m.is_active]
        if len(active_members) < 2:
            return
        # Stable identity for this group of participant ids
        ids_key = tuple(sorted(m.id for m in active_members))
        if ids_key in seen_pair_sets:
            return
        seen_pair_sets.add(ids_key)
        groups.append({
            "reason": reason,
            "wg_number": wg_lookup.get(active_members[0].wg_id, {}).get("number"),
            "match_value": (
                active_members[0].name if reason == "same_name"
                else (active_members[0].email or "")
            ),
            "members": [_row_dict(m) for m in active_members],
        })

    for (_wg_id, _name), members in by_name.items():
        _emit("same_name", members)
    for (_wg_id, _email), members in by_email.items():
        _emit("same_email", members)

    # Sort: most-likely-to-need-attention first (more members, then by WG)
    groups.sort(key=lambda g: (-len(g["members"]), g["wg_number"] or 0))

    return {"groups": groups, "total_groups": len(groups)}
