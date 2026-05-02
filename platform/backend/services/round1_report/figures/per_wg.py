"""Per-WG figures (F1–F5) for the Round 1 report.

Each function takes pre-aggregated data (no DB / no AI) and returns a
matplotlib Figure. Callers do `fig_to_png_bytes(fig)` to embed it.

Conventions:
- All functions accept `style` ('screen' or 'print') and `width` (inches).
- Question labels are wrapped to two lines via style.question_label,
  never silently truncated.
- Sort orders are deterministic.
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
    question_label,
    style_context,
    wrap_label,
)


# Row height in inches (per question) for the long horizontal-bar figures.
ROW_HEIGHT = 0.42


def _q_label(row: pd.Series, *, width: int = 55) -> str:
    """Wrap a question label to 2 lines using its short_text / text."""
    txt = (row.get("short_text") or "").strip() or row.get("text", "")
    return question_label(int(row["question_id"]), txt, width=width, max_lines=2)


# --- F1 — Disposition stacked bar ---------------------------------------


def disposition_bar(
    q_stats: pd.DataFrame,
    *,
    wg_number: int,
    style: str = "print",
    width: Optional[float] = None,
) -> plt.Figure:
    df = q_stats[q_stats["wg_id"].notna()].copy()
    df = df.sort_values("include_pct", ascending=True)
    n = len(df)
    h = max(3.0, ROW_HEIGHT * n + 1.4)
    w = width or default_width(style, "double")

    with style_context(style):
        fig, ax = plt.subplots(figsize=(w, h))
        labels = [_q_label(r) for _, r in df.iterrows()]
        y = np.arange(n)
        inc = df["include_pct"].fillna(0).values
        mod = df["modify_pct"].fillna(0).values
        exc = df["exclude_pct"].fillna(0).values

        ax.barh(y, inc, color=DISPOSITION_COLORS["include"], label="Include",
                edgecolor="white", linewidth=0.4)
        ax.barh(y, mod, left=inc, color=DISPOSITION_COLORS["include_with_modifications"],
                label="Modify", edgecolor="white", linewidth=0.4)
        ax.barh(y, exc, left=inc + mod, color=DISPOSITION_COLORS["exclude"],
                label="Exclude", edgecolor="white", linewidth=0.4)

        # n annotations on the right of the bar
        for yi, n_resp in zip(y, df["n_responses"].fillna(0).astype(int).values):
            ax.text(102, yi, f"n={n_resp}", va="center", fontsize=7, color="#6B7280")

        ax.set_yticks(list(y))
        ax.set_yticklabels(labels, fontsize=7.5)
        ax.set_xlim(0, 112)
        ax.set_xticks([0, 25, 50, 75, 100])
        ax.set_xticklabels(["0%", "25%", "50%", "75%", "100%"])
        ax.set_xlabel("Round 1 disposition")
        fig.suptitle(f"WG{wg_number}: Round 1 disposition by question",
                      x=0.02, y=0.985, ha="left", fontsize=11,
                      fontweight="bold", color="#0C2340")
        # 80% threshold line
        ax.axvline(80, ls="--", lw=0.7, color=DISPOSITION_COLORS["include"], alpha=0.6)
        # Legend top-center above the plot
        ax.legend(loc="lower center", ncol=3, bbox_to_anchor=(0.5, 1.005),
                  fontsize=8, frameon=False)
        ax.grid(axis="y", visible=False)
        ax.invert_yaxis()  # most-supported on top
        # … but we sorted ascending so least-supported is at index 0, top.
        # Invert again so highest include% is at the top:
        ax.invert_yaxis()
        ax.spines["left"].set_visible(False)
        fig.tight_layout()
        return fig


# --- F2 — Importance distribution ---------------------------------------


def importance_strip(
    q_stats: pd.DataFrame,
    delphi_r1: pd.DataFrame,
    *,
    wg_number: int,
    style: str = "print",
    width: Optional[float] = None,
) -> plt.Figure:
    qs = q_stats[q_stats["wg_id"].notna()].copy()
    qs = qs.sort_values("importance_mean", ascending=True, na_position="first")
    n = len(qs)
    h = max(3.0, ROW_HEIGHT * n + 1.4)
    w = width or default_width(style, "double")

    with style_context(style):
        fig, ax = plt.subplots(figsize=(w, h))
        labels = [_q_label(r) for _, r in qs.iterrows()]

        # Background band where importance >=7 (the confirmed threshold)
        ax.axvspan(7, 9.5, color="#10B981", alpha=0.05, zorder=0)

        for yi, (_, row) in enumerate(qs.iterrows()):
            qid = int(row["question_id"])
            votes = (
                delphi_r1[delphi_r1["question_id"] == qid]["importance"]
                .dropna().astype(float).values
            )
            if len(votes):
                jitter = np.random.RandomState(qid).uniform(-0.18, 0.18, size=len(votes))
                ax.scatter(votes, [yi + j for j in jitter], s=22, color="#3B82F6",
                           alpha=0.55, edgecolors="white", linewidths=0.4, zorder=2)
            iqr_lo = row.get("importance_iqr_low")
            iqr_hi = row.get("importance_iqr_high")
            mean = row.get("importance_mean")
            if iqr_lo is not None and iqr_hi is not None:
                ax.hlines(yi, iqr_lo, iqr_hi, color="#1F2937", lw=2.2, alpha=0.75, zorder=3)
            if mean is not None:
                ax.scatter([mean], [yi], color="#111827", marker="D", s=26, zorder=4,
                           edgecolors="white", linewidths=0.5)

        ax.set_yticks(list(range(n)))
        ax.set_yticklabels(labels, fontsize=7.5)
        ax.set_xlim(0.5, 9.5)
        ax.set_xticks(list(range(1, 10)))
        ax.set_xlabel("Importance (1 = Not important · 9 = Critically important)")
        fig.suptitle(f"WG{wg_number}: Round 1 importance ratings",
                      x=0.02, y=0.985, ha="left", fontsize=11,
                      fontweight="bold", color="#0C2340")
        ax.axvline(7, ls="--", lw=0.7, color="#10B981", alpha=0.5)
        ax.grid(axis="y", visible=False)
        ax.spines["left"].set_visible(False)
        from matplotlib.lines import Line2D
        ax.legend(
            handles=[
                Line2D([0], [0], marker="D", color="white", markerfacecolor="#111827",
                       markersize=6, label="mean"),
                Line2D([0], [0], color="#1F2937", lw=2.2, label="IQR"),
                Line2D([0], [0], marker="o", color="white", markerfacecolor="#3B82F6",
                       markersize=6, alpha=0.7, label="individual vote"),
            ],
            loc="lower center", bbox_to_anchor=(0.5, 1.005), ncol=3,
            fontsize=7.5, frameon=False,
        )
        fig.tight_layout()
        return fig


# --- F3 — Pairwise leaderboard ------------------------------------------


def pairwise_leaderboard(
    q_stats: pd.DataFrame,
    *,
    wg_number: int,
    low_confidence: bool = False,
    style: str = "print",
    width: Optional[float] = None,
) -> plt.Figure:
    qs = q_stats.copy()
    qs = qs[qs["pairwise_score"].notna()]
    qs = qs.sort_values("pairwise_score", ascending=True)
    n = len(qs)
    h = max(3.0, ROW_HEIGHT * n + 1.6)
    w = width or default_width(style, "double")

    with style_context(style):
        fig, ax = plt.subplots(figsize=(w, h))
        labels = [_q_label(r) for _, r in qs.iterrows()]
        y = np.arange(n)
        scores = qs["pairwise_score"].values
        lo = qs["pairwise_score_ci_low"].values
        hi = qs["pairwise_score_ci_high"].values
        colors = [BUCKET_COLORS.get(b, "#6B7280") for b in qs["bucket"].values]

        ax.barh(y, scores, color=colors, alpha=0.88, edgecolor="white", linewidth=0.4)
        for yi, sc, l, h_ in zip(y, scores, lo, hi):
            if l is None or pd.isna(l):
                continue
            ax.hlines(yi, l, h_, color="#1F2937", lw=1.0, alpha=0.55)
        ax.set_yticks(y)
        ax.set_yticklabels(labels, fontsize=7.5)
        ax.set_xlim(0, 100)
        ax.set_xticks([0, 25, 50, 75, 100])
        ax.set_xlabel("Pairwise score (Bradley-Terry, 0–100)")
        title = f"WG{wg_number}: Pairwise priority ranking"
        # Use suptitle so the legend can sit on the axes without collision
        fig.suptitle(title, x=0.02, y=0.985, ha="left", fontsize=11,
                      fontweight="bold", color="#0C2340")
        ax.axvline(50, ls=":", lw=0.6, color="#9CA3AF")
        ax.grid(axis="y", visible=False)
        ax.spines["left"].set_visible(False)

        from matplotlib.patches import Patch
        ax.legend(
            handles=[Patch(color=c, label=b) for b, c in BUCKET_COLORS.items()],
            loc="lower center", bbox_to_anchor=(0.5, 1.005), ncol=4,
            fontsize=7.5, frameon=False, title=None,
        )
        if low_confidence:
            fig.text(
                0.02, 0.965,
                "⚠ LOW CONFIDENCE — thin pairwise data; rankings preliminary, "
                "Wilson CIs are wide.",
                fontsize=7.5, color="#B45309", style="italic",
            )
        fig.tight_layout()
        return fig


# --- F4 — Concordance scatter -------------------------------------------


def concordance_scatter(
    q_stats: pd.DataFrame,
    *,
    wg_number: int,
    spearman_rho: Optional[float] = None,
    spearman_p: Optional[float] = None,
    style: str = "print",
    width: Optional[float] = None,
    annotate_top: int = 6,
) -> plt.Figure:
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
        # Wider canvas so the title isn't clipped and the right-side
        # legend has room.
        fig, ax = plt.subplots(figsize=(w * 1.55, w * 1.0))
        for bucket, sub in df.groupby("bucket"):
            ax.scatter(
                sub["importance_mean"], sub["pairwise_score"],
                color=BUCKET_COLORS.get(bucket, "#6B7280"),
                edgecolors="white", linewidths=0.6,
                s=52, alpha=0.88, label=bucket,
            )

        # Quadrant lines and labels
        ax.axhline(50, ls=":", lw=0.6, color="#9CA3AF", zorder=0)
        ax.axvline(7, ls=":", lw=0.6, color="#9CA3AF", zorder=0)
        ax.text(8.7, 96, "high importance\nhigh pairwise", fontsize=6.5,
                color="#6B7280", ha="right", style="italic")
        ax.text(1.3, 96, "low importance\nhigh pairwise", fontsize=6.5,
                color="#6B7280", ha="left", style="italic")
        ax.text(1.3, 4, "low importance\nlow pairwise", fontsize=6.5,
                color="#6B7280", ha="left", style="italic")
        ax.text(8.7, 4, "high importance\nlow pairwise", fontsize=6.5,
                color="#6B7280", ha="right", style="italic")

        # Annotate only the top-N most-discordant points (rank-distance)
        if len(df) >= 4:
            df["_rank_imp"] = df["importance_mean"].rank()
            df["_rank_pw"] = df["pairwise_score"].rank()
            df["_diff"] = (df["_rank_imp"] - df["_rank_pw"]).abs()
            top_outliers = df.sort_values("_diff", ascending=False).head(annotate_top)
            try:
                from adjustText import adjust_text  # type: ignore
                texts = []
                for _, r in top_outliers.iterrows():
                    texts.append(ax.text(r["importance_mean"], r["pairwise_score"],
                                         f"Q{int(r['question_id'])}",
                                         fontsize=7, color="#111827"))
                adjust_text(texts, arrowprops=dict(arrowstyle="-",
                                                   color="#9CA3AF", lw=0.5))
            except Exception:
                # Fallback: simple offset that alternates direction
                for i, (_, r) in enumerate(top_outliers.iterrows()):
                    dx, dy = (6, 6) if i % 2 == 0 else (-12, -6)
                    ax.annotate(
                        f"Q{int(r['question_id'])}",
                        (r["importance_mean"], r["pairwise_score"]),
                        textcoords="offset points", xytext=(dx, dy),
                        fontsize=7, color="#111827",
                    )

        ax.set_xlabel("Delphi importance mean (1–9)")
        ax.set_ylabel("Pairwise score (0–100)")
        ax.set_xlim(1, 9)
        ax.set_ylim(0, 100)
        title = f"WG{wg_number}: Delphi importance vs. pairwise priority"
        if spearman_rho is not None:
            sig = "***" if (spearman_p or 1) < 0.001 else (
                "**" if (spearman_p or 1) < 0.01 else (
                "*" if (spearman_p or 1) < 0.05 else "ns"))
            title += f"  ·  ρ = {spearman_rho:.2f} {sig}"
        ax.set_title(title, pad=8, loc="left")
        # Legend outside the axes so it doesn't collide with quadrant
        # labels or annotated outliers.
        ax.legend(
            loc="center left", bbox_to_anchor=(1.02, 0.5),
            fontsize=7.5, title="Bucket",
            title_fontsize=7.5, frameon=False,
        )
        fig.tight_layout()
        return fig


# --- F5 — Per-respondent disposition heatmap ---------------------------


def respondent_heatmap(
    delphi_r1: pd.DataFrame,
    questions: pd.DataFrame,
    *,
    wg_number: int,
    style: str = "print",
    width: Optional[float] = None,
) -> plt.Figure:
    """Co-lead view only — gated by caller."""
    if questions.empty or delphi_r1.empty:
        with style_context(style):
            fig, ax = plt.subplots(figsize=(default_width(style, "double"), 2.5))
            ax.text(0.5, 0.5, "No respondent data", ha="center", va="center",
                    transform=ax.transAxes, color="#6B7280")
            ax.set_axis_off()
            return fig

    first_seen = (
        delphi_r1.groupby("participant_id")["created_at"].min()
        .sort_values().reset_index()
    )
    pid_to_label = {int(pid): f"P{i+1}" for i, pid in enumerate(first_seen["participant_id"])}
    pids_ordered = list(pid_to_label.keys())
    n_p = len(pid_to_label)

    q_sorted = questions.sort_values("r1_include_pct", ascending=False, na_position="last")
    qids = [int(q) for q in q_sorted["question_id"]]

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

    h = max(3.5, ROW_HEIGHT * len(qids) + 1.6)
    w = width or default_width(style, "double")
    with style_context(style):
        from matplotlib.colors import ListedColormap
        cmap = ListedColormap([
            "#F3F4F6", "#EF4444", "#F59E0B", "#10B981",
        ])
        fig, ax = plt.subplots(figsize=(w, h))
        ax.imshow(M, aspect="auto", cmap=cmap, vmin=0, vmax=3,
                  interpolation="nearest")
        labels = []
        for qid in qids:
            row = q_sorted[q_sorted["question_id"] == qid].iloc[0]
            labels.append(question_label(qid,
                                          row.get("short_text") or row.get("text", ""),
                                          width=55, max_lines=2))
        ax.set_yticks(range(len(qids)))
        ax.set_yticklabels(labels, fontsize=7.5)
        ax.set_xticks(range(n_p))
        ax.set_xticklabels([pid_to_label[p] for p in pids_ordered], fontsize=7.5)
        fig.suptitle(
            f"WG{wg_number}: Per-respondent disposition (co-lead view only)",
            x=0.02, y=0.985, ha="left", fontsize=11,
            fontweight="bold", color="#0C2340",
        )
        ax.set_xlabel("Respondent (anonymized)")

        from matplotlib.patches import Patch
        ax.legend(
            handles=[
                Patch(color="#10B981", label="Include"),
                Patch(color="#F59E0B", label="Modify"),
                Patch(color="#EF4444", label="Exclude"),
                Patch(color="#F3F4F6", label="No vote"),
            ],
            loc="lower center", bbox_to_anchor=(0.5, 1.005), ncol=4,
            fontsize=7.5, frameon=False,
        )
        ax.grid(visible=False)
        ax.spines["left"].set_visible(False)
        ax.spines["bottom"].set_visible(False)
        fig.tight_layout()
        return fig
