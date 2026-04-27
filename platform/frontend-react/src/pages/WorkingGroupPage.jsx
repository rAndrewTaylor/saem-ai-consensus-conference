import { useEffect, useState } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  ClipboardList,
  GitCompare,
  BarChart3,
  Users,
  UserCheck,
  Sparkles,
  CheckCircle2,
  Cpu,
  GraduationCap,
  Brain,
  Scale,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { api, getToken } from '@/lib/api';
import { usePageTitle } from '@/hooks/usePageTitle';
import { WG_EXTRAS, PHASE_INFO } from '@/lib/workingGroups';

// Pillar styling (mirrors HomePage conventions)
const PILLAR_STYLES = {
  Technology: {
    icon: Cpu,
    border: 'border-t-cyan-400',
    iconColor: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    badge: 'cyan',
    glow: 'from-cyan-500/10 to-transparent',
  },
  Training: {
    icon: GraduationCap,
    border: 'border-t-indigo-400',
    iconColor: 'text-indigo-400',
    bg: 'bg-indigo-500/10',
    badge: 'primary',
    glow: 'from-[#1B5E8A]/10 to-transparent',
  },
  Self: {
    icon: Brain,
    border: 'border-t-emerald-400',
    iconColor: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    badge: 'success',
    glow: 'from-emerald-500/10 to-transparent',
  },
  Society: {
    icon: Scale,
    border: 'border-t-amber-400',
    iconColor: 'text-amber-400',
    bg: 'bg-amber-500/10',
    badge: 'warning',
    glow: 'from-amber-500/10 to-transparent',
  },
};

const DEFAULT_STYLE = {
  icon: Sparkles,
  border: 'border-t-indigo-500',
  iconColor: 'text-indigo-400',
  bg: 'bg-indigo-500/10',
  badge: 'primary',
  glow: 'from-[#1B5E8A]/10 to-transparent',
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

export function WorkingGroupPage() {
  const { wgNumber } = useParams();
  const wgNum = parseInt(wgNumber, 10);
  const [wg, setWg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [signedInName, setSignedInName] = useState(null);

  usePageTitle(wg ? `WG${wg.wg_number} \u00B7 ${wg.short_name || wg.name}` : `Working Group ${wgNumber}`);

  useEffect(() => {
    if (!Number.isInteger(wgNum) || wgNum < 1 || wgNum > 5) {
      setLoading(false);
      setError('invalid');
      return;
    }
    api('/api/surveys/working-groups')
      .then((data) => {
        const match = Array.isArray(data) ? data.find((w) => w.wg_number === wgNum) : null;
        if (!match) setError('notfound');
        setWg(match || null);
      })
      .catch((err) => setError(err.message || 'error'))
      .finally(() => setLoading(false));

    // If the user has a participant token for this WG, check if it's a
    // named invite (not anonymous) so we can show "Signed in as [name]"
    const existingToken = getToken(wgNum);
    if (existingToken) {
      api('/api/participants/me', { params: { token: existingToken } })
        .then((data) => { if (data?.name) setSignedInName(data.name); })
        .catch(() => { /* anonymous token, no name — ignore */ });
    }
  }, [wgNum]);

  if (!Number.isInteger(wgNum) || wgNum < 1 || wgNum > 5) {
    return <Navigate to="/" replace />;
  }

  if (loading) return <WGPageSkeleton />;

  if (error === 'notfound' || !wg) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6">
        <h1 className="text-2xl font-bold text-white">Working group not found</h1>
        <p className="mt-3 text-white/50">WG {wgNumber} doesn't exist. Try heading back to the home page.</p>
        <Link to="/" className="mt-6 inline-block">
          <Button variant="secondary" className="gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Button>
        </Link>
      </div>
    );
  }

  const extras = WG_EXTRAS[wgNum] || {};
  const pillar = wg.pillar || 'Technology';
  const style = PILLAR_STYLES[pillar] || DEFAULT_STYLE;
  const PillarIcon = style.icon;

  return (
    <div className="flex flex-col bg-[#0A1628]">
      <Helmet>
        <meta
          name="description"
          content={`${wg.name} \u2014 one of five working groups in the SAEM 2026 AI Consensus Conference. ${extras.tagline || wg.scope || ''}`}
        />
      </Helmet>

      {/* ─── Hero ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-4 pt-10 pb-16 sm:px-6 sm:pt-14 sm:pb-20">
        {/* Gradient glow */}
        <div className={`pointer-events-none absolute -top-32 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-b ${style.glow} blur-3xl`} />

        <div className="relative mx-auto max-w-5xl">
          <div className="flex items-center justify-between gap-3">
            <Link
              to="/#working-groups"
              className="inline-flex items-center gap-1.5 text-sm text-white/40 transition hover:text-white/70"
            >
              <ArrowLeft className="h-4 w-4" /> All working groups
            </Link>
            {signedInName && (
              <div className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
                <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Signed in as {signedInName}
              </div>
            )}
          </div>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="relative mt-6 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0E1E35] p-8 sm:p-10"
          >
            {/* Large watermark WG number */}
            <span className="pointer-events-none absolute -bottom-10 -right-6 select-none text-[14rem] font-black leading-none text-white opacity-[0.03] sm:text-[18rem]">
              {wg.wg_number}
            </span>

            <div className="relative">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant={style.badge} className="text-xs font-bold">
                  WG {wg.wg_number}
                </Badge>
                {wg.pillar && (
                  <div className={`inline-flex items-center gap-1.5 rounded-full ${style.bg} px-3 py-1`}>
                    <PillarIcon className={`h-3.5 w-3.5 ${style.iconColor}`} />
                    <span className={`text-xs font-semibold ${style.iconColor}`}>{wg.pillar} Pillar</span>
                  </div>
                )}
              </div>

              <h1 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
                {wg.name}
              </h1>

              {extras.tagline && (
                <p className="mt-4 max-w-3xl text-lg text-white/60">{extras.tagline}</p>
              )}

              {wg.scope && (
                <p className="mt-4 max-w-3xl text-base leading-relaxed text-white/50">{wg.scope}</p>
              )}

              {/* Stats */}
              <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-sm">
                <StatPill
                  icon={ClipboardList}
                  label="Total questions"
                  value={wg.total_questions ?? 0}
                />
                <StatPill
                  icon={CheckCircle2}
                  label="Confirmed"
                  value={wg.confirmed ?? 0}
                />
                <StatPill
                  icon={Users}
                  label="Co-leads"
                  value={wg.co_leads?.length || 0}
                />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Leadership ───────────────────────────────────────────── */}
      <section className="px-4 pb-16 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white/40">Leadership</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {wg.co_leads?.map((cl, i) => (
              <Card key={i} className="border border-white/[0.06]">
                <CardContent className="flex items-start gap-3 p-5">
                  <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${style.bg}`}>
                    <UserCheck className={`h-5 w-5 ${style.iconColor}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-white/30">Co-Lead</p>
                    <p className="mt-0.5 text-sm font-semibold text-white">{cl.name}</p>
                    {cl.institution && (
                      <p className="mt-0.5 text-xs text-white/40">{cl.institution}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

            {extras.liaison && (
              <Card className="border border-white/[0.06]">
                <CardContent className="flex items-start gap-3 p-5">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/[0.06]">
                    <Users className="h-5 w-5 text-white/60" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-white/30">
                      {extras.liaison.role || 'Planning Committee Liaison'}
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-white">{extras.liaison.name}</p>
                    <p className="mt-0.5 text-xs text-white/40">Planning Committee</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </section>

      {/* ─── Key topics ───────────────────────────────────────────── */}
      {extras.keyTopics && extras.keyTopics.length > 0 && (
        <section className="px-4 pb-16 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white/40">Key topics</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {extras.keyTopics.map((topic, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-[#0E1E35] p-4"
                >
                  <CheckCircle2 className={`mt-0.5 h-4 w-4 flex-shrink-0 ${style.iconColor}`} />
                  <span className="text-sm text-white/70">{topic}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ─── How this works (educational blurb) ─────────────────── */}
      <section className="px-4 pb-16 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white/40">How this works</h2>
          <div className="mt-4 rounded-xl border border-white/[0.06] bg-[#0E1E35] p-5 sm:p-6">
            <p className="text-sm leading-relaxed text-white/70">
              This conference uses a <strong className="text-white/90">modified Delphi method</strong> — a structured, multi-round process
              to build expert consensus on the most important research questions for AI in emergency medicine over the next decade.
            </p>

            <div className="mt-5 space-y-4">
              <ProcessStep number="1" title="Round 1 — Rate the questions" active>
                Read each candidate research question. For each one, tell us:
                <strong className="text-white/90"> should it be included?</strong> (Include / Modify / Exclude),
                <strong className="text-white/90"> how important is it?</strong> (1–9 scale), and optionally leave a comment explaining your reasoning.
                You can also suggest entirely new questions. Your responses are <strong className="text-white/90">anonymous</strong> — no one sees individual votes.
              </ProcessStep>

              <ProcessStep number="2" title="Between rounds — AI synthesis">
                After Round 1 closes, the platform computes group consensus statistics and uses AI to synthesize comment themes,
                suggest question revisions, and identify gaps. Your co-leads review and finalize the revised question set.
              </ProcessStep>

              <ProcessStep number="3" title="Round 2 — Revote with context">
                You'll see each remaining question alongside the <strong className="text-white/90">Round 1 group results</strong> (what % included vs. excluded, average importance).
                Vote again with a simpler binary choice: Include or Exclude. Questions reaching ≥80% agreement are confirmed for the final agenda.
              </ProcessStep>

              <ProcessStep number="4" title="Pairwise ranking — head-to-head comparisons">
                Running alongside both Delphi rounds: pick the more important question in quick side-by-side pairs.
                Vote as many times as you like — the platform uses a statistical model to build a priority ranking.
                Results are visible in real time.
              </ProcessStep>

              <ProcessStep number="5" title="Conference Day — May 21, Atlanta">
                All participants convene for live deliberation, breakout discussions, and final voting.
                The combined Delphi + pairwise results produce the <strong className="text-white/90">10-year research agenda</strong> for AI in emergency medicine.
              </ProcessStep>
            </div>

            <p className="mt-5 text-xs text-white/40">
              The full methodology is described in the Guide (top nav). Questions? Contact your co-leads or the conference chair.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Participate (activity cards) ─────────────────────────── */}
      <section className="bg-[#0A1628] px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Participate</h2>
          <p className="mt-2 text-white/50">
            Start with Round 1, then pairwise ranking. Round 2 opens after co-lead review.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <ActivityCard
              to={`/survey/${wg.wg_number}/round_1`}
              icon={ClipboardList}
              phase={PHASE_INFO.round_1.label}
              blurb={PHASE_INFO.round_1.blurb}
              accent="cyan"
            />
            <ActivityCard
              to={`/survey/${wg.wg_number}/round_2`}
              icon={ClipboardList}
              phase={PHASE_INFO.round_2.label}
              blurb={PHASE_INFO.round_2.blurb}
              accent="navy"
            />
            <ActivityCard
              to={`/rank/${wg.wg_number}`}
              icon={GitCompare}
              phase={PHASE_INFO.pairwise.label}
              blurb={PHASE_INFO.pairwise.blurb}
              accent="teal"
            />
            <ActivityCard
              to={`/results/${wg.wg_number}`}
              icon={BarChart3}
              phase={PHASE_INFO.results.label}
              blurb={PHASE_INFO.results.blurb}
              accent="emerald"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────

function ProcessStep({ number, title, active, children }) {
  return (
    <div className="flex gap-3">
      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
        active ? 'bg-[#00B4D8] text-white' : 'bg-white/[0.06] text-white/40'
      }`}>
        {number}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold text-white/90">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-white/50">{children}</p>
      </div>
    </div>
  );
}

function StatPill({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-white/30" />
      <span className="font-bold text-white">{value}</span>
      <span className="text-white/40">{label}</span>
    </div>
  );
}

const ACCENT_STYLES = {
  cyan: { bg: 'bg-cyan-500/10', icon: 'text-cyan-400', hover: 'group-hover:border-cyan-400/40' },
  navy: { bg: 'bg-[#1B5E8A]/15', icon: 'text-[#48CAE4]', hover: 'group-hover:border-[#48CAE4]/40' },
  teal: { bg: 'bg-[#00B4D8]/10', icon: 'text-[#00B4D8]', hover: 'group-hover:border-[#00B4D8]/40' },
  emerald: { bg: 'bg-emerald-500/10', icon: 'text-emerald-400', hover: 'group-hover:border-emerald-400/40' },
};

function ActivityCard({ to, icon: Icon, phase, blurb, accent = 'navy' }) {
  const a = ACCENT_STYLES[accent];
  return (
    <Link to={to} className="group block">
      <div className={`relative flex h-full flex-col rounded-xl border border-white/[0.08] bg-[#0E1E35] p-5 transition-all hover:bg-[#142C4A] ${a.hover}`}>
        <div className="flex items-start gap-3">
          <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${a.bg}`}>
            <Icon className={`h-5 w-5 ${a.icon}`} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-white">{phase}</h3>
              <ArrowRight className="h-4 w-4 flex-shrink-0 text-white/20 transition group-hover:translate-x-0.5 group-hover:text-white/60" />
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-white/50">{blurb}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}

function WGPageSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <Skeleton className="h-5 w-40" />
      <div className="mt-6 rounded-2xl border border-white/[0.08] bg-[#0E1E35] p-8">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="mt-5 h-12 w-3/4" />
        <Skeleton className="mt-4 h-5 w-full max-w-2xl" />
        <Skeleton className="mt-2 h-5 w-full max-w-xl" />
        <div className="mt-8 flex gap-6">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-24" />
        </div>
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    </div>
  );
}
