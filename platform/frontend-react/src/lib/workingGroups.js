// Supplementary per-working-group metadata that isn't in the DB/API.
// Keyed by wg_number (1-5). Matches the structure confirmed in Apr 2026.

export const WG_EXTRAS = {
  1: {
    liaison: { name: 'Andy Muck', role: 'Planning Committee Liaison' },
    tagline: 'How AI integrates into ED workflows, safety, and daily clinical practice.',
    keyTopics: [
      'Clinical decision support integration at the point of care',
      'Workflow redesign around AI tools',
      'Safety monitoring and failure modes',
      'Operational implementation and adoption',
    ],
  },
  2: {
    liaison: { name: 'Tom Hartka', role: 'Planning Committee Liaison' },
    tagline: 'The data, infrastructure, and technical foundations that AI requires.',
    keyTopics: [
      'Data standards and interoperability',
      'Model validation and regulatory frameworks',
      'Infrastructure, deployment, and monitoring',
      'Cross-institutional data sharing',
    ],
  },
  3: {
    liaison: { name: 'Matt Trowbridge', role: 'Planning Committee Liaison' },
    tagline: 'Preparing emergency physicians and trainees for AI-augmented practice.',
    keyTopics: [
      'Medical school and residency curricula',
      'Assessment of AI-related competencies',
      'Faculty development and CME',
      'Simulation and experiential learning',
    ],
  },
  4: {
    liaison: { name: 'Moira Smith', role: 'Planning Committee Liaison' },
    tagline: 'Cognition, identity, trust, and wellbeing when humans work with AI.',
    keyTopics: [
      'Trust calibration and automation bias',
      'Effects on diagnostic reasoning',
      'Professional identity and deskilling',
      'Cognitive load and burnout',
    ],
  },
  5: {
    liaison: { name: 'Andrew Taylor', role: 'Planning Committee Liaison & Chair' },
    tagline: 'The ethical, legal, equity, and societal dimensions of AI in emergency medicine.',
    keyTopics: [
      'Algorithmic bias and health equity',
      'Liability and regulatory responsibility',
      'Patient consent and transparency',
      'Policy and public trust',
    ],
  },
};

// Phase labels for the activity cards on the WG hub page.
export const PHASE_INFO = {
  round_1: {
    label: 'Delphi Round 1',
    blurb: 'Rate the importance and feasibility of candidate research questions. Suggest additions.',
  },
  round_2: {
    label: 'Delphi Round 2',
    blurb: 'Revisit your ratings after seeing the group\u2019s Round 1 results and synthesis.',
  },
  pairwise: {
    label: 'Pairwise Ranking',
    blurb: 'Head-to-head comparisons of top-rated questions. Vote as many times as you like.',
  },
  results: {
    label: 'Results',
    blurb: 'Live Bradley-Terry rankings, Delphi consensus metrics, and AI-synthesized themes.',
  },
};
