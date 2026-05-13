/**
 * Static config for panel-mode views.
 *
 * Discussion prompts mirror docs/conference-day/discussion_prompts.md
 * (synthesized from each WG's R2 question set). Keep in sync if either
 * is edited.
 */

export const WG_LABELS = {
  1: 'Clinical Practice & Operations',
  2: 'Infrastructure & Data Ecosystems',
  3: 'Education, Training & Competency',
  4: 'Human-AI Interaction & Perception of Self',
  5: 'Ethical, Legal & Societal Implications',
};

export const PILLAR_COLORS = {
  1: '#00B4D8',
  2: '#22d3ee',
  3: '#8b5cf6',
  4: '#10b981',
  5: '#f59e0b',
};

export const PANEL_PROMPTS = {
  1: [
    { label: 'Prompt 1.1', text: 'How do we move from technically-validated AI outputs to meaningfully better clinical and operational outcomes in the ED — and what design, workflow, and governance conditions are required to bridge that gap?' },
    { label: 'Prompt 1.2', text: 'As EDs deploy multiple AI systems (imaging, triage, sepsis, LLMs, scribes), how should we approach validation, lifecycle monitoring, build-vs-buy decisions, and clinician adoption when the unit of intervention is a portfolio, not a single tool?' },
    { label: 'Prompt 1.3', text: 'What does equitable AI implementation look like for historically understudied populations (behavioral health, pediatrics, rural, non-English-speaking), and where are the biggest infrastructure or organizational gaps preventing scale?' },
  ],
  2: [
    { label: 'Prompt 2.1', text: 'What does the minimum viable data foundation look like for an ED to safely deploy AI — covering data quality, SDOH capture, de-identification, governance, and ongoing drift monitoring — and where are the biggest gaps today?' },
    { label: 'Prompt 2.2', text: 'How can the EM community detect, measure, and mitigate algorithmic bias originating in training data, especially for under-represented populations, and what infrastructure investments most reliably reduce that bias?' },
    { label: 'Prompt 2.3', text: 'What are the right structures for multi-institutional collaboration on ED AI (federated learning, data sharing, dynamic consent, synthetic data, cross-institutional benchmarks) given the constraints of emergency care?' },
  ],
  3: [
    { label: 'Prompt 3.1', text: 'How should AI competencies be defined and tiered across the EM training continuum (med student → attending → educator), and how do we anchor them in existing frameworks (Milestones, ABEM MCP, EM Foundations 3) without bolting on more checklists?' },
    { label: 'Prompt 3.2', text: 'Does sustained AI use erode diagnostic reasoning, autonomy, or skill retention — and if so, what training and workflow interventions preserve clinical judgment while still capturing AI\'s benefits? How do we teach calibrated trust and hallucination detection?' },
    { label: 'Prompt 3.3', text: 'As patients arrive with chatbot differentials, AI-summarized charts, and consumer wearable interpretations, what competencies do EM physicians need to manage these encounters, and how should we communicate with patients about AI-generated recommendations?' },
  ],
  4: [
    { label: 'Prompt 4.1', text: 'How does AI integration affect physician diagnostic reasoning, autonomy, professional identity, burnout, and well-being — and where is the line between augmentation that supports clinicians vs. erosion of the skills that define the specialty?' },
    { label: 'Prompt 4.2', text: 'What does informed consent, trust, and the clinician-patient relationship look like when AI sits between physician and patient — and how do we handle patients arriving with their own AI-generated information?' },
    { label: 'Prompt 4.3', text: 'How should clinicians and ED systems handle the moments where AI conflicts with intuition, where responsibility shifts after an AI-assisted decision causes harm, and where automation bias quietly distorts care?' },
  ],
  5: [
    { label: 'Prompt 5.1', text: 'How should the reasonable-physician standard apply when AI is in the loop, and how should liability be distributed across developers, health systems, and clinicians when an AI-assisted decision causes harm?' },
    { label: 'Prompt 5.2', text: 'What legal frameworks, institutional accountability mechanisms, and design practices are needed to ensure AI doesn\'t worsen access for marginalized populations, doesn\'t enable insurance-driven care refusals, and accounts for environmental and socioeconomic costs?' },
    { label: 'Prompt 5.3', text: 'As AI is deployed across pre-ED, ED, and post-ED care, and expands APP scope and changes safe-staffing dynamics, what institutional governance, oversight, and patient-rights mechanisms keep the system tethered to patient safety and EM ethics?' },
  ],
};

export const CROSS_WG_PROMPT =
  "If a researcher writing a major grant in the year after this conference could fund only three of the questions surfaced today across all five working groups, which three would have the highest impact on emergency care over the next decade, and why?";
