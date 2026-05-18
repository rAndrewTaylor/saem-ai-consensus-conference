import { useEffect, useState } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
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
  ChevronDown,
  Info,
  PlayCircle,
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
  const [pairwiseCount, setPairwiseCount] = useState(null);
  const [wgPosts, setWgPosts] = useState([]);

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

    // Fetch co-lead posts for this WG
    api(`/api/wg-posts/public/${wgNum}`)
      .then((data) => setWgPosts(Array.isArray(data) ? data : []))
      .catch(() => {});

    // If the user has a participant token for this WG, check identity + pairwise progress
    const existingToken = getToken(wgNum);
    if (existingToken) {
      api('/api/participants/me', { params: { token: existingToken } })
        .then((data) => { if (data?.name) setSignedInName(data.name); })
        .catch(() => {});
      api(`/api/pairwise/my-count/${wgNum}`, { token: existingToken })
        .then((data) => { if (data?.count != null) setPairwiseCount(data.count); })
        .catch(() => {});
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

      {/* ─── Compact Hero ────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-4 pt-8 pb-6 sm:px-6 sm:pt-10 sm:pb-8">
        <div className={`pointer-events-none absolute -top-32 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-b ${style.glow} blur-3xl`} />
        <div className="relative mx-auto max-w-5xl">
          <div className="flex items-center justify-between gap-3">
            <Link
              to="/welcome"
              className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-500/[0.08] px-3 py-2 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/[0.16] hover:text-cyan-100"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Welcome
            </Link>
            {signedInName && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
                  <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  {signedInName}
                </div>
                <button
                  onClick={() => {
                    localStorage.removeItem(`saem_token_wg${wgNum}`);
                    window.location.href = '/';
                  }}
                  className="rounded-full px-2 py-1 text-[11px] text-white/30 transition hover:bg-white/[0.06] hover:text-white/60"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge variant={style.badge} className="text-xs font-bold">WG {wg.wg_number}</Badge>
            {wg.pillar && (
              <div className={`inline-flex items-center gap-1 rounded-full ${style.bg} px-2.5 py-0.5`}>
                <PillarIcon className={`h-3 w-3 ${style.iconColor}`} />
                <span className={`text-[11px] font-semibold ${style.iconColor}`}>{wg.pillar}</span>
              </div>
            )}
            <div className="flex items-center gap-3 text-xs text-white/40">
              <span>{wg.total_questions ?? 0} questions</span>
              <span>{wg.co_leads?.length || 0} co-leads</span>
            </div>
          </div>

          <h1 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {wg.name}
          </h1>
          {extras.tagline && (
            <p className="mt-2 max-w-3xl text-base text-white/50">{extras.tagline}</p>
          )}
        </div>
      </section>

      {/* ─── Primary action: contextual to phase ─────────────────── */}
      {(() => {
        const r1 = wg.r1_status || 'open';
        const r2 = wg.r2_status || 'not_started';
        // Decide which action gets the START-HERE treatment.
        let primary;
        if (r2 === 'open') {
          primary = {
            to: `/survey/${wg.wg_number}/round_2`,
            label: 'Start here',
            title: 'Delphi Round 2 Survey',
            blurb: 'Re-rate the chair-curated R2 questions. Takes 10–15 minutes.',
          };
        } else if (r1 === 'open') {
          primary = {
            to: `/survey/${wg.wg_number}/round_1`,
            label: 'Start here',
            title: 'Delphi Round 1 Survey',
            blurb: 'Rate each research question on importance and disposition. Takes 10–15 minutes.',
          };
        } else if (r2 === 'closed' && r1 === 'closed') {
          // All voting done — point to results
          primary = {
            to: `/results/${wg.wg_number}`,
            label: 'View now',
            title: 'Results',
            blurb: 'All Delphi rounds and pairwise voting are closed. View the final group results.',
          };
        } else if (r2 === 'not_started') {
          // R1 closed, R2 not yet — informational card, no link.
          primary = {
            to: null,
            label: 'Round 1 closed',
            title: 'Round 2 — coming soon',
            blurb: "Round 1 is closed for this WG. Round 2 will open shortly — we'll email you when it does.",
          };
        }
        const Inner = (
          <div className={`group relative overflow-hidden rounded-xl border ${primary.to ? 'border-[#00B4D8]/30 bg-gradient-to-r from-[#0C2340] to-[#0E1E35] hover:border-[#00B4D8]/50 hover:shadow-lg hover:shadow-[#00B4D8]/10' : 'border-white/[0.08] bg-white/[0.02]'} p-5 transition-all sm:p-6`}>
            <div className="flex items-center gap-4">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${primary.to ? 'bg-[#00B4D8]/15' : 'bg-white/[0.06]'}`}>
                <PlayCircle className={`h-6 w-6 ${primary.to ? 'text-[#00B4D8]' : 'text-white/40'}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-xs font-semibold uppercase tracking-wider ${primary.to ? 'text-[#48CAE4]' : 'text-white/40'}`}>{primary.label}</p>
                <h2 className="mt-0.5 text-lg font-bold text-white sm:text-xl">{primary.title}</h2>
                <p className="mt-1 text-sm text-white/50">{primary.blurb}</p>
              </div>
              {primary.to && (
                <ArrowRight className="hidden h-5 w-5 shrink-0 text-white/30 transition group-hover:translate-x-1 group-hover:text-[#00B4D8] sm:block" />
              )}
            </div>
          </div>
        );
        return (
          <section className="px-4 pb-4 sm:px-6">
            <div className="mx-auto max-w-5xl">
              {primary.to ? <Link to={primary.to}>{Inner}</Link> : Inner}
            </div>
          </section>
        );
      })()}

      {/* ─── Activity cards (phase-aware) ─────────────────────────── */}
      <section className="px-4 pb-6 sm:px-6">
        <div className="mx-auto max-w-5xl">
          {(() => {
            const r1 = wg.r1_status || 'open';
            const r2 = wg.r2_status || 'not_started';
            const pairwiseOpen = r1 === 'open' || r2 === 'open';
            const r2BadgeAndBlurb = r2 === 'open'
              ? { blurb: 'Active', badge: null }
              : r2 === 'closed'
                ? { blurb: 'Closed', badge: null }
                : { blurb: 'Coming soon', badge: null };
            return (
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <ActivityCard
                  to={pairwiseOpen ? `/rank/${wg.wg_number}` : null}
                  icon={GitCompare}
                  phase="Pairwise"
                  blurb={pairwiseOpen ? (pairwiseCount != null ? `${pairwiseCount}/50 done` : 'Head-to-head ranking') : 'Closed'}
                  accent="teal"
                  compact
                  badge={pairwiseOpen && pairwiseCount != null && pairwiseCount >= 50 ? 'done' : pairwiseOpen && pairwiseCount != null ? 'todo' : null}
                  disabled={!pairwiseOpen}
                />
                <ActivityCard
                  to={r2 === 'open' ? `/survey/${wg.wg_number}/round_2` : null}
                  icon={ClipboardList}
                  phase="Round 2"
                  blurb={r2BadgeAndBlurb.blurb}
                  accent="navy"
                  compact
                  disabled={r2 !== 'open'}
                />
                <ActivityCard
                  to={`/results/${wg.wg_number}`}
                  icon={BarChart3}
                  phase="Results"
                  blurb={r1 === 'closed' && r2 === 'closed' ? 'Final results' : 'Live rankings'}
                  accent="emerald"
                  compact
                />
              </div>
            );
          })()}
          {/* Cross-WG report link */}
          <div className="mt-3">
            <Link
              to="/reports/round1"
              className="group flex items-center justify-between rounded-xl border border-purple-400/20 bg-purple-500/5 px-4 py-3 transition hover:border-purple-400/40 hover:bg-purple-500/10"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/15">
                  <BarChart3 className="h-4 w-4 text-purple-300" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white/90">Round 1 Report — cross-WG view</p>
                  <p className="text-xs text-white/50">
                    Similarity network, theme clusters, pillar coverage across all five WGs
                  </p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-white/30 transition group-hover:translate-x-0.5 group-hover:text-purple-300" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Updates from co-leads ──────────────────────────────── */}
      {wgPosts.length > 0 && (
        <section className="px-4 pb-4 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <CollapsibleSection icon={Info} title={`Updates from your co-leads (${wgPosts.length})`} defaultOpen={true}>
              <div className="space-y-3">
                {wgPosts.map((post) => (
                  <div key={post.id} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
                    <div className="flex items-center gap-2">
                      {post.pinned && <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">Pinned</span>}
                      <h3 className="text-sm font-semibold text-white/90">{post.title}</h3>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-white/60">{post.body}</p>
                    {post.links && post.links.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {post.links.map((lnk, i) => (
                          <a
                            key={i}
                            href={lnk.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-full bg-[#00B4D8]/10 px-3 py-1 text-xs font-medium text-[#48CAE4] hover:bg-[#00B4D8]/20"
                          >
                            {lnk.label || 'Link'}
                            <ArrowRight className="h-3 w-3" />
                          </a>
                        ))}
                      </div>
                    )}
                    <p className="mt-2 text-[10px] text-white/25">{post.author} &middot; {new Date(post.created_at).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          </div>
        </section>
      )}

      {/* ─── How this works (collapsible) ─────────────────────────── */}
      <section className="px-4 pb-4 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <CollapsibleSection icon={Info} title="How this works" defaultOpen={false}>
            <p className="text-sm leading-relaxed text-white/60">
              This conference uses a <strong className="text-white/80">modified Delphi method</strong> — a structured, multi-round process
              to build expert consensus on the most important research questions for AI in emergency medicine.
            </p>
            <div className="mt-4 space-y-3">
              <ProcessStep number="1" title="Round 1 — Rate the questions" active>
                For each question: <strong className="text-white/80">Include / Modify / Exclude</strong> +
                importance (1–9) + optional comment. You can suggest new questions too. All responses are anonymous.
              </ProcessStep>
              <ProcessStep number="2" title="Between rounds — AI synthesis">
                Platform computes consensus stats. AI synthesizes comment themes + revision suggestions. Co-leads review and finalize.
              </ProcessStep>
              <ProcessStep number="3" title="Round 2 — Revote with context">
                See Round 1 group results inline. Binary Include/Exclude. ≥80% agreement = confirmed for the agenda.
              </ProcessStep>
              <ProcessStep number="4" title="Pairwise ranking">
                Quick side-by-side pairs running alongside both rounds. Vote as many times as you like. Live rankings.
              </ProcessStep>
              <ProcessStep number="5" title="Conference Day — May 21">
                Live deliberation, breakouts, final voting → 10-year research agenda.
              </ProcessStep>
            </div>
          </CollapsibleSection>
        </div>
      </section>

      {/* ─── About this group (collapsible) ───────────────────────── */}
      <section className="px-4 pb-10 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <CollapsibleSection icon={Users} title="About this group" defaultOpen={false}>
            {wg.scope && (
              <p className="text-sm leading-relaxed text-white/60">{wg.scope}</p>
            )}

            {/* Co-leads */}
            {wg.co_leads?.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-white/30">Co-leads</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {wg.co_leads.map((cl, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1.5 text-sm font-medium text-white/80">
                      <UserCheck className={`h-3.5 w-3.5 ${style.iconColor}`} />
                      {cl.name}
                      {cl.institution && <span className="text-white/40">· {cl.institution}</span>}
                    </span>
                  ))}
                  {extras.liaison && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1.5 text-sm font-medium text-white/60">
                      <Users className="h-3.5 w-3.5 text-white/40" />
                      {extras.liaison.name}
                      <span className="text-white/30">· Liaison</span>
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Key topics */}
            {extras.keyTopics?.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-white/30">Key topics</p>
                <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                  {extras.keyTopics.map((topic, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-white/60">
                      <CheckCircle2 className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${style.iconColor}`} />
                      {topic}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CollapsibleSection>
        </div>
      </section>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────

function CollapsibleSection({ icon: Icon, title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0E1E35]">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-white/[0.02]"
      >
        <Icon className="h-4 w-4 shrink-0 text-white/40" />
        <span className="flex-1 text-sm font-semibold text-white/80">{title}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-white/30 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/[0.04] px-5 py-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

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

function ActivityCard({ to, icon: Icon, phase, blurb, accent = 'navy', compact = false, badge = null, disabled = false }) {
  const a = ACCENT_STYLES[accent];
  const dim = disabled || !to;

  const compactInner = (
    <div className={`relative flex h-full flex-col items-center gap-2 rounded-xl border border-white/[0.08] bg-[#0E1E35] p-3 text-center transition-all sm:p-4 ${dim ? 'opacity-50 cursor-not-allowed' : `hover:bg-[#142C4A] ${a.hover}`}`}>
      {!dim && badge === 'done' && (
        <div className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500">
          <CheckCircle2 className="h-3 w-3 text-white" />
        </div>
      )}
      {!dim && badge === 'todo' && (
        <div className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500">
          <span className="text-[9px] font-bold text-white">!</span>
        </div>
      )}
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${a.bg} sm:h-10 sm:w-10`}>
        <Icon className={`h-4 w-4 ${a.icon} sm:h-5 sm:w-5`} />
      </div>
      <h3 className="text-xs font-semibold text-white sm:text-sm">{phase}</h3>
      <p className="text-[11px] leading-snug text-white/40">{blurb}</p>
    </div>
  );

  const wideInner = (
    <div className={`relative flex h-full flex-col rounded-xl border border-white/[0.08] bg-[#0E1E35] p-5 transition-all ${dim ? 'opacity-50 cursor-not-allowed' : `hover:bg-[#142C4A] ${a.hover}`}`}>
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${a.bg}`}>
          <Icon className={`h-5 w-5 ${a.icon}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-white">{phase}</h3>
            {!dim && <ArrowRight className="h-4 w-4 flex-shrink-0 text-white/20 transition group-hover:translate-x-0.5 group-hover:text-white/60" />}
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-white/50">{blurb}</p>
        </div>
      </div>
    </div>
  );

  const inner = compact ? compactInner : wideInner;

  if (dim) {
    return <div className="block">{inner}</div>;
  }
  return (
    <Link to={to} className="group block">
      {inner}
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
