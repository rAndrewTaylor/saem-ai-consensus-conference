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
      { value: '4', label: 'adjacent WG links' },
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

const UPCOMING_WGS = [
  { wg: 2, title: 'Data, Infrastructure & Technical Foundations', icon: Cpu },
  { wg: 3, title: 'Education & Training', icon: GraduationCap },
  { wg: 4, title: 'Human Factors, Cognition & Trust', icon: Brain },
];

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
                  <HeroStat value={SUMMARY_DOCS.length} label="live docs" />
                  <HeroStat value="17" label="questions" />
                  <HeroStat value="6" label="themes" />
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

        <section className="rounded-3xl border border-white/[0.08] bg-white/[0.035] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/35">
                Coming Soon
              </p>
              <h2 className="mt-1 text-xl font-bold text-white">Additional working group summaries</h2>
            </div>
            <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs font-medium text-white/45">
              WG2, WG3, and WG4 will appear here when their summaries are ready
            </span>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {UPCOMING_WGS.map((wg) => (
              <div key={wg.wg} className="rounded-2xl border border-dashed border-white/[0.12] bg-black/10 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] text-white/35">
                    <Icon icon={wg.icon} className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white/75">WG {wg.wg}</div>
                    <div className="text-xs text-white/42">{wg.title}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
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
