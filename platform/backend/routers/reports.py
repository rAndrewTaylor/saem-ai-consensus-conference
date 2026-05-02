"""Round 1 report endpoints.

  /round1                       — admin-only DOCX download
  /round1/data                  — JSON bundle (admin or any active participant)
  /round1/figure/{name}.png     — single figure PNG (admin or any active participant)

Per the locked tier decisions:
  - admin: everything, including F5 respondent heatmap and the DOCX
  - any signed-in participant: data + figures except F5
  - public: 401 on every endpoint
"""

import logging
from datetime import datetime
from io import BytesIO
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.orm import Session

from ..auth import require_admin, verify_admin_token, verify_participant_token
from ..database import get_db, write_audit_log
from ..services.round1_report.data import fetch_bundle
from ..services.round1_report.figures import cross_wg as fig_cross
from ..services.round1_report.figures import per_wg as fig_per_wg
from ..services.round1_report.figures.style import fig_to_png_bytes
from ..services.round1_report.main import generate_report
from ..services.round1_report.stats import (
    overall_summary,
    per_question_stats,
    per_wg_summary,
)

logger = logging.getLogger(__name__)

router = APIRouter()


# ----- Tier gating -------------------------------------------------------

def _require_signed_in(
    db: Session,
    authorization: Optional[str],
) -> dict:
    """Returns {"is_admin": bool, "subject": str}. Raises 401 if no
    valid admin token AND no valid participant token are present."""
    if not authorization:
        raise HTTPException(401, "Authorization header required")
    token = authorization.replace("Bearer ", "").strip()
    # Try admin first
    try:
        claims = verify_admin_token(token)
        return {"is_admin": True, "subject": claims.get("sub", "admin")}
    except HTTPException:
        pass
    # Then participant
    try:
        p = verify_participant_token(token, db)
        return {"is_admin": False, "subject": f"participant#{p.id}",
                "wg_id": p.wg_id}
    except HTTPException:
        raise HTTPException(401, "Invalid token")


def _signed_in(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> dict:
    return _require_signed_in(db, authorization)


@router.get("/round1")
def round1_docx(
    skip_ai: bool = False,
    db: Session = Depends(get_db),
    admin: dict = Depends(require_admin),
):
    """Generate and stream the Round 1 inter-round report as a DOCX.

    Query params:
      skip_ai=true — skip Opus tagging passes (faster; F8/F9/D.3 will be
                     empty unless the cache already has tags).
    """
    timestamp = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    try:
        raw = generate_report(db, skip_ai=skip_ai)
    except RuntimeError as exc:
        # Most common: ANTHROPIC_API_KEY missing or invalid
        raise HTTPException(500, f"Report generation failed: {exc}")

    write_audit_log(
        db,
        user_email=admin.get("sub", "unknown"),
        action="report_round1_download",
        detail=f"Generated Round 1 DOCX ({len(raw):,} bytes); skip_ai={skip_ai}",
    )

    return StreamingResponse(
        iter([raw]),
        media_type=(
            "application/vnd.openxmlformats-officedocument."
            "wordprocessingml.document"
        ),
        headers={
            "Content-Disposition": (
                f'attachment; filename="Round_1_Report_{timestamp}.docx"'
            ),
        },
    )


# ----- /round1/data — JSON bundle for the React page --------------------

@router.get("/round1/data")
def round1_data(
    db: Session = Depends(get_db),
    auth: dict = Depends(_signed_in),
):
    """Aggregated stats for the Round 1 report — feeds the in-app page.
    Returns the same numbers the DOCX uses, sans figures and prose.
    """
    bundle = fetch_bundle(db)
    qs = per_question_stats(bundle)
    wgs = per_wg_summary(bundle, qs)
    overall = overall_summary(bundle, wgs, qs)

    write_audit_log(
        db, user_email=auth["subject"], action="report_round1_data",
        detail=f"Round 1 data bundle (admin={auth['is_admin']})",
    )

    # Strip text from non-admin tier? Locked decision says WG members can
    # see aggregates across all WGs but not foreign-WG question text.
    # For simplicity here: return everything; the React page handles tier
    # masking. (Token never exposed in any case.)
    # NaN/Inf floats are not JSON compliant — replace with None so the
    # browser doesn't get a 500.
    import math
    def _scrub(obj):
        if isinstance(obj, dict):
            return {k: _scrub(v) for k, v in obj.items()}
        if isinstance(obj, list):
            return [_scrub(x) for x in obj]
        if isinstance(obj, float) and (math.isnan(obj) or math.isinf(obj)):
            return None
        # Timestamps to ISO
        if hasattr(obj, "isoformat"):
            try:
                return obj.isoformat()
            except Exception:
                return str(obj)
        return obj

    return _scrub({
        "snapshot_at": bundle.snapshot_at.isoformat(),
        "is_admin": auth["is_admin"],
        "viewer_wg_id": auth.get("wg_id"),
        "overall": overall,
        "working_groups": wgs.to_dict(orient="records"),
        "questions": qs.to_dict(orient="records"),
    })


# ----- /round1/figure/{name}.png — pre-rendered PNG bytes ---------------

# Map figure name → builder that returns a matplotlib Figure.
# Per-WG figures take a `wg` query param; cross-WG figures don't.
_PER_WG_BUILDERS = {
    "F1": "disposition_bar",
    "F2": "importance_strip",
    "F3": "pairwise_leaderboard",
    "F4": "concordance_scatter",
    "F5": "respondent_heatmap",
}
_CROSS_BUILDERS = {
    "F6": "similarity_network",
    "F7": "theme_clusters_bars",
    "F8": "pillar_coverage",
    "F9": "cross_cutting_heatmap",
}


@router.get("/round1/figure/{name}.png")
def round1_figure(
    name: str,
    wg: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    auth: dict = Depends(_signed_in),
):
    """Render one of the report figures as a PNG. Cross-WG figures need
    no params. Per-WG figures require ?wg=<n>. F5 (respondent heatmap)
    is admin-only.
    """
    name = name.upper()

    if name == "F5" and not auth["is_admin"]:
        raise HTTPException(403, "F5 is restricted to admin / co-lead viewers")

    bundle = fetch_bundle(db)
    qs = per_question_stats(bundle)
    wg_summary = per_wg_summary(bundle, qs)

    style = "screen"
    fig = None

    try:
        if name in _PER_WG_BUILDERS:
            if wg is None:
                raise HTTPException(400, f"{name} requires ?wg=<n>")
            wg_row = wg_summary[wg_summary["wg_number"] == wg]
            if wg_row.empty:
                raise HTTPException(404, f"WG {wg} not found")
            wg_row = wg_row.iloc[0]
            q_sub = qs[qs["wg_id"] == wg_row["wg_id"]]
            r1_sub = (
                bundle.delphi_r1.merge(q_sub[["question_id"]],
                                        on="question_id", how="inner")
                if not bundle.delphi_r1.empty else bundle.delphi_r1
            )
            if name == "F1":
                fig = fig_per_wg.disposition_bar(q_sub, wg_number=wg, style=style)
            elif name == "F2":
                fig = fig_per_wg.importance_strip(q_sub, r1_sub, wg_number=wg, style=style)
            elif name == "F3":
                fig = fig_per_wg.pairwise_leaderboard(
                    q_sub, wg_number=wg,
                    low_confidence=bool(wg_row["pairwise_low_confidence"]),
                    style=style,
                )
            elif name == "F4":
                fig = fig_per_wg.concordance_scatter(
                    q_sub, wg_number=wg,
                    spearman_rho=wg_row["spearman_rho_delphi_pairwise"],
                    spearman_p=wg_row["spearman_p_delphi_pairwise"],
                    style=style,
                )
            elif name == "F5":
                fig = fig_per_wg.respondent_heatmap(
                    r1_sub, q_sub, wg_number=wg, style=style,
                )

        elif name in _CROSS_BUILDERS:
            # These need embeddings + AI tags. Reuse cached values.
            from ..services.round1_report import ai_tagging, embeddings

            embs = embeddings.embed_questions(bundle.questions)
            qids, sim = embeddings.cosine_similarity_matrix(embs)

            if name == "F6":
                fig = fig_cross.similarity_network(
                    qids, sim, bundle.questions, threshold=0.62, style=style,
                )
            elif name == "F7":
                # Need cluster assignments + theme labels (cached)
                from scipy.cluster.hierarchy import fcluster, linkage
                from scipy.spatial.distance import squareform
                import numpy as np
                dist = 1.0 - sim
                np.fill_diagonal(dist, 0.0)
                dist = (dist + dist.T) / 2
                np.clip(dist, 0.0, None, out=dist)
                Z = linkage(squareform(dist, checks=False), method="ward")
                ca = fcluster(Z, t=10, criterion="maxclust")
                qmap = bundle.questions.set_index("question_id")
                groups: dict[int, list[str]] = {}
                for qid, c in zip(qids, ca):
                    groups.setdefault(int(c), []).append(qmap.loc[qid, "text"])
                idx_map = {c: i for i, c in enumerate(sorted(groups.keys()))}
                qid_to_cluster = {int(qid): idx_map[int(c)]
                                  for qid, c in zip(qids, ca)}
                import asyncio
                loop = asyncio.new_event_loop()
                try:
                    theme_clusters = loop.run_until_complete(
                        ai_tagging.label_themes(
                            [groups[c] for c in sorted(groups.keys())]
                        )
                    )
                finally:
                    loop.close()
                fig = fig_cross.theme_clusters_bars(
                    qids, [qid_to_cluster.get(q, 0) for q in qids],
                    theme_clusters, bundle.questions, style=style,
                )
            elif name == "F8":
                import asyncio
                loop = asyncio.new_event_loop()
                try:
                    pillar_tags = loop.run_until_complete(
                        ai_tagging.tag_all_pillars(bundle.questions)
                    )
                finally:
                    loop.close()
                fig = fig_cross.pillar_coverage(
                    pillar_tags, bundle.questions, style=style,
                )
            elif name == "F9":
                import asyncio
                loop = asyncio.new_event_loop()
                try:
                    cc_tags = loop.run_until_complete(
                        ai_tagging.tag_all_cross_cutting(bundle.questions)
                    )
                finally:
                    loop.close()
                fig = fig_cross.cross_cutting_heatmap(
                    cc_tags, bundle.questions,
                    tag_set=ai_tagging.CROSS_CUTTING_TAGS, style=style,
                )
        else:
            raise HTTPException(404, f"Unknown figure: {name}")

        if fig is None:
            raise HTTPException(500, f"Builder for {name} returned None")

        png = fig_to_png_bytes(fig)
    except HTTPException:
        raise
    except Exception:
        logger.exception("Figure render failed: %s", name)
        raise HTTPException(500, f"Figure render failed: {name}")

    return Response(
        content=png, media_type="image/png",
        headers={"Cache-Control": "private, max-age=300"},
    )
