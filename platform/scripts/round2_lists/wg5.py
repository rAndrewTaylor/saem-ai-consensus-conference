"""WG5 (Ethical, Legal, and Societal Implications) — chair-curated R2 list.

Format: list of (question_id_or_None, new_text). Use the existing
question id when revising; use None to create a new R2 question.
"""

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
    (None,
     "What are the environmental and socioeconomic trade-offs of AI "
     "deployment, e.g., regarding energy consumption, water usage, "
     "economic growth, and resource distribution?"),
    (None,
     "In the context of emergency department human-AI teaming, how is "
     "safe staffing defined, measured, and enacted in policy?"),
]
