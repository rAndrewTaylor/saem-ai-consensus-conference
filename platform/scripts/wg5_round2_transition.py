"""WG5 Round 2 transition: preview-by-default, --apply to commit.

Reads the chair's revised question list (embedded below), shows a
diff against the current prod state, and only writes when --apply is
passed. Every change is also logged to the audit_log table.
"""

from __future__ import annotations

import argparse
import os
import sys
from datetime import datetime

import psycopg2
import psycopg2.extras


# ---------------------------------------------------------------------------
# Chair's R2 list — keys are existing question IDs (None for new questions).
# Edit here if any wording needs further tweaking before --apply.
# ---------------------------------------------------------------------------

REVISIONS: list[tuple[int | None, str]] = [
    (96,
     "What evidence basis can/should inform how the reasonable physician "
     "standard applies to AI-augmented medical decision-making, e.g., when "
     "a reasonable physician would use, not use, or disagree with AI "
     "recommendations?"),
    (91,
     "What is the appropriate distribution of liability for AI-assisted "
     "clinical decisions among developers, health systems, and clinicians?"),
    (117,
     "What institutional processes (governance, quality controls) safeguard "
     "medical decision-making for optimal patient safety throughout the AI "
     "innovation and implementation lifecycles?"),
    (127,
     "How should AI be governed and implemented in pre- and post-ED care "
     "settings (e.g., pre-ED triage, post-ED follow up, telemedicine) to "
     "support patients' care needs?"),
    (110,
     "Recognizing that humans and AI systems both have real-world failure "
     "rates, what approach and parameters should guide an ED human and AI "
     "teaming risk management system?"),
    (125,
     "How does systemic AI implementation in EDs affect insurance "
     "reimbursement and AI-generated care refusals?"),
    (107,
     "How should organizations optimize governance and guardrails for AI "
     "to incorporate values, goals, and ethical principles for pragmatic "
     "application within unique organizational contexts?"),
    (128,
     "What are the cost implications of AI-assisted care for patients?"),
    (100,
     "What clinical use cases and ethical thresholds distinguish when "
     "broad/global consent is sufficient for embedded ED AI vs. when "
     "use-case-specific informed consent is required?"),
    (99,
     "What legal and ethical informed-consent standards are necessary for "
     "AI use in ED care?"),
    (104,
     "What legal frameworks and standards of institutional accountability "
     "are required to protect marginalized populations from AI-driven "
     "diagnostic errors, such as algorithmic \"under-triage\"?"),
    (103,
     "How should ED AI systems be built, deployed, and modified to prevent "
     "bias against under-sampled populations (rural, pediatric, "
     "non-English-speaking)?"),
    (121,
     "What best practices for patient and community engagement effectively "
     "identify ethical, legal, and policy pain points for AI integration "
     "into ED systems?"),
    (109,
     "If AI expands the clinical scope of APPs in the ED, what physician "
     "oversight standards are required to maintain non-inferior outcomes?"),
    (112,
     "What oversight mechanisms protect patient rights and ensure core "
     "priorities (ethics, privacy, quality, etc.) when AI rule-making is "
     "increasingly outsourced to private platforms?"),
    # New (no parent — was anonymously suggested in R1 free-text)
    (None,
     "What are the environmental and socioeconomic trade-offs of AI "
     "deployment, e.g., regarding energy consumption, water usage, "
     "economic growth, and resource distribution?"),
]

WG_NUMBER = 5


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--apply", action="store_true",
                    help="Actually write the changes (default: preview).")
    args = ap.parse_args()

    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        sys.exit("DATABASE_URL not set. Run via `railway run`.")

    conn = psycopg2.connect(db_url)
    conn.autocommit = False
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute(
        "SELECT id FROM working_groups WHERE number = %s", (WG_NUMBER,)
    )
    wg_row = cur.fetchone()
    if not wg_row:
        sys.exit(f"WG{WG_NUMBER} not found")
    wg_id = wg_row["id"]

    # Snapshot current WG5 state
    cur.execute(
        "SELECT id, text, status::text AS status, version, "
        "r1_include_pct, r1_importance_mean "
        "FROM questions WHERE wg_id = %s ORDER BY id", (wg_id,),
    )
    by_id = {r["id"]: r for r in cur.fetchall()}

    revise_ids = {qid for qid, _ in REVISIONS if qid is not None}
    keep_in_r2 = set(revise_ids)
    retire_ids = set(by_id) - keep_in_r2
    new_questions = [text for qid, text in REVISIONS if qid is None]

    print(f"Connected to {db_url.split('@')[-1].split('/')[0]} "
          f"({'APPLY' if args.apply else 'PREVIEW'})\n")
    print(f"WG{WG_NUMBER}: {len(by_id)} questions currently active, "
          f"{len(revise_ids)} revised, {len(retire_ids)} retired, "
          f"{len(new_questions)} new")
    print()

    # --- Preview revisions
    print("── REVISIONS (text update + status=REVISED + version+1) ─────────")
    for qid, new_text in REVISIONS:
        if qid is None:
            continue
        old = by_id.get(qid)
        if old is None:
            print(f"  ! Q{qid}: NOT FOUND in WG5 — skipping")
            continue
        same = old["text"].strip() == new_text.strip()
        marker = " (no text change)" if same else ""
        print(f"  Q{qid}{marker}")
        print(f"    R1 stats: inc%={old['r1_include_pct']:.0f} imp={old['r1_importance_mean']:.1f}")
        if not same:
            print(f"    OLD: {old['text'][:160]}")
            print(f"    NEW: {new_text[:160]}")
    print()

    # --- Preview retirements
    print("── RETIREMENTS (status=REMOVED — preserved with R1 stats) ──────")
    for qid in sorted(retire_ids):
        r = by_id[qid]
        print(f"  Q{qid}  inc%={r['r1_include_pct']:.0f} imp={r['r1_importance_mean']:.1f}  {r['text'][:100]}")
    print()

    # --- Preview new
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

    for qid, new_text in REVISIONS:
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
                (chair, "wg5_r2_new_question",
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
                "SET text=%s, status='REVISED', version=COALESCE(version,1)+1, "
                "    updated_at=%s "
                "WHERE id=%s",
                (new_text, now, qid),
            )
            cur.execute(
                "INSERT INTO audit_log (user_email, action, detail, created_at) "
                "VALUES (%s, %s, %s, %s)",
                (chair, "wg5_r2_revise",
                 f"Q{qid} v{(old['version'] or 1)+1}: \"{old['text'][:120]}\" → \"{new_text[:120]}\"", now),
            )

    for qid in retire_ids:
        cur.execute(
            "UPDATE questions SET status='REMOVED', updated_at=%s WHERE id=%s",
            (now, qid),
        )
        cur.execute(
            "INSERT INTO audit_log (user_email, action, detail, created_at) "
            "VALUES (%s, %s, %s, %s)",
            (chair, "wg5_r2_retire",
             f"Q{qid} retired (inc%={by_id[qid]['r1_include_pct']:.0f}, imp={by_id[qid]['r1_importance_mean']:.1f})", now),
        )

    conn.commit()
    print("Done. Changes committed. Verify via /api/surveys/questions/5?round_name=round_2")


if __name__ == "__main__":
    main()
