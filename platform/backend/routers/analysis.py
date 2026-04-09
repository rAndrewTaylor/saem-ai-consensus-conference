"""AI synthesis and analysis routes — Claude API integration."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import json
import os

from ..database import (
    get_db, WorkingGroup, Question, DelphiResponse, DelphiSuggestion,
    AISynthesisRun, AISynthesisItem, AISynthesisType, HumanDecision,
    DelphiRound, DispositionVote, QuestionStatus
)
from ..services.ai_synthesis import run_synthesis, PROMPTS

router = APIRouter()


class SynthesisRequest(BaseModel):
    synthesis_type: str
    wg_number: Optional[int] = None
    round_name: Optional[str] = None
    question_id: Optional[int] = None

class ReviewItem(BaseModel):
    decision: str  # "accepted", "rejected", "modified"
    reviewer: str
    notes: Optional[str] = None


# --- Run AI Synthesis ---

@router.post("/synthesize")
async def run_ai_synthesis(request: SynthesisRequest, db: Session = Depends(get_db)):
    """Run an AI synthesis task. Returns the structured output."""

    synthesis_type = AISynthesisType(request.synthesis_type)

    # Gather input data based on synthesis type
    input_data = _gather_input_data(
        synthesis_type, request.wg_number, request.round_name,
        request.question_id, db
    )

    # Get the appropriate prompt template
    prompt_template = PROMPTS.get(request.synthesis_type)
    if not prompt_template:
        raise HTTPException(400, f"Unknown synthesis type: {request.synthesis_type}")

    # Format the prompt with actual data
    prompt = prompt_template.format(**input_data)

    # Run through Claude
    result = await run_synthesis(prompt, input_data)

    # Store the run
    wg = None
    if request.wg_number:
        wg = db.query(WorkingGroup).filter(WorkingGroup.number == request.wg_number).first()

    delphi_round = None
    if request.round_name:
        delphi_round = DelphiRound.ROUND_1 if request.round_name == "round_1" else DelphiRound.ROUND_2

    run = AISynthesisRun(
        synthesis_type=synthesis_type,
        wg_id=wg.id if wg else None,
        round=delphi_round,
        model_name=result["model"],
        model_version=result.get("model_version", ""),
        prompt_text=prompt,
        input_data=json.dumps(input_data, default=str),
        raw_output=result["output"],
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    return {
        "run_id": run.id,
        "synthesis_type": request.synthesis_type,
        "model": result["model"],
        "output": result["output"],
        "input_summary": {
            "wg_number": request.wg_number,
            "round": request.round_name,
            "question_id": request.question_id,
        },
    }


@router.post("/synthesize/all/{wg_number}/{round_name}")
async def run_full_synthesis(wg_number: int, round_name: str, db: Session = Depends(get_db)):
    """Run all synthesis tasks for a WG round: theme clustering, revisions, new questions, summary."""
    wg = db.query(WorkingGroup).filter(WorkingGroup.number == wg_number).first()
    if not wg:
        raise HTTPException(404, "Working group not found")

    results = {}

    # 1. Round summary
    req = SynthesisRequest(
        synthesis_type="round_summary",
        wg_number=wg_number,
        round_name=round_name,
    )
    results["round_summary"] = await run_ai_synthesis(req, db)

    # 2. Theme clustering for each gray-zone question
    gray_zone_questions = db.query(Question).filter(
        Question.wg_id == wg.id,
        Question.status == QuestionStatus.ACTIVE,
    ).all()

    # Filter to questions with comments
    for q in gray_zone_questions:
        comments = db.query(DelphiResponse).filter(
            DelphiResponse.question_id == q.id,
            DelphiResponse.round == (DelphiRound.ROUND_1 if round_name == "round_1" else DelphiRound.ROUND_2),
            DelphiResponse.comment.isnot(None),
            DelphiResponse.comment != "",
        ).all()
        if len(comments) >= 2:
            req = SynthesisRequest(
                synthesis_type="theme_clustering",
                wg_number=wg_number,
                round_name=round_name,
                question_id=q.id,
            )
            results[f"themes_q{q.id}"] = await run_ai_synthesis(req, db)

    # 3. Question revision suggestions for "modify" questions
    modify_questions = db.query(Question).filter(
        Question.wg_id == wg.id,
        Question.status == QuestionStatus.ACTIVE,
        Question.r1_modify_pct > 20 if round_name == "round_1" else True,
    ).all()

    for q in modify_questions:
        req = SynthesisRequest(
            synthesis_type="question_revision",
            wg_number=wg_number,
            round_name=round_name,
            question_id=q.id,
        )
        results[f"revisions_q{q.id}"] = await run_ai_synthesis(req, db)

    # 4. New question synthesis
    suggestions = db.query(DelphiSuggestion).filter(
        DelphiSuggestion.wg_id == wg.id,
        DelphiSuggestion.round == (DelphiRound.ROUND_1 if round_name == "round_1" else DelphiRound.ROUND_2),
    ).all()
    if suggestions:
        req = SynthesisRequest(
            synthesis_type="new_question_synthesis",
            wg_number=wg_number,
            round_name=round_name,
        )
        results["new_questions"] = await run_ai_synthesis(req, db)

    return {
        "wg_number": wg_number,
        "round": round_name,
        "tasks_completed": len(results),
        "results": results,
    }


@router.post("/synthesize/cross-wg")
async def run_cross_wg_analysis(db: Session = Depends(get_db)):
    """Run cross-WG overlap detection and research agenda analysis."""
    results = {}

    # Cross-WG overlap detection
    req = SynthesisRequest(synthesis_type="cross_wg_overlap")
    results["overlap"] = await run_ai_synthesis(req, db)

    # Full agenda analysis
    req = SynthesisRequest(synthesis_type="agenda_analysis")
    results["agenda"] = await run_ai_synthesis(req, db)

    return {"tasks_completed": len(results), "results": results}


# --- Review AI Output ---

@router.get("/runs")
def list_runs(
    wg_number: Optional[int] = None,
    synthesis_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List all AI synthesis runs."""
    query = db.query(AISynthesisRun).order_by(AISynthesisRun.created_at.desc())
    if wg_number:
        wg = db.query(WorkingGroup).filter(WorkingGroup.number == wg_number).first()
        if wg:
            query = query.filter(AISynthesisRun.wg_id == wg.id)
    if synthesis_type:
        query = query.filter(AISynthesisRun.synthesis_type == AISynthesisType(synthesis_type))

    runs = query.all()
    return [{
        "id": r.id,
        "synthesis_type": r.synthesis_type.value,
        "wg_id": r.wg_id,
        "round": r.round.value if r.round else None,
        "model": r.model_name,
        "created_at": r.created_at.isoformat(),
        "items_count": len(r.items),
        "reviewed": sum(1 for i in r.items if i.human_decision != HumanDecision.PENDING),
    } for r in runs]


@router.get("/runs/{run_id}")
def get_run(run_id: int, db: Session = Depends(get_db)):
    """Get full details of an AI synthesis run."""
    run = db.query(AISynthesisRun).get(run_id)
    if not run:
        raise HTTPException(404, "Run not found")
    return {
        "id": run.id,
        "synthesis_type": run.synthesis_type.value,
        "model": run.model_name,
        "prompt": run.prompt_text,
        "output": run.raw_output,
        "created_at": run.created_at.isoformat(),
        "items": [{
            "id": i.id,
            "type": i.item_type,
            "content": i.content,
            "related_questions": i.related_question_ids,
            "human_decision": i.human_decision.value if i.human_decision else None,
            "reviewer": i.human_reviewer,
            "notes": i.human_notes,
        } for i in run.items],
    }


@router.put("/items/{item_id}/review")
def review_item(item_id: int, review: ReviewItem, db: Session = Depends(get_db)):
    """Record a human review decision on an AI synthesis item."""
    item = db.query(AISynthesisItem).get(item_id)
    if not item:
        raise HTTPException(404, "Item not found")
    item.human_decision = HumanDecision(review.decision)
    item.human_reviewer = review.reviewer
    item.human_notes = review.notes
    item.reviewed_at = datetime.utcnow()
    db.commit()
    return {"status": "reviewed", "decision": review.decision}


# --- Concordance Analysis ---

@router.get("/concordance/{wg_number}")
def compute_concordance(wg_number: int, db: Session = Depends(get_db)):
    """Compute concordance between Delphi importance and pairwise ranking."""
    wg = db.query(WorkingGroup).filter(WorkingGroup.number == wg_number).first()
    if not wg:
        raise HTTPException(404, "Working group not found")

    questions = db.query(Question).filter(
        Question.wg_id == wg.id,
        Question.r2_importance_mean.isnot(None),
        Question.pairwise_score.isnot(None),
    ).all()

    if len(questions) < 3:
        return {"wg_number": wg_number, "error": "Not enough data for concordance analysis"}

    # Sort by each metric
    by_delphi = sorted(questions, key=lambda q: q.r2_importance_mean or 0, reverse=True)
    by_pairwise = sorted(questions, key=lambda q: q.pairwise_score or 0, reverse=True)

    delphi_ranks = {q.id: i+1 for i, q in enumerate(by_delphi)}
    pairwise_ranks = {q.id: i+1 for i, q in enumerate(by_pairwise)}

    # Spearman rank correlation
    n = len(questions)
    d_squared_sum = sum((delphi_ranks[q.id] - pairwise_ranks[q.id]) ** 2 for q in questions)
    spearman_rho = 1 - (6 * d_squared_sum) / (n * (n**2 - 1)) if n > 1 else 0

    comparison = [{
        "question_id": q.id,
        "text": q.text[:100],
        "delphi_importance": q.r2_importance_mean,
        "delphi_rank": delphi_ranks[q.id],
        "pairwise_score": q.pairwise_score,
        "pairwise_rank": pairwise_ranks[q.id],
        "rank_difference": abs(delphi_ranks[q.id] - pairwise_ranks[q.id]),
    } for q in questions]

    comparison.sort(key=lambda x: x["rank_difference"], reverse=True)

    return {
        "wg_number": wg_number,
        "n_questions": n,
        "spearman_rho": round(spearman_rho, 3),
        "interpretation": _interpret_spearman(spearman_rho),
        "comparison": comparison,
    }


def _interpret_spearman(rho):
    abs_rho = abs(rho)
    if abs_rho >= 0.8:
        return "Strong concordance — Delphi and pairwise methods produce very similar rankings"
    elif abs_rho >= 0.6:
        return "Moderate concordance — general agreement with some notable differences"
    elif abs_rho >= 0.4:
        return "Weak concordance — the two methods capture different aspects of priority"
    else:
        return "Little concordance — the methods produce substantially different rankings"


# --- Helper: Gather Input Data ---

def _gather_input_data(synthesis_type, wg_number, round_name, question_id, db):
    """Compile the data needed for each synthesis prompt."""
    data = {}

    if wg_number:
        wg = db.query(WorkingGroup).filter(WorkingGroup.number == wg_number).first()
        if wg:
            data["wg_name"] = wg.name
            data["wg_scope"] = wg.scope
            data["wg_number"] = wg.number

    delphi_round = None
    if round_name:
        delphi_round = DelphiRound.ROUND_1 if round_name == "round_1" else DelphiRound.ROUND_2

    if synthesis_type == AISynthesisType.THEME_CLUSTERING and question_id:
        q = db.query(Question).get(question_id)
        if q:
            data["question_text"] = q.text
            responses = db.query(DelphiResponse).filter(
                DelphiResponse.question_id == question_id,
                DelphiResponse.round == delphi_round,
            ).all()
            total = len(responses)
            include = sum(1 for r in responses if r.disposition in [DispositionVote.INCLUDE, DispositionVote.INCLUDE_WITH_MODIFICATIONS])
            modify = sum(1 for r in responses if r.disposition == DispositionVote.INCLUDE_WITH_MODIFICATIONS)
            exclude = sum(1 for r in responses if r.disposition == DispositionVote.EXCLUDE)
            data["include_pct"] = round(include / total * 100, 1) if total else 0
            data["modify_pct"] = round(modify / total * 100, 1) if total else 0
            data["exclude_pct"] = round(exclude / total * 100, 1) if total else 0
            data["include_count"] = include
            data["modify_count"] = modify
            data["exclude_count"] = exclude
            importance = [r.importance_rating for r in responses if r.importance_rating]
            data["mean"] = round(sum(importance) / len(importance), 2) if importance else "N/A"
            data["median"] = round(sorted(importance)[len(importance)//2], 2) if importance else "N/A"
            data["q1"] = round(sorted(importance)[len(importance)//4], 2) if len(importance) >= 4 else "N/A"
            data["q3"] = round(sorted(importance)[3*len(importance)//4], 2) if len(importance) >= 4 else "N/A"
            comments = [r for r in responses if r.comment]
            data["comments"] = "\n".join(f"{i+1}. [{r.disposition.value}] {r.comment}" for i, r in enumerate(comments))

    elif synthesis_type == AISynthesisType.QUESTION_REVISION and question_id:
        q = db.query(Question).get(question_id)
        if q:
            data["question_text"] = q.text
            responses = db.query(DelphiResponse).filter(
                DelphiResponse.question_id == question_id,
                DelphiResponse.round == delphi_round,
            ).all()
            total = len(responses)
            data["include_pct"] = round(sum(1 for r in responses if r.disposition == DispositionVote.INCLUDE) / total * 100, 1) if total else 0
            data["modify_pct"] = round(sum(1 for r in responses if r.disposition == DispositionVote.INCLUDE_WITH_MODIFICATIONS) / total * 100, 1) if total else 0
            data["exclude_pct"] = round(sum(1 for r in responses if r.disposition == DispositionVote.EXCLUDE) / total * 100, 1) if total else 0
            modify_comments = [r for r in responses if r.disposition == DispositionVote.INCLUDE_WITH_MODIFICATIONS and r.comment]
            exclude_comments = [r for r in responses if r.disposition == DispositionVote.EXCLUDE and r.comment]
            data["modify_comments"] = "\n".join(f"{i+1}. {r.comment}" for i, r in enumerate(modify_comments))
            data["exclude_comments"] = "\n".join(f"{i+1}. {r.comment}" for i, r in enumerate(exclude_comments))

    elif synthesis_type == AISynthesisType.NEW_QUESTION_SYNTHESIS and wg_number:
        wg = db.query(WorkingGroup).filter(WorkingGroup.number == wg_number).first()
        existing = db.query(Question).filter(Question.wg_id == wg.id, Question.status != QuestionStatus.REMOVED).all()
        data["existing_questions"] = "\n".join(f"{i+1}. {q.text}" for i, q in enumerate(existing))
        suggestions = db.query(DelphiSuggestion).filter(
            DelphiSuggestion.wg_id == wg.id,
            DelphiSuggestion.round == delphi_round,
        ).all()
        data["suggestions"] = "\n".join(f"{i+1}. {s.suggestion_text}" for i, s in enumerate(suggestions))

    elif synthesis_type in [AISynthesisType.CROSS_WG_OVERLAP, AISynthesisType.AGENDA_ANALYSIS]:
        wgs = db.query(WorkingGroup).order_by(WorkingGroup.number).all()
        wg_data = []
        for wg in wgs:
            questions = db.query(Question).filter(
                Question.wg_id == wg.id,
                Question.status.in_([QuestionStatus.CONFIRMED, QuestionStatus.NEAR_CONSENSUS, QuestionStatus.ACTIVE])
            ).all()
            wg_questions = "\n".join(
                f"  Q{i+1}: {q.text} (R2: {q.r2_include_pct or q.r1_include_pct or 'N/A'}%)"
                for i, q in enumerate(questions)
            )
            wg_data.append(f"WG{wg.number} — {wg.name} ({wg.scope}):\n{wg_questions}")
        data["all_wg_questions"] = "\n\n".join(wg_data)

    elif synthesis_type == AISynthesisType.ROUND_SUMMARY and wg_number:
        wg = db.query(WorkingGroup).filter(WorkingGroup.number == wg_number).first()
        questions = db.query(Question).filter(Question.wg_id == wg.id).all()
        total_participants = db.query(DelphiResponse.participant_id).filter(
            DelphiResponse.question_id.in_([q.id for q in questions]),
            DelphiResponse.round == delphi_round,
        ).distinct().count()
        data["response_rate"] = f"{total_participants} participants"
        q_data = []
        for q in questions:
            responses = db.query(DelphiResponse).filter(
                DelphiResponse.question_id == q.id,
                DelphiResponse.round == delphi_round,
            ).all()
            comments = [r.comment for r in responses if r.comment]
            q_data.append(f"Q: {q.text}\n  Include: {q.r1_include_pct or 'N/A'}%, Importance: {q.r1_importance_mean or 'N/A'}\n  Comments: {'; '.join(comments[:5])}")
        data["round_data"] = "\n\n".join(q_data)

    return data
