"""Per-WG figures (F1–F4) for the Round 1 report.

Each function takes pre-aggregated data (no DB / no AI) and returns a
matplotlib Figure. Callers do `fig_to_png_bytes(fig)` to embed it.

Conventions:
- All functions accept `style` ('screen' or 'print') and `width` (inches).
- Question labels are short_text if present, else first 60 chars of text.
- Sort orders are deterministic so re-runs produce identical figures.
"""

from __future__ import annotations

from typing import Optional

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from .style import (
    BUCKET_COLORS,
    DISPOSITION_COLORS,
    default_width,
    style_context,
)


def _label(row: pd.Series, max_chars: int = 60) -> str:
    txt = (row.get("short_text") or "").strip() or row.get("text", "")
    txt = txt.replace("\n", " ").strip()
    if len(txt) > max_chars:
        txt = txt[: max_chars - 1].rstrip() + "…"
    return f"Q{int(row['question_id'])}: {txt}"


def disposition_bar(
    q_stats: pd.DataFrame,
    *,
    wg_number: int,
    style: str = "print",
    width: Optional[float] = None,
) -> plt.Figure:
    """F1 — Stacked horizontal bar of disposition % per question.

    Sorted by include% descending so the most-supported questions are at
    the top. Bar width = include + modify + exclude (always 100% by
    construction); the n_responses value is annotated on the right edge.
    """
    df = q_stats[q_stats["wg_id"].notna()].copy()
    df = df.sort_values("include_pct", ascending=True)  # ascending so highest is at top
    n = len(df)
    h = max(2.5, 0.32 * n + 0.6)  # dynamic height
    w = width or default_width(style, "double")

    with style_context(style):
        fig, ax = plt.subplots(figsize=(w, h))
        labels = [_label(r) for _, r in df.iterrows()]
        y = range(n)
        inc = df["include_pct"].fillna(0).values
        mod = df["modify_pct"].fillna(0).values
        exc = df["exclude_pct"].fillna(0).values

        ax.barh(y, inc, color=DISPOSITION_COLORS["include"], label="Include")
        ax.barh(y, mod, left=inc, color=DISPOSITION_COLORS["include_with_modifications"], label="Modify")
        ax.barh(y, exc, left=inc + mod, color=DISPOSITION_COLORS["exclude"], label="Exclude")

        # Annotate n on the right
        for yi, n_resp in zip(y, df["n_responses"].fillna(0).astype(int).values):
            ax.text(101, yi, f"n={n_resp}", va="center", fontsize=7, color="#6B7280")

        ax.set_yticks(list(y))
        ax.set_yticklabels(labels, fontsize=7)
        ax.set_xlim(0, 110)
        ax.set_xticks([0, 25, 50, 75, 100])
        ax.set_xticklabels(["0%", "25%", "50%", "75%", "100%"])
        ax.set_xlabel("Round 1 disposition")
        ax.set_title(f"WG{wg_number}: Round 1 disposition by question")
        ax.axvline(80, ls="--", lw=0.7, color="#10B981", alpha=0.5)
        ax.legend(loc="lower right", ncol=3, bbox_to_anchor=(1.0, 1.0))
        ax.grid(axis="y", visible=False)
        fig.tight_layout()
        return fig


def importance_strip(
    q_stats: pd.DataFrame,
    delphi_r1: pd.DataFrame,
    *,
    wg_number: int,
    style: str = "print",
    width: Optional[float] = None,
) -> plt.Figure:
    """F2 — Strip plot of all 1-9 importance votes per question, sorted
    by mean importance descending. Mean line + IQR band overlaid.
    """
    qs = q_stats[q_stats["wg_id"].notna()].copy()
    qs = qs.sort_values("importance_mean", ascending=True, na_position="first")
    n = len(qs)
    h = max(2.5, 0.30 * n + 0.6)
    w = width or default_width(style, "double")

    with style_context(style):
        fig, ax = plt.subplots(figsize=(w, h))
        labels = [_label(r) for _, r in qs.iterrows()]

        for yi, (_, row) in enumerate(qs.iterrows()):
            qid = int(row["question_id"])
            votes = (
                delphi_r1[delphi_r1["question_id"] == qid]["importance"]
                .dropna()
                .astype(float)
                .values
            )
            if len(votes) == 0:
                continue
            # Add small jitter for visibility
            import numpy as np
            jitter = np.random.RandomState(qid).uniform(-0.15, 0.15, size=len(votes))
            ax.scatter(votes, [yi + j for j in jitter], s=22, color="#3B82F6",
                       alpha=0.55, edgecolors="white", linewidths=0.4)
            # IQR band
            iqr_lo = row.get("importance_iqr_low")
            iqr_hi = row.get("importance_iqr_high")
            mean = row.get("importance_mean")
            if iqr_lo is not None and iqr_hi is not None:
                ax.hlines(yi, iqr_lo, iqr_hi, color="#1F2937", lw=2, alpha=0.7)
            if mean is not None:
                ax.scatter([mean], [yi], color="#111827", marker="D", s=22, zorder=3)

        ax.set_yticks(list(range(n)))
        ax.set_yticklabels(labels, fontsize=7)
        ax.set_xlim(0.5, 9.5)
        ax.set_xticks(list(range(1, 10)))
        ax.set_xlabel("Importance (1=Not important · 9=Critically important)")
        ax.set_title(f"WG{wg_number}: Round 1 importance ratings")
        ax.axvline(7, ls="--", lw=0.7, color="#10B981", alpha=0.4)
        ax.grid(axis="y", visible=False)
        fig.tight_layout()
        return fig


def pairwise_leaderboard(
    q_stats: pd.DataFrame,
    *,
    wg_number: int,
    low_confidence: bool = False,
    style: str = "print",
    width: Optional[float] = None,
) -> plt.Figure:
    """F3 — Pairwise score (Bradley-Terry) per question with 95% Wilson CIs.

    `low_confidence=True` adds an explicit warning banner at the top
    (used for WG2 today). Bars sorted by score descending.
    """
    qs = q_stats.copy()
    qs = qs[qs["pairwise_score"].notna()]
    qs = qs.sort_values("pairwise_score", ascending=True)
    n = len(qs)
    h = max(2.5, 0.30 * n + 0.7)
    w = width or default_width(style, "double")

    with style_context(style):
        fig, ax = plt.subplots(figsize=(w, h))
        labels = [_label(r) for _, r in qs.iterrows()]
        y = list(range(n))
        scores = qs["pairwise_score"].values
        lo = qs["pairwise_score_ci_low"].values
        hi = qs["pairwise_score_ci_high"].values
        # Color by bucket
        colors = [BUCKET_COLORS.get(b, "#6B7280") for b in qs["bucket"].values]

        ax.barh(y, scores, color=colors, alpha=0.85)
        # Error bars (CI)
        for yi, sc, l, h_ in zip(y, scores, lo, hi):
            if l is None or pd.isna(l):
                continue
            ax.hlines(yi, l, h_, color="#374151", lw=0.9, alpha=0.7)

        ax.set_yticks(y)
        ax.set_yticklabels(labels, fontsize=7)
        ax.set_xlim(0, 100)
        ax.set_xticks([0, 25, 50, 75, 100])
        ax.set_xticklabels(["0", "25", "50", "75", "100"])
        ax.set_xlabel("Pairwise score (Bradley-Terry, 0–100)")
        title = f"WG{wg_number}: Pairwise priority ranking"
        if low_confidence:
            title += " — LOW CONFIDENCE (thin pairwise data)"
        ax.set_title(title)
        ax.axvline(50, ls=":", lw=0.6, color="#9CA3AF")
        ax.grid(axis="y", visible=False)
        fig.tight_layout()
        return fig


def respondent_heatmap(
    delphi_r1: pd.DataFrame,
    questions: pd.DataFrame,
    *,
    wg_number: int,
    style: str = "print",
    width: Optional[float] = None,
) -> plt.Figure:
    """F5 — Per-respondent disposition heatmap.

    Rows = questions (sorted by include%). Columns = respondents,
    anonymized as P1, P2 ... in stable but non-identifying order.

    Locked decision: this figure is shown only to co-lead and admin
    tiers. Caller is responsible for tier gating; this just renders.
    """
    if questions.empty or delphi_r1.empty:
        with style_context(style):
            fig, ax = plt.subplots(figsize=(default_width(style, "double"), 2.5))
            ax.text(0.5, 0.5, "No respondent data", ha="center", va="center",
                    transform=ax.transAxes, color="#6B7280")
            ax.set_axis_off()
            return fig

    # Anonymize: stable order based on first response time, then label P1..PN
    first_seen = (
        delphi_r1.groupby("participant_id")["created_at"].min()
        .sort_values().reset_index()
    )
    pid_to_label = {int(pid): f"P{i+1}" for i, pid in enumerate(first_seen["participant_id"])}
    n_p = len(pid_to_label)

    # Sort questions by include% descending (most-supported on top)
    q_sorted = questions.sort_values("r1_include_pct", ascending=True, na_position="first")
    qids = [int(q) for q in q_sorted["question_id"]]
    pids_ordered = list(pid_to_label.keys())

    # Build matrix: 0 = no vote, 1 = exclude, 2 = modify, 3 = include
    code = {"exclude": 1, "include_with_modifications": 2, "include": 3}
    M = np.zeros((len(qids), n_p), dtype=int)
    for _, r in delphi_r1.iterrows():
        qid = int(r["question_id"])
        pid = int(r["participant_id"])
        if qid not in qids or pid not in pid_to_label:
            continue
        i = qids.index(qid)
        j = pids_ordered.index(pid)
        M[i, j] = code.get(r["disposition"], 0)

    h = max(3.0, 0.22 * len(qids) + 1.2)
    w = width or default_width(style, "double")
    with style_context(style):
        from matplotlib.colors import ListedColormap
        cmap = ListedColormap([
            "#F3F4F6",  # 0 — no vote
            "#EF4444",  # 1 — exclude
            "#F59E0B",  # 2 — modify
            "#10B981",  # 3 — include
        ])
        fig, ax = plt.subplots(figsize=(w, h))
        ax.imshow(M, aspect="auto", cmap=cmap, vmin=0, vmax=3)
        # Question labels on y
        labels = []
        for qid in qids:
            row = q_sorted[q_sorted["question_id"] == qid].iloc[0]
            short = (row.get("short_text") or row.get("text", "")).strip().replace("\n", " ")
            if len(short) > 50:
                short = short[:49] + "…"
            labels.append(f"Q{qid}: {short}")
        ax.set_yticks(range(len(qids)))
        ax.set_yticklabels(labels, fontsize=6)
        ax.set_xticks(range(n_p))
        ax.set_xticklabels([pid_to_label[p] for p in pids_ordered], fontsize=7)
        ax.set_title(f"WG{wg_number}: Per-respondent disposition (co-lead view only)")
        ax.set_xlabel("Respondent (anonymized)")
        # Legend
        from matplotlib.patches import Patch
        ax.legend(
            handles=[
                Patch(color="#10B981", label="Include"),
                Patch(color="#F59E0B", label="Modify"),
                Patch(color="#EF4444", label="Exclude"),
                Patch(color="#F3F4F6", label="No vote"),
            ],
            loc="upper right", bbox_to_anchor=(1.0, -0.05), ncol=4, fontsize=7,
        )
        ax.grid(visible=False)
        fig.tight_layout()
        return fig


def concordance_scatter(
    q_stats: pd.DataFrame,
    *,
    wg_number: int,
    spearman_rho: Optional[float] = None,
    spearman_p: Optional[float] = None,
    style: str = "print",
    width: Optional[float] = None,
) -> plt.Figure:
    """F4 — Scatter of Delphi importance mean (x) vs Pairwise score (y).

    Points coloured by consensus bucket. Outliers in either direction
    (high Delphi + low pairwise OR vice versa) are annotated with their
    Q-id so co-leads can spot disagreement between methods.
    """
    df = q_stats.dropna(subset=["importance_mean", "pairwise_score"]).copy()
    if df.empty:
        with style_context(style):
            fig, ax = plt.subplots(figsize=(width or default_width(style, "single"), 3.0))
            ax.text(0.5, 0.5, "No concordance data yet", ha="center", va="center",
                    transform=ax.transAxes, color="#6B7280")
            ax.set_axis_off()
            return fig

    w = width or default_width(style, "single")

    with style_context(style):
        fig, ax = plt.subplots(figsize=(w, w * 0.85))
        for bucket, sub in df.groupby("bucket"):
            ax.scatter(
                sub["importance_mean"], sub["pairwise_score"],
                color=BUCKET_COLORS.get(bucket, "#6B7280"),
                edgecolors="white", linewidths=0.5,
                s=42, alpha=0.85, label=bucket,
            )

        # Outlier annotation: rank both axes, flag if rank distance > 25%
        # of the WG's question count.
        if len(df) >= 4:
            df["_rank_imp"] = df["importance_mean"].rank()
            df["_rank_pw"] = df["pairwise_score"].rank()
            df["_diff"] = (df["_rank_imp"] - df["_rank_pw"]).abs()
            cutoff = max(2, len(df) * 0.25)
            for _, r in df[df["_diff"] >= cutoff].iterrows():
                ax.annotate(
                    f"Q{int(r['question_id'])}",
                    (r["importance_mean"], r["pairwise_score"]),
                    textcoords="offset points", xytext=(4, 4),
                    fontsize=7, color="#374151",
                )

        ax.set_xlabel("Delphi importance mean (1–9)")
        ax.set_ylabel("Pairwise score (0–100)")
        ax.set_xlim(1, 9)
        ax.set_ylim(0, 100)
        ax.axhline(50, ls=":", lw=0.5, color="#9CA3AF")
        ax.axvline(7, ls=":", lw=0.5, color="#9CA3AF")
        title = f"WG{wg_number}: Delphi vs pairwise concordance"
        if spearman_rho is not None:
            sig = "***" if (spearman_p or 1) < 0.001 else (
                "**" if (spearman_p or 1) < 0.01 else (
                "*" if (spearman_p or 1) < 0.05 else "")
            )
            title += f" — ρ={spearman_rho:.2f}{sig}"
        ax.set_title(title)
        ax.legend(loc="lower right", fontsize=7, title="Bucket", title_fontsize=7)
        fig.tight_layout()
        return fig
