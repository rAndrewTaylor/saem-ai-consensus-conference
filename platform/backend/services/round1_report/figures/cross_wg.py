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
    wrap_label,
)


# --- F6 — Cross-WG question similarity network --------------------------


def similarity_network(
    qids: list[int],
    sim_matrix: "np.ndarray",
    questions: pd.DataFrame,
    *,
    threshold: float = 0.55,
    only_connected: bool = True,
    label_top_n_hubs: int = 10,
    style: str = "print",
    width: Optional[float] = None,
) -> plt.Figure:
    """Force-directed graph of question similarity. Cross-WG edges in red,
    within-WG in faint gray.

    `only_connected=True` drops nodes with zero edges so the visualisation
    isn't dominated by a starburst of orphans (the previous version's
    main flaw). `label_top_n_hubs` annotates the most-connected questions
    with their Q-id so the reader can pick out cross-WG bridges.
    """
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

    if only_connected:
        isolated = [n for n, d in G.degree() if d == 0]
        G.remove_nodes_from(isolated)

    if G.number_of_nodes() == 0:
        with style_context(style):
            fig, ax = plt.subplots(figsize=(default_width(style, "double"), 4))
            ax.text(0.5, 0.5, "No edges above similarity threshold", ha="center",
                    va="center", transform=ax.transAxes, color="#6B7280")
            ax.set_axis_off()
            return fig

    # Stronger layout: Kamada-Kawai gives more uniform spacing than
    # spring for small connected networks; fall back to spring if KK fails.
    try:
        pos = nx.kamada_kawai_layout(G)
    except Exception:
        pos = nx.spring_layout(G, seed=42, k=2.4 / np.sqrt(max(1, G.number_of_nodes())),
                                iterations=200)

    w = width or default_width(style, "double")
    # Bigger canvas so a 100+ node graph isn't visually compressed.
    fig_w = w * 1.4
    fig_h = w * 0.95

    with style_context(style):
        fig, ax = plt.subplots(figsize=(fig_w, fig_h))

        same_wg, cross_wg = [], []
        for u, v, d in G.edges(data=True):
            same = G.nodes[u]["wg"] == G.nodes[v]["wg"]
            (same_wg if same else cross_wg).append((u, v, d["weight"]))

        # Within-WG edges: very faint so they recede into the background.
        for u, v, w_ in same_wg:
            x0, y0 = pos[u]; x1, y1 = pos[v]
            ax.plot([x0, x1], [y0, y1], color="#D1D5DB",
                    lw=0.3, alpha=0.35, zorder=1)
        # Cross-WG edges: full attention.
        for u, v, w_ in cross_wg:
            x0, y0 = pos[u]; x1, y1 = pos[v]
            ax.plot([x0, x1], [y0, y1], color="#EF4444",
                    lw=0.7 + (w_ - threshold) * 5, alpha=0.55, zorder=2)

        # Nodes
        for node, (x, y) in pos.items():
            wg = G.nodes[node]["wg"]
            imp = G.nodes[node]["importance"] or 5.0
            color = WG_COLORS.get(wg, "#6B7280")
            size = 35 + max(0, imp - 4) ** 2 * 18
            ax.scatter([x], [y], s=size, color=color,
                       edgecolors="white", linewidths=0.7, zorder=3)

        # Label the highest-degree nodes (hubs) with Q-id only
        if label_top_n_hubs and G.number_of_nodes() > 0:
            degrees = dict(G.degree())
            hubs = sorted(degrees, key=degrees.get, reverse=True)[:label_top_n_hubs]
            for node in hubs:
                x, y = pos[node]
                ax.text(x, y, f"Q{int(node)}", fontsize=7, color="#111827",
                        ha="center", va="center", zorder=4,
                        bbox=dict(facecolor="white", edgecolor="none",
                                  boxstyle="round,pad=0.18", alpha=0.85))

        from matplotlib.lines import Line2D
        legend_handles = [
            Line2D([0], [0], marker="o", color="white",
                   markerfacecolor=c, markersize=8, label=f"WG{wg}")
            for wg, c in WG_COLORS.items()
        ] + [
            Line2D([0], [0], color="#9CA3AF", lw=1.5, label="within-WG edge"),
            Line2D([0], [0], color="#EF4444", lw=1.5, label="cross-WG edge"),
        ]
        ax.legend(handles=legend_handles, loc="lower right",
                  fontsize=7.5, frameon=False)

        ax.set_axis_off()
        n_dropped = n - G.number_of_nodes()
        ax.set_title(
            f"Question similarity network "
            f"(cosine ≥ {threshold:.2f}; {len(G.edges())} edges, "
            f"{len(cross_wg)} cross-WG, {n_dropped} unconnected hidden)",
            pad=8, loc="left",
        )
        fig.tight_layout()
        return fig


# --- F7 — Theme cluster bars (REPLACES the unusable dendrogram) ---------


def theme_clusters_bars(
    qids: list[int],
    cluster_assignments: list[int],
    cluster_labels: list[dict],
    questions: pd.DataFrame,
    *,
    style: str = "print",
    width: Optional[float] = None,
) -> plt.Figure:
    """Horizontal stacked bars — one per cluster — showing cluster size
    and the WG composition. Each bar is labeled with the Opus theme
    name. This replaces the broken leaf-by-question dendrogram.

    `cluster_assignments` is parallel to `qids` and gives the cluster
    index (0-based) for each question.
    """
    if not qids or not cluster_labels:
        with style_context(style):
            fig, ax = plt.subplots(figsize=(default_width(style, "double"), 3))
            ax.text(0.5, 0.5, "No clusters to plot", ha="center", va="center",
                    transform=ax.transAxes, color="#6B7280")
            ax.set_axis_off()
            return fig

    qmap = questions.set_index("question_id")

    # Build cluster -> WG -> count
    by_cluster: dict[int, dict[int, int]] = {}
    for qid, c in zip(qids, cluster_assignments):
        if qid not in qmap.index:
            continue
        wg = int(qmap.loc[qid, "wg_id"])
        by_cluster.setdefault(int(c), {}).setdefault(wg, 0)
        by_cluster[int(c)][wg] += 1

    # Sort clusters by total size descending
    rows = sorted(
        by_cluster.items(),
        key=lambda kv: -sum(kv[1].values()),
    )

    n = len(rows)
    h = max(3.5, 0.85 * n + 1.2)
    w = width or default_width(style, "double")

    with style_context(style):
        fig, ax = plt.subplots(figsize=(w, h))
        wg_ids_sorted = sorted({wg for _, d in rows for wg in d.keys()})
        y = np.arange(n)

        # Stacked bar across WGs per cluster
        left = np.zeros(n)
        for wg in wg_ids_sorted:
            counts = np.array([row[1].get(wg, 0) for row in rows])
            ax.barh(
                y, counts, left=left,
                color=WG_COLORS.get(wg, "#9CA3AF"),
                edgecolor="white", linewidth=0.5,
                label=f"WG{wg}",
            )
            left += counts

        # Theme label as the y-tick (use Opus label, fall back to "Cluster N")
        labels = []
        for c_idx, _ in rows:
            lab = (cluster_labels[c_idx].get("label")
                   if c_idx < len(cluster_labels) else None) or f"Cluster {c_idx + 1}"
            wrapped = wrap_label(lab, width=42, max_lines=2)
            labels.append(wrapped)
        ax.set_yticks(y)
        ax.set_yticklabels(labels, fontsize=8.5)

        # Annotate the total size at the right edge
        for yi, ((_, by_wg)) in enumerate(rows):
            total = sum(by_wg.values())
            ax.text(left[yi] + 0.4, yi, f"{total}", va="center",
                    fontsize=8, color="#374151")

        ax.set_xlabel("Number of questions (stacked by working group)")
        ax.set_title("Thematic clusters across the agenda (Opus-labeled)",
                     pad=22, loc="left")
        ax.invert_yaxis()
        ax.legend(loc="lower right", bbox_to_anchor=(1.0, 1.01), ncol=len(wg_ids_sorted),
                  fontsize=7.5, frameon=False)
        ax.grid(axis="y", visible=False)
        ax.spines["left"].set_visible(False)
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
    pillars = ["Technology", "Training", "Self", "Society"]
    qmap = questions.set_index("question_id")
    rows: list[dict] = []
    for _, t in pillar_tags.iterrows():
        qid = int(t["question_id"])
        if qid not in qmap.index:
            continue
        wg = int(qmap.loc[qid, "wg_id"])
        rows.append({"wg_id": wg, "pillar": t.get("primary"),
                     "cross_cutting": bool(t.get("cross_cutting"))})
    df = pd.DataFrame(rows)
    if df.empty:
        with style_context(style):
            fig, ax = plt.subplots(figsize=(default_width(style, "double"), 3))
            ax.text(0.5, 0.5, "No pillar tags yet", ha="center", va="center",
                    transform=ax.transAxes, color="#6B7280")
            ax.set_axis_off()
            return fig

    wg_ids = sorted(df["wg_id"].unique())
    counts = pd.crosstab(df["pillar"], df["wg_id"]).reindex(
        index=pillars, columns=wg_ids).fillna(0).astype(int)
    cross_counts = pd.crosstab(
        df[df["cross_cutting"]]["pillar"],
        df[df["cross_cutting"]]["wg_id"]
    ).reindex(index=pillars, columns=wg_ids).fillna(0).astype(int)

    w = width or default_width(style, "single")
    with style_context(style):
        fig, ax = plt.subplots(figsize=(w * 1.05, w * 0.78))
        im = ax.imshow(counts.values, cmap="Blues", aspect="auto")
        for i, p in enumerate(pillars):
            for j, wg in enumerate(wg_ids):
                v = counts.iloc[i, j]
                cv = cross_counts.iloc[i, j]
                txt = str(v)
                if cv:
                    txt += f"\n({cv}×)"
                color = "white" if v >= counts.values.max() * 0.55 else "#111827"
                ax.text(j, i, txt, ha="center", va="center",
                        fontsize=8.5, color=color)
        ax.set_xticks(range(len(wg_ids)))
        ax.set_xticklabels([f"WG{w_}" for w_ in wg_ids])
        ax.set_yticks(range(len(pillars)))
        ax.set_yticklabels(pillars)
        for tl, p in zip(ax.get_yticklabels(), pillars):
            tl.set_color(PILLAR_COLORS.get(p, "#111827"))
            tl.set_fontweight("bold")
        ax.set_title("Pillar coverage by working group\n(× = cross-cutting questions)",
                     pad=8, loc="left")
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
        counts = pd.crosstab(df["tag"], df["wg_id"]).reindex(
            index=tag_set, columns=wg_ids).fillna(0).astype(int)

    w = width or default_width(style, "double")
    h = max(3.0, 0.42 * len(tag_set) + 0.9)
    with style_context(style):
        fig, ax = plt.subplots(figsize=(w, h))
        im = ax.imshow(counts.values, cmap="OrRd", aspect="auto")
        for i in range(len(counts)):
            for j in range(len(wg_ids)):
                v = int(counts.iloc[i, j])
                color = "white" if v >= counts.values.max() * 0.55 else "#111827"
                ax.text(j, i, str(v), ha="center", va="center",
                        fontsize=8.5, color=color)
        ax.set_xticks(range(len(wg_ids)))
        ax.set_xticklabels([f"WG{w_}" for w_ in wg_ids])
        ax.set_yticks(range(len(counts)))
        ax.set_yticklabels(counts.index, fontsize=8.5)
        ax.set_title("Cross-cutting topic distribution by working group",
                     pad=8, loc="left")
        fig.colorbar(im, ax=ax, fraction=0.03, label="Question count")
        fig.tight_layout()
        return fig
