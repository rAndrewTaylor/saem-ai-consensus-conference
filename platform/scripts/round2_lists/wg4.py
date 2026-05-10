"""WG4 (Human-AI Interaction and the Perception of Self) — chair-curated R2 list.

Composition: 11 revised + 8 kept-as-is + 4 new = 23 R2 questions.
12 retired: Q63, Q65, Q67, Q68, Q70, Q72, Q73, Q76, Q80, Q83, Q87, Q89.
"""

REVISIONS: list[tuple[int | None, str]] = [
    # --- 11 revisions (parent → new wording) ---------------------------------
    (61,
     "Under what conditions does AI enhance or impair ED clinical decision "
     "making?"),
    (64,
     "What forms of AI explainability are clinically useful vs. distracting "
     "in ED workflows? For example, AI explainability can include but not "
     "limited to transparency, interpretability, and model accuracy?"),
    (62,
     "How does AI automation manifest in the ED and how do we mitigate it?"),
    (69,
     "How does AI integration impact emergency physicians' autonomy?"),
    (84,
     "What does informed patient consent look like when AI contributes to "
     "ED clinical decisions?"),
    (86,
     "Which ED AI implementation strategies best balance and mitigate "
     "unintended bias and inequities across patient subgroups?"),
    (82,
     "How does consumer AI use affect their expectations in clinical care "
     "in the ED?"),
    (78,
     "How do patients perceive use of AI by their physicians in the ED?"),
    (71,
     "How does AI integration affect ED professional satisfaction and "
     "stress?"),
    (81,
     "How does patient use of consumer AI tools before ED arrival affect "
     "their experience of clinical care?"),
    (77,
     "What is the impact of AI scribe implementation on clinician "
     "satisfaction and efficiency?"),

    # --- 8 R1-confirmed, kept as-is ------------------------------------------
    (60,
     "How does AI-augmented clinical decision making affect emergency "
     "physicians' diagnostic reasoning processes?"),
    (66,
     "What factors influence physician trust in AI?"),
    (74,
     "What are the effects of AI on the quality and nature of the "
     "clinician-patient relationship in emergency care? (e.g. accuracy, "
     "timeliness, communication patterns, empathy expression, therapeutic "
     "alliance, etc.)"),
    (75,
     "How does the cognitive burden of maintaining human oversight of "
     "increasingly autonomous AI systems affect clinician performance in "
     "the ED?"),
    (79,
     "What factors shape patient trust in AI involvement in their clinical "
     "care? (e.g. disclosure, explanation, consent)"),
    (85,
     "How can AI-augmented clinical decision support be implemented in "
     "existing ED workflows without disrupting care delivery or increasing "
     "cognitive burden?"),
    (88,
     "How should adaptive AI systems that learn from clinician feedback be "
     "designed and governed to ensure they improve rather than degrade "
     "over time in emergency care settings?"),
    (90,
     "What are the risks of physician reliance on AI in emergency medicine?"),

    # --- 4 new questions -----------------------------------------------------
    (None,
     "What is the experience of emergency physicians when AI recommendations "
     "conflict with their clinical intuition, and how do they resolve that "
     "tension? How does perceived responsibility shift when an AI-assisted "
     "decision leads to patient harm?"),
    (None,
     "Should there be different considerations for closer AI-CDS (automated "
     "actions from AI calculations and decisions) that interact in ED "
     "workflows with human staff, from open AI-CDS that presents summarized "
     "information or recommendations to ED staff?"),
    (None,
     "How does AI change ED physicians' consultation thresholds to "
     "specialists?"),
    (None,
     "How does AI change interaction patterns with specialists overnight "
     "and how does that impact ED patient outcomes?"),
]
