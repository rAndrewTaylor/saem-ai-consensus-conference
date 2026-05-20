import { createElement } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  ArrowRight,
  BookOpen,
  Brain,
  ChevronLeft,
  ClipboardList,
  Cpu,
  Database,
  FileText,
  GraduationCap,
  Lightbulb,
  Scale,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { usePageTitle } from '@/hooks/usePageTitle';

export const SUMMARY_DOCS = [
  {
    wg: 1,
    title: 'Clinical Practice & Operations',
    subtitle: 'Closing the gap between AI promise and clinical reality',
    source: 'WG1_2page_summary_v1.docx',
    icon: Cpu,
    palette: {
      name: 'cyan',
      from: 'from-cyan-400/20',
      via: 'via-sky-500/10',
      to: 'to-blue-600/10',
      text: 'text-cyan-200',
      border: 'border-cyan-300/25',
      bg: 'bg-cyan-500/[0.08]',
      dot: 'bg-cyan-300',
    },
    background:
      'AI tools are now available for healthcare systems across imaging interpretation, sepsis surveillance, triage optimization, and clinical documentation. Yet translation into clinical and operational impact remains inconsistent: adoption varies across institutions, implementation barriers persist, prospective validation evidence is sparse, and equity concerns remain under-addressed.',
    composition: [
      { value: '12', label: 'consensus questions' },
      { value: '3', label: 'cross-cutting themes' },
      { value: '91%', label: 'R2 response rate' },
    ],
    questions: [
      {
        title: 'Integrating AI-generated insights into ED workflows',
        prompt:
          'How can AI-generated insights be integrated into emergency department workflows in ways that lead to measurable improvements in clinical outcomes and operational efficiency?',
        pain:
          'Most ED AI research focuses on retrospective algorithmic performance in isolated datasets, while implementation studies reveal substantial variability in real-world adoption and clinical impact.',
        expansion:
          'Design, deploy, and evaluate AI tools so frontline clinicians can translate algorithmic insights into clinical actions that improve patient and operational outcomes.',
        impact:
          'Establishes implementation frameworks, change management strategies, and workflow redesign methods needed for AI to deliver clinical value.',
      },
      {
        title: 'Preventing missed critical cases and embedded bias',
        prompt:
          'How can we ensure that machine-learning-optimized tools do not overlook critical cases due to threshold settings or embedded biases?',
        pain:
          'Algorithms optimized for aggregate sensitivity and specificity may miss rare high-consequence pathologies or perform poorly in underrepresented subgroups.',
        expansion:
          'Define validation approaches, threshold-setting methods, and bias-detection strategies for diverse ED populations and clinical presentations.',
        impact:
          'Creates standards for sensitivity, specificity, probabilistic rule-out/rule-in, and demographic performance to reduce diagnostic errors.',
      },
      {
        title: 'LLM risk frameworks for emergency care',
        prompt:
          'How should a risk framework that evaluates appropriate clinical use cases for LLMs in the ED be developed, and what safeguards should it include?',
        pain:
          'LLMs are already being used for reasoning, documentation, and patient communication, but use-case boundaries and safeguards remain unclear.',
        expansion:
          'Systematically evaluate LLM risks and benefits, define safe-use boundaries, and monitor for hallucination, bias, and harmful outputs.',
        impact:
          'Guides safe LLM deployment and protects patient safety in high-stakes emergency settings.',
      },
      {
        title: 'Detecting algorithm degradation',
        prompt:
          'How should emergency departments establish systems to detect algorithm degradation in real-world settings and implement effective mitigation strategies?',
        pain:
          'Algorithms may perform well at deployment but degrade as populations, practices, and data distributions change.',
        expansion:
          'Define metrics, timelines, and response strategies for drift detection, including how to separate normal variation from clinically meaningful degradation.',
        impact:
          'Creates post-market surveillance standards that sustain algorithm safety, effectiveness, and clinician confidence.',
      },
      {
        title: 'Driving clinician adoption',
        prompt:
          'What organizational strategies and implementation approaches most effectively promote clinician adoption and integration of new ED AI tools into routine clinical workflows?',
        pain:
          'Even well-validated tools fail when adoption is low, and the organizational factors driving adoption remain inconsistently studied.',
        expansion:
          'Study culture, leadership, clinician involvement, training, and workflow redesign as drivers of sustained AI use.',
        impact:
          'Builds evidence-based implementation methods and reduces variation in deployment outcomes.',
      },
      {
        title: 'Governance and oversight for clinical AI',
        prompt:
          'What governance and oversight frameworks are needed to ensure clinical AI tools remain safe and effective in emergency departments?',
        pain:
          'Responsibility allocation among vendors, institutions, and clinicians is unclear, and governance structures vary widely.',
        expansion:
          'Define institutional oversight, roles, monitoring requirements, and response pathways for safety signals or performance failures.',
        impact:
          'Creates accountability and infrastructure for sustained safe and equitable AI deployment.',
      },
      {
        title: 'Prospective validation standards',
        prompt:
          'What should constitute minimum prospective validation evidence requirements for ED AI tools, and should these requirements differ by clinical domain?',
        pain:
          'Most ED AI literature remains retrospective and single-center, with no shared minimum validation standard before deployment.',
        expansion:
          'Determine whether validation pathways should differ for high-acuity diagnostics, operational forecasting, and other clinical domains.',
        impact:
          'Accelerates appropriate innovation while protecting patients and creating a level playing field for tool evaluation.',
      },
      {
        title: 'Automation versus system redesign',
        prompt:
          'Does AI automation in emergency medicine improve clinical and operational outcomes, or does it primarily reinforce existing workflows without meaningful system change?',
        pain:
          'AI can encode inefficient legacy workflows rather than enabling true process redesign.',
        expansion:
          'Study whether AI implementation is coupled with workflow redesign and whether it creates measurable improvement rather than superficial efficiency.',
        impact:
          'Prevents algorithmic entrenchment of outdated practices and pushes automation toward meaningful system improvement.',
      },
      {
        title: 'ROI and cost-effectiveness',
        prompt:
          'What is the return on investment and cost-effectiveness profile of different categories of ED AI tools under varied operational and financial constraints?',
        pain:
          'Resource-constrained EDs must choose among competing AI investments without emergency-specific ROI frameworks.',
        expansion:
          'Compare financial and operational value across institutions with different capacities, populations, and constraints.',
        impact:
          'Enables evidence-based prioritization of AI investments, especially in under-resourced settings.',
      },
      {
        title: 'Mitigating subgroup performance disparities',
        prompt:
          'What deployment strategies before, during, and after implementation most effectively mitigate performance disparities across patient subgroups?',
        pain:
          'Demographic validation is inconsistently reported, and algorithmic bias has real consequences for ED populations.',
        expansion:
          'Identify disparities during development, design representative validation cohorts, monitor deployment bias, and correct emerging disparities.',
        impact:
          'Protects vulnerable populations and operationalizes equity obligations for clinical AI.',
      },
      {
        title: 'Operational decision support',
        prompt:
          'How should AI be developed and studied to support ED operational decision-making, including flow, resource allocation, and staffing optimization?',
        pain:
          'Crowding and operational inefficiency threaten patient safety and staff wellbeing, but operational AI has not been systematically evaluated.',
        expansion:
          'Develop, validate, and deploy tools for admission prediction, disposition planning, staffing, and resource allocation.',
        impact:
          'Helps EDs reduce crowding, improve flow, protect staff wellbeing, and create safer work environments.',
      },
      {
        title: 'Reconciling competing AI recommendations',
        prompt:
          'How should emergency physicians and ED systems safely integrate and prioritize outputs from multiple competing AI systems when they generate conflicting recommendations?',
        pain:
          'EDs will run multiple AI tools at once, but clinicians lack guidance when systems generate conflicting signals.',
        expansion:
          'Design integrated workflows, conflict-resolution rules, clinician training, and monitoring for unintended consequences.',
        impact:
          'Reduces cognitive load, prevents decision paralysis, and helps AI systems work together rather than at cross-purposes.',
      },
    ],
    themes: [
      {
        title: 'Workflow integration and actionability',
        body:
          'Questions 1, 5, 8, 11, and 12 ask how to make AI work in practice through alignment with ED workflows, clinician cognition, operational constraints, and institutional capacity.',
      },
      {
        title: 'Safety, validation, and equity',
        body:
          'Questions 2, 3, 4, 6, 7, and 10 form the evidence backbone: bias detection, validation standards, degradation monitoring, governance, and demographic subgroup safety.',
      },
      {
        title: 'Adoption and sustainability',
        body:
          'Questions 5 and 9 directly address organizational uptake and economic sustainability, while successful implementation of all other questions depends on these barriers being solved.',
      },
    ],
    callToAction:
      'WG1 calls for prospective, multisite, rigorous evaluation through funded research programs, including randomized trials, implementation science studies, and health equity assessments across diverse institutional settings.',
    references: [
      'Rajput S, Bardsiri AN, Kachur S, et al. Artificial intelligence in emergency medicine: a systematic literature review. Int J Med Inform. 2024;183:105034.',
      'Sax DR, Gebreyes K, Zatz I, et al. The AI future of emergency medicine. Ann Emerg Med. 2024;83(3):267-277.',
      'Williams CYK, Roumeliotis A, Alon N, et al. Evaluating the use of large language models to provide clinical recommendations in the emergency department. Nat Commun. 2024;15:8713.',
      'Henry KE, Hager DN, Pronovost PJ, Saria S. Factors driving provider adoption of the TREWS machine learning-based early warning system. Nat Med. 2022;28(9):1898-1905.',
      'Wong A, Levin SR, Gomez MA, et al. Implementation considerations for the adoption of artificial intelligence in the emergency department. Am J Emerg Med. 2024;82:1-8.',
      'Levin S, Toerper M, Hamrock E, et al. Impact of AI-based triage decision support on emergency department care. NEJM AI. 2025;2(4):AIoa2400296.',
      'Obermeyer Z, Powers B, Vogeli C, Mullainathan S. Dissecting racial bias in an algorithm used to manage health populations. Science. 2019;366(6464):447-453.',
      'Rodriguez-Salgado D, Martinez K, Chen Y, et al. AI-assisted emergency department vertical patient flow optimization. Ann Emerg Med. 2025;85(4):456-468.',
      'Wu E, Mao G, Davis-Marcisak M, et al. How AI is used in FDA-authorized medical devices. npj Digit Med. 2025;8(1):23.',
      'Muehlematter UJ, Daniore P, Vokinger KN. FDA approval of AI/ML devices in radiology. JAMA Netw Open. 2024;7(12):e2441066.',
    ],
  },
  {
    wg: 2,
    title: 'Infrastructure & Data',
    subtitle: 'Building the data foundation for safe, portable ED AI',
    source: 'WG2_2page_summary_v1',
    icon: Database,
    palette: {
      name: 'sky',
      from: 'from-sky-400/20',
      via: 'via-blue-500/10',
      to: 'to-indigo-600/10',
      text: 'text-sky-200',
      border: 'border-sky-300/25',
      bg: 'bg-sky-500/[0.08]',
      dot: 'bg-sky-300',
    },
    meta: 'Co-leads: Fran Riley · Ethan Abbott',
    background:
      'AI in emergency medicine depends on data infrastructure and validation pipelines that EDs do not yet share. Fragmented EHR architectures, inconsistent data quality, and the absence of standardized benchmark datasets make it nearly impossible to compare AI tools across institutions or detect performance degradation once deployed. Algorithmic bias originates in upstream training data and propagates silently into clinical decisions about under-sampled populations. Without shared infrastructure for monitoring drift, validating models across sites, and managing the full lifecycle from development to retirement, every ED becomes its own evidence island. WG2 asks how emergency medicine builds the data foundation, technical standards, and governance frameworks needed for AI to be portable, equitable, and trustworthy across diverse care settings — including the scaffolding required to safely deploy generative and agentic AI in real-time clinical workflows.',
    composition: [
      { value: '10', label: 'consensus questions' },
      { value: '3', label: 'cross-cutting themes' },
      { value: '90%', label: 'R2 response rate' },
    ],
    questions: [
      {
        title: 'EHR data quality standards',
        prompt:
          'What minimum EHR data quality standards should be met to ensure reliable AI model performance in emergency departments, and how should these standards be monitored over time?',
        pain:
          'ED documentation is high-acuity, fragmented across systems, and inconsistent across institutions; AI models trained or deployed on such data inherit those defects.',
        expansion:
          'Define data-quality dimensions (completeness, timeliness, structure, concept fidelity) and the monitoring cadence needed to keep ED-facing AI safe.',
        impact:
          'Sets a floor for the data substrate every clinical AI tool depends on and creates accountability for institutions deploying them.',
      },
      {
        title: 'Benchmark datasets',
        prompt:
          'What standardized benchmark datasets should the emergency medicine community develop to enable fair cross-institutional comparison of AI model performance?',
        pain:
          'Without shared benchmarks, vendor claims are unverifiable and academic comparisons rest on incompatible local datasets.',
        expansion:
          'Specify which conditions, data modalities, and patient populations the EM community should curate into open or federated benchmark resources.',
        impact:
          'Enables apples-to-apples model comparison and accelerates legitimate translation while exposing performance gaps that single-site studies hide.',
      },
      {
        title: 'Real-world generalizability validation',
        prompt:
          'What real-world evidence validation methods are most appropriate for assessing whether an AI tool developed at one institution generalizes safely to other emergency departments with different patient populations and EHR systems?',
        pain:
          'Most AI tools deployed in EM are validated at a single site; failure modes only surface after broad deployment.',
        expansion:
          'Compare prospective external validation, silent-mode deployment, and federated evaluation as evidence-generation strategies for ED AI.',
        impact:
          'Reduces the post-deployment failure rate by establishing minimum generalizability evidence before broad clinical use.',
      },
      {
        title: 'Performance drift monitoring and lifecycle management',
        prompt:
          'What methods should be used to continuously monitor AI model performance drift and manage the full lifecycle of AI tools in operational EDs, and what performance degradation thresholds should trigger automatic rollback or human review?',
        pain:
          'Models that performed well at deployment degrade as populations and practice patterns evolve; few EDs run the monitoring pipelines needed to detect that drift early.',
        expansion:
          'Specify drift metrics, monitoring intervals, escalation thresholds, retraining triggers, and retirement criteria across the model lifecycle.',
        impact:
          'Creates post-market surveillance infrastructure that keeps deployed AI safe and effective without depending on human pattern recognition alone.',
      },
      {
        title: 'Data infrastructure for generative/agentic AI',
        prompt:
          'What data infrastructure capabilities are foundational for emergency departments to safely deploy generative and agentic AI in real-time clinical workflows while preserving accuracy, auditability, and patient safety?',
        pain:
          'Generative and agentic AI move from retrieval to action without the audit and rollback infrastructure that traditional CDS assumes.',
        expansion:
          'Identify the architectural building blocks — context grounding, action logging, retrieval-augmentation, guardrails — required for real-time generative AI in the ED.',
        impact:
          'Defines the technical preconditions for emergency medicine to adopt the next generation of AI tools safely.',
      },
      {
        title: 'Representativeness of training data',
        prompt:
          'How can the emergency medicine community ensure that training datasets for clinical AI are representative of the full diversity of ED patient populations, including rural, underinsured, and non-English-speaking patients?',
        pain:
          'Training datasets systematically underrepresent the populations most likely to experience ED care disparities.',
        expansion:
          'Design dataset-construction practices, federated contribution incentives, and population-coverage audits that close representation gaps.',
        impact:
          'Builds the evidence base for AI tools that perform equitably across the diverse populations EDs actually serve.',
      },
      {
        title: 'Algorithmic bias detection and mitigation',
        prompt:
          'How should emergency departments detect, measure, and mitigate algorithmic bias in AI models that arises from training data reflecting historical healthcare inequities, independent of social-determinants data capture?',
        pain:
          'Bias originating in training data propagates through deployment regardless of how SDOH variables are captured at the point of care.',
        expansion:
          'Develop subgroup performance monitoring, counterfactual auditing, and corrective interventions that operate even when sensitive attributes are missing from the EHR.',
        impact:
          'Creates standards for bias surveillance that protect patients without relying on perfect demographic data capture.',
      },
      {
        title: 'Common data models for ED data',
        prompt:
          'How can common data models be adapted or extended to capture the temporal, high-acuity data patterns unique to emergency department encounters?',
        pain:
          'Existing common data models (OMOP, PCORnet, FHIR) capture longitudinal care well but miss the rapid, high-acuity event sequences that define ED care.',
        expansion:
          'Define ED-specific extensions for triage time, acuity transitions, multi-shift handoffs, and high-frequency monitoring data.',
        impact:
          'Makes emergency-specific AI development possible on shared, interoperable data substrates rather than bespoke local schemas.',
      },
      {
        title: 'Interoperability and dynamic consent',
        prompt:
          'What interoperability standards and infrastructure are needed to interface vendor AI applications across diverse ED environments, and how should patient consent models evolve from one-time informed consent to dynamic frameworks that give patients ongoing control over how their emergency care data is used for AI development?',
        pain:
          'Vendor AI tools are locked into proprietary integrations, and patient consent is captured once at registration without mechanisms to revisit it as AI use expands.',
        expansion:
          'Specify the interoperability standards and consent architectures that let AI move across EDs while preserving patient agency over their data.',
        impact:
          'Builds the technical and ethical scaffolding for portable AI tools that respect patient rights at the data layer.',
      },
      {
        title: 'Cybersecurity of cloud vs. local deployment',
        prompt:
          'What broad cybersecurity considerations should guide the choice between cloud-hosted and locally deployed AI models in emergency care?',
        pain:
          'EDs face cybersecurity threats that disrupt clinical operations; AI deployment decisions now carry security implications that are rarely evaluated systematically.',
        expansion:
          'Compare attack surface, latency, data residency, and resilience trade-offs between cloud and local AI deployment in emergency settings.',
        impact:
          'Gives EDs an evidence-based framework for making the deployment choices that determine AI resilience in adverse conditions.',
      },
    ],
    themes: [
      {
        title: 'Data quality and lifecycle as preconditions',
        body:
          'Questions on EHR data quality, benchmarks, real-world validation, drift monitoring, and generative-AI infrastructure form a coherent stack — every layer must be solved for the one above it to be trustworthy.',
      },
      {
        title: 'Equity built into infrastructure',
        body:
          'Representativeness, bias detection, and common data models for ED-specific patterns make equity a design property of the data ecosystem rather than a post-hoc audit.',
      },
      {
        title: 'Patient agency and security at the data layer',
        body:
          'Interoperability with dynamic consent and cybersecurity decisions about where data lives translate technical infrastructure into rights and resilience.',
      },
    ],
    callToAction:
      'WG2 calls for funded multi-institutional infrastructure to operationalize shared data-quality standards, benchmark datasets, and lifecycle monitoring protocols — coordinated through SAEM with regulatory liaisons at FDA and ONC and federated partnerships across academic and community EDs.',
    references: [
      'Norgeot B, Quer G, Beaulieu-Jones BK, et al. Minimum information about clinical artificial intelligence modeling: the MI-CLAIM checklist. Nat Med. 2020;26(9):1320-1324.',
      'Wong A, Otles E, Donnelly JP, et al. External validation of a widely implemented proprietary sepsis prediction model. JAMA Intern Med. 2021;181(8):1065-1070.',
      'Sendak M, Gao M, Brajer N, Balu S. Presenting machine learning model information to clinical end users. NPJ Digit Med. 2020;3:41.',
      'Reps JM, Schuemie MJ, Suchard MA, Ryan PB, Rijnbeek PR. Design and implementation of a standardized framework to generate and evaluate patient-level prediction models. J Am Med Inform Assoc. 2018;25(8):969-975.',
      'Hripcsak G, Albers DJ. Next-generation phenotyping of electronic health records. J Am Med Inform Assoc. 2013;20(1):117-121.',
      'Obermeyer Z, Powers B, Vogeli C, Mullainathan S. Dissecting racial bias in an algorithm used to manage health populations. Science. 2019;366(6464):447-453.',
      'Rieke N, Hancox J, Li W, et al. The future of digital health with federated learning. NPJ Digit Med. 2020;3:119.',
      'Kelly CJ, Karthikesalingam A, Suleyman M, Corrado G, King D. Key challenges for delivering clinical impact with artificial intelligence. BMC Med. 2019;17(1):195.',
      'Sahni N, Stein G, Zemmel R, Cutler DM. The potential impact of artificial intelligence on healthcare spending. NBER Working Paper 30857. 2023.',
      'Coiera E, Liu S. Evidence synthesis, digital scribes, and translational challenges for artificial intelligence in healthcare. Cell Rep Med. 2022;3(12):100860.',
    ],
  },
  {
    wg: 3,
    title: 'Education & Training',
    subtitle: 'Preparing EM physicians for AI-augmented practice',
    source: 'WG3_2page_summary_v1',
    icon: GraduationCap,
    palette: {
      name: 'indigo',
      from: 'from-indigo-400/20',
      via: 'via-violet-500/10',
      to: 'to-purple-600/10',
      text: 'text-indigo-200',
      border: 'border-indigo-300/25',
      bg: 'bg-indigo-500/[0.08]',
      dot: 'bg-indigo-300',
    },
    meta: 'Co-leads: Christian Rose · Carl Preiksaitis',
    background:
      'AI tools have moved from research artifact to point-of-care reality in emergency medicine, with ambient documentation, sepsis surveillance, and imaging triage now deployed at thousands of EDs. Yet the training, assessment, and faculty-development infrastructure that prepares EM physicians to work with AI lags far behind the technology. ACGME EM Milestones 2.0, the ABEM Model, and EM Foundations 3 do not yet anchor AI-specific competencies; residents calibrate trust ad hoc; and faculty have no published model for teaching critical appraisal of AI outputs. The cognitive consequences of sustained AI use — on diagnostic reasoning, autonomy, and skill retention — remain unstudied even as deployment accelerates. Patients now arrive with their own AI-generated differentials, expanding what physicians must be trained to handle. WG3 asks what trainees and attendings need to know, how those competencies are taught and assessed, and how to preserve reasoning skills in an AI-augmented practice environment.',
    composition: [
      { value: '10', label: 'consensus questions' },
      { value: '3', label: 'cross-cutting themes' },
      { value: '73%', label: 'R2 response rate' },
    ],
    questions: [
      {
        title: 'Sustained AI use → diagnostic reasoning, autonomy, skill',
        prompt:
          'Does sustained AI use affect EM physician diagnostic reasoning, autonomy, or skill retention over time?',
        pain:
          'AI decision-support tools are now embedded in routine ED workflows, yet the longitudinal cognitive consequences for clinicians who use them daily over months and years remain unstudied.',
        expansion:
          'Compare diagnostic reasoning, autonomy of practice, and skill retention between physicians with high vs. low sustained AI exposure across training and practice.',
        impact:
          'Determines whether AI augments or degrades the core reasoning skills emergency medicine depends on, with direct implications for curriculum design.',
      },
      {
        title: 'EM AI competencies anchored in ACGME / ABEM / EM Foundations',
        prompt:
          'How should EM AI competencies be anchored in ACGME Milestones 2.0, ABEM Model, and EM Foundations 3?',
        pain:
          'No EM accreditation or assessment framework currently names AI-specific competencies, leaving programs to invent their own ad hoc.',
        expansion:
          'Map proposed AI competencies onto existing milestones, the ABEM Model, and EM Foundations 3 so curriculum development has a shared anchor.',
        impact:
          'Embeds AI training in the formal infrastructure that programs are already accountable to, accelerating system-wide adoption.',
      },
      {
        title: 'LLM delegation vs. physician-led tasks',
        prompt:
          'Which cognitive tasks are appropriate for LLM delegation vs. physician-led decision-making?',
        pain:
          'LLMs are being used for documentation, reasoning, and patient communication without a shared framework for what should and should not be delegated.',
        expansion:
          'Categorize ED cognitive work by complexity, risk, and reversibility, and identify which categories LLMs can responsibly take on.',
        impact:
          'Gives programs and clinicians a defensible framework for when LLM use is appropriate vs. inappropriate in emergency care.',
      },
      {
        title: 'Hallucination and error detection across training stages',
        prompt:
          'How reliably do EM physicians at different training stages detect LLM hallucinations and errors?',
        pain:
          'Detection of LLM error is a critical safety skill, but baseline ability varies widely and is not formally assessed.',
        expansion:
          'Measure detection reliability across PGY level, attending experience, and exposure to AI training across realistic ED scenarios.',
        impact:
          'Establishes the floor of LLM-safety competency and identifies the training stages where focused remediation is highest yield.',
      },
      {
        title: 'Patient communication about AI recommendations',
        prompt:
          'How should EM physicians communicate with patients about AI-generated recommendations, including patient-initiated AI?',
        pain:
          'Physicians lack scripts and shared vocabulary for explaining AI involvement to patients, including patients who arrive with their own AI-generated differentials.',
        expansion:
          'Develop and validate communication frameworks for disclosing AI involvement, calibrating patient trust, and responding to patient-initiated AI.',
        impact:
          'Preserves the trust core of the ED encounter as AI becomes a routine participant in care.',
      },
      {
        title: 'Competency → patient safety outcomes',
        prompt:
          'Does EM physician AI competency predict patient-level safety outcomes?',
        pain:
          'AI competency is treated as intrinsically valuable, but the downstream effect on patient safety has not been demonstrated.',
        expansion:
          'Link validated AI competency measures to patient-level outcomes (diagnostic accuracy, time-to-treatment, error rates) across multi-program cohorts.',
        impact:
          'Provides the evidence base that justifies competency-driven curriculum reform and accreditation changes.',
      },
      {
        title: 'Faculty development for AI',
        prompt:
          'What interventions prepare EM attendings to teach, assess, and role-model AI use?',
        pain:
          'No published EM-specific faculty development program exists for AI, leaving the teaching of trainees to faculty who learned on the job.',
        expansion:
          'Design and evaluate faculty-development interventions covering technical literacy, assessment, and role-modeling of AI use in clinical teaching.',
        impact:
          'Removes the most common bottleneck to embedding AI competencies into residency programs.',
      },
      {
        title: 'Resident trust calibration over training',
        prompt:
          'How do EM residents calibrate trust in AI outputs over training, and what environment features shape that calibration?',
        pain:
          'Residents calibrate trust through informal, unstructured experience that varies across programs and rotations.',
        expansion:
          'Track trust calibration longitudinally across training and identify the learning-environment features (case mix, feedback, faculty modeling) that shape it.',
        impact:
          'Identifies the structured experiences and feedback mechanisms that produce appropriately calibrated trust by graduation.',
      },
      {
        title: 'Competencies for patient-initiated AI',
        prompt:
          'What competencies enable EM physicians to manage patient-initiated AI use (chatbot differentials, AI-summarized chart access, wearables)?',
        pain:
          'Patient-initiated AI use is already common but no competency framework names the skills physicians need to manage it.',
        expansion:
          'Define the knowledge, communication, and clinical-reasoning skills required to engage productively with patient-initiated AI in real time.',
        impact:
          'Equips physicians for a clinical encounter in which patients arrive pre-equipped with AI-generated information.',
      },
      {
        title: 'Training for pre-emptive vs. post-hoc AI integration',
        prompt:
          'How do training needs differ for pre-emptive vs. post-hoc AI integration models?',
        pain:
          'Pre-emptive integration (AI surfaces recommendations before clinician review) and post-hoc integration (AI checks clinician decisions) demand fundamentally different cognitive workflows that current training does not distinguish.',
        expansion:
          'Compare cognitive workload, error patterns, and training needs between pre-emptive and post-hoc AI integration models.',
        impact:
          'Tailors training to the specific cognitive demands of each integration paradigm rather than treating AI as a monolith.',
      },
    ],
    themes: [
      {
        title: 'Anchoring competencies in existing frameworks',
        body:
          'Q2 (ACGME/ABEM/EM Foundations) and Q7 (faculty development) explicitly anchor AI training in the accreditation and program infrastructure EM already depends on, rather than building a parallel curriculum.',
      },
      {
        title: 'Cognitive effects of sustained AI use',
        body:
          'Q1, Q4, Q6, and Q8 form a longitudinal thread tracking diagnostic reasoning, hallucination detection, safety outcomes, and trust calibration as residents and attendings work with AI over time.',
      },
      {
        title: 'Patient-facing AI and the changing encounter',
        body:
          'Q5, Q9, and Q10 recognize that AI is no longer behind the curtain — patients bring AI to the encounter, integration paradigms differ, and physician communication has to adapt.',
      },
    ],
    callToAction:
      'WG3 will operationalize these competencies through ACGME/ABEM curriculum proposals, validated workplace-based assessment tools, and multi-program faculty development trials — funded primarily through training-grant pathways (R25, K12) and partnerships with CORD, SAEM RAMS, and the ABEM education committee.',
    references: [
      'Preiksaitis C, Rose C. Opportunities, challenges, and future directions of generative artificial intelligence in medical education. JMIR Med Educ. 2023;9:e48785.',
      'Boscardin CK, Gin B, Golde PB, Hauer KE. ChatGPT and generative AI in medical education. Acad Med. 2024;99(1):22-27.',
      'McCoy LG, Nagaraj S, Morgado F, Harish V, Das S, Celi LA. What do medical students actually need to know about AI? NPJ Digit Med. 2020;3:86.',
      'Han ER, Yeo S, Kim MJ, et al. Medical education trends for future physicians in the era of advanced technology and AI. BMC Med Educ. 2019;19:460.',
      'Lebovitz S, Lifshitz-Assaf H, Levina N. To engage or not to engage with AI for critical judgments. Organ Sci. 2022;33(1):126-148.',
      'Goddard K, Roudsari A, Wyatt JC. Automation bias: a systematic review of frequency, effect mediators, and mitigators. J Am Med Inform Assoc. 2012;19(1):121-127.',
      'Mosch L, Back DA, Balzer F, et al. The DCSM AI literacy framework for medical education. Stud Health Technol Inform. 2022;294:71-75.',
      'Doumat G, Daher D, Ghanem NN, Khater B. Knowledge and attitudes of medical students toward AI in medicine and radiology. BMC Med Educ. 2022;22:587.',
      'Sapci AH, Sapci HA. Artificial intelligence education and tools for medical and health informatics students. JMIR Med Educ. 2020;6(1):e19285.',
      'Marshall T, Champagne-Langabeer T, Castelli D, Hoelscher D. Cognitive aspects of artificial intelligence in clinical reasoning. AEM Educ Train. 2023;7(S1):S5-S9.',
    ],
  },
  {
    wg: 4,
    title: 'Human-AI Interaction',
    subtitle: 'How AI changes clinician cognition, identity, and the patient relationship',
    source: 'WG4_2page_summary_v1',
    icon: Brain,
    palette: {
      name: 'emerald',
      from: 'from-emerald-400/20',
      via: 'via-teal-500/10',
      to: 'to-cyan-600/10',
      text: 'text-emerald-200',
      border: 'border-emerald-300/25',
      bg: 'bg-emerald-500/[0.08]',
      dot: 'bg-emerald-300',
    },
    meta: 'Co-leads: Maame Yiadom · Tehreem Rehman',
    background:
      'AI is changing the cognitive and relational work of emergency physicians. Decision-support systems sit between clinicians and the data they reason from; ambient scribes mediate the patient encounter; patients arrive with their own AI-generated differentials. WG4 asks how AI affects clinician reasoning, autonomy, professional identity, and wellbeing, and how AI integration affects the clinician-patient relationship that emergency medicine depends on. The agenda spans first-order cognitive effects (reasoning, reliance, conditions that enhance or impair judgment), workforce effects (burnout, autonomy, satisfaction), trust and explainability (what clinicians and patients need to safely act on AI outputs), and the boundary between human oversight and AI autonomy. Without a research base on these human-factors questions, AI deployment risks degrading the cognitive and relational core of emergency medicine even as it improves measurable workflow metrics.',
    composition: [
      { value: '12', label: 'consensus questions' },
      { value: '3', label: 'cross-cutting themes' },
      { value: '81%', label: 'R2 response rate' },
    ],
    questions: [
      {
        title: 'AI vs. clinical intuition — conflict resolution',
        prompt:
          'What is the experience of emergency physicians when AI recommendations conflict with their clinical intuition, and how do they resolve that conflict in real time?',
        pain:
          'AI-clinician disagreement happens routinely in deployed CDS, but how clinicians experience and resolve those moments has not been studied.',
        expansion:
          'Use real-time observation and structured debrief to characterize AI-intuition conflict and the heuristics clinicians use to resolve it.',
        impact:
          'Surfaces the cognitive work of override decisions and informs CDS design that supports rather than overrides clinical judgment.',
      },
      {
        title: 'AI and the clinician-patient relationship',
        prompt:
          'What are the effects of AI on the quality and nature of the clinician-patient relationship in emergency care, including accuracy, timeliness, continuity, and trust?',
        pain:
          'AI mediates the encounter through scribes, decision support, and patient-facing tools, but the net effect on the clinician-patient bond is unknown.',
        expansion:
          'Measure relationship-quality outcomes across deployment models that vary in how visible AI involvement is to the patient.',
        impact:
          'Protects the patient relationship at the center of emergency care from being eroded by tools designed for efficiency alone.',
      },
      {
        title: 'Risks of clinician reliance on AI',
        prompt:
          'What are the risks of physician reliance on AI in emergency medicine, and what mitigations preserve clinician skill?',
        pain:
          'Over-reliance is a well-documented failure mode in other safety-critical industries; emergency medicine lacks specific evidence on what reliance looks like and when it tips into harm.',
        expansion:
          'Identify reliance patterns, measurable degradation in skill, and the workflow / feedback interventions that keep clinicians appropriately calibrated.',
        impact:
          'Names the boundary between productive augmentation and harmful reliance for clinicians, programs, and regulators.',
      },
      {
        title: 'AI effects on diagnostic reasoning',
        prompt:
          'How does AI-augmented clinical decision making affect emergency physicians\' diagnostic reasoning processes?',
        pain:
          'AI changes what clinicians notice, hypothesize, and rule out, but the mechanism of cognitive change is poorly characterized.',
        expansion:
          'Use protocol-analysis and observational studies to characterize how AI prompts reshape diagnostic reasoning step by step.',
        impact:
          'Reveals the cognitive pathway from AI input to clinical decision and informs how AI should be designed to support rather than short-circuit reasoning.',
      },
      {
        title: 'Clinically useful vs. distracting explainability',
        prompt:
          'What forms of AI explainability are clinically useful vs. distracting in ED workflows?',
        pain:
          'Explainability is treated as a universal good, but ED workflows have no time for explanation that does not change action.',
        expansion:
          'Compare explanation modalities (feature attribution, prototypes, counterfactuals) for ED-appropriate utility and cognitive load.',
        impact:
          'Drives explainability design toward forms that improve clinical decisions, not just satisfy ethical principles in the abstract.',
      },
      {
        title: 'CDS integration without cognitive overload',
        prompt:
          'How can AI-augmented clinical decision support be implemented in existing ED workflows without disrupting care delivery or increasing cognitive burden?',
        pain:
          'AI tools layer alerts and prompts onto already-saturated ED workflows, contributing to alert fatigue and decision overload.',
        expansion:
          'Study workflow integration strategies that minimize interruption and quantify the cognitive load they impose on physicians.',
        impact:
          'Aligns AI deployment with the cognitive limits of emergency clinicians, sustaining safety and clinician wellbeing.',
      },
      {
        title: 'Burnout, moral injury, and AI integration',
        prompt:
          'How does AI integration affect ED professional satisfaction and stress, including burnout and moral injury?',
        pain:
          'AI is positioned as a burnout intervention but deployment patterns may add cognitive load and dilute professional agency.',
        expansion:
          'Track satisfaction, burnout, and moral injury longitudinally across AI deployment patterns and clinician demographics.',
        impact:
          'Determines whether AI is an answer to or contributor to emergency-medicine workforce attrition.',
      },
      {
        title: 'Conditions enhancing or impairing decisions',
        prompt:
          'Under what conditions does AI enhance or impair ED clinical decision making?',
        pain:
          'AI effects are context-dependent — alertness, case mix, time pressure, and team dynamics all shape outcomes, but the conditions are not mapped.',
        expansion:
          'Identify the case, team, and environmental conditions under which AI augmentation improves or degrades decision quality.',
        impact:
          'Allows deployment to be tuned to the conditions where AI helps, and dampened where it does not.',
      },
      {
        title: 'Mitigating bias and inequity in CDS implementation',
        prompt:
          'Which ED AI implementation strategies best balance and mitigate unintended bias and inequities across patient subgroups?',
        pain:
          'Even well-designed AI tools produce biased outcomes when deployment context interacts with patient demographics in unmodeled ways.',
        expansion:
          'Compare deployment strategies (silent mode, threshold tuning, subgroup monitoring) for their effect on inequity in real ED use.',
        impact:
          'Operationalizes equity in deployment decisions, not just model training.',
      },
      {
        title: 'Clinician autonomy under AI integration',
        prompt:
          'How does AI integration impact emergency physicians\' autonomy?',
        pain:
          'AI prompts can shift decisional authority from clinicians to algorithms and the institutions that deploy them; the consequences for autonomy are not well characterized.',
        expansion:
          'Measure clinician-perceived and structural autonomy across AI integration models and deployment intensities.',
        impact:
          'Names the conditions under which AI augments vs. erodes the professional autonomy emergency medicine depends on.',
      },
      {
        title: 'Patient trust in AI involvement',
        prompt:
          'What factors shape patient trust in AI involvement in their clinical care — including disclosure, explanation, and consent?',
        pain:
          'Patients may not know AI is involved in their care; even when they do, the determinants of trust have not been mapped.',
        expansion:
          'Identify the disclosure, explanation, and consent practices that calibrate patient trust appropriately across patient demographics.',
        impact:
          'Establishes the patient-facing communication standards needed for AI deployment that respects patient agency.',
      },
      {
        title: 'Adaptive AI that learns from clinician feedback',
        prompt:
          'How should adaptive AI systems that learn from clinician feedback be designed and governed to ensure they improve rather than degrade over time?',
        pain:
          'Continuously learning AI can drift in response to biased feedback signals, magnifying existing patterns rather than correcting them.',
        expansion:
          'Specify the feedback structures, monitoring metrics, and human-in-the-loop governance that keep adaptive AI improving safely.',
        impact:
          'Gives EDs a framework for adopting next-generation adaptive AI tools without compounding bias or losing oversight.',
      },
    ],
    themes: [
      {
        title: 'Cognition and reasoning under AI augmentation',
        body:
          'Q1, Q3, Q4, and Q8 address how AI changes what clinicians notice, hypothesize, and decide — the core cognitive work of emergency care.',
      },
      {
        title: 'Trust, oversight, and adaptation',
        body:
          'Q5, Q6, and Q12 form the trust-and-oversight thread: how explainability, workflow integration, and adaptive feedback shape calibrated trust over time.',
      },
      {
        title: 'Workforce identity and the clinician-patient bond',
        body:
          'Q2, Q7, Q10, and Q11 capture AI\'s effects on what physicians experience (autonomy, burnout) and what patients perceive (relationship quality, trust).',
      },
    ],
    callToAction:
      'WG4 calls for prospective human-factors studies — in-situ observation, simulation, and longitudinal cognitive measurement — funded by AHRQ patient-safety mechanisms and SAEM human-factors grants, with the goal of evidence-based AI deployment standards that protect cognition, autonomy, and the clinician-patient relationship.',
    references: [
      'Lebovitz S, Lifshitz-Assaf H, Levina N. To engage or not to engage with AI for critical judgments. Organ Sci. 2022;33(1):126-148.',
      'Goddard K, Roudsari A, Wyatt JC. Automation bias: a systematic review of frequency, effect mediators, and mitigators. J Am Med Inform Assoc. 2012;19(1):121-127.',
      'Ghassemi M, Oakden-Rayner L, Beam AL. The false hope of current approaches to explainable artificial intelligence in health care. Lancet Digit Health. 2021;3(11):e745-e750.',
      'Asan O, Bayrak AE, Choudhury A. Artificial intelligence and human trust in healthcare. J Med Internet Res. 2020;22(6):e15154.',
      'Triberti S, Durosini I, Pravettoni G. A "third wheel" effect in health decision making involving AI. Front Public Health. 2020;8:117.',
      'Verghese A, Shah NH, Harrington RA. What this computer needs is a physician. JAMA. 2018;319(1):19-20.',
      'Topol EJ. High-performance medicine: the convergence of human and artificial intelligence. Nat Med. 2019;25(1):44-56.',
      'Char DS, Shah NH, Magnus D. Implementing machine learning in health care — addressing ethical challenges. N Engl J Med. 2018;378(11):981-983.',
      'Lyell D, Coiera E. Automation bias and verification complexity: a systematic review. J Am Med Inform Assoc. 2017;24(2):423-431.',
      'Sittig DF, Wright A, Coiera E, et al. Current challenges in health information technology-related patient safety. Health Informatics J. 2020;26(1):181-189.',
      'Carayon P, Hoonakker P. Human factors and usability for health information technology. Yearb Med Inform. 2019;28(1):71-77.',
    ],
  },
  {
    wg: 5,
    title: 'Ethics, Legal & Society',
    subtitle: 'Making accountability, equity, and trust first-order science',
    source: 'WG5_2page_summary_v5.docx',
    icon: Scale,
    palette: {
      name: 'amber',
      from: 'from-amber-400/20',
      via: 'via-orange-500/10',
      to: 'to-rose-600/10',
      text: 'text-amber-200',
      border: 'border-amber-300/25',
      bg: 'bg-amber-500/[0.08]',
      dot: 'bg-amber-300',
    },
    meta: 'Co-leads: Arwen Declan, Yohan Sumathipala, M. Kennedy Hall',
    background:
      'Artificial intelligence is entering emergency medicine faster than the legal, ethical, and regulatory infrastructure needed to govern it. Algorithmic bias can amplify existing disparities, liability frameworks offer incomplete guidance for shared decision pathways, and governance structures are not yet adapted to AI-augmented care.',
    composition: [
      { value: '5', label: 'final questions' },
      { value: '3', label: 'cross-cutting threads' },
      { value: '10', label: 'listed authors' },
    ],
    questions: [
      {
        title: 'Reasonable physician standard',
        prompt:
          'How does the reasonable physician standard apply to AI-augmented medical decision-making, including when a reasonable physician would use, disagree with, or not use an AI recommendation?',
        body:
          'Without a defined legal or evidentiary standard for AI-augmented judgment, clinicians and institutions lack guidance when AI and physician assessments conflict. The work must operationalize malpractice doctrine, accountability, informed consent, and disclosure thresholds for embedded AI.',
      },
      {
        title: 'Bias, diagnostic error, and under-triage',
        prompt:
          'Regarding marginalized groups, how should AI systems be developed, governed, and evaluated to prevent bias, diagnostic errors, and under-triage?',
        body:
          'Training datasets systematically under-represent vulnerable populations served by EDs. The question combines technical requirements such as dataset auditing and subgroup monitoring with policy requirements for institutional accountability, industry accountability, and community engagement.',
      },
      {
        title: 'Human-AI teaming and safe staffing',
        prompt:
          'What human-AI teaming risk management systems are needed for safe ED implementation, including how safe staffing is defined, measured, and enacted in policy?',
        body:
          'New tools alter workflow and team dynamics without validated frameworks for safe collaboration, staffing ratios, oversight standards, or acceptable failure modes. This agenda links governance, quality controls, staffing policy, and advanced practice scope.',
      },
      {
        title: 'Externalities of large-scale AI deployment',
        prompt:
          'What broader societal and health-system consequences result from large-scale AI deployment in emergency medicine?',
        body:
          'AI deployment often focuses on clinical performance while neglecting patient costs, insurance denials, reimbursement, resource allocation, and environmental impacts such as energy and water use. WG5 calls for a validated externality framework.',
      },
      {
        title: 'Reasonable AI Standard',
        prompt:
          'What standards define a Reasonable AI Standard for medicine to ensure accurate, accountable, and equitable care across special populations?',
        body:
          'Emergency medicine needs technical, legal, and ethical benchmarks for accuracy, consistent performance across under-represented populations, and accountability structures that scale across multiple human oversight models.',
      },
    ],
    themes: [
      {
        title: 'AI capability versus legal accountability',
        body:
          'The reasonable physician standard, liability distribution, and consent thresholds all address law lagging behind AI use in ED decision-making.',
      },
      {
        title: 'Equity as an enforceable standard',
        body:
          'Equity must be embedded in procurement standards, bias-monitoring requirements, staffing policy, and harm assessment rather than corrected after deployment.',
      },
      {
        title: 'Shared responsibility boundaries',
        body:
          'Developers, health systems, regulators, and clinicians each hold accountability, but the allocation remains undefined and requires cross-WG coordination.',
      },
    ],
    callToAction:
      'WG5 recommends integrating this summary into conference proceedings, expanding the core concepts into a high-impact manuscript, and engaging federal partners such as FDA, ONC, and CMS on funding and regulatory pathways.',
    references: [
      'Obermeyer Z, Powers B, Vogeli C, Mullainathan S. Dissecting racial bias in an algorithm used to manage health populations. Science. 2019;366(6464):447-453.',
      'Price WN 2nd, Gerke S, Cohen IG. Potential liability for physicians using artificial intelligence. JAMA. 2019;322(18):1765-1766.',
      'Gerke S, Minssen T, Cohen G. Ethical and legal challenges of artificial intelligence-driven healthcare. In: Artificial Intelligence in Healthcare. Elsevier; 2020.',
      'Rane S. The Reasonable Person Standard for AI. arXiv. 2024. doi:10.48550/arXiv.2406.04671.',
      'Braun M, Hummel P, Beck S, Dabrock P. Primer on an ethics of AI-based decision support systems in the clinic. J Med Ethics. 2020.',
      'Sendak M, Elish MC, Gao M, et al. The human body is a black box. Proceedings of FAT*. ACM; 2020.',
      'Mello MM, Frakes MD, Blumenkranz E, Studdert DM. Malpractice liability and health care quality. JAMA. 2020;323(4):352-366.',
      'Huang R, Wu H, Yuan Y, et al. Evaluation and bias analysis of large language models in synthetic EHR generation. J Med Internet Res. 2025;27:e65317.',
      'Zack T, Lehman E, Suzgun M, et al. Assessing GPT-4 racial and gender bias in health care. Lancet Digit Health. 2024;6(1):e12-e22.',
      'Ong AY, Merle DA, Pollreisz A, et al. Flight rules for clinical AI. NPJ Digit Med. 2026;9(1).',
      'Luccioni AS, Strubell E, Crawford K. From efficiency gains to rebound effects. ACM FAccT. 2025.',
      'O\'Neill T, McNeese N, Barron A, Schelble B. Human-autonomy teaming. Hum Factors. 2022;64(5):904-938.',
    ],
  },
];

// Aggregate stats for the hero — computed once from SUMMARY_DOCS so the
// numbers can't drift from the underlying content as WG entries are
// added or edited.
const HERO_STATS = {
  totalQuestions: SUMMARY_DOCS.reduce((n, d) => n + (d.questions?.length || 0), 0),
  totalThemes: SUMMARY_DOCS.reduce((n, d) => n + (d.themes?.length || 0), 0),
};

function Icon({ icon, className }) {
  return createElement(icon, { className });
}

export function WorkingGroupsSummaryPage() {
  usePageTitle('Working Group Summary Presentations');

  return (
    <div className="min-h-screen overflow-hidden bg-[#07111f] text-white">
      <Helmet>
        <title>Working Group Summary Presentations - SAEM 2026 AI Consensus</title>
        <meta
          name="description"
          content="Presentation-style working group summaries for the SAEM 2026 AI Consensus Conference."
        />
      </Helmet>

      <section className="relative border-b border-white/[0.06] px-4 pb-12 pt-10 sm:px-6 sm:pt-14">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(72,202,228,0.18),transparent_28%),radial-gradient(circle_at_80%_0%,rgba(245,158,11,0.16),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.04),transparent_45%)]" />
        <div className="relative mx-auto max-w-7xl">
          <Link
            to="/welcome"
            className="mb-6 inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-500/[0.08] px-3 py-2 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/[0.16] hover:text-cyan-100"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Welcome
          </Link>

          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-cyan-200/90">
                Working Group Summary Library
              </p>
              <h1 className="mt-3 max-w-4xl text-4xl font-black tracking-tight text-white sm:text-6xl">
                The two-page summaries, rebuilt as presentation decks.
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-relaxed text-white/62 sm:text-lg">
                These sections transform the available Word summaries into readable,
                conference-ready platform presentations: overview, research question deck,
                thematic architecture, call-to-action, and references.
              </p>
            </div>

            <Card className="border-white/[0.08] bg-white/[0.045] shadow-2xl shadow-cyan-950/30">
              <CardContent className="p-5">
                <div className="grid grid-cols-3 gap-3">
                  <HeroStat value={SUMMARY_DOCS.length} label="WG summaries" />
                  <HeroStat value={HERO_STATS.totalQuestions} label="questions" />
                  <HeroStat value={HERO_STATS.totalThemes} label="themes" />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {SUMMARY_DOCS.map((doc) => (
                    <Link
                      key={doc.wg}
                      to={`/working-groups/${doc.wg}`}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition hover:bg-white/[0.08] ${doc.palette.border} ${doc.palette.text}`}
                    >
                      WG {doc.wg}: {doc.title}
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl space-y-14 px-4 py-12 sm:px-6 sm:py-16">
        <section className="grid gap-4 md:grid-cols-2">
          {SUMMARY_DOCS.map((doc) => (
            <DocumentLaunchCard key={doc.wg} doc={doc} />
          ))}
        </section>

      </main>
    </div>
  );
}

// ---------- Detail page (/working-groups/:wg) ----------

export function WorkingGroupSummaryDetailPage() {
  const { wg } = useParams();
  const wgNumber = Number(wg);
  const doc = SUMMARY_DOCS.find((d) => d.wg === wgNumber);
  usePageTitle(doc ? `WG ${doc.wg} · ${doc.title}` : 'Working group summary');

  if (!doc) {
    // Unknown WG — bounce back to the index rather than 404.
    return <Navigate to="/working-groups" replace />;
  }

  return (
    <div className="min-h-screen bg-[#070F1F] text-white">
      <Helmet>
        <title>WG {doc.wg} · {doc.title} — SAEM 2026</title>
      </Helmet>
      <div className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#070F1F]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
          <Link
            to="/working-groups"
            className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-xs font-medium text-white/70 transition hover:bg-white/[0.08] hover:text-white"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            All working group summaries
          </Link>
          <Badge variant="outline" className={`${doc.palette.border} ${doc.palette.text}`}>
            WG {doc.wg}
          </Badge>
        </div>
      </div>
      <main className="mx-auto max-w-7xl space-y-10 px-4 py-10 sm:px-6 sm:py-14">
        <SummaryPresentation doc={doc} />
        <div className="flex justify-center">
          <Link to="/working-groups">
            <Button variant="secondary" size="sm">
              <ChevronLeft className="h-4 w-4" />
              Back to all summaries
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}

function HeroStat({ value, label }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-black/15 p-4 text-center">
      <div className="text-3xl font-black text-white">{value}</div>
      <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-white/38">{label}</div>
    </div>
  );
}

function DocumentLaunchCard({ doc }) {
  return (
    <Link to={`/working-groups/${doc.wg}`} className="group block">

      <Card className={`relative h-full overflow-hidden border ${doc.palette.border} bg-white/[0.04] transition duration-300 hover:-translate-y-1 hover:bg-white/[0.06]`}>
        <div className={`absolute inset-0 bg-gradient-to-br ${doc.palette.from} ${doc.palette.via} ${doc.palette.to}`} />
        <CardContent className="relative flex h-full flex-col p-6">
          <div className="flex items-start justify-between gap-4">
            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${doc.palette.bg} ${doc.palette.text}`}>
              <Icon icon={doc.icon} className="h-7 w-7" />
            </div>
            <Badge variant="outline" className={`${doc.palette.border} ${doc.palette.text}`}>
              {doc.source}
            </Badge>
          </div>
          <h2 className="mt-6 text-2xl font-black text-white">
            WG {doc.wg}: {doc.title}
          </h2>
          <p className="mt-2 text-sm font-semibold text-white/70">{doc.subtitle}</p>
          <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-white/50">{doc.background}</p>
          <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-white/70 transition group-hover:text-white">
            Open presentation
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function SummaryPresentation({ doc }) {
  return (
    <article id={`wg-${doc.wg}`} className="scroll-mt-20">
      <section className={`relative overflow-hidden rounded-[2rem] border ${doc.palette.border} bg-[#0A1628] shadow-2xl shadow-black/25`}>
        <div className={`absolute inset-0 bg-gradient-to-br ${doc.palette.from} ${doc.palette.via} ${doc.palette.to}`} />
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/[0.06] blur-3xl" />
        <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[0.8fr_1.2fr] lg:p-10">
          <div>
            <Badge variant="outline" className={`${doc.palette.border} ${doc.palette.text}`}>
              Working Group {doc.wg}
            </Badge>
            <h2 className="mt-5 text-3xl font-black tracking-tight text-white sm:text-5xl">
              {doc.title}
            </h2>
            <p className={`mt-3 text-lg font-semibold ${doc.palette.text}`}>{doc.subtitle}</p>
            {doc.meta && <p className="mt-3 text-sm text-white/48">{doc.meta}</p>}
            <p className="mt-6 text-sm leading-relaxed text-white/62">{doc.background}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 lg:self-end">
            {doc.composition.map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/[0.08] bg-black/20 p-5">
                <div className="text-4xl font-black text-white">{item.value}</div>
                <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-white/38">
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[0.7fr_1.3fr]">
        <aside className="space-y-4">
          <SlideCard icon={BookOpen} eyebrow="Source" title="Document provenance" palette={doc.palette}>
            <p className="text-sm leading-relaxed text-white/55">
              Rebuilt from <span className="font-semibold text-white/75">{doc.source}</span> in
              `docs/wg_summaries`. The platform version keeps the source narrative but breaks it
              into presentation-friendly panels.
            </p>
          </SlideCard>

          <SlideCard icon={Target} eyebrow="Action" title="Call to action" palette={doc.palette}>
            <p className="text-sm leading-relaxed text-white/58">{doc.callToAction}</p>
          </SlideCard>
        </aside>

        <section className="space-y-6">
          <SlideCard icon={ClipboardList} eyebrow="Question Deck" title="Final research questions" palette={doc.palette}>
            <div className="space-y-3">
              {doc.questions.map((question, index) => (
                <QuestionPanel
                  key={question.title}
                  index={index + 1}
                  question={question}
                  palette={doc.palette}
                />
              ))}
            </div>
          </SlideCard>

          <SlideCard icon={Lightbulb} eyebrow="Thematic Architecture" title="Cross-cutting threads" palette={doc.palette}>
            <div className="grid gap-3 md:grid-cols-3">
              {doc.themes.map((theme) => (
                <div key={theme.title} className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
                  <div className={`mb-3 h-1.5 w-10 rounded-full ${doc.palette.dot}`} />
                  <h4 className="text-sm font-bold text-white">{theme.title}</h4>
                  <p className="mt-2 text-xs leading-relaxed text-white/50">{theme.body}</p>
                </div>
              ))}
            </div>
          </SlideCard>

          <SlideCard icon={FileText} eyebrow="References" title="Source references" palette={doc.palette}>
            <details className="group">
              <summary className="cursor-pointer text-sm font-semibold text-white/65 transition hover:text-white">
                Show {doc.references.length} references
              </summary>
              <ol className="mt-4 space-y-2 text-xs leading-relaxed text-white/45">
                {doc.references.map((ref, index) => (
                  <li key={ref} className="flex gap-2">
                    <span className="font-mono text-white/25">{index + 1}.</span>
                    <span>{ref}</span>
                  </li>
                ))}
              </ol>
            </details>
          </SlideCard>
        </section>
      </div>
    </article>
  );
}

function SlideCard({ icon, eyebrow, title, palette, children }) {
  return (
    <Card className={`border ${palette.border} bg-white/[0.035]`}>
      <CardContent className="p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${palette.bg} ${palette.text}`}>
            <Icon icon={icon} className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/35">{eyebrow}</p>
            <h3 className="text-xl font-black text-white">{title}</h3>
          </div>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function QuestionPanel({ index, question, palette }) {
  return (
    <details className={`group rounded-2xl border ${palette.border} bg-black/15 p-4 open:bg-black/25`}>
      <summary className="flex cursor-pointer list-none gap-3">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${palette.bg} font-mono text-sm font-black ${palette.text}`}>
          {index}
        </span>
        <span>
          <span className="block text-sm font-black text-white">{question.title}</span>
          <span className="mt-1 block text-sm leading-relaxed text-white/58">{question.prompt}</span>
        </span>
      </summary>
      <div className="mt-4 grid gap-3 border-t border-white/[0.06] pt-4 md:grid-cols-3">
        {question.pain && <DetailBlock label="Pain point" body={question.pain} />}
        {question.expansion && <DetailBlock label="Conceptual expansion" body={question.expansion} />}
        {question.impact && <DetailBlock label="Anticipated impact" body={question.impact} />}
        {question.body && <DetailBlock label="Why it matters" body={question.body} wide />}
      </div>
    </details>
  );
}

function DetailBlock({ label, body, wide = false }) {
  return (
    <div className={`rounded-xl border border-white/[0.06] bg-white/[0.035] p-3 ${wide ? 'md:col-span-3' : ''}`}>
      <div className="text-[10px] font-bold uppercase tracking-wider text-white/35">{label}</div>
      <p className="mt-1 text-xs leading-relaxed text-white/52">{body}</p>
    </div>
  );
}

export default WorkingGroupsSummaryPage;
