"""Round 2 transition for any WG: preview-by-default, --apply to commit.

Reads a chair-curated R2 list from a Python module under
`scripts/round2_lists/wg{N}.py` (each defines REVISIONS, a list of
(qid_or_None, new_text) tuples) and applies it as REVISED/REMOVED/new
ACTIVE rows on the questions table, with audit-log entries.

Safety rail: refuses to retire any R1 "confirmed-bucket" question
(>=80% include AND >=7 importance mean) unless explicitly authorized
via --allow-retire <qid> (repeatable) or --reattribute <qid>:<wg> (which
moves the question to the named WG instead of removing it).

Usage:
  railway run python3 scripts/round2_transition.py --wg 4
  railway run python3 scripts/round2_transition.py --wg 4 --apply
  railway run python3 scripts/round2_transition.py --wg 5 \
      --allow-retire 114 --apply
  railway run python3 scripts/round2_transition.py --wg 5 \
      --reattribute 114:3 --apply
"""

from __future__ import annotations

import argparse
import importlib
import os
import sys
from datetime import datetime

import psycopg2
import psycopg2.extras


CONFIRMED_INCLUDE_PCT = 80.0
CONFIRMED_IMPORTANCE_MEAN = 7.0


def is_confirmed_bucket(row) -> bool:
    inc = row["r1_include_pct"] or 0.0
    imp = row["r1_importance_mean"] or 0.0
    return inc >= CONFIRMED_INCLUDE_PCT and imp >= CONFIRMED_IMPORTANCE_MEAN


def parse_reattribution(values):
    """Parse list of "qid:wg_number" strings into {qid: wg_number}."""
    out = {}
    for v in values or []:
        try:
            qid, wg = v.split(":")
            out[int(qid)] = int(wg)
        except Exception:
            sys.exit(f"--reattribute expects 'qid:wg_number', got: {v!r}")
    return out


def load_revisions(wg_number: int):
    """Import round2_lists.wg{N} from the scripts/ directory."""
    here = os.path.dirname(os.path.abspath(__file__))
    if here not in sys.path:
        sys.path.insert(0, here)
    mod_name = f"round2_lists.wg{wg_number}"
    try:
        mod = importlib.import_module(mod_name)
    except ModuleNotFoundError:
        sys.exit(
            f"No revisions module found at scripts/round2_lists/wg{wg_number}.py. "
            f"Create that file with a "
            f"`REVISIONS = [(qid_or_None, new_text), ...]` list."
        )
    rev = getattr(mod, "REVISIONS", None)
    if rev is None:
        sys.exit(f"{mod_name} must define REVISIONS")
    return rev


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--wg", type=int, required=True, help="WG number (1-5)")
    ap.add_argument("--apply", action="store_true",
                    help="Write the changes (default: preview only).")
    ap.add_argument("--allow-retire", action="append", type=int, default=[],
                    metavar="QID",
                    help="Permit retiring this confirmed-bucket question "
                         "(repeatable). Required to bypass the safety rail.")
    ap.add_argument("--reattribute", action="append", default=[],
                    metavar="QID:WG_NUMBER",
                    help="Move this question to another WG instead of "
                         "retiring it (repeatable).")
    args = ap.parse_args()

    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        sys.exit("DATABASE_URL not set. Run via `railway run`.")

    revisions = load_revisions(args.wg)
    revise_ids = {qid for qid, _ in revisions if qid is not None}
    new_questions = [text for qid, text in revisions if qid is None]
    reattr_map = parse_reattribution(args.reattribute)
    allow_retire = set(args.allow_retire)

    conn = psycopg2.connect(db_url)
    conn.autocommit = False
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    cur.execute(
        "SELECT id FROM working_groups WHERE number = %s", (args.wg,)
    )
    wg_row = cur.fetchone()
    if not wg_row:
        sys.exit(f"WG{args.wg} not found")
    wg_id = wg_row["id"]

    # All target WGs we may touch (this WG + any reattribution destinations)
    cur.execute(
        "SELECT id, number FROM working_groups WHERE number = ANY(%s)",
        (list({args.wg} | set(reattr_map.values())),)
    )
    wg_id_by_number = {r["number"]: r["id"] for r in cur.fetchall()}
    for qid, dest_wg in reattr_map.items():
        if dest_wg not in wg_id_by_number:
            sys.exit(f"Reattribution target WG{dest_wg} not found")

    cur.execute(
        "SELECT id, text, status::text AS status, version, "
        "r1_include_pct, r1_importance_mean "
        "FROM questions WHERE wg_id = %s ORDER BY id", (wg_id,),
    )
    by_id = {r["id"]: r for r in cur.fetchall()}

    keep_in_r2 = set(revise_ids)
    retire_ids = set(by_id) - keep_in_r2

    # --- Safety rail: confirmed-bucket questions cannot be silently retired
    confirmed_to_retire = [
        qid for qid in retire_ids
        if is_confirmed_bucket(by_id[qid])
        and qid not in allow_retire
        and qid not in reattr_map
    ]
    if confirmed_to_retire:
        print("ABORT: the following confirmed-bucket questions "
              "(>=80% include AND >=7 importance) would be retired "
              "without authorization:\n")
        for qid in sorted(confirmed_to_retire):
            r = by_id[qid]
            print(f"  Q{qid}  inc={r['r1_include_pct']:.0f}%  "
                  f"imp={r['r1_importance_mean']:.1f}  "
                  f"{r['text'][:120]}")
        print()
        print("Rerun with one of:")
        print("  --allow-retire <qid>      (acknowledge retirement)")
        print("  --reattribute <qid>:<wg>  (move to another WG instead)")
        sys.exit(2)

    print(f"Connected to {db_url.split('@')[-1].split('/')[0]} "
          f"({'APPLY' if args.apply else 'PREVIEW'})\n")
    print(f"WG{args.wg}: {len(by_id)} questions currently active, "
          f"{len(revise_ids)} revised, {len(retire_ids)} retired "
          f"({len(reattr_map)} reattributed), "
          f"{len(new_questions)} new\n")

    print("── REVISIONS (text update + status=REVISED + version+1) ─────────")
    for qid, new_text in revisions:
        if qid is None:
            continue
        old = by_id.get(qid)
        if old is None:
            print(f"  ! Q{qid}: NOT FOUND in WG{args.wg} — skipping")
            continue
        same = old["text"].strip() == new_text.strip()
        marker = " (no text change)" if same else ""
        print(f"  Q{qid}{marker}  inc={old['r1_include_pct']:.0f}% "
              f"imp={old['r1_importance_mean']:.1f}")
        if not same:
            print(f"    OLD: {old['text'][:140]}")
            print(f"    NEW: {new_text[:140]}")
    print()

    if reattr_map:
        print("── REATTRIBUTIONS (move to a different WG, R1 stats preserved) ─")
        for qid, dest_wg in reattr_map.items():
            r = by_id.get(qid)
            if r is None:
                print(f"  ! Q{qid}: NOT FOUND in WG{args.wg} — skipping")
                continue
            print(f"  Q{qid} → WG{dest_wg}  inc={r['r1_include_pct']:.0f}% "
                  f"imp={r['r1_importance_mean']:.1f}  {r['text'][:100]}")
        print()

    print("── RETIREMENTS (status=REMOVED — preserved with R1 stats) ──────")
    pure_retire = [qid for qid in retire_ids if qid not in reattr_map]
    for qid in sorted(pure_retire):
        r = by_id[qid]
        flag = " [CONFIRMED-BUCKET, retire authorized]" if (
            is_confirmed_bucket(r) and qid in allow_retire
        ) else ""
        print(f"  Q{qid}  inc={r['r1_include_pct']:.0f}% "
              f"imp={r['r1_importance_mean']:.1f}  "
              f"{r['text'][:100]}{flag}")
    print()

    print("── NEW QUESTIONS (status=ACTIVE, source='chair_round_2') ────────")
    for text in new_questions:
        print(f"  {text[:160]}")
    print()

    if not args.apply:
        print("Preview only — no changes made. Re-run with --apply.")
        return

    # --- APPLY ---
    now = datetime.utcnow()
    chair = os.environ.get("MIGRATION_USER", "chair")

    for qid, new_text in revisions:
        if qid is None:
            cur.execute(
                """
                INSERT INTO questions
                  (wg_id, text, version, status, source, created_at, updated_at)
                VALUES (%s, %s, 1, 'ACTIVE', 'chair_round_2', %s, %s)
                RETURNING id
                """,
                (wg_id, new_text, now, now),
            )
            new_id = cur.fetchone()["id"]
            cur.execute(
                "INSERT INTO audit_log (user_email, action, detail, created_at) "
                "VALUES (%s, %s, %s, %s)",
                (chair, f"wg{args.wg}_r2_new_question",
                 f"Created Q{new_id}: {new_text[:160]}", now),
            )
            continue

        old = by_id.get(qid)
        if old is None:
            continue
        if old["text"].strip() == new_text.strip():
            cur.execute(
                "UPDATE questions SET status='REVISED', updated_at=%s "
                "WHERE id=%s", (now, qid),
            )
        else:
            cur.execute(
                "UPDATE questions "
                "SET text=%s, status='REVISED', "
                "    version=COALESCE(version,1)+1, updated_at=%s "
                "WHERE id=%s",
                (new_text, now, qid),
            )
            cur.execute(
                "INSERT INTO audit_log (user_email, action, detail, created_at) "
                "VALUES (%s, %s, %s, %s)",
                (chair, f"wg{args.wg}_r2_revise",
                 f"Q{qid} v{(old['version'] or 1)+1}: "
                 f"\"{old['text'][:120]}\" → \"{new_text[:120]}\"", now),
            )

    for qid, dest_wg in reattr_map.items():
        if qid not in by_id:
            continue
        old = by_id[qid]
        cur.execute(
            "UPDATE questions SET wg_id=%s, updated_at=%s WHERE id=%s",
            (wg_id_by_number[dest_wg], now, qid),
        )
        cur.execute(
            "INSERT INTO audit_log (user_email, action, detail, created_at) "
            "VALUES (%s, %s, %s, %s)",
            (chair, f"wg{args.wg}_r2_reattribute",
             f"Q{qid} moved to WG{dest_wg} "
             f"(inc={old['r1_include_pct']:.0f}%, imp={old['r1_importance_mean']:.1f})",
             now),
        )

    for qid in pure_retire:
        old = by_id[qid]
        cur.execute(
            "UPDATE questions SET status='REMOVED', updated_at=%s WHERE id=%s",
            (now, qid),
        )
        action = (
            f"wg{args.wg}_r2_retire_confirmed"
            if is_confirmed_bucket(old)
            else f"wg{args.wg}_r2_retire"
        )
        cur.execute(
            "INSERT INTO audit_log (user_email, action, detail, created_at) "
            "VALUES (%s, %s, %s, %s)",
            (chair, action,
             f"Q{qid} retired (inc={old['r1_include_pct']:.0f}%, "
             f"imp={old['r1_importance_mean']:.1f})", now),
        )

    conn.commit()
    print("Done. Changes committed. Verify via "
          f"/api/surveys/questions/{args.wg}?round_name=round_2")


if __name__ == "__main__":
    main()
