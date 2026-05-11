"""WG3 (AI Education, Training, and Competency Development) — chair-curated R2 list.

Composition: 14 revised + 3 kept-as-is + 2 new = 19 R2 questions.
3 retired: Q45 (instructional modalities), Q54 (physician-leader competencies), Q59 (drift response).

Q47, Q52, Q56 are R1-confirmed (>=80% include + >=7 importance) and carry
forward unchanged per chair direction — the curated revision list only
covered gray-zone questions.
"""

REVISIONS: list[tuple[int | None, str]] = [
    # --- 14 revisions (gray-zone wording fixes) --------------------------
    (40,
     "What is the current prevalence and pattern of AI tool use by "
     "emergency physicians in academic and community emergency departments "
     "(with particular attention to settings affiliated with residency "
     "training programs)?"),
    (41,
     "What formal, informal, and hidden curricular elements addressing AI "
     "competency are currently present in US emergency medicine residency "
     "programs?"),
    (42,
     "Can a workplace-based assessment tool be developed and validated to "
     "assess EM physician performance in the critical appraisal of AI "
     "outputs?"),
    (43,
     "How should EM AI-related competencies be anchored within existing "
     "educational and accreditation frameworks (ACGME Emergency Medicine "
     "Milestones 2.0, ABEM Model of Clinical Practice, EM Foundations 3)?"),
    (44,
     "What is the predictive validity of AI literacy and readiness "
     "assessment scores (e.g., SNAIL, MAIRS-MS, or EM-apted variants) for "
     "downstream clinical performance among EM trainees?"),
    (46,
     "When during EM training is foundational AI literacy most effectively "
     "introduced?"),
    (48,
     "How do EM residents calibrate trust in AI-generated outputs "
     "(disposition predictions, sepsis alerts, imaging AI, EKG reads) over "
     "the course of training, and what training environment features shape "
     "that calibration?"),
    (49,
     "What proportion of AI-generated documentation from ambient scribes "
     "is edited or reviewed by EM physicians during shifts? What workflow "
     "or training factors affect the likelihood and quality of physician "
     "review?"),
    (50,
     "How reliably do EM physicians at different training stages detect "
     "hallucinations and clinically significant errors in LLM-generated "
     "content?"),
    (51,
     "Which specific tasks during emergency care are appropriate for "
     "delegation to LLM-based AI tools, and which should remain "
     "physician-led?"),
    (53,
     "How should EM physicians communicate with patients about "
     "AI-generated recommendations (including patient-initiated AI like "
     "differential diagnoses from chatbots or AI-summarized chart access "
     "via patient portals)?"),
    (55,
     "How should AI competency expectations differ across stages of the EM "
     "training continuum (medical student → early resident → late resident "
     "→ attending → educator/champion)?"),
    (57,
     "How does AI integration affect interprofessional communication and "
     "team coordination during emergency department care?"),
    (58,
     "Does EM physician AI competency predict patient-level safety "
     "outcomes in emergency care?"),

    # --- 3 R1-confirmed, kept as-is --------------------------------------
    (47,
     "What interventions effectively prepare EM attending physicians to "
     "teach, assess, and role-model appropriate AI use?"),
    (52,
     "How effectively do current curricula train EM physicians to "
     "recognize subgroup performance disparities and implementation bias "
     "in deployed AI tools?"),
    (56,
     "Does sustained use of AI decision support in emergency care affect "
     "EM physician diagnostic reasoning, clinical autonomy, or skill "
     "retention over time?"),

    # --- 2 new questions -------------------------------------------------
    (None,
     "What competencies are required for EM physicians to manage "
     "patient-initiated AI use in clinical encounters (including patients "
     "arriving with chatbot-generated differentials, AI-summarized chart "
     "access, and consumer wearable interpretations)?"),
    (None,
     "How do training needs differ for EM physicians working with "
     "pre-emptive AI integration models (AI surfaces recommendations "
     "before clinician reasoning) versus post-hoc models (AI reviews "
     "completed physician work)?"),
]
