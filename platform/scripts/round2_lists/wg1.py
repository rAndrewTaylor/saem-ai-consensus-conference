"""WG1 (AI in Clinical Practice and Operations) — chair-curated R2 list.

Composition: 19 revisions + 1 new = 20 R2 questions.
14 retired: Q2, Q4, Q7, Q9, Q12, Q130, Q133, Q137, Q138, Q140, Q142, Q146, Q147, Q148.

Q141 wording uses chair's explicit edit from May 10 (spell out "Behavioral
Health", add "etc" after rural).
Q143 typo "consbe" rendered as "considerations should be reflected"
pending confirmation.
"""

REVISIONS: list[tuple[int | None, str]] = [
    # --- 19 revisions ----------------------------------------------------
    (1,
     "How do we ensure that tools which are \"optimized\" from an ML "
     "standpoint aren't missing critical cases — with regard to "
     "appropriate thresholds and biases?"),
    (3,
     "How can AI-generated outputs be translated into ED workflow actions "
     "that change clinical outcomes (e.g. morbidity/mortality) or "
     "operational outcomes (e.g. LOS)?"),
    (5,
     "What governance, oversight, and post-market surveillance structures "
     "are needed to keep clinical AI tools safe and effective in EDs?"),
    (6,
     "What design and workflow conditions make AI-generated insights "
     "actionable at the ED point of care?"),
    (8,
     "When is it appropriate/efficient/safe to make AI tools ED clinician "
     "facing?"),
    (10,
     "How do we support safe, effective, and equitable implementation of "
     "AI-enabled point-of-care ultrasound in emergency departments?"),
    (11,
     "How can we develop AI tools to optimally allocate human staffing in "
     "the ED to improve efficiency and quality?"),
    (13,
     "Does AI-mation improve clinical or operational outcomes, or does it "
     "propagate legacy workflows?"),
    (14,
     "How can AI be used to promote best practice and improve "
     "patient-oriented outcomes?"),
    (131,
     "How should EDs detect and respond to algorithm degradation over "
     "time in real-world clinical settings?"),
    (132,
     "What in-deployment interventions are most effective at mitigating "
     "identified subgroup performance gaps?"),
    (134,
     "Which categories of ED AI tools deliver the highest value per "
     "dollar in EDs under different operational constraints?"),
    (135,
     "What constitutes minimum prospective validation evidence for ED AI "
     "within a domain?"),
    (136,
     "How do EPs and ED systems integrate outputs from multiple AI "
     "systems?"),
    (139,
     "What clinical use cases for LLMs in the ED are appropriate vs. "
     "inappropriate, evaluated against a defined risk framework?"),
    (141,
     "How do tools for historically understudied populations (Behavioral "
     "Health, pediatrics, rural etc) differ in their implementation "
     "considerations?"),
    (143,
     "What ED-specific clinical and operational considerations should be "
     "reflected in regulatory AI/ML guidance?"),
    (144,
     "What framework should guide ED build-vs-buy decisions for AI tools?"),
    (145,
     "What organizational strategies most reliably drive clinician "
     "adoption of new ED AI tools?"),

    # --- 1 new question (split from Q145) --------------------------------
    (None,
     "How do institutional culture and leadership characteristics "
     "moderate AI adoption success in EDs?"),
]
