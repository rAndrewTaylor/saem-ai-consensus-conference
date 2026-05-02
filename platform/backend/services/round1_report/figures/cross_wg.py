"""Cross-WG figures (F6–F9) for the Round 1 report.

Each function takes pre-computed inputs (no DB / no AI) and returns a
matplotlib Figure ready to embed.
"""

from __future__ import annotations

from typing import Optional

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from .style import (
    BUCKET_COLORS,
    PILLAR_COLORS,
    WG_COLORS,
    default_width,
    style_context,
)


# --- F6 — Cross-WG question similarity network --------------------------


def similarity_network(
    qids: list[int],
    sim_matrix: "np.ndarray",
    questions: pd.DataFrame,
    *,
    threshold: float = 0.55,
    style: str = "print",
    width: Optional[float] = None,
) -> plt.Figure:
    """Force-directed graph of question similarity. Cross-WG edges drawn
    in red and slightly thicker so they pop visually."""
    import networkx as nx

    if not qids:
        with style_context(style):
            fig, ax = plt.subplots(figsize=(default_width(style, "double"), 4))
            ax.text(0.5, 0.5, "No questions to plot", ha="center", va="center",
                    transform=ax.transAxes, color="#6B7280")
            ax.set_axis_off()
            return fig

    qmap = questions.set_index("question_id")
    G = nx.Graph()
    for qid in qids:
        if qid not in qmap.index:
            continue
        wg = int(qmap.loc[qid, "wg_id"])
        imp = qmap.loc[qid, "r1_importance_mean"]
        G.add_node(qid, wg=wg, importance=(float(imp) if pd.notna(imp) else 5.0))

    n = len(qids)
    for i in range(n):
        for j in range(i + 1, n):
            s = float(sim_matrix[i, j])
            if s >= threshold:
                G.add_edge(qids[i], qids[j], weight=s)

    pos = nx.spring_layout(G, seed=42, k=1.6 / np.sqrt(max(1, n)))

    w = width or default_width(style, "double")
    with style_context(style):
        fig, ax = plt.subplots(figsize=(w, w * 0.75))

        # Draw edges — within-WG faint gray, cross-WG bright red.
        same_wg, cross_wg = [], []
        for u, v, d in G.edges(data=True):
            same = G.nodes[u]["wg"] == G.nodes[v]["wg"]
            (same_wg if same else cross_wg).append((u, v, d["weight"]))

        for u, v, w_ in same_wg:
            x0, y0 = pos[u]
            x1, y1 = pos[v]
            ax.plot([x0, x1], [y0, y1], color="#9CA3AF",
                    lw=0.6 + (w_ - threshold) * 4, alpha=0.45, zorder=1)
        for u, v, w_ in cross_wg:
            x0, y0 = pos[u]
            x1, y1 = pos[v]
            ax.plot([x0, x1], [y0, y1], color="#EF4444",
                    lw=0.9 + (w_ - threshold) * 6, alpha=0.7, zorder=2)

        # Draw nodes
        for node, (x, y) in pos.items():
            wg = G.nodes[node]["wg"]
            imp = G.nodes[node]["importance"] or 5.0
            color = WG_COLORS.get(wg, "#6B7280")
            size = 25 + max(0, imp - 4) ** 2 * 14  # scale with importance
            ax.scatter([x], [y], s=size, color=color,
                       edgecolors="white", linewidths=0.6, zorder=3)

        # Legend
        from matplotlib.lines import Line2D
        legend_handles = [
            Line2D([0], [0], marker="o", color="white",
                   markerfacecolor=c, markersize=7, label=f"WG{wg}")
            for wg, c in WG_COLORS.items()
        ] + [
            Line2D([0], [0], color="#9CA3AF", lw=1.5, label="within-WG edge"),
            Line2D([0], [0], color="#EF4444", lw=1.5, label="cross-WG edge"),
        ]
        ax.legend(handles=legend_handles, loc="lower right", fontsize=7)

        ax.set_axis_off()
        n_cross = len(cross_wg)
        ax.set_title(
            f"Question similarity network "
            f"(cosine ≥ {threshold:.2f}; {len(G.edges())} edges, "
            f"{n_cross} cross-WG)"
        )
        fig.tight_layout()
        return fig


# --- F7 — Theme dendrogram ----------------------------------------------


def theme_dendrogram(
    qids: list[int],
    sim_matrix: "np.ndarray",
    cluster_labels: list[dict],
    cluster_assignments: list[int],
    questions: pd.DataFrame,
    *,
    style: str = "print",
    width: Optional[float] = None,
) -> plt.Figure:
    """Hierarchical clustering of all questions across WGs.

    `cluster_labels`: list of {label, description} dicts, one per cluster.
    `cluster_assignments`: list of cluster_idx, parallel to qids.
    """
    from scipy.cluster.hierarchy import linkage, dendrogram
    from scipy.spatial.distance import squareform

    if len(qids) < 3:
        with style_context(style):
            fig, ax = plt.subplots(figsize=(default_width(style, "double"), 3))
            ax.text(0.5, 0.5, "Need ≥3 questions for clustering",
                    ha="center", va="center", transform=ax.transAxes, color="#6B7280")
            ax.set_axis_off()
            return fig

    # Distance = 1 - cosine_similarity, force diagonal to 0
    dist = 1.0 - sim_matrix
    np.fill_diagonal(dist, 0.0)
    dist = (dist + dist.T) / 2  # ensure symmetry from float drift
    np.clip(dist, 0.0, None, out=dist)
    condensed = squareform(dist, checks=False)
    Z = linkage(condensed, method="ward")

    n_clusters = len(cluster_labels) or max(cluster_assignments) + 1
    h = max(4.5, 0.18 * len(qids) + 1)
    w = width or default_width(style, "double")

    with style_context(style):
        fig, ax = plt.subplots(figsize=(w, h))
        # Color by cluster idx
        cluster_idx_for_qid = dict(zip(qids, cluster_assignments))

        # Build leaf labels: short text + WG tag
        qmap = questions.set_index("question_id")
        labels = []
        for qid in qids:
            row = qmap.loc[qid] if qid in qmap.index else None
            if row is not None:
                wg = int(row["wg_id"])
                short = (row.get("short_text") or row.get("text", "")).strip()
                short = short.replace("\n", " ")
                if len(short) > 55:
                    short = short[:54] + "…"
                labels.append(f"WG{wg} · Q{qid}: {short}")
            else:
                labels.append(f"Q{qid}")

        from matplotlib.colors import to_hex
        cmap = plt.get_cmap("tab10")
        link_colors = {}

        dendrogram(
            Z,
            labels=labels,
            orientation="left",
            ax=ax,
            leaf_font_size=6,
            color_threshold=0,  # we'll color manually below if needed
            above_threshold_color="#9CA3AF",
        )
        ax.set_xlabel("Distance (1 - cosine similarity)")
        ax.set_title(f"Question clustering across all WGs ({n_clusters} thematic groups)")
        ax.tick_params(axis="x", labelsize=7)
        # Tighten the spines
        for s in ("top", "right"):
            ax.spines[s].set_visible(False)
        fig.tight_layout()
        return fig


# --- F8 — Pillar coverage matrix ----------------------------------------


def pillar_coverage(
    pillar_tags: pd.DataFrame,
    questions: pd.DataFrame,
    *,
    style: str = "print",
    width: Optional[float] = None,
) -> plt.Figure:
    """4 pillars × 5 WGs heatmap of question counts (by primary pillar).
    Cross-cutting questions are hatched on top of their primary cell."""
    pillars = ["Technology", "Training", "Self", "Society"]
    qmap = questions.set_index("question_id")
    rows: list[dict] = []
    for _, t in pillar_tags.iterrows():
        qid = int(t["question_id"])
        if qid not in qmap.index:
            continue
        wg = int(qmap.loc[qid, "wg_id"])
        rows.append({"wg_id": wg, "pillar": t.get("primary"), "cross_cutting": bool(t.get("cross_cutting"))})
    df = pd.DataFrame(rows)
    if df.empty:
        with style_context(style):
            fig, ax = plt.subplots(figsize=(default_width(style, "double"), 3))
            ax.text(0.5, 0.5, "No pillar tags yet", ha="center", va="center",
                    transform=ax.transAxes, color="#6B7280")
            ax.set_axis_off()
            return fig

    wg_ids = sorted(df["wg_id"].unique())
    counts = pd.crosstab(df["pillar"], df["wg_id"]).reindex(index=pillars, columns=wg_ids).fillna(0).astype(int)
    cross_counts = pd.crosstab(df[df["cross_cutting"]]["pillar"],
                               df[df["cross_cutting"]]["wg_id"]).reindex(
        index=pillars, columns=wg_ids).fillna(0).astype(int)

    w = width or default_width(style, "single")
    with style_context(style):
        fig, ax = plt.subplots(figsize=(w, w * 0.75))
        im = ax.imshow(counts.values, cmap="Blues", aspect="auto")
        for i, p in enumerate(pillars):
            for j, wg in enumerate(wg_ids):
                v = counts.iloc[i, j]
                cv = cross_counts.iloc[i, j]
                txt = str(v)
                if cv:
                    txt += f"\n({cv}×)"
                color = "white" if v >= counts.values.max() * 0.55 else "#111827"
                ax.text(j, i, txt, ha="center", va="center", fontsize=8, color=color)

        ax.set_xticks(range(len(wg_ids)))
        ax.set_xticklabels([f"WG{w_}" for w_ in wg_ids])
        ax.set_yticks(range(len(pillars)))
        ax.set_yticklabels(pillars)
        # Color the y-tick labels by pillar
        for tl, p in zip(ax.get_yticklabels(), pillars):
            tl.set_color(PILLAR_COLORS.get(p, "#111827"))
            tl.set_fontweight("bold")
        ax.set_title("Pillar coverage by working group\n(× = cross-cutting questions in that cell)")
        fig.colorbar(im, ax=ax, fraction=0.04, label="Question count")
        fig.tight_layout()
        return fig


# --- F9 — Cross-cutting topic heatmap -----------------------------------


def cross_cutting_heatmap(
    cross_cutting_tags: pd.DataFrame,
    questions: pd.DataFrame,
    *,
    tag_set: list[str],
    style: str = "print",
    width: Optional[float] = None,
) -> plt.Figure:
    """Tags × WGs heatmap of question counts."""
    qmap = questions.set_index("question_id")
    rows: list[dict] = []
    for _, t in cross_cutting_tags.iterrows():
        qid = int(t["question_id"])
        if qid not in qmap.index:
            continue
        wg = int(qmap.loc[qid, "wg_id"])
        for tag in t.get("tags") or []:
            rows.append({"wg_id": wg, "tag": tag})
    df = pd.DataFrame(rows)

    wg_ids = sorted(qmap["wg_id"].unique())
    if df.empty:
        counts = pd.DataFrame(0, index=tag_set, columns=wg_ids)
    else:
        counts = pd.crosstab(df["tag"], df["wg_id"]).reindex(index=tag_set, columns=wg_ids).fillna(0).astype(int)

    w = width or default_width(style, "double")
    h = max(3.0, 0.36 * len(tag_set) + 0.8)
    with style_context(style):
        fig, ax = plt.subplots(figsize=(w, h))
        im = ax.imshow(counts.values, cmap="OrRd", aspect="auto")
        for i in range(len(counts)):
            for j in range(len(wg_ids)):
                v = int(counts.iloc[i, j])
                color = "white" if v >= counts.values.max() * 0.55 else "#111827"
                ax.text(j, i, str(v), ha="center", va="center",
                        fontsize=8, color=color)
        ax.set_xticks(range(len(wg_ids)))
        ax.set_xticklabels([f"WG{w_}" for w_ in wg_ids])
        ax.set_yticks(range(len(counts)))
        ax.set_yticklabels(counts.index, fontsize=8)
        ax.set_title("Cross-cutting topic distribution by working group")
        fig.colorbar(im, ax=ax, fraction=0.03, label="Question count")
        fig.tight_layout()
        return fig
