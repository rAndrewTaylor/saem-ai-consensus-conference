"""Per-question, per-WG, and overall statistics for the Round 1 report.

Everything here is pure: takes a ReportBundle, returns DataFrames /
dicts. No DB access. No matplotlib. Easy to unit-test on a small
fixture bundle.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

import pandas as pd
from scipy import stats as sp_stats
from statsmodels.stats.proportion import proportion_confint

from .data import ReportBundle


# --- Consensus thresholds ------------------------------------------------
#
# Canonical (methodology doc): include% ≥ 80% = Confirmed; 21–79% = Gray; ≤20% = Removed.
# Buckets here are *review-priority labels*, not advancement gates — every
# R1 question advances to R2. Importance is used only as a within-bucket
# review-priority modifier: a ≥80% include question with importance < 7 is
# downshifted from "confirmed" to "gray" so co-leads spend revision time on
# it. It still advances. See Round_1_Analysis_Plan.md §3 for the full
# framing.
CONFIRMED_INCLUDE_PCT = 80.0
CONFIRMED_IMPORTANCE_MEAN = 7.0  # review-flag threshold, not a gate
GRAY_LOWER_INCLUDE_PCT = 60.0
REMOVED_EXCLUDE_PCT = 80.0
REMOVED_INCLUDE_FLOOR = 40.0

# WG2 sensitivity: pairwise data is "thin" when these are unmet.
PAIRWISE_LOW_CONF_VOTERS = 8
PAIRWISE_LOW_CONF_PAIRS = 100


# --- Per-question stats -------------------------------------------------


def consensus_bucket(row: pd.Series) -> str:
    """Return one of: confirmed | gray | removed | open."""
    inc = row.get("r1_include_pct") or 0.0
    exc = row.get("r1_exclude_pct") or 0.0
    imp = row.get("r1_importance_mean") or 0.0

    if inc >= CONFIRMED_INCLUDE_PCT and imp >= CONFIRMED_IMPORTANCE_MEAN:
        return "confirmed"
    if exc >= REMOVED_EXCLUDE_PCT or (inc < REMOVED_INCLUDE_FLOOR and imp < 5):
        return "removed"
    if GRAY_LOWER_INCLUDE_PCT <= inc < CONFIRMED_INCLUDE_PCT:
        return "gray"
    if inc >= CONFIRMED_INCLUDE_PCT and imp < CONFIRMED_IMPORTANCE_MEAN:
        return "gray"  # >=80% include but importance lukewarm — still gray
    return "open"


def per_question_stats(bundle: ReportBundle) -> pd.DataFrame:
    """One row per question with everything the figures and DOCX need.

    Columns: question_id, wg_id, wg_number, text, short_text, status,
             n_responses, n_participants, include_pct, modify_pct,
             exclude_pct, importance_mean, importance_median,
             importance_iqr_low, importance_iqr_high, importance_sd,
             dip_p (Hartigan's dip on importance bimodality),
             pairwise_score, pairwise_wins, pairwise_losses,
             pairwise_score_ci_low, pairwise_score_ci_high,
             bucket.
    """
    if bundle.questions.empty:
        return pd.DataFrame()

    q = bundle.questions.copy()
    wgs = bundle.working_groups.set_index("wg_id")["wg_number"]
    q["wg_number"] = q["wg_id"].map(wgs)

    # Aggregate Delphi R1 from raw responses (more robust than relying
    # on the precomputed columns, which may be stale until compute-results
    # has been run for the snapshot).
    r1 = bundle.delphi_r1
    if r1.empty:
        agg = pd.DataFrame(columns=[
            "question_id", "n_responses", "include_pct", "modify_pct",
            "exclude_pct", "importance_mean", "importance_median",
            "importance_iqr_low", "importance_iqr_high", "importance_sd",
            "dip_p",
        ])
    else:
        rows = []
        for qid, sub in r1.groupby("question_id"):
            n = len(sub)
            disp = sub["disposition"].value_counts()
            inc = (disp.get("include", 0) / n) * 100 if n else None
            mod = (disp.get("include_with_modifications", 0) / n) * 100 if n else None
            exc = (disp.get("exclude", 0) / n) * 100 if n else None
            imp = sub["importance"].dropna().astype(float)
            if len(imp) == 0:
                imp_mean = imp_med = imp_q1 = imp_q3 = imp_sd = None
                dip_p = None
            else:
                imp_mean = float(imp.mean())
                imp_med = float(imp.median())
                imp_q1 = float(imp.quantile(0.25))
                imp_q3 = float(imp.quantile(0.75))
                imp_sd = float(imp.std(ddof=1)) if len(imp) > 1 else 0.0
                # Hartigan's dip is unavailable in scipy; use a fast proxy:
                # compare bimodality coefficient (see SAS bimodality coef).
                # b = (g^2 + 1) / (k + 3*(n-1)^2/((n-2)(n-3))) where g=skew,
                # k=excess kurtosis. b > 5/9 suggests bimodality.
                if len(imp) >= 4:
                    g = float(sp_stats.skew(imp, bias=False))
                    k = float(sp_stats.kurtosis(imp, fisher=True, bias=False))
                    n_imp = len(imp)
                    denom = (k + (3 * (n_imp - 1) ** 2) / ((n_imp - 2) * (n_imp - 3)))
                    b = (g ** 2 + 1) / denom if denom else 0
                    # Map b to a pseudo-p: linearly compress around 5/9.
                    dip_p = float(max(0.001, min(1.0, 1.0 - b / (5 / 9))))
                else:
                    dip_p = None
            rows.append({
                "question_id": int(qid),
                "n_responses": n,
                "include_pct": inc,
                "modify_pct": mod,
                "exclude_pct": exc,
                "importance_mean": imp_mean,
                "importance_median": imp_med,
                "importance_iqr_low": imp_q1,
                "importance_iqr_high": imp_q3,
                "importance_sd": imp_sd,
                "dip_p": dip_p,
            })
        agg = pd.DataFrame(rows)

    # Pairwise CI: Wilson on win-rate over (wins + losses), ignoring skips.
    pw_ci = []
    for _, row in q.iterrows():
        w = int(row.get("pairwise_wins") or 0)
        l = int(row.get("pairwise_losses") or 0)
        if w + l > 0:
            lo, hi = proportion_confint(w, w + l, alpha=0.05, method="wilson")
            pw_ci.append({"question_id": int(row["question_id"]),
                          "pairwise_score_ci_low": float(lo) * 100,
                          "pairwise_score_ci_high": float(hi) * 100})
        else:
            pw_ci.append({"question_id": int(row["question_id"]),
                          "pairwise_score_ci_low": None,
                          "pairwise_score_ci_high": None})
    pw_ci_df = pd.DataFrame(pw_ci)

    # Number of unique participants per question
    if not r1.empty:
        n_participants = (
            r1.groupby("question_id")["participant_id"].nunique()
            .rename("n_participants").reset_index()
        )
    else:
        n_participants = pd.DataFrame(columns=["question_id", "n_participants"])

    out = (
        q.merge(agg, on="question_id", how="left")
         .merge(n_participants, on="question_id", how="left")
         .merge(pw_ci_df, on="question_id", how="left")
    )
    out["n_participants"] = out["n_participants"].fillna(0).astype(int)
    out["bucket"] = out.apply(consensus_bucket, axis=1)
    return out


# --- Per-WG aggregations ------------------------------------------------


@dataclass
class WGSummary:
    wg_id: int
    wg_number: int
    name: str
    short_name: str
    pillar: str
    n_questions: int
    n_invited: int
    n_r1_responders: int
    n_r1_responses: int
    response_rate_pct: float
    completion_rate_pct: float  # responders who answered every question
    median_questions_per_responder: int
    n_pairwise_voters: int
    n_pairwise_votes: int
    pairwise_low_confidence: bool
    n_comments: int
    n_suggestions: int
    n_confirmed: int
    n_gray: int
    n_removed: int
    n_open: int
    spearman_rho_delphi_pairwise: Optional[float]
    spearman_p_delphi_pairwise: Optional[float]


def per_wg_summary(bundle: ReportBundle, q_stats: pd.DataFrame) -> pd.DataFrame:
    """One row per WG with the headline numbers."""
    if bundle.working_groups.empty:
        return pd.DataFrame()

    rows: list[WGSummary] = []
    for _, w in bundle.working_groups.iterrows():
        wg_id = int(w["wg_id"])
        q_sub = q_stats[q_stats["wg_id"] == wg_id] if not q_stats.empty else q_stats
        invited = int((bundle.participants["wg_id"] == wg_id).sum())
        r1_sub = (
            bundle.delphi_r1.merge(
                q_sub[["question_id"]], on="question_id", how="inner"
            )
            if not bundle.delphi_r1.empty and not q_sub.empty
            else pd.DataFrame()
        )
        n_responders = (
            int(r1_sub["participant_id"].nunique()) if not r1_sub.empty else 0
        )
        n_responses = len(r1_sub)
        rate = (n_responders / invited * 100) if invited else 0.0
        # "completion" = responders who answered all questions in the WG
        if not r1_sub.empty and not q_sub.empty:
            per_p = r1_sub.groupby("participant_id").size()
            full = int((per_p >= len(q_sub)).sum())
            complete_pct = full / invited * 100 if invited else 0.0
            median_qs = int(per_p.median())
        else:
            complete_pct = 0.0
            median_qs = 0
        pw_sub = bundle.pairwise[bundle.pairwise["wg_id"] == wg_id] if not bundle.pairwise.empty else bundle.pairwise
        n_pw_voters = int(pw_sub["participant_id"].nunique()) if not pw_sub.empty else 0
        n_pw_votes = len(pw_sub)
        low_conf = (
            n_pw_voters < PAIRWISE_LOW_CONF_VOTERS
            or n_pw_votes < PAIRWISE_LOW_CONF_PAIRS
        )
        n_comments = (
            int((r1_sub["comment"].fillna("").str.len() > 0).sum())
            if not r1_sub.empty
            else 0
        )
        n_suggestions = (
            int((bundle.suggestions["wg_id"] == wg_id).sum())
            if not bundle.suggestions.empty
            else 0
        )

        if not q_sub.empty:
            buckets = q_sub["bucket"].value_counts()
            n_conf = int(buckets.get("confirmed", 0))
            n_gray = int(buckets.get("gray", 0))
            n_rem = int(buckets.get("removed", 0))
            n_open = int(buckets.get("open", 0))
            pair = q_sub.dropna(subset=["importance_mean", "pairwise_score"])
            if len(pair) >= 3:
                rho, p = sp_stats.spearmanr(
                    pair["importance_mean"], pair["pairwise_score"]
                )
                rho = float(rho)
                p = float(p)
            else:
                rho = p = None
        else:
            n_conf = n_gray = n_rem = n_open = 0
            rho = p = None

        rows.append(
            WGSummary(
                wg_id=wg_id,
                wg_number=int(w["wg_number"]),
                name=w["name"],
                short_name=w["short_name"],
                pillar=w.get("pillar") or "",
                n_questions=len(q_sub),
                n_invited=invited,
                n_r1_responders=n_responders,
                n_r1_responses=n_responses,
                response_rate_pct=round(rate, 1),
                completion_rate_pct=round(complete_pct, 1),
                median_questions_per_responder=median_qs,
                n_pairwise_voters=n_pw_voters,
                n_pairwise_votes=n_pw_votes,
                pairwise_low_confidence=low_conf,
                n_comments=n_comments,
                n_suggestions=n_suggestions,
                n_confirmed=n_conf,
                n_gray=n_gray,
                n_removed=n_rem,
                n_open=n_open,
                spearman_rho_delphi_pairwise=rho,
                spearman_p_delphi_pairwise=p,
            )
        )

    return pd.DataFrame([r.__dict__ for r in rows])


# --- Top-level / cross-WG snapshot --------------------------------------


def overall_summary(bundle: ReportBundle, wg_summary: pd.DataFrame, q_stats: pd.DataFrame) -> dict:
    """Single dict with the overall (cross-WG) headline numbers."""
    if wg_summary.empty:
        return {}
    total_q = int(wg_summary["n_questions"].sum())
    total_invited = int(wg_summary["n_invited"].sum())
    total_r1_resp = int(wg_summary["n_r1_responses"].sum())
    total_pw_votes = int(wg_summary["n_pairwise_votes"].sum())

    # Spearman across all questions (overall concordance)
    if not q_stats.empty:
        pair = q_stats.dropna(subset=["importance_mean", "pairwise_score"])
        if len(pair) >= 3:
            rho, p = sp_stats.spearmanr(
                pair["importance_mean"], pair["pairwise_score"]
            )
        else:
            rho = p = None
    else:
        rho = p = None

    return {
        "snapshot_at": bundle.snapshot_at.isoformat(),
        "n_working_groups": int(len(wg_summary)),
        "n_questions_total": total_q,
        "n_confirmed_total": int(wg_summary["n_confirmed"].sum()),
        "n_gray_total": int(wg_summary["n_gray"].sum()),
        "n_removed_total": int(wg_summary["n_removed"].sum()),
        "n_open_total": int(wg_summary["n_open"].sum()),
        "n_invited_total": total_invited,
        "n_r1_responders_total": int(wg_summary["n_r1_responders"].sum()),
        "n_r1_responses_total": total_r1_resp,
        "n_pairwise_voters_total": int(wg_summary["n_pairwise_voters"].sum()),
        "n_pairwise_votes_total": total_pw_votes,
        "n_comments_total": int(wg_summary["n_comments"].sum()),
        "n_suggestions_total": int(wg_summary["n_suggestions"].sum()),
        "wgs_low_pairwise_confidence": [
            int(r["wg_number"])
            for _, r in wg_summary.iterrows()
            if r["pairwise_low_confidence"]
        ],
        "spearman_rho_delphi_pairwise_overall": (
            float(rho) if rho is not None else None
        ),
        "spearman_p_delphi_pairwise_overall": (
            float(p) if p is not None else None
        ),
    }
