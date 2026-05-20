/**
 * /background — substantive methodology page for the conference.
 *
 * Linked from the Welcome tile grid. Intentionally distinct from the
 * marketing-tone /#process anchor on the homepage; this is the page
 * for people who want to know *how* the consensus was actually built
 * — Delphi rounds, pairwise math, AI synthesis, conference-day output.
 */

import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  ChevronLeft, ArrowRight, ClipboardList, GitCompare, Sparkles, Radio,
  Network, Calendar, BookOpen, Layers, Target, FileText, AlertCircle,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { usePageTitle } from '@/hooks/usePageTitle';

export function BackgroundPage() {
  usePageTitle('Background — Methodology');
  return (
    <div className="min-h-screen bg-[#0A1628] text-white">
      <Helmet>
        <title>Background — SAEM 2026 AI Consensus</title>
        <meta name="description" content="How the SAEM 2026 AI Consensus Conference was built — modified Delphi, pairwise comparison, AI synthesis, conference-day output." />
      </Helmet>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/[0.06] px-4 pt-10 pb-12 sm:px-6 sm:pt-14">
        <div className="pointer-events-none absolute -top-32 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-b from-cyan-500/15 to-transparent blur-3xl" />
        <div className="relative mx-auto max-w-4xl">
          <Link
            to="/welcome"
            className="mb-5 inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-500/[0.08] px-3 py-2 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/[0.16] hover:text-cyan-100"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Welcome
          </Link>

          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-300/90">
            Background
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            How this consensus was built
          </h1>
          <p className="mt-3 max-w-2xl text-base text-white/60 sm:text-lg">
            A multi-layered modified-Delphi process — augmented (not replaced) by AI
            — running from April through May 21 to produce a 10-year research
            agenda for AI in emergency medicine.
          </p>

          {/* TOC chips */}
          <nav className="mt-6 flex flex-wrap gap-2">
            {TOC.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs font-medium text-white/55 transition hover:bg-white/[0.08] hover:text-white"
              >
                {s.label}
              </a>
            ))}
          </nav>
        </div>
      </section>

      <div className="mx-auto max-w-4xl space-y-12 px-4 py-12 sm:px-6 sm:py-16">
        <WhySection />
        <LayersSection />
        <DelphiSection />
        <PairwiseSection />
        <AISection />
        <ConferenceDaySection />
        <CrossWgSection />
        <TimelineSection />
        <OutputsSection />
        <AcknowledgmentsSection />
      </div>
    </div>
  );
}

const TOC = [
  { id: 'why',          label: 'Why this conference' },
  { id: 'layers',       label: 'Five layers' },
  { id: 'delphi',       label: 'Modified Delphi' },
  { id: 'pairwise',     label: 'Pairwise ranking' },
  { id: 'ai',           label: 'AI synthesis' },
  { id: 'conference',   label: 'Conference day' },
  { id: 'cross-wg',     label: 'Cross-WG analysis' },
  { id: 'timeline',     label: 'Timeline' },
  { id: 'outputs',      label: 'Outputs' },
  { id: 'acks',         label: 'Acknowledgments' },
];

// ─────────────────────────────────────────────────────────────────────

function SectionTitle({ icon: Icon, eyebrow, title, id, tone = 'cyan' }) {
  const colorMap = {
    cyan:    'text-cyan-300 bg-cyan-500/15',
    purple:  'text-purple-300 bg-purple-500/15',
    emerald: 'text-emerald-300 bg-emerald-500/15',
    amber:   'text-amber-300 bg-amber-500/15',
    pink:    'text-pink-300 bg-pink-500/15',
    indigo:  'text-indigo-300 bg-indigo-500/15',
  };
  return (
    <header id={id} className="scroll-mt-20">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${colorMap[tone] || colorMap.cyan}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/40">
            {eyebrow}
          </p>
          <h2 className="text-xl font-bold text-white sm:text-2xl">{title}</h2>
        </div>
      </div>
    </header>
  );
}

// ─────────────────────────────────────────────────────────────────────

function WhySection() {
  return (
    <section className="space-y-4">
      <SectionTitle id="why" eyebrow="Why" title="Why this conference exists" icon={Target} tone="cyan" />
      <div className="space-y-3 text-base leading-relaxed text-white/70">
        <p>
          AI tools are entering emergency departments faster than the field can
          decide where they should be heading. Imaging models, sepsis early-warning
          systems, LLM scribes, triage support, decision aids — each is being
          piloted somewhere, but there is no shared research agenda telling the
          community which questions matter most over the next decade.
        </p>
        <p>
          SAEM convened this consensus conference to produce that agenda: a
          prioritized set of research questions across five domains, generated by
          working-group experts, sharpened through two Delphi rounds, and
          finalized on the conference floor on May 21, 2026. The output is
          intended to guide grant calls, individual investigator portfolios, and
          the field's collective attention through 2036.
        </p>
        <p className="text-white/55">
          The conference also <em>models</em> what it studies. Every AI-augmented
          step in the process is documented, human-reviewed, and reported — so
          the methodology itself is a contribution, not just an enabler.
        </p>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────

function LayersSection() {
  return (
    <section className="space-y-4">
      <SectionTitle id="layers" eyebrow="At a glance" title="Five complementary layers" icon={Layers} tone="purple" />
      <p className="text-base text-white/60">
        The consensus process runs across five layers, each producing distinct
        evidence that can be analyzed alone and in combination.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {LAYERS.map((l, i) => (
          <Card key={l.title} className="border-white/[0.06] bg-white/[0.02]">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-xs font-bold text-white/70">
                  {i + 1}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">{l.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-white/50">{l.desc}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

const LAYERS = [
  { title: 'Modified Delphi',          desc: 'Two anonymous rounds; the validated, citable backbone.' },
  { title: 'Pairwise comparison',      desc: 'Continuous head-to-head ranking using a Bradley-Terry model.' },
  { title: 'AI inter-round synthesis', desc: 'LLMs cluster themes, summarize free text, and surface overlap.' },
  { title: 'Conference-day polling',   desc: 'Real-time voting and breakout reactions on May 21.' },
  { title: 'Cross-WG analysis',        desc: 'Post-Delphi AI-assisted thematic mapping across all five groups.' },
];

// ─────────────────────────────────────────────────────────────────────

function DelphiSection() {
  return (
    <section className="space-y-4">
      <SectionTitle id="delphi" eyebrow="Layer 1" title="Modified Delphi process" icon={ClipboardList} tone="cyan" />
      <p className="text-base text-white/65">
        Two anonymous electronic rounds, compressed from the traditional three
        to fit the conference timeline. Each working group (8–12 domain experts)
        develops 10–25 candidate research questions during kickoff, then refines
        them through the rounds.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-cyan-400/20 bg-cyan-500/[0.04]">
          <CardContent className="p-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">Round 1</p>
            <h3 className="mt-1 text-base font-semibold text-white">Disposition + importance + free text</h3>
            <ul className="mt-3 space-y-1.5 text-sm text-white/60">
              <li>· Include / Modify / Exclude vote per question</li>
              <li>· 9-point importance Likert</li>
              <li>· Free-text rationale + suggested rewording</li>
              <li>· Up to 3 additional questions per respondent</li>
            </ul>
          </CardContent>
        </Card>
        <Card className="border-purple-400/20 bg-purple-500/[0.04]">
          <CardContent className="p-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-purple-300">Round 2</p>
            <h3 className="mt-1 text-base font-semibold text-white">Final disposition on revised set</h3>
            <ul className="mt-3 space-y-1.5 text-sm text-white/60">
              <li>· Include / Exclude (modifications resolved between rounds)</li>
              <li>· 9-point importance Likert</li>
              <li>· Gap check across full slate</li>
              <li>· Comments threaded into the panel-day prompts</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
        <p className="text-sm font-semibold text-white">Consensus thresholds</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <ThresholdRow label="≥80% include" tone="emerald"
            detail="Confirmed — locked into the final slate." />
          <ThresholdRow label="21–79%" tone="amber"
            detail="Gray zone — revised and advanced to Round 2." />
          <ThresholdRow label="≤20%" tone="rose"
            detail="Removed — documented, excluded from the slate." />
        </div>
      </div>
    </section>
  );
}

function ThresholdRow({ label, detail, tone }) {
  const toneCls = {
    emerald: 'border-emerald-400/30 bg-emerald-500/[0.06] text-emerald-200',
    amber:   'border-amber-400/30 bg-amber-500/[0.06] text-amber-200',
    rose:    'border-rose-400/30 bg-rose-500/[0.06] text-rose-200',
  }[tone];
  return (
    <div className={`rounded-lg border px-3 py-2 ${toneCls}`}>
      <p className="text-xs font-bold">{label}</p>
      <p className="mt-0.5 text-xs text-white/65">{detail}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────

function PairwiseSection() {
  return (
    <section className="space-y-4">
      <SectionTitle id="pairwise" eyebrow="Layer 2" title="Pairwise comparison ranking" icon={GitCompare} tone="purple" />
      <div className="space-y-3 text-base leading-relaxed text-white/65">
        <p>
          Likert importance ratings cluster ("everything is a 7"). To get
          discriminating prioritization, the platform runs a continuous pairwise
          comparison alongside the Delphi rounds — participants are shown two
          questions at a time and pick the more important one.
        </p>
        <p>
          The resulting head-to-head data is fit with a{' '}
          <strong className="text-white/85">Bradley–Terry model</strong>, producing
          a latent "strength" score and uncertainty interval for every question.
          The output is a per-WG leaderboard and a cross-WG ranking that fuels
          the closing vote on conference day.
        </p>
        <p className="text-sm text-white/55">
          Implementation note: comparisons are sampled to balance coverage
          (every question gets seen ≥ N times) with information gain (close
          rivals are surfaced more often as the model's confidence grows).
        </p>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────

function AISection() {
  return (
    <section className="space-y-4">
      <SectionTitle id="ai" eyebrow="Layer 3" title="AI synthesis — where we used it (and didn't)" icon={Sparkles} tone="amber" />
      <p className="text-base text-white/65">
        Large language models accelerate three specific bottlenecks in this
        process. Every output is reviewed by the chair and/or working-group
        co-leads before being shown to participants.
      </p>
      <div className="space-y-3">
        <AIUseCard
          title="Inter-round thematic synthesis"
          body="After Round 1, free-text feedback is clustered into themes and tensions per WG. The output is a 1-page briefing the WG sees before Round 2 — never a substitute for reading the raw responses."
        />
        <AIUseCard
          title="Question revision drafting"
          body="For gray-zone questions, the model proposes 2–3 reworded variants conditioned on the disposition + rationale text. WG co-leads pick one (or rewrite) before Round 2 ships."
        />
        <AIUseCard
          title="Cross-WG overlap detection"
          body="Embedding similarity surfaces pairs of questions from different WGs that converge on the same underlying concept — flagged for the panel-day discussion."
        />
      </div>
      <div className="rounded-xl border border-rose-400/25 bg-rose-500/[0.04] p-4 text-sm leading-relaxed text-rose-100/85">
        <p className="flex items-start gap-2">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
          <span>
            <strong className="font-semibold">AI is not used to vote, score, or rank.</strong>{' '}
            All consensus decisions — disposition, importance, inclusion in the
            final slate — are produced by participant ratings only.
          </span>
        </p>
      </div>
    </section>
  );
}

function AIUseCard({ title, body }) {
  return (
    <Card className="border-white/[0.06] bg-white/[0.02]">
      <CardContent className="p-4">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-white/60">{body}</p>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────

function ConferenceDaySection() {
  return (
    <section className="space-y-4">
      <SectionTitle id="conference" eyebrow="Layer 4" title="Conference day — May 21" icon={Radio} tone="amber" />
      <p className="text-base text-white/65">
        The Delphi-refined slate is the input to the day. The day's output is a
        ranked, prioritized agenda — produced live, with the room voting on the
        same questions the working groups deliberated on.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <DayCard title="Panels (5 × 40 min)"
          body="One per WG. Co-leads present R2 results and walk the panel through 3 discussion prompts that cluster the top R2 questions." />
        <DayCard title="Table reactions"
          body="Between panels, breakout tables react to what just happened — short structured prompts collected via the participant app." />
        <DayCard title="World café"
          body="Three rotations across pillars (Technology · People · Society) for cross-WG synthesis." />
        <DayCard title="Cross-WG consensus vote"
          body="Closing drag-to-rank vote across each WG's top 4 questions (plus all of WG5's 5 themes — 21 in total). The result is the conference's prioritized agenda." />
      </div>
    </section>
  );
}

function DayCard({ title, body }) {
  return (
    <Card className="border-white/[0.06] bg-white/[0.02]">
      <CardContent className="p-4">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-white/60">{body}</p>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────

function CrossWgSection() {
  return (
    <section className="space-y-4">
      <SectionTitle id="cross-wg" eyebrow="Layer 5" title="Cross-WG analysis" icon={Network} tone="emerald" />
      <p className="text-base text-white/65">
        After the Delphi rounds, an AI-assisted thematic analysis maps where the
        five working groups converge, where they diverge, and where the silence
        is. The output feeds the conference-day panel prompts and the final
        manuscript's discussion section.
      </p>
      <ul className="space-y-2 text-sm leading-relaxed text-white/60">
        <li>· <strong className="text-white/85">Overlap map</strong> — question pairs from different WGs with high semantic similarity, flagged for chair review.</li>
        <li>· <strong className="text-white/85">Tension map</strong> — pairs where the framing implies competing priorities (e.g. autonomy vs. oversight).</li>
        <li>· <strong className="text-white/85">Gap inventory</strong> — domains repeatedly mentioned in free text but absent from any WG's question set.</li>
      </ul>
      <p className="text-sm text-white/45">
        See the live{' '}
        <Link to="/reports/round1" className="text-cyan-300 hover:underline">Round 1</Link>{' '}
        and{' '}
        <Link to="/reports/round2" className="text-cyan-300 hover:underline">Round 2</Link>{' '}
        reports for the current state of these analyses.
      </p>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────

function TimelineSection() {
  return (
    <section className="space-y-4">
      <SectionTitle id="timeline" eyebrow="Timeline" title="From recruitment to manuscript" icon={Calendar} tone="indigo" />
      <ol className="space-y-3">
        {TIMELINE.map((t, i) => (
          <li key={i} className="flex gap-4 rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="shrink-0 text-xs font-bold uppercase tracking-wider text-indigo-300">
              {t.date}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{t.title}</p>
              <p className="mt-1 text-sm text-white/55">{t.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

const TIMELINE = [
  { date: 'Apr 9',     title: 'Co-leads confirmed',         detail: 'Five working groups, 10 co-leads across academic EM departments.' },
  { date: 'Apr 19–20', title: 'WG kickoff meetings',        detail: 'Each group converges on 10–25 candidate questions and reviews its evidence brief.' },
  { date: 'Apr 25 – May 2',  title: 'Round 1 surveys',      detail: 'Disposition + importance + free text. Pairwise ranking opens in parallel.' },
  { date: 'May 3–9',   title: 'R1 → R2 deliberation',       detail: 'Co-leads + chair revise gray-zone questions; AI synthesis assists.' },
  { date: 'May 10–17', title: 'Round 2 surveys',            detail: 'Final include/exclude on revised slate.' },
  { date: 'May 21',    title: 'Conference day in Atlanta',  detail: 'Panels, breakouts, world café, cross-WG consensus vote.' },
  { date: 'Jun–Aug',   title: 'Manuscript pipeline',        detail: 'Per-WG papers + methods paper + cross-WG synthesis.' },
];

// ─────────────────────────────────────────────────────────────────────

function OutputsSection() {
  return (
    <section className="space-y-4">
      <SectionTitle id="outputs" eyebrow="Outputs" title="What the conference produces" icon={FileText} tone="pink" />
      <div className="grid gap-3 sm:grid-cols-2">
        <OutputCard title="Prioritized 10-year research agenda"
          body="Top-ranked questions per WG plus a cross-WG ranked agenda — the conference's headline output." />
        <OutputCard title="Five WG manuscripts"
          body="Each working group produces a paper on its domain's questions, rationale, and priority ranking." />
        <OutputCard title="Methods paper"
          body="A standalone paper describing the AI-enhanced modified-Delphi design and its validation — an independent scholarly contribution." />
        <OutputCard title="Open data + platform"
          body="De-identified Delphi data, pairwise ranking matrix, and the open-source consensus platform itself." />
      </div>
    </section>
  );
}

function OutputCard({ title, body }) {
  return (
    <Card className="border-pink-400/20 bg-pink-500/[0.04]">
      <CardContent className="p-4">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-white/60">{body}</p>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────

function AcknowledgmentsSection() {
  return (
    <section className="space-y-4">
      <SectionTitle id="acks" eyebrow="Acknowledgments" title="Supporters" icon={BookOpen} tone="cyan" />
      <p className="text-base text-white/65">
        This conference is convened by{' '}
        <strong className="text-white/85">SAEM</strong> in collaboration with{' '}
        <strong className="text-white/85">CORD</strong>,{' '}
        <strong className="text-white/85">ABEM</strong>, and the{' '}
        <strong className="text-white/85">UVA Department of Emergency Medicine</strong>.
        The 74 invited working-group members — 63 of whom responded in
        Round 2 (85%) — and the co-leads donating evenings and weekends
        since April are the reason this exists. Special thanks to Hope
        Duncan for project management and to the planning committee
        liaisons (Andy Muck, Tom Hartka, Matt Trowbridge, Moira Smith) for
        carrying the WGs.
      </p>
      <div className="flex flex-wrap gap-2 pt-2">
        <Link
          to="/welcome"
          className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-500/[0.08] px-3 py-2 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/[0.16]"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Welcome
        </Link>
        <Link
          to="/reports"
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-sm font-semibold text-white/75 transition hover:bg-white/[0.08] hover:text-white"
        >
          View Round reports
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

export default BackgroundPage;
