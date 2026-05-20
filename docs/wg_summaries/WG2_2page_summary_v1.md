# Working Group 2 — Infrastructure & Data

**SAEM 2026 AI Consensus Conference · 2-page summary**
Co-leads: Fran Riley · Ethan Abbott
Pillar: Technology

---

## Background

AI in emergency medicine depends on data infrastructure and validation pipelines that EDs do not yet share. Fragmented EHR architectures, inconsistent data quality, and the absence of standardized benchmark datasets make it nearly impossible to compare AI tools across institutions or detect performance degradation once deployed. Algorithmic bias originates in upstream training data and propagates silently into clinical decisions about under-sampled populations. Without shared infrastructure for monitoring drift, validating models across sites, and managing the full lifecycle from development to retirement, every ED becomes its own evidence island. WG2 asks how emergency medicine builds the data foundation, technical standards, and governance frameworks needed for AI to be portable, equitable, and trustworthy across diverse care settings — including the scaffolding required to safely deploy generative and agentic AI in real-time clinical workflows.

## Final research questions

**1. EHR data quality standards.** What minimum EHR data quality standards should be met to ensure reliable AI model performance in emergency departments, and how should these standards be monitored over time?
*Pain point:* ED documentation is high-acuity, fragmented across systems, and inconsistent across institutions. *Conceptual expansion:* Define data-quality dimensions and monitoring cadence needed to keep ED-facing AI safe. *Anticipated impact:* Sets a floor for the data substrate every clinical AI tool depends on.

**2. Benchmark datasets.** What standardized benchmark datasets should the emergency medicine community develop to enable fair cross-institutional comparison of AI model performance?
*Pain point:* Without shared benchmarks, vendor claims are unverifiable. *Conceptual expansion:* Specify conditions, modalities, and populations EM should curate into open or federated resources. *Anticipated impact:* Apples-to-apples model comparison.

**3. Real-world generalizability validation.** What real-world evidence validation methods are most appropriate for assessing whether an AI tool developed at one institution generalizes safely to others?
*Pain point:* Single-site validation hides failure modes that surface only after broad deployment. *Conceptual expansion:* Compare prospective external validation, silent-mode deployment, and federated evaluation. *Anticipated impact:* Reduces post-deployment failure rate.

**4. Performance drift monitoring and lifecycle management.** What methods should be used to continuously monitor AI model performance drift and manage the full lifecycle in operational EDs, and what degradation thresholds should trigger automatic rollback or human review?
*Pain point:* Models degrade as populations and practice patterns evolve; few EDs run the monitoring needed to catch it. *Conceptual expansion:* Specify drift metrics, escalation thresholds, retraining triggers, and retirement criteria. *Anticipated impact:* Post-market surveillance that keeps deployed AI safe.

**5. Data infrastructure for generative/agentic AI.** What data infrastructure capabilities are foundational for emergency departments to safely deploy generative and agentic AI in real-time clinical workflows?
*Pain point:* Generative and agentic AI move from retrieval to action without the audit and rollback infrastructure traditional CDS assumes. *Conceptual expansion:* Identify the architectural building blocks (context grounding, action logging, retrieval-augmentation, guardrails) required for real-time use. *Anticipated impact:* Technical preconditions for the next generation of ED AI.

**6. Representativeness of training data.** How can the EM community ensure that training datasets for clinical AI are representative of the full diversity of ED patient populations, including rural, underinsured, and non-English-speaking patients?
*Pain point:* Training datasets systematically underrepresent populations most likely to experience ED care disparities. *Conceptual expansion:* Dataset-construction practices, federated contribution incentives, and population-coverage audits. *Anticipated impact:* AI tools that perform equitably across the populations EDs actually serve.

**7. Algorithmic bias detection and mitigation.** How should EDs detect, measure, and mitigate algorithmic bias in AI models arising from training data reflecting historical healthcare inequities, independent of SDOH data capture?
*Pain point:* Bias propagates through deployment regardless of SDOH capture at the point of care. *Conceptual expansion:* Subgroup performance monitoring, counterfactual auditing, and corrective interventions that work without perfect demographic data. *Anticipated impact:* Bias surveillance standards that protect patients regardless of EHR completeness.

**8. Common data models for ED data.** How can common data models be adapted or extended to capture the temporal, high-acuity data patterns unique to ED encounters?
*Pain point:* OMOP/PCORnet/FHIR capture longitudinal care well but miss the rapid, high-acuity event sequences that define ED care. *Conceptual expansion:* ED-specific extensions for triage time, acuity transitions, handoffs, and high-frequency monitoring. *Anticipated impact:* Emergency-specific AI development on shared, interoperable substrates.

**9. Interoperability and dynamic consent.** What interoperability standards are needed to interface vendor AI applications across diverse ED environments, and how should patient consent models evolve from one-time informed consent to dynamic frameworks?
*Pain point:* Vendor AI is locked into proprietary integrations; patient consent is captured once at registration. *Conceptual expansion:* Standards and consent architectures that let AI move across EDs while preserving patient agency. *Anticipated impact:* Portable AI tools that respect patient rights at the data layer.

**10. Cybersecurity of cloud vs. local deployment.** What broad cybersecurity considerations should guide the choice between cloud-hosted and locally deployed AI models in emergency care?
*Pain point:* EDs face cybersecurity threats that disrupt operations; AI deployment decisions carry security implications rarely evaluated systematically. *Conceptual expansion:* Compare attack surface, latency, data residency, and resilience trade-offs. *Anticipated impact:* Evidence-based deployment framework for AI resilience in adverse conditions.

## Thematic summary

Three threads run through the WG2 research agenda. First, **data quality and lifecycle as preconditions** — questions on EHR data quality, benchmarks, real-world validation, drift monitoring, and generative-AI infrastructure form a coherent stack where every layer must be solved for the one above it to be trustworthy. Second, **equity built into infrastructure** — representativeness, bias detection, and ED-specific common data models make equity a design property of the data ecosystem rather than a post-hoc audit. Third, **patient agency and security at the data layer** — interoperability with dynamic consent and cybersecurity decisions about where data lives translate technical infrastructure into rights and resilience.

## Conclusion and call to action

WG2 calls for funded multi-institutional infrastructure to operationalize shared data-quality standards, benchmark datasets, and lifecycle monitoring protocols — coordinated through SAEM with regulatory liaisons at FDA and ONC and federated partnerships across academic and community EDs. The R2 question set is intended as the seed for an AHRQ/NIH infrastructure proposal aligned with the SAEM annual research agenda.

## References

1. Norgeot B, Quer G, Beaulieu-Jones BK, et al. Minimum information about clinical AI modeling: the MI-CLAIM checklist. Nat Med. 2020;26(9):1320-1324.
2. Wong A, Otles E, Donnelly JP, et al. External validation of a widely implemented proprietary sepsis prediction model. JAMA Intern Med. 2021;181(8):1065-1070.
3. Sendak M, Gao M, Brajer N, Balu S. Presenting machine learning model information to clinical end users. NPJ Digit Med. 2020;3:41.
4. Reps JM, Schuemie MJ, Suchard MA, Ryan PB, Rijnbeek PR. Standardized framework to generate and evaluate patient-level prediction models. J Am Med Inform Assoc. 2018;25(8):969-975.
5. Hripcsak G, Albers DJ. Next-generation phenotyping of electronic health records. J Am Med Inform Assoc. 2013;20(1):117-121.
6. Obermeyer Z, Powers B, Vogeli C, Mullainathan S. Dissecting racial bias in an algorithm used to manage health populations. Science. 2019;366(6464):447-453.
7. Rieke N, Hancox J, Li W, et al. The future of digital health with federated learning. NPJ Digit Med. 2020;3:119.
8. Kelly CJ, Karthikesalingam A, Suleyman M, Corrado G, King D. Key challenges for delivering clinical impact with artificial intelligence. BMC Med. 2019;17(1):195.
9. Sahni N, Stein G, Zemmel R, Cutler DM. The potential impact of artificial intelligence on healthcare spending. NBER Working Paper 30857. 2023.
10. Coiera E, Liu S. Evidence synthesis, digital scribes, and translational challenges for AI in healthcare. Cell Rep Med. 2022;3(12):100860.
