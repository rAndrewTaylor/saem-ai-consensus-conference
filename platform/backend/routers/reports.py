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
    # --- Cross-WG enrichment (drives the interactive figures) ----------
    cross = _build_cross_wg_payload(db, bundle, qs)

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
        **cross,
    })


def _build_cross_wg_payload(db, bundle, qs) -> dict:
    """Compute everything the client needs for D.1–D.5: similarity
    network (with pre-computed node positions), theme clusters, pillar
    matrix, cross-cutting matrix, and the D.2 overlap pairs table.

    All pieces use cached embeddings + Opus tags from disk; nothing new
    runs unless those caches are missing.
    """
    if bundle.questions.empty:
        return {"network": None, "themes": [], "pillar_matrix": [],
                "cross_cutting_matrix": [], "overlap_pairs": []}

    from ..services.round1_report import ai_tagging, embeddings
    import asyncio
    import numpy as np

    embs = embeddings.embed_questions(bundle.questions)
    qids, sim = embeddings.cosine_similarity_matrix(embs)

    loop = asyncio.new_event_loop()
    try:
        pillar_tags = loop.run_until_complete(
            ai_tagging.tag_all_pillars(bundle.questions)
        )
        cc_tags = loop.run_until_complete(
            ai_tagging.tag_all_cross_cutting(bundle.questions)
        )
    finally:
        loop.close()

    # --- Theme clusters (size + WG composition + Opus label) ---
    from scipy.cluster.hierarchy import fcluster, linkage
    from scipy.spatial.distance import squareform

    qmap = bundle.questions.set_index("question_id")
    qstats_map = qs.set_index("question_id") if not qs.empty else qs

    themes_payload: list[dict] = []
    qid_to_cluster: dict[int, int] = {}
    if len(qids) >= 3:
        dist = 1.0 - sim
        np.fill_diagonal(dist, 0.0)
        dist = (dist + dist.T) / 2
        np.clip(dist, 0.0, None, out=dist)
        Z = linkage(squareform(dist, checks=False), method="ward")
        ca = fcluster(Z, t=10, criterion="maxclust")
        groups: dict[int, list[str]] = {}
        for qid, c in zip(qids, ca):
            groups.setdefault(int(c), []).append(qmap.loc[qid, "text"])
        order = sorted(groups.keys())
        cluster_texts = [groups[c] for c in order]

        loop = asyncio.new_event_loop()
        try:
            theme_clusters = loop.run_until_complete(
                ai_tagging.label_themes(cluster_texts)
            )
        finally:
            loop.close()

        idx_map = {c: i for i, c in enumerate(order)}
        for qid, c in zip(qids, ca):
            qid_to_cluster[int(qid)] = idx_map[int(c)]

        # Compose payload entries with WG composition counts
        for i, c in enumerate(order):
            wg_counts: dict[int, int] = {}
            qids_in_cluster: list[int] = []
            for qid, cc in zip(qids, ca):
                if int(cc) == c:
                    wg = int(qmap.loc[qid, "wg_id"])
                    wg_counts[wg] = wg_counts.get(wg, 0) + 1
                    qids_in_cluster.append(int(qid))
            themes_payload.append({
                "index": i,
                "label": (theme_clusters[i].get("label") if i < len(theme_clusters) else None) or f"Cluster {i+1}",
                "description": (theme_clusters[i].get("description") if i < len(theme_clusters) else "") or "",
                "size": sum(wg_counts.values()),
                "wg_counts": wg_counts,
                "question_ids": qids_in_cluster,
            })
        themes_payload.sort(key=lambda t: -t["size"])

    # --- Pillar matrix (4 × 5) ---
    pillars_order = ["Technology", "Training", "Self", "Society"]
    # Carry question_id through so we can build per-cell question lists.
    pillar_rows = []
    for tag_row in pillar_tags.itertuples(index=False):
        qid = int(tag_row.question_id)
        if qid not in qmap.index:
            continue
        wg = int(qmap.loc[qid, "wg_id"])
        pillar_rows.append({
            "qid": qid,
            "wg": wg,
            "primary": tag_row.primary,
            "secondary": tag_row.secondary,
            "cross_cutting": bool(tag_row.cross_cutting),
        })
    pillar_matrix: list[dict] = []
    for p in pillars_order:
        wg_counts: dict[int, int] = {}
        cross_counts: dict[int, int] = {}
        wg_qids: dict[int, list[int]] = {}
        for r in pillar_rows:
            if r["primary"] == p:
                wg_counts[r["wg"]] = wg_counts.get(r["wg"], 0) + 1
                wg_qids.setdefault(r["wg"], []).append(r["qid"])
                if r["cross_cutting"]:
                    cross_counts[r["wg"]] = cross_counts.get(r["wg"], 0) + 1
        pillar_matrix.append({
            "pillar": p,
            "wg_counts": wg_counts,
            "cross_cutting_counts": cross_counts,
            "wg_question_ids": wg_qids,
        })

    # --- Cross-cutting matrix (10 × 5) ---
    cc_rows = []
    for tag_row in cc_tags.itertuples(index=False):
        qid = int(tag_row.question_id)
        if qid not in qmap.index:
            continue
        wg = int(qmap.loc[qid, "wg_id"])
        for tag in (tag_row.tags or []):
            cc_rows.append({"qid": qid, "wg": wg, "tag": tag})
    cross_cutting_matrix: list[dict] = []
    for tag in ai_tagging.CROSS_CUTTING_TAGS:
        wg_counts: dict[int, int] = {}
        wg_qids: dict[int, list[int]] = {}
        for r in cc_rows:
            if r["tag"] == tag:
                wg_counts[r["wg"]] = wg_counts.get(r["wg"], 0) + 1
                wg_qids.setdefault(r["wg"], []).append(r["qid"])
        cross_cutting_matrix.append({
            "tag": tag,
            "wg_counts": wg_counts,
            "wg_question_ids": wg_qids,
        })

    # --- Network (nodes with pre-computed positions + edges) ---
    network = _build_network_payload(qids, sim, qmap, qstats_map, qid_to_cluster)

    # --- D.2 cross-WG overlap pairs (top-25) ---
    overlap_pairs: list[dict] = []
    for i in range(len(qids)):
        for j in range(i + 1, len(qids)):
            s = float(sim[i, j])
            if s < 0.55:
                continue
            qa, qb = qids[i], qids[j]
            wg_a = int(qmap.loc[qa, "wg_id"])
            wg_b = int(qmap.loc[qb, "wg_id"])
            if wg_a == wg_b:
                continue
            overlap_pairs.append({
                "qid_a": qa, "qid_b": qb,
                "wg_a": wg_a, "wg_b": wg_b,
                "text_a": qmap.loc[qa, "text"],
                "text_b": qmap.loc[qb, "text"],
                "similarity": round(s, 3),
            })
    overlap_pairs.sort(key=lambda p: -p["similarity"])
    overlap_pairs = overlap_pairs[:50]  # send 50; UI can paginate

    # --- AI key-findings summaries (cached) -----------------------------
    # Compact payloads — Opus only needs aggregates, not every question.
    network_summary_payload = {
        "n_nodes": len(network["nodes"]) if network else 0,
        "n_edges": len(network["edges"]) if network else 0,
        "n_cross_wg_edges": sum(1 for e in (network["edges"] or []) if e["cross_wg"])
            if network else 0,
        "n_unconnected_dropped": (network or {}).get("n_dropped_unconnected", 0),
        "top_hubs": [
            {"qid": n["id"], "wg": n["wg"], "degree": n["degree"],
             "short_text": n["short_text"][:120]}
            for n in (network["nodes"] if network else [])[:10]
        ],
        "top_overlap_pairs": [
            {"wg_a": p["wg_a"], "wg_b": p["wg_b"],
             "sim": p["similarity"],
             "short_a": p["text_a"][:120],
             "short_b": p["text_b"][:120]}
            for p in overlap_pairs[:8]
        ],
    }
    pillar_summary_payload = {
        "pillars": [
            {"pillar": p["pillar"], "wg_counts": p["wg_counts"],
             "cross_cutting_counts": p["cross_cutting_counts"]}
            for p in pillar_matrix
        ],
    }
    cc_summary_payload = {
        "topics": [
            {"tag": t["tag"], "wg_counts": t["wg_counts"]}
            for t in cross_cutting_matrix
        ],
    }

    loop = asyncio.new_event_loop()
    try:
        d1_summary = loop.run_until_complete(
            ai_tagging.summarize_findings("d1_network", network_summary_payload)
        )
        d4_summary = loop.run_until_complete(
            ai_tagging.summarize_findings("d4_pillars", pillar_summary_payload)
        )
        d5_summary = loop.run_until_complete(
            ai_tagging.summarize_findings("d5_cross_cutting", cc_summary_payload)
        )
    finally:
        loop.close()

    return {
        "network": network,
        "themes": themes_payload,
        "pillar_matrix": pillar_matrix,
        "cross_cutting_matrix": cross_cutting_matrix,
        "overlap_pairs": overlap_pairs,
        "summaries": {
            "d1_network": d1_summary,
            "d4_pillars": d4_summary,
            "d5_cross_cutting": d5_summary,
        },
    }


def _build_network_payload(qids, sim, qmap, qstats_map, qid_to_cluster) -> dict:
    """Use networkx + Kamada-Kawai (computed server-side) to produce
    {nodes, edges} the client renders as plain SVG. Avoids shipping
    d3-force / cytoscape on every page load."""
    import networkx as nx
    import numpy as np

    threshold = 0.62
    G = nx.Graph()
    for qid in qids:
        if qid not in qmap.index:
            continue
        wg = int(qmap.loc[qid, "wg_id"])
        imp = qmap.loc[qid, "r1_importance_mean"]
        G.add_node(qid, wg=wg,
                    importance=(float(imp) if imp is not None and not (isinstance(imp, float) and np.isnan(imp)) else 5.0))

    n = len(qids)
    for i in range(n):
        for j in range(i + 1, n):
            s = float(sim[i, j])
            if s >= threshold:
                G.add_edge(qids[i], qids[j], weight=s)

    isolated = [n for n, d in G.degree() if d == 0]
    G.remove_nodes_from(isolated)

    if G.number_of_nodes() == 0:
        return {"nodes": [], "edges": [], "threshold": threshold,
                "n_dropped_unconnected": len(isolated)}

    try:
        pos = nx.kamada_kawai_layout(G)
    except Exception:
        pos = nx.spring_layout(G, seed=42, iterations=200)

    # Normalize positions to a 0-1000 viewbox and round to 1 decimal
    xs = [p[0] for p in pos.values()]
    ys = [p[1] for p in pos.values()]
    minx, maxx = min(xs), max(xs)
    miny, maxy = min(ys), max(ys)
    span_x = maxx - minx or 1
    span_y = maxy - miny or 1

    nodes: list[dict] = []
    for node in G.nodes:
        x, y = pos[node]
        text = qmap.loc[node, "text"] if node in qmap.index else ""
        short = qmap.loc[node, "short_text"] if node in qmap.index else ""
        importance = G.nodes[node]["importance"]
        nodes.append({
            "id": int(node),
            "wg": G.nodes[node]["wg"],
            "importance": importance,
            "degree": int(G.degree[node]),
            "cluster": qid_to_cluster.get(int(node)),
            "x": round((x - minx) / span_x * 1000, 1),
            "y": round((y - miny) / span_y * 1000, 1),
            "short_text": (short or text[:140]).replace("\n", " "),
        })
    nodes.sort(key=lambda n: -n["degree"])

    edges = []
    for u, v, d in G.edges(data=True):
        wu = G.nodes[u]["wg"]; wv = G.nodes[v]["wg"]
        edges.append({
            "a": int(u), "b": int(v),
            "wg_a": wu, "wg_b": wv,
            "cross_wg": wu != wv,
            "sim": round(float(d["weight"]), 3),
        })

    return {
        "nodes": nodes,
        "edges": edges,
        "threshold": threshold,
        "n_dropped_unconnected": len(isolated),
        "viewbox": {"x": 0, "y": 0, "w": 1000, "h": 1000},
    }


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


# ----- /round2/data — JSON bundle for the R2 report page ----------------

@router.get("/round2/data")
def round2_data(
    db: Session = Depends(get_db),
    auth: dict = Depends(_signed_in),
):
    """Aggregated stats for the Round 2 report.

    Lighter than R1 — no embeddings or clustering. Drives a single-page
    React view that highlights what survived R2 deliberation, the
    largest R1→R2 shifts, and the pairwise leaderboard.
    """
    from ..services.round2_report.stats import (
        overall_summary, per_wg_summary, per_question_rows,
        top_shifts, pairwise_leaders,
    )

    overall = overall_summary(db)
    wgs = per_wg_summary(db)
    questions = per_question_rows(db)
    shifts = top_shifts(questions, n=10)
    pair_top = pairwise_leaders(questions, n=10)

    write_audit_log(
        db, user_email=auth["subject"], action="report_round2_data",
        detail=f"Round 2 data bundle (admin={auth['is_admin']})",
    )

    import math
    def _scrub(obj):
        if isinstance(obj, dict):
            return {k: _scrub(v) for k, v in obj.items()}
        if isinstance(obj, list):
            return [_scrub(x) for x in obj]
        if isinstance(obj, float) and (math.isnan(obj) or math.isinf(obj)):
            return None
        if hasattr(obj, "isoformat"):
            try:
                return obj.isoformat()
            except Exception:
                return str(obj)
        return obj

    return _scrub({
        "is_admin": auth["is_admin"],
        "viewer_wg_id": auth.get("wg_id"),
        "overall": overall,
        "working_groups": wgs,
        "questions": questions,
        "top_shifts": shifts,
        "pairwise_leaders": pair_top,
    })
