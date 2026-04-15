"""Demo data seeder — populates the DB with synthetic questions, participants,
Delphi responses, and pairwise votes so the platform can be walked through
end-to-end without needing real traffic.

All demo records are tagged so they can be cleanly removed:
  - Participants: email ends with DEMO_EMAIL_SUFFIX
  - Questions:    source == 'demo'

Running:
  from backend.demo_seed import seed_demo_data, reset_demo_data
  with SessionLocal() as db:
      seed_demo_data(db)
"""

from datetime import datetime, timedelta
import random
import secrets

from sqlalchemy.orm import Session

from .database import (
    WorkingGroup, Question, Participant, DelphiResponse, PairwiseVote,
    QuestionStatus, DelphiRound, DispositionVote,
)

DEMO_EMAIL_SUFFIX = "@demo.saem-ai.test"
TESTER_EMAIL_SUFFIX = "@tester.saem-ai.test"

# ---------------------------------------------------------------------------
# Demo content
# ---------------------------------------------------------------------------

QUESTIONS_BY_WG = {
    1: [  # Clinical Practice & Operations
        "What is the optimal role of AI-based triage systems in emergency department workflows, and how should human oversight be structured?",
        "How should emergency physicians integrate AI-generated differential diagnoses into their clinical reasoning without surrendering diagnostic authority?",
        "What evidence thresholds should gate the deployment of AI clinical decision support for high-acuity conditions (e.g., stroke, sepsis)?",
        "How can AI tools for bed management and patient flow reduce ED boarding without exacerbating disparities in care?",
        "What are the safety and liability implications of autonomous AI-driven discharge recommendations for low-acuity patients?",
        "How should AI-generated handoff summaries be validated before being incorporated into transitions of care?",
        "Which operational metrics (LOS, left-without-being-seen, boarding time) best reflect the impact of AI interventions in the ED?",
        "How should EDs monitor AI model performance drift in real time, and what triggers should prompt rollback?",
        "What is the appropriate use of AI-enabled clinical documentation (ambient scribes) during high-acuity resuscitations?",
        "How should AI tools support resource allocation decisions during mass casualty or disaster scenarios?",
    ],
    2: [  # Infrastructure & Data
        "What minimum data governance standards should be required before an AI model is deployed in the ED?",
        "How should de-identified ED data be shared across institutions to support AI development while preserving patient privacy?",
        "What FHIR-based interoperability requirements are essential for AI tools to function across EHR vendors?",
        "Who should bear responsibility for ongoing validation of AI models post-deployment — vendor, hospital, or regulatory body?",
        "How should emergency medicine contribute to the development of open, shared benchmark datasets for clinical AI?",
        "What infrastructure is needed to enable real-time model monitoring across geographically distributed emergency departments?",
        "How can we design data pipelines that preserve label quality given the time pressure of emergency documentation?",
        "What security architectures are needed to protect against adversarial attacks on AI-driven triage systems?",
        "Should there be a national registry of clinical AI models deployed in emergency care, analogous to device registries?",
        "How should structured and unstructured ED data be curated for model training to minimize label leakage and confounding?",
    ],
    3: [  # Education & Training
        "What core AI competencies should be required of all emergency medicine residents before graduation?",
        "How should residency programs teach critical appraisal of AI-driven clinical decision support tools?",
        "What is the appropriate role of simulation in training clinicians to use AI tools under time pressure?",
        "How should faculty development programs prepare attending physicians to teach AI-era clinical reasoning?",
        "Which assessment tools best measure a trainee's ability to appropriately override or trust AI recommendations?",
        "How should medical schools revise preclinical curricula to prepare future emergency physicians for AI-augmented practice?",
        "What continuing medical education (CME) structure is needed to keep practicing EM physicians current on AI tools?",
        "How do we teach residents to recognize and respond to algorithmic bias in clinical AI tools?",
        "What training is needed for physician leaders (medical directors, CMIOs) to oversee AI deployment in EDs?",
        "How should competencies for AI-era clinical practice be integrated into board certification examinations?",
    ],
    4: [  # Human-AI Interaction
        "How does sustained use of AI clinical decision support affect emergency physicians' diagnostic skills over time?",
        "What interface design principles best support appropriate trust calibration between clinicians and AI tools?",
        "How does AI assistance affect clinician cognitive load and burnout in high-volume emergency departments?",
        "What is the impact of AI-augmented practice on the professional identity of emergency physicians?",
        "How should AI systems communicate uncertainty in a way that supports, rather than undermines, clinical judgment?",
        "What are the downstream effects of AI-driven autonomy loss on job satisfaction among emergency physicians?",
        "How do patients perceive care delivered with visible AI involvement, and how should consent and disclosure be handled?",
        "What cognitive biases are introduced or amplified when clinicians work alongside AI recommendations?",
        "How should AI tools be designed to avoid deskilling junior clinicians while still providing decision support?",
        "What are the psychological effects on clinicians when AI recommendations conflict with their own judgment?",
    ],
    5: [  # Ethics & Legal
        "Who bears liability when an AI-driven clinical decision support tool contributes to an adverse outcome in the ED?",
        "How should algorithmic bias in emergency-department AI tools be detected, disclosed, and remediated?",
        "What informed consent standards apply when AI is materially involved in emergency clinical decisions?",
        "How should AI models be governed to ensure equitable performance across race, sex, age, and socioeconomic status?",
        "What regulatory framework is appropriate for AI tools that adapt or learn after deployment in clinical settings?",
        "How should hospitals balance transparency about AI use with the risk of eroding patient trust?",
        "What ethical principles should guide the use of AI for resource allocation decisions during capacity crises?",
        "Who should have the authority to override AI-driven clinical recommendations, and under what circumstances?",
        "How should conflicts of interest (vendor incentives, health system priorities) be disclosed in AI deployment decisions?",
        "What legal and ethical obligations govern the use of AI to identify social determinants of health in ED patients?",
    ],
}

# 8 participants per WG = 40 total
DEMO_PARTICIPANTS = {
    1: [
        ("Dr. Ava Patel", "ava.patel"),
        ("Dr. Marcus Chen", "marcus.chen"),
        ("Dr. Lena Okonkwo", "lena.okonkwo"),
        ("Dr. Ben Ramirez", "ben.ramirez"),
        ("Dr. Priya Shah", "priya.shah"),
        ("Dr. Noah Adler", "noah.adler"),
        ("Dr. Hana Ito", "hana.ito"),
        ("Dr. Samuel Reyes", "samuel.reyes"),
    ],
    2: [
        ("Dr. Emma Larsen", "emma.larsen"),
        ("Dr. Devon Washington", "devon.washington"),
        ("Dr. Yuki Tanaka", "yuki.tanaka"),
        ("Dr. Leah Rosenberg", "leah.rosenberg"),
        ("Dr. Omar Haddad", "omar.haddad"),
        ("Dr. Chloe Martin", "chloe.martin"),
        ("Dr. Ravi Iyer", "ravi.iyer"),
        ("Dr. Grace Kim", "grace.kim"),
    ],
    3: [
        ("Dr. Julia Brooks", "julia.brooks"),
        ("Dr. Elijah Park", "elijah.park"),
        ("Dr. Sofia Russo", "sofia.russo"),
        ("Dr. Kwame Boateng", "kwame.boateng"),
        ("Dr. Nadia Hassan", "nadia.hassan"),
        ("Dr. Liam O'Brien", "liam.obrien"),
        ("Dr. Zara Khan", "zara.khan"),
        ("Dr. Theo Bennett", "theo.bennett"),
    ],
    4: [
        ("Dr. Naomi Foster", "naomi.foster"),
        ("Dr. Lucas Wright", "lucas.wright"),
        ("Dr. Mira Srinivasan", "mira.srinivasan"),
        ("Dr. Caleb Johansson", "caleb.johansson"),
        ("Dr. Aria Mehta", "aria.mehta"),
        ("Dr. Jonah Becker", "jonah.becker"),
        ("Dr. Elena Vasquez", "elena.vasquez"),
        ("Dr. Isaac Osei", "isaac.osei"),
    ],
    5: [
        ("Dr. Simone Laurent", "simone.laurent"),
        ("Dr. Malik Carter", "malik.carter"),
        ("Dr. Beatriz Oliveira", "beatriz.oliveira"),
        ("Dr. Finn Murphy", "finn.murphy"),
        ("Dr. Anya Kowalski", "anya.kowalski"),
        ("Dr. Derek Nwosu", "derek.nwosu"),
        ("Dr. Rosa Moreno", "rosa.moreno"),
        ("Dr. Henry Cho", "henry.cho"),
    ],
}

SAMPLE_COMMENTS = [
    "Broad agreement in my experience, though implementation varies dramatically by site.",
    "Important topic, but the question as worded could be sharpened around specific decision contexts.",
    "Strongly agree this is a priority for the field.",
    "I'd modify to focus specifically on high-acuity encounters — the stakes differ meaningfully.",
    "Good question; worth pairing with the one on liability framing.",
    "The evidence base here is still emerging; I wouldn't draw strong conclusions yet.",
    "Agree in principle, but wary of overreach without stronger validation data.",
    "Critical for equity considerations — should stay in.",
    "This touches the same theme as another question; consider merging.",
    "Needs to be more operationally specific to drive actionable research.",
    None, None, None, None,  # most responses have no comment
]


# ---------------------------------------------------------------------------
# Seeder
# ---------------------------------------------------------------------------

def seed_demo_if_empty(db: Session) -> dict:
    """Idempotent seed — only creates demo data if none exists yet. Fast
    no-op when data is already present, so safe to call on every startup.
    """
    existing = (
        db.query(Participant)
        .filter(Participant.email.like(f"%{DEMO_EMAIL_SUFFIX}"))
        .count()
    )
    if existing > 0:
        return {"seeded": False, "existing_personas": existing}
    summary = seed_demo_data(db)
    return {"seeded": True, "created": summary}


def seed_demo_data(db: Session, seed: int = 42) -> dict:
    """Populate the database with demo data. Idempotent — if demo data
    already exists it is reset first.

    Returns a summary dict of what was created.
    """
    rng = random.Random(seed)

    # Fresh slate for demo rows
    reset_demo_data(db)

    summary = {"questions": 0, "participants": 0, "delphi_responses": 0, "pairwise_votes": 0}

    # --- Questions ---
    wgs = {wg.number: wg for wg in db.query(WorkingGroup).all()}
    questions_by_wg: dict[int, list[Question]] = {}
    for wg_number, qs in QUESTIONS_BY_WG.items():
        wg = wgs.get(wg_number)
        if not wg:
            continue
        created = []
        for text in qs:
            q = Question(
                wg_id=wg.id,
                text=text,
                status=QuestionStatus.ACTIVE,
                source="demo",
            )
            db.add(q)
            created.append(q)
        db.flush()  # populate IDs
        questions_by_wg[wg_number] = created
        summary["questions"] += len(created)

    # --- Participants (named invites) ---
    participants_by_wg: dict[int, list[Participant]] = {}
    now = datetime.utcnow()
    for wg_number, people in DEMO_PARTICIPANTS.items():
        wg = wgs.get(wg_number)
        if not wg:
            continue
        created = []
        for i, (name, email_stem) in enumerate(people):
            # About 70% of demo participants are "claimed"
            claimed = rng.random() < 0.70
            p = Participant(
                token=secrets.token_urlsafe(24),
                wg_id=wg.id,
                name=name,
                email=f"{email_stem}{DEMO_EMAIL_SUFFIX}",
                is_active=True,
                created_at=now - timedelta(days=rng.randint(1, 14)),
                claimed_at=now - timedelta(days=rng.randint(0, 10)) if claimed else None,
            )
            db.add(p)
            created.append(p)
        db.flush()
        participants_by_wg[wg_number] = created
        summary["participants"] += len(created)

    # --- Delphi R1 responses ---
    # Each participant answers ~75-95% of their WG's questions
    dispositions = [
        DispositionVote.INCLUDE,
        DispositionVote.INCLUDE_WITH_MODIFICATIONS,
        DispositionVote.EXCLUDE,
    ]
    disposition_weights = [0.55, 0.30, 0.15]  # skewed toward include

    for wg_number, participants in participants_by_wg.items():
        qs = questions_by_wg.get(wg_number, [])
        if not qs:
            continue
        for p in participants:
            # Only claimed participants have responses (realistic)
            if p.claimed_at is None:
                continue
            answer_rate = rng.uniform(0.75, 0.95)
            for q in qs:
                if rng.random() > answer_rate:
                    continue
                disposition = rng.choices(dispositions, weights=disposition_weights, k=1)[0]
                # Importance correlates loosely with disposition
                if disposition == DispositionVote.INCLUDE:
                    importance = rng.choices([6, 7, 8, 9], weights=[1, 3, 3, 2])[0]
                elif disposition == DispositionVote.INCLUDE_WITH_MODIFICATIONS:
                    importance = rng.choices([4, 5, 6, 7], weights=[1, 2, 3, 2])[0]
                else:
                    importance = rng.choices([1, 2, 3, 4], weights=[2, 3, 3, 1])[0]

                comment = rng.choice(SAMPLE_COMMENTS)
                resp = DelphiResponse(
                    question_id=q.id,
                    participant_id=p.id,
                    round=DelphiRound.ROUND_1,
                    disposition=disposition,
                    importance_rating=importance,
                    comment=comment,
                    created_at=p.claimed_at + timedelta(minutes=rng.randint(1, 600)),
                )
                db.add(resp)
                summary["delphi_responses"] += 1

    db.flush()

    # --- Pairwise votes ---
    # ~30 votes per WG from claimed participants
    seen_pairs: set[tuple[int, int, int]] = set()  # (participant_id, q_a_min, q_b_max)
    for wg_number, participants in participants_by_wg.items():
        wg = wgs.get(wg_number)
        qs = questions_by_wg.get(wg_number, [])
        if not wg or len(qs) < 2:
            continue
        claimed = [p for p in participants if p.claimed_at]
        if not claimed:
            continue

        target_votes = 30
        attempts = 0
        created = 0
        while created < target_votes and attempts < target_votes * 4:
            attempts += 1
            p = rng.choice(claimed)
            q1, q2 = rng.sample(qs, 2)
            key = (p.id, min(q1.id, q2.id), max(q1.id, q2.id))
            if key in seen_pairs:
                continue
            seen_pairs.add(key)
            # Winner: 10% can't-decide (null), otherwise prefer one of the two
            if rng.random() < 0.10:
                winner_id = None
            else:
                winner_id = rng.choice([q1.id, q2.id])
            vote = PairwiseVote(
                participant_id=p.id,
                question_a_id=q1.id,
                question_b_id=q2.id,
                winner_id=winner_id,
                wg_id=wg.id,
                response_time_ms=rng.randint(1200, 9000),
                created_at=p.claimed_at + timedelta(minutes=rng.randint(1, 1200)),
            )
            db.add(vote)
            created += 1
            summary["pairwise_votes"] += 1

            # Update question win/loss counts
            if winner_id is not None:
                winner = next(q for q in (q1, q2) if q.id == winner_id)
                loser = q2 if winner is q1 else q1
                winner.pairwise_wins = (winner.pairwise_wins or 0) + 1
                loser.pairwise_losses = (loser.pairwise_losses or 0) + 1

    # Recompute pairwise scores (Laplace-smoothed win rate, 0-100)
    for qs in questions_by_wg.values():
        for q in qs:
            wins = q.pairwise_wins or 0
            losses = q.pairwise_losses or 0
            q.pairwise_score = ((wins + 1) / (wins + losses + 2)) * 100

    db.commit()
    return summary


# ---------------------------------------------------------------------------
# Reset
# ---------------------------------------------------------------------------

def reset_demo_data(db: Session) -> dict:
    """Delete every record tagged as demo data. Safe to run repeatedly."""

    # Demo participants + self-service tester accounts (both tagged by email suffix)
    from sqlalchemy import or_ as sa_or
    demo_participants = (
        db.query(Participant)
        .filter(
            sa_or(
                Participant.email.like(f"%{DEMO_EMAIL_SUFFIX}"),
                Participant.email.like(f"%{TESTER_EMAIL_SUFFIX}"),
            )
        )
        .all()
    )
    demo_participant_ids = [p.id for p in demo_participants]

    # Demo questions (by source)
    demo_questions = db.query(Question).filter(Question.source == "demo").all()
    demo_question_ids = [q.id for q in demo_questions]

    deleted = {"delphi_responses": 0, "pairwise_votes": 0, "questions": 0, "participants": 0}

    if demo_participant_ids or demo_question_ids:
        # Delphi responses tied to demo participants OR demo questions
        filters = []
        if demo_participant_ids:
            filters.append(DelphiResponse.participant_id.in_(demo_participant_ids))
        if demo_question_ids:
            filters.append(DelphiResponse.question_id.in_(demo_question_ids))
        from sqlalchemy import or_
        deleted["delphi_responses"] = (
            db.query(DelphiResponse)
            .filter(or_(*filters))
            .delete(synchronize_session=False)
        )

        # Pairwise votes tied to demo participants OR any demo question on either side
        pw_filters = []
        if demo_participant_ids:
            pw_filters.append(PairwiseVote.participant_id.in_(demo_participant_ids))
        if demo_question_ids:
            pw_filters.append(PairwiseVote.question_a_id.in_(demo_question_ids))
            pw_filters.append(PairwiseVote.question_b_id.in_(demo_question_ids))
        deleted["pairwise_votes"] = (
            db.query(PairwiseVote)
            .filter(or_(*pw_filters))
            .delete(synchronize_session=False)
        )

    # Demo questions and participants themselves
    if demo_question_ids:
        deleted["questions"] = (
            db.query(Question)
            .filter(Question.id.in_(demo_question_ids))
            .delete(synchronize_session=False)
        )
    if demo_participant_ids:
        deleted["participants"] = (
            db.query(Participant)
            .filter(Participant.id.in_(demo_participant_ids))
            .delete(synchronize_session=False)
        )

    db.commit()
    return deleted


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import sys
    from .database import SessionLocal, init_db, seed_working_groups

    init_db()
    db = SessionLocal()
    try:
        seed_working_groups(db)
        cmd = sys.argv[1] if len(sys.argv) > 1 else "seed"
        if cmd == "reset":
            deleted = reset_demo_data(db)
            print(f"Demo data reset. Deleted: {deleted}")
        else:
            summary = seed_demo_data(db)
            print(f"Demo data seeded. Created: {summary}")
    finally:
        db.close()
