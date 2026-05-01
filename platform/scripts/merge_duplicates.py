"""Preview and (optionally) execute participant duplicate merges.

Default mode is preview-only — no DB writes. Pass --apply to actually
execute the merges. Always run a backup first.

Approach (per merge group):
  - choose a "primary" row (the row that should survive)
  - re-attribute every delphi_response, pairwise_vote, conference_vote,
    delphi_suggestion, conference_comment from each "secondary" row to
    the primary
  - deactivate the secondary rows (is_active=false). Their tokens stop
    working but the rows stay in place for audit.
  - never DELETE anything

Conflicts:
  - delphi_responses has UNIQUE(question_id, participant_id, round)
  - pairwise_votes has UNIQUE(participant_id, question_a, question_b, wg)
  - conference_votes has UNIQUE(session_id, participant_id, vote_type)
  When a re-attribution would violate one of these, the primary's row
  wins (the secondary row stays unattached to the primary; it's
  effectively orphaned by deactivation but the data is still in the
  DB for inspection).

Usage:
    railway run python3 scripts/merge_duplicates.py            # preview
    railway run python3 scripts/merge_duplicates.py --apply    # execute
"""

from __future__ import annotations

import argparse
import os
import sys
from dataclasses import dataclass

import psycopg2
import psycopg2.extras


@dataclass
class MergePlan:
    primary_id: int
    secondary_ids: list[int]
    label: str
    note: str = ""


# Hardcoded plans built from the audit findings (2026-05-01).
# Edit this list to adjust which rows survive — preview before applying.
PLANS: list[MergePlan] = [
    MergePlan(
        primary_id=31,
        secondary_ids=[10],
        label="Arwen Declan (WG5)",
        note="Keeps the row with 64 pairwise votes; absorbs the 12 from #10. WG4 #3 stays untouched (legitimate cross-WG membership).",
    ),
    MergePlan(
        primary_id=35,
        secondary_ids=[52, 53, 54, 55, 56],
        label="Alexandra Sanseverino (WG1)",
        note="Keeps #35 (33 Delphi). Absorbs 55 pairwise from #52 and 1 from #53. Empty rows #54/#55/#56 deactivate (no data to move). #55 has the typo'd email umassmeorial.org — deactivating it lets her sign in via #35.",
    ),
    MergePlan(
        primary_id=16,
        secondary_ids=[30],
        label="Rohit Sangal (WG1)",
        note="#30 has no data — straight deactivation, no data movement.",
    ),
    MergePlan(
        primary_id=8,
        secondary_ids=[51],
        label="Deborah Diercks (WG4)",
        note="Keeps #8 (31 Delphi); absorbs 58 pairwise from #51. WG3 #48 (20 Delphi) is left alone — confirm separately whether her WG3 membership is intentional.",
    ),
]


def fetch_overview(cur, plan: MergePlan) -> dict:
    ids = [plan.primary_id, *plan.secondary_ids]
    cur.execute(
        """
        SELECT p.id, p.name, p.email, p.wg_id, w.number AS wg_number,
               p.is_active, p.claimed_at,
               (SELECT COUNT(*) FROM delphi_responses dr WHERE dr.participant_id=p.id) AS delphi,
               (SELECT COUNT(*) FROM pairwise_votes pv WHERE pv.participant_id=p.id) AS pairwise,
               (SELECT COUNT(*) FROM conference_votes cv WHERE cv.participant_id=p.id) AS conference,
               (SELECT COUNT(*) FROM delphi_suggestions ds WHERE ds.participant_id=p.id) AS suggestions
        FROM participants p
        LEFT JOIN working_groups w ON p.wg_id=w.id
        WHERE p.id = ANY(%s)
        ORDER BY p.id
        """,
        (ids,),
    )
    by_id = {r["id"]: r for r in cur.fetchall()}
    if plan.primary_id not in by_id:
        raise SystemExit(f"primary id {plan.primary_id} not found")
    return by_id


def conflict_count(cur, table: str, key_cols: list[str], primary_id: int, secondary_id: int) -> int:
    """How many rows on `secondary_id` already have a peer on `primary_id`
    that would collide on `key_cols`? Those rows can't be re-attributed."""
    keys = ", ".join(key_cols)
    cur.execute(
        f"""
        SELECT COUNT(*) FROM {table} s
        WHERE s.participant_id = %s
          AND EXISTS (
            SELECT 1 FROM {table} p
            WHERE p.participant_id = %s
              AND { ' AND '.join(f'p.{k}=s.{k}' for k in key_cols if k != 'participant_id') }
          )
        """,
        (secondary_id, primary_id),
    )
    return cur.fetchone()["count"]


def preview_plan(cur, plan: MergePlan) -> dict:
    by_id = fetch_overview(cur, plan)
    primary = by_id[plan.primary_id]
    print(f"\n── {plan.label} ─ primary #{plan.primary_id} (WG{primary['wg_number']}) absorbs {plan.secondary_ids}")
    print(f"    {plan.note}")
    rows_to_move = {
        "delphi_responses": 0,
        "pairwise_votes": 0,
        "conference_votes": 0,
        "delphi_suggestions": 0,
        "conference_comments": 0,
    }
    conflicts = {"delphi_responses": 0, "pairwise_votes": 0, "conference_votes": 0}

    for sid in plan.secondary_ids:
        if sid not in by_id:
            print(f"    ! secondary id {sid} not found in DB — skipping")
            continue
        s = by_id[sid]
        # Re-attributable rows = total on secondary minus those that would conflict
        c_delphi = conflict_count(cur, "delphi_responses",
                                  ["participant_id", "question_id", "round"],
                                  plan.primary_id, sid)
        c_pair = conflict_count(cur, "pairwise_votes",
                                ["participant_id", "question_a_id", "question_b_id", "wg_id"],
                                plan.primary_id, sid)
        c_conf = conflict_count(cur, "conference_votes",
                                ["session_id", "participant_id", "vote_type"],
                                plan.primary_id, sid)

        rows_to_move["delphi_responses"] += s["delphi"] - c_delphi
        rows_to_move["pairwise_votes"] += s["pairwise"] - c_pair
        rows_to_move["conference_votes"] += s["conference"] - c_conf
        rows_to_move["delphi_suggestions"] += s["suggestions"]  # no unique constraint
        # conference_comments has no unique constraint either — fold all in
        cur.execute("SELECT COUNT(*) FROM conference_comments WHERE participant_id=%s", (sid,))
        rows_to_move["conference_comments"] += cur.fetchone()["count"]

        conflicts["delphi_responses"] += c_delphi
        conflicts["pairwise_votes"] += c_pair
        conflicts["conference_votes"] += c_conf

        print(f"    secondary #{sid:>3}: delphi={s['delphi']} pairwise={s['pairwise']} conf={s['conference']} sugg={s['suggestions']}  (conflicts: delphi={c_delphi} pair={c_pair} conf={c_conf})")

    print(f"    => move: {rows_to_move}")
    if any(conflicts.values()):
        print(f"    => conflicts (kept on secondary, primary wins): {conflicts}")
    print(f"    => deactivate: {plan.secondary_ids}")
    return {"plan": plan, "moves": rows_to_move, "conflicts": conflicts}


def apply_plan(cur, plan: MergePlan):
    """Execute the merge inside a transaction the caller manages."""
    print(f"   APPLY {plan.label}: primary={plan.primary_id} secondaries={plan.secondary_ids}")
    for sid in plan.secondary_ids:
        # Move re-attributable rows; conflicting rows stay on the secondary
        cur.execute(
            """
            UPDATE delphi_responses SET participant_id=%s
             WHERE participant_id=%s
               AND NOT EXISTS (
                 SELECT 1 FROM delphi_responses dr2
                 WHERE dr2.participant_id=%s
                   AND dr2.question_id=delphi_responses.question_id
                   AND dr2.round=delphi_responses.round
               )
            """,
            (plan.primary_id, sid, plan.primary_id),
        )
        cur.execute(
            """
            UPDATE pairwise_votes SET participant_id=%s
             WHERE participant_id=%s
               AND NOT EXISTS (
                 SELECT 1 FROM pairwise_votes pv2
                 WHERE pv2.participant_id=%s
                   AND pv2.question_a_id=pairwise_votes.question_a_id
                   AND pv2.question_b_id=pairwise_votes.question_b_id
                   AND pv2.wg_id=pairwise_votes.wg_id
               )
            """,
            (plan.primary_id, sid, plan.primary_id),
        )
        cur.execute(
            """
            UPDATE conference_votes SET participant_id=%s
             WHERE participant_id=%s
               AND NOT EXISTS (
                 SELECT 1 FROM conference_votes cv2
                 WHERE cv2.participant_id=%s
                   AND cv2.session_id=conference_votes.session_id
                   AND cv2.vote_type=conference_votes.vote_type
               )
            """,
            (plan.primary_id, sid, plan.primary_id),
        )
        cur.execute(
            "UPDATE delphi_suggestions SET participant_id=%s WHERE participant_id=%s",
            (plan.primary_id, sid),
        )
        cur.execute(
            "UPDATE conference_comments SET participant_id=%s WHERE participant_id=%s",
            (plan.primary_id, sid),
        )
        # Deactivate the secondary row
        cur.execute(
            "UPDATE participants SET is_active=false WHERE id=%s",
            (sid,),
        )
        # Leave an audit log entry
        cur.execute(
            """
            INSERT INTO audit_log (user_email, action, detail, created_at)
            VALUES (%s, %s, %s, NOW())
            """,
            (
                os.environ.get("MERGE_USER", "merge-script"),
                "participant_merge",
                f"Merged participant #{sid} into #{plan.primary_id} ({plan.label})",
            ),
        )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true",
                        help="Actually execute the merges (default: preview only).")
    args = parser.parse_args()

    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        sys.exit("DATABASE_URL not set. Run via `railway run python3 scripts/merge_duplicates.py`")

    conn = psycopg2.connect(db_url)
    conn.autocommit = False
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    print(f"Connected to {db_url.split('@')[-1].split('/')[0]} ({'APPLY' if args.apply else 'PREVIEW'} mode)")

    try:
        for plan in PLANS:
            preview_plan(cur, plan)

        if not args.apply:
            print("\nPreview only — no changes made. Re-run with --apply to execute.")
            return

        print("\n--- APPLYING MERGES ---")
        for plan in PLANS:
            apply_plan(cur, plan)
        conn.commit()
        print("\nDone. All merges committed.")

    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    main()
