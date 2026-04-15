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
    border: 'border-t-purple-400',
    iconColor: 'text-purple-400',
    bg: 'bg-purple-500/10',
    badge: 'primary',
    glow: 'from-purple-500/10 to-transparent',
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
  border: 'border-t-purple-500',
  iconColor: 'text-purple-400',
  bg: 'bg-purple-500/10',
  badge: 'primary',
  glow: 'from-purple-500/10 to-transparent',
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
    <div className="flex flex-col bg-[#13111C]">
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
            className="relative mt-6 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#1C1A2E] p-8 sm:p-10"
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
                  className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-[#1C1A2E] p-4"
                >
                  <CheckCircle2 className={`mt-0.5 h-4 w-4 flex-shrink-0 ${style.iconColor}`} />
                  <span className="text-sm text-white/70">{topic}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ─── Participate (activity cards) ─────────────────────────── */}
      <section className="bg-[#13111C] px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Participate</h2>
          <p className="mt-2 text-white/50">
            Each working group runs two Delphi rounds plus continuous pairwise ranking. Everything lives here.
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
              accent="purple"
            />
            <ActivityCard
              to={`/rank/${wg.wg_number}`}
              icon={GitCompare}
              phase={PHASE_INFO.pairwise.label}
              blurb={PHASE_INFO.pairwise.blurb}
              accent="pink"
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
  purple: { bg: 'bg-purple-500/10', icon: 'text-purple-400', hover: 'group-hover:border-purple-400/40' },
  pink: { bg: 'bg-pink-500/10', icon: 'text-pink-400', hover: 'group-hover:border-pink-400/40' },
  emerald: { bg: 'bg-emerald-500/10', icon: 'text-emerald-400', hover: 'group-hover:border-emerald-400/40' },
};

function ActivityCard({ to, icon: Icon, phase, blurb, accent = 'purple' }) {
  const a = ACCENT_STYLES[accent];
  return (
    <Link to={to} className="group block">
      <div className={`relative flex h-full flex-col rounded-xl border border-white/[0.08] bg-[#1C1A2E] p-5 transition-all hover:bg-[#252340] ${a.hover}`}>
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
      <div className="mt-6 rounded-2xl border border-white/[0.08] bg-[#1C1A2E] p-8">
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
