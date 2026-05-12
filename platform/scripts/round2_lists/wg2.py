"""WG2 (AI Technology: Infrastructure and Data Ecosystems) — chair-curated R2 list.

Composition: 24 revised + 1 kept-as-is = 25 R2 questions.

Q21, Q26, Q35 are R1-confirmed (>=80% include + >=7 importance) and are
covered in Fran's revision list. Q164 is also R1-confirmed but Fran's
list did not include it (Q24 covers adjacent but distinct ground —
"validation methods" vs Q164's "validation design/resourcing/standardization").
Q164 is carried forward unchanged per chair direction.
"""

REVISIONS: list[tuple[int | None, str]] = [
    # --- 24 revisions per Fran + Ethan's chair-curated list ----------------
    (162,
     "What data infrastructure capabilities are foundational for emergency "
     "departments to safely deploy generative and agentic AI in real-time "
     "clinical workflows while preserving accuracy, auditability, and "
     "patient safety?"),
    (35,
     "What methods should be used to continuously monitor AI model "
     "performance drift and manage the full lifecycle (evaluation, "
     "updating, retirement) of AI tools deployed in operational emergency "
     "departments, and what performance degradation thresholds should "
     "trigger automatic rollback or human review?"),
    (21,
     "How should emergency departments detect, measure, and mitigate "
     "algorithmic bias in AI models that arises from training data "
     "reflecting historical healthcare inequities, independent of "
     "social-determinants data capture?"),
    (160,
     "What data infrastructure, standards, and capture workflows are "
     "needed for emergency departments to reliably collect and represent "
     "Social Determinants of Health to support equitable AI-driven "
     "emergency care?"),
    (24,
     "What real-world evidence validation methods are most appropriate "
     "for assessing whether an AI tool developed at one institution "
     "generalizes safely to other emergency departments with different "
     "patient populations and EHR systems?"),
    (22,
     "What standardized benchmark datasets should the emergency medicine "
     "community develop to enable fair cross-institutional comparison of "
     "AI model performance?"),
    (149,
     "How do the distinctive characteristics of ED clinical documentation "
     "and workflow affect the validity of EHR-derived data used to "
     "develop AI tools, and how should this shape data-engineering and "
     "model-development practice?"),
    (154,
     "What interoperability standards and infrastructure are needed to "
     "support portable, vendor-agnostic AI applications across diverse "
     "ED clinical environments?"),
    (37,
     "What technical standards and sociotechnical design principles "
     "should govern the integration of AI-generated clinical predictions "
     "into ED information displays and clinician workflows?"),
    (23,
     "How can common data models be adapted or extended to capture the "
     "temporal, high-acuity data patterns unique to emergency department "
     "encounters?"),
    (34,
     "How should multi-institutional data sharing agreements be "
     "structured to enable emergency medicine AI research while "
     "protecting institutional interests, patient privacy, and ensuring "
     "equitable benefit distribution?"),
    (19,
     "What are the practical trade-offs between differential privacy "
     "protection levels and clinical AI model accuracy in emergency "
     "medicine applications, and how should acceptable thresholds be "
     "defined?"),
    (156,
     "How effective are current and emerging methods for de-identifying "
     "ED clinical text, and what residual privacy risks remain that "
     "affect responsible secondary use of ED data?"),
    (168,
     "What approaches to consent, transparency, and patient engagement "
     "are appropriate for the secondary use of ED data in AI development, "
     "given the constraints of emergency care?"),
    (29,
     "How should patient consent models evolve from one-time informed "
     "consent to dynamic consent frameworks that give patients ongoing "
     "control over how their emergency care data is used for AI "
     "development?"),
    (157,
     "What is the role of synthetic data in ED AI development, under "
     "what conditions can it responsibly substitute for or augment real "
     "patient data, and what validation against real-world data should "
     "be required before clinical deployment?"),
    (155,
     "When does federated learning offer meaningful advantages over "
     "centralized data approaches in emergency medicine, and how should "
     "ED-relevant federated infrastructure be designed and sustained?"),
    (17,
     "What institutional data governance structures (committees, "
     "oversight roles, escalation pathways) are necessary to manage the "
     "full lifecycle of AI tools deployed in emergency care?"),
    (33,
     "What role should emergency medicine play in coordinating "
     "cross-institutional distribution and benchmarking of deployed "
     "clinical AI tools, including tracking validation status and "
     "post-deployment performance?"),
    (15,
     "What minimum EHR data quality standards should be met to ensure "
     "reliable AI model performance in emergency departments, and how "
     "should these standards be monitored over time?"),
    (28,
     "What broad cybersecurity considerations should guide the choice "
     "between cloud-hosted and locally deployed AI models in emergency "
     "care?"),
    (36,
     "How can the emergency medicine community ensure that training "
     "datasets for clinical AI are representative of the full diversity "
     "of ED patient populations, including rural, underinsured, and "
     "non-English-speaking patients?"),
    (26,
     "What computational phenotyping approaches best identify acute "
     "conditions (sepsis, stroke, STEMI) from EHR data while maintaining "
     "accuracy across institutions with different coding practices?"),
    (161,
     "What are the comparative strengths, limitations, and practical "
     "requirements of clinical versus general-purpose AI models for "
     "emergency-medicine applications?"),

    # --- 1 R1-confirmed, kept as-is ----------------------------------------
    (164,
     "How should external validation of ED AI tools be designed, "
     "resourced, and standardized to ensure safety and generalizability "
     "across diverse practice settings?"),
]
