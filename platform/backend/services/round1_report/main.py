"""Top-level orchestrator for the Round 1 report.

Single entrypoint: `generate_report(db)` returns DOCX bytes. Callers:
  - the admin endpoint (returns the bytes as a download),
  - a CLI script (writes to disk),
  - tests (renders against a fixture bundle).

Phase 3 scope: per-WG sections (F1-F4) + cross-WG analysis (F5-F9 with
Opus-driven theme labels and pillar/cross-cutting tagging) + DOCX
section D rendered. Sections E and Appendices remain stubs.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Optional

import numpy as np
from sqlalchemy.orm import Session

from . import ai_tagging, embeddings
from .data import fetch_bundle
from .docx_render import render
from .figures import cross_wg as fig_cross
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
    skip_ai: bool = False,
    similarity_threshold: float = 0.55,
    n_clusters: int = 10,
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
            for fkey, builder in [
                ("F1", lambda: fig_per_wg.disposition_bar(q_sub, wg_number=wg_n, style=style)),
                ("F2", lambda: fig_per_wg.importance_strip(q_sub, r1_sub, wg_number=wg_n, style=style)),
                ("F3", lambda: fig_per_wg.pairwise_leaderboard(
                    q_sub, wg_number=wg_n,
                    low_confidence=bool(w["pairwise_low_confidence"]),
                    style=style,
                )),
                ("F4", lambda: fig_per_wg.concordance_scatter(
                    q_sub, wg_number=wg_n,
                    spearman_rho=w["spearman_rho_delphi_pairwise"],
                    spearman_p=w["spearman_p_delphi_pairwise"],
                    style=style,
                )),
                ("F5", lambda: fig_per_wg.respondent_heatmap(
                    r1_sub, q_sub, wg_number=wg_n, style=style,
                )),
            ]:
                try:
                    figures[fkey] = fig_to_png_bytes(builder())
                except Exception:
                    logger.exception("%s failed for WG%s", fkey, wg_n)
        per_wg_figures[wg_id] = figures

    # --- Cross-WG analysis (D) ----------------------------------------
    cross_figures: dict[str, bytes] = {}
    pillar_tags_df = None
    cross_cutting_tags_df = None
    theme_clusters: list[dict] = []
    similarity_data: Optional[tuple] = None

    if not bundle.questions.empty:
        logger.info("Computing question embeddings")
        embs = embeddings.embed_questions(bundle.questions)
        qids, sim = embeddings.cosine_similarity_matrix(embs)
        similarity_data = (qids, sim)

        if not skip_ai:
            logger.info("AI tagging: pillars + cross-cutting (Claude Opus)")
            loop = asyncio.new_event_loop()
            try:
                pillar_tags_df = loop.run_until_complete(
                    ai_tagging.tag_all_pillars(bundle.questions)
                )
                cross_cutting_tags_df = loop.run_until_complete(
                    ai_tagging.tag_all_cross_cutting(bundle.questions)
                )

                # Hierarchical clustering for theme labeling
                from scipy.cluster.hierarchy import fcluster, linkage
                from scipy.spatial.distance import squareform

                if len(qids) >= 3:
                    dist = 1.0 - sim
                    np.fill_diagonal(dist, 0.0)
                    dist = (dist + dist.T) / 2
                    np.clip(dist, 0.0, None, out=dist)
                    Z = linkage(squareform(dist, checks=False), method="ward")
                    cluster_assignments = fcluster(Z, t=n_clusters, criterion="maxclust")
                    qmap = bundle.questions.set_index("question_id")
                    cluster_groups: dict[int, list[str]] = {}
                    for qid, c in zip(qids, cluster_assignments):
                        cluster_groups.setdefault(int(c), []).append(qmap.loc[qid, "text"])
                    cluster_idx_list = sorted(cluster_groups.keys())
                    cluster_texts = [cluster_groups[c] for c in cluster_idx_list]
                    theme_clusters = loop.run_until_complete(
                        ai_tagging.label_themes(cluster_texts)
                    )
                    # Re-key cluster assignments to match label order
                    idx_map = {c: i for i, c in enumerate(cluster_idx_list)}
                    qid_to_cluster = {
                        int(qid): idx_map[int(c)]
                        for qid, c in zip(qids, cluster_assignments)
                    }
                else:
                    qid_to_cluster = {qid: 0 for qid in qids}
            finally:
                loop.close()
        else:
            logger.info("AI tagging skipped (skip_ai=True)")
            qid_to_cluster = {qid: 0 for qid in qids}

        # F6 — similarity network
        try:
            cross_figures["F6"] = fig_to_png_bytes(
                fig_cross.similarity_network(
                    qids, sim, bundle.questions,
                    threshold=similarity_threshold, style=style,
                )
            )
        except Exception:
            logger.exception("F6 failed")

        # F7 — theme dendrogram
        if not skip_ai and theme_clusters:
            try:
                cross_figures["F7"] = fig_to_png_bytes(
                    fig_cross.theme_dendrogram(
                        qids, sim, theme_clusters,
                        [qid_to_cluster.get(q, 0) for q in qids],
                        bundle.questions, style=style,
                    )
                )
            except Exception:
                logger.exception("F7 failed")

        # F8 — pillar coverage
        if pillar_tags_df is not None and not pillar_tags_df.empty:
            try:
                cross_figures["F8"] = fig_to_png_bytes(
                    fig_cross.pillar_coverage(
                        pillar_tags_df, bundle.questions, style=style,
                    )
                )
            except Exception:
                logger.exception("F8 failed")

        # F9 — cross-cutting heatmap
        if cross_cutting_tags_df is not None:
            try:
                cross_figures["F9"] = fig_to_png_bytes(
                    fig_cross.cross_cutting_heatmap(
                        cross_cutting_tags_df, bundle.questions,
                        tag_set=ai_tagging.CROSS_CUTTING_TAGS,
                        style=style,
                    )
                )
            except Exception:
                logger.exception("F9 failed")

    logger.info("Rendering DOCX")
    return render(
        bundle=bundle,
        q_stats=q_stats,
        wg_summary=wg_summary,
        overall=overall,
        per_wg_figures=per_wg_figures,
        cross_figures=cross_figures,
        pillar_tags=pillar_tags_df,
        cross_cutting_tags=cross_cutting_tags_df,
        theme_clusters=theme_clusters,
        similarity_data=similarity_data,
        output_path=output_path,
    )
