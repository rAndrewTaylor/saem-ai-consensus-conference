"""Top-level orchestrator for the Round 1 report.

Single entrypoint: `generate_report(db)` returns DOCX bytes. Callers:
  - the admin endpoint (returns the bytes as a download),
  - a CLI script (writes to disk),
  - tests (renders against a fixture bundle).

Phase 2 scope: per-WG sections only (F1–F4 + tables). Cross-WG (D), Round
2 plan (E), and appendices remain stubs until later phases land.
"""

from __future__ import annotations

import logging
from typing import Optional

from sqlalchemy.orm import Session

from .data import fetch_bundle
from .docx_render import render
from .figures import per_wg as fig_per_wg
from .figures.style import fig_to_png_bytes
from .stats import overall_summary, per_question_stats, per_wg_summary

logger = logging.getLogger(__name__)


def generate_report(
    db: Session,
    *,
    style: str = "print",
    include_demo: bool = False,
    include_tester: bool = False,
    output_path: Optional[str] = None,
) -> bytes:
    """Build the report end-to-end. Returns DOCX bytes."""
    logger.info("Round 1 report: pulling data snapshot")
    bundle = fetch_bundle(db, include_demo=include_demo, include_tester=include_tester)
    logger.info(
        "Snapshot: %d WGs, %d questions, %d R1 responses, %d pairwise, %d suggestions",
        len(bundle.working_groups), len(bundle.questions),
        len(bundle.delphi_r1), len(bundle.pairwise), len(bundle.suggestions),
    )

    q_stats = per_question_stats(bundle)
    wg_summary = per_wg_summary(bundle, q_stats)
    overall = overall_summary(bundle, wg_summary, q_stats)

    logger.info("Stats computed: overall ρ=%s, low-PW WGs=%s",
                overall.get("spearman_rho_delphi_pairwise_overall"),
                overall.get("wgs_low_pairwise_confidence"))

    # Build per-WG figures
    per_wg_figures: dict[int, dict[str, bytes]] = {}
    for _, w in wg_summary.iterrows():
        wg_id = int(w["wg_id"])
        wg_n = int(w["wg_number"])
        q_sub = q_stats[q_stats["wg_id"] == wg_id]
        r1_sub = bundle.delphi_r1.merge(
            q_sub[["question_id"]], on="question_id", how="inner"
        ) if not bundle.delphi_r1.empty else bundle.delphi_r1

        figures: dict[str, bytes] = {}
        if not q_sub.empty:
            try:
                figures["F1"] = fig_to_png_bytes(
                    fig_per_wg.disposition_bar(q_sub, wg_number=wg_n, style=style)
                )
            except Exception:
                logger.exception("F1 failed for WG%s", wg_n)
            try:
                figures["F2"] = fig_to_png_bytes(
                    fig_per_wg.importance_strip(q_sub, r1_sub, wg_number=wg_n, style=style)
                )
            except Exception:
                logger.exception("F2 failed for WG%s", wg_n)
            try:
                figures["F3"] = fig_to_png_bytes(
                    fig_per_wg.pairwise_leaderboard(
                        q_sub, wg_number=wg_n,
                        low_confidence=bool(w["pairwise_low_confidence"]),
                        style=style,
                    )
                )
            except Exception:
                logger.exception("F3 failed for WG%s", wg_n)
            try:
                figures["F4"] = fig_to_png_bytes(
                    fig_per_wg.concordance_scatter(
                        q_sub, wg_number=wg_n,
                        spearman_rho=w["spearman_rho_delphi_pairwise"],
                        spearman_p=w["spearman_p_delphi_pairwise"],
                        style=style,
                    )
                )
            except Exception:
                logger.exception("F4 failed for WG%s", wg_n)
        per_wg_figures[wg_id] = figures

    logger.info("Rendering DOCX")
    return render(
        bundle=bundle,
        q_stats=q_stats,
        wg_summary=wg_summary,
        overall=overall,
        per_wg_figures=per_wg_figures,
        output_path=output_path,
    )
