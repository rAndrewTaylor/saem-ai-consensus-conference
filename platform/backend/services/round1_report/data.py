"""Data fetch for the Round 1 report.

Pulls everything the report needs from the live database in one pass and
returns it as a small bundle of plain dicts / pandas DataFrames. No
pandas-specific magic in callers — they get rows of primitives.

The bundle is the input contract for stats.py and the figure modules.
Anything downstream that needs DB access should go through here so we
have one place to add caching / parquet snapshots later.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

import pandas as pd
from sqlalchemy.orm import Session

from ...database import (
    DelphiResponse,
    DelphiRound,
    DelphiSuggestion,
    PairwiseVote,
    Participant,
    Question,
    QuestionStatus,
    WorkingGroup,
)


@dataclass
class ReportBundle:
    """Everything the report engine needs in one place."""

    snapshot_at: datetime
    working_groups: pd.DataFrame  # one row per WG
    questions: pd.DataFrame       # one row per active question
    participants: pd.DataFrame    # one row per active named participant
    delphi_r1: pd.DataFrame       # one row per R1 vote
    pairwise: pd.DataFrame        # one row per pairwise vote
    suggestions: pd.DataFrame     # one row per Delphi suggestion (R1)
    config: dict = field(default_factory=dict)


# Statuses that count as "live" questions in this round of the report.
# DRAFT is excluded; REMOVED is excluded; everything else is in scope.
ACTIVE_STATUSES = (
    QuestionStatus.ACTIVE,
    QuestionStatus.CONFIRMED,
    QuestionStatus.NEAR_CONSENSUS,
    QuestionStatus.REVISED,
)


def fetch_bundle(
    db: Session,
    *,
    include_demo: bool = False,
    include_tester: bool = False,
) -> ReportBundle:
    """Pull every table the report needs into a ReportBundle.

    `include_demo` / `include_tester` are off by default so production
    runs ignore the @demo.saem-ai.test and @tester.saem-ai.test rows
    seeded for QA; turn either on for local dev.
    """
    snapshot_at = datetime.utcnow()

    # --- Working groups ---
    wg_rows = (
        db.query(WorkingGroup)
        .order_by(WorkingGroup.number)
        .all()
    )
    working_groups = pd.DataFrame(
        [
            {
                "wg_id": w.id,
                "wg_number": w.number,
                "name": w.name,
                "short_name": w.short_name,
                "pillar": w.pillar,
                "scope": w.scope or "",
            }
            for w in wg_rows
        ]
    )

    # --- Participants (active, named, real) ---
    p_q = (
        db.query(Participant)
        .filter(Participant.is_active == True)  # noqa: E712
        .filter(Participant.name.isnot(None))
    )
    if not include_demo:
        p_q = p_q.filter(
            (Participant.email.is_(None))
            | (~Participant.email.like("%@demo.saem-ai.test"))
        )
    if not include_tester:
        p_q = p_q.filter(
            (Participant.email.is_(None))
            | (~Participant.email.like("%@tester.saem-ai.test"))
        )
    participants = pd.DataFrame(
        [
            {
                "participant_id": p.id,
                "name": p.name,
                "email": p.email,
                "role": p.role,
                "wg_id": p.wg_id,
                "claimed_at": p.claimed_at,
                "created_at": p.created_at,
            }
            for p in p_q.all()
        ]
    )
    keep_pids = (
        set(participants["participant_id"].tolist()) if not participants.empty else set()
    )

    # --- Questions ---
    q_rows = (
        db.query(Question)
        .filter(Question.status.in_(ACTIVE_STATUSES))
        .order_by(Question.wg_id, Question.id)
        .all()
    )
    questions = pd.DataFrame(
        [
            {
                "question_id": q.id,
                "wg_id": q.wg_id,
                "text": q.text,
                "short_text": q.short_text or "",
                "version": q.version,
                "status": q.status.value if q.status else None,
                "source": q.source or "",
                "r1_include_pct": q.r1_include_pct,
                "r1_modify_pct": q.r1_modify_pct,
                "r1_exclude_pct": q.r1_exclude_pct,
                "r1_importance_mean": q.r1_importance_mean,
                "r1_importance_median": q.r1_importance_median,
                "pairwise_score": q.pairwise_score,
                "pairwise_wins": q.pairwise_wins or 0,
                "pairwise_losses": q.pairwise_losses or 0,
                "created_at": q.created_at,
                "updated_at": q.updated_at,
            }
            for q in q_rows
        ]
    )
    keep_qids = (
        set(questions["question_id"].tolist()) if not questions.empty else set()
    )

    # --- Delphi R1 responses ---
    if keep_qids and keep_pids:
        r1_rows = (
            db.query(DelphiResponse)
            .filter(DelphiResponse.round == DelphiRound.ROUND_1)
            .filter(DelphiResponse.question_id.in_(keep_qids))
            .filter(DelphiResponse.participant_id.in_(keep_pids))
            .all()
        )
    else:
        r1_rows = []
    delphi_r1 = pd.DataFrame(
        [
            {
                "response_id": r.id,
                "question_id": r.question_id,
                "participant_id": r.participant_id,
                "disposition": r.disposition.value if r.disposition else None,
                "importance": r.importance_rating,
                "comment": (r.comment or "").strip(),
                "created_at": r.created_at,
            }
            for r in r1_rows
        ]
    )

    # --- Pairwise votes ---
    if keep_qids and keep_pids:
        pw_rows = (
            db.query(PairwiseVote)
            .filter(PairwiseVote.participant_id.in_(keep_pids))
            .all()
        )
    else:
        pw_rows = []
    pairwise = pd.DataFrame(
        [
            {
                "vote_id": v.id,
                "wg_id": v.wg_id,
                "participant_id": v.participant_id,
                "question_a_id": v.question_a_id,
                "question_b_id": v.question_b_id,
                "winner_id": v.winner_id,
                "response_time_ms": v.response_time_ms,
                "created_at": v.created_at,
            }
            for v in pw_rows
        ]
    )

    # --- Suggestions (R1 only) ---
    if keep_pids:
        s_rows = (
            db.query(DelphiSuggestion)
            .filter(DelphiSuggestion.round == DelphiRound.ROUND_1)
            .filter(DelphiSuggestion.participant_id.in_(keep_pids))
            .all()
        )
    else:
        s_rows = []
    suggestions = pd.DataFrame(
        [
            {
                "suggestion_id": s.id,
                "wg_id": s.wg_id,
                "participant_id": s.participant_id,
                "text": s.suggestion_text,
                "general_comment": s.general_comment or "",
                "ai_category": s.ai_category,
                "human_decision": (
                    s.human_decision.value if s.human_decision else None
                ),
                "created_at": s.created_at,
            }
            for s in s_rows
        ]
    )

    return ReportBundle(
        snapshot_at=snapshot_at,
        working_groups=working_groups,
        questions=questions,
        participants=participants,
        delphi_r1=delphi_r1,
        pairwise=pairwise,
        suggestions=suggestions,
        config={
            "include_demo": include_demo,
            "include_tester": include_tester,
            "active_statuses": [s.value for s in ACTIVE_STATUSES],
        },
    )
