/**
 * Projector view for the 2:50 PM Priority Presentations slot.
 *
 * Designed as a scrollable, top-to-bottom deck — one section per
 * minute of the co-lead's 5-7 minute window. Each section combines a
 * data viz with a one-line key takeaway so the audience can both
 * skim the screen and follow the talk.
 *
 * Sections:
 *   1. WG identity (refresh)
 *   2. Process funnel ("how we got to these 4")
 *   3. Morning vote receipt (which 4 advanced, by how much)
 *   4. The 4 advancing questions in depth (uses SUMMARY_DOCS rationale)
 *   5. R1 → R2 deliberation shifts
 *   6. Closing band w/ cross-cutting themes + handoff to cross-WG vote
 *
 * Audience phones get a leaner CompactPresent in CompactStageView.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight, ArrowUpRight, ArrowDownRight,
  Target, Layers, BarChart3, Sparkles,
  TrendingUp, ChevronsDown, Network,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { PILLAR_COLORS, WG_LABELS } from '@/components/stage/panelConfig';
import { SUMMARY_DOCS } from '@/pages/WorkingGroupsSummaryPage';

// How many advance per WG (WG5 fields all 5 themed Qs)
function advanceLimitFor(wgNumber) {
  return wgNumber === 5 ? 5 : 4;
}

export function PresentWGStage({ wgNumber, bus }) {
  const [wg, setWg] = useState(null);
  const [candidates, setCandidates] = useState(null);
  const [r2, setR2] = useState(null);
  const [voteResults, setVoteResults] = useState(null);

  // Fetch every data source independently so a 500 on one leg doesn't
  // blank the whole slide. Each section guards its own data.
  useEffect(() => {
    if (!wgNumber) return undefined;
    let cancelled = false;
    const safe = async (url) => {
      try { return await api(url); } catch (e) { return { __error: e }; }
    };
    (async () => {
      const [wgs, panel, results, sessions] = await Promise.all([
        safe('/api/surveys/working-groups'),
        safe(`/api/conference/panel/${wgNumber}/candidates`),
        safe(`/api/surveys/results/${wgNumber}/round_2`),
        safe('/api/conference/sessions'),
      ]);
      if (cancelled) return;
      const wgsList = Array.isArray(wgs) ? wgs : [];
      setWg(wgsList.find((w) => w?.wg_number === wgNumber) || null);
      setCandidates(panel?.__error ? [] : (panel?.questions || []));
      setR2(results?.__error ? null : (results || null));
      // Find the WG's morning wg_presentation session and pull its results
      const sessList = Array.isArray(sessions) ? sessions : [];
      const sess = sessList.find(
        (s) => s.wg_number === wgNumber && s.session_type === 'wg_presentation'
      );
      if (sess) {
        const tally = await safe(`/api/conference/results/${sess.id}`);
        if (!cancelled) setVoteResults(tally?.__error ? null : (tally || null));
      } else if (!cancelled) {
        setVoteResults(null);
      }
    })();
    return () => { cancelled = true; };
  }, [wgNumber, bus]);

  const accent = PILLAR_COLORS[wgNumber] || '#00B4D8';
  const doc = (SUMMARY_DOCS || []).find((d) => d.wg === wgNumber);
  const limit = advanceLimitFor(wgNumber);

  const allActive = useMemo(
    () => (r2?.questions || []).filter((q) => q.status !== 'removed'),
    [r2],
  );

  // Advancing = featured if any, else top R2 include%/importance
  const advancing = useMemo(() => {
    if (!candidates) return [];
    const featured = candidates.filter((q) => q.is_featured);
    const pool = featured.length > 0 ? featured : candidates;
    return [...pool]
      .sort((a, b) => (b.r2_include_pct ?? 0) - (a.r2_include_pct ?? 0)
                   || (b.r2_importance_mean ?? 0) - (a.r2_importance_mean ?? 0))
      .slice(0, limit);
  }, [candidates, limit]);

  // Morning vote tally — sort by avg_rank ascending (lower = better).
  const morningRanking = useMemo(() => {
    const rows = (voteResults?.questions || voteResults?.results || [])
      .filter((r) => r.avg_rank != null || r.points != null || r.importance_mean != null);
    if (!rows.length) return [];
    return [...rows].sort((a, b) => {
      if (a.avg_rank != null && b.avg_rank != null) return a.avg_rank - b.avg_rank;
      return (b.points ?? b.importance_mean ?? 0) - (a.points ?? a.importance_mean ?? 0);
    });
  }, [voteResults]);

  // Biggest R1 → R2 importance movers
  const shifts = useMemo(() => {
    const withShift = allActive
      .filter((q) => q.r1_importance_mean != null && q.r2_importance_mean != null)
      .map((q) => ({
        id: q.id,
        text: q.text,
        r1: q.r1_importance_mean,
        r2: q.r2_importance_mean,
        delta: q.r2_importance_mean - q.r1_importance_mean,
      }));
    const up = [...withShift].sort((a, b) => b.delta - a.delta).slice(0, 3);
    const down = [...withShift].sort((a, b) => a.delta - b.delta)
      .filter((q) => q.delta < 0).slice(0, 3);
    return { up, down };
  }, [allActive]);

  // Process funnel numbers — pull what we know; gaps fall back gracefully.
  const funnel = useMemo(() => {
    const r2Active = allActive.length;
    const r2Removed = (r2?.questions || []).filter((q) => q.status === 'removed').length;
    const total = r2Active + r2Removed;
    const panelPool = candidates?.length ?? r2Active;
    return {
      candidates: total || null,
      toR2: r2Active || null,
      panelPool,
      advance: limit,
    };
  }, [allActive, r2, candidates, limit]);

  if (candidates === null) {
    return <Skeleton className="h-full w-full rounded-2xl" />;
  }

  const friendlyName = WG_LABELS[wgNumber] || doc?.title || wg?.name || `Working Group ${wgNumber}`;
  const subtitle = doc?.subtitle || '';
  const background = doc?.background || (wg?.scope || '').split('.').slice(0, 2).join('.');
  const pillar = wg?.pillar || '';

  return (
    <div className="h-full overflow-y-auto bg-[#0A1628] text-white">
      {/* Eyebrow strip so the audience always knows what slot this is */}
      <div
        className="sticky top-0 z-10 border-b border-white/[0.06] px-8 py-2 backdrop-blur-md sm:px-12"
        style={{ backgroundColor: 'rgba(0, 180, 216, 0.10)' }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-300">
          Priority presentation · WG {wgNumber}
          {pillar ? ` · ${pillar} pillar` : ''} · co-lead presenting now
        </p>
      </div>

      <div className="mx-auto max-w-7xl space-y-8 px-8 py-8 sm:px-12">
        {/* Section 1 — WG identity */}
        <SectionShell tone={accent}>
          <SectionHeader icon={Sparkles} eyebrow="The working group" title={friendlyName} accent={accent} />
          {subtitle && (
            <p className="mt-2 text-2xl font-semibold leading-snug" style={{ color: accent }}>
              {subtitle}
            </p>
          )}
          {background && (
            <p className="mt-4 max-w-5xl text-lg leading-relaxed text-white/72">
              {background}
            </p>
          )}
          <div className="mt-6 grid grid-cols-3 gap-4">
            <CompositionStat
              value={funnel.toR2 ?? '—'}
              label="R2 questions on the table"
              accent={accent}
            />
            <CompositionStat
              value={funnel.panelPool ?? '—'}
              label="On today's panel slate"
              accent={accent}
            />
            <CompositionStat
              value={limit}
              label="Advancing to cross-WG"
              accent="#10b981"
            />
          </div>
        </SectionShell>

        {/* Section 2 — Process funnel */}
        <SectionShell tone="#6366F1">
          <SectionHeader icon={ChevronsDown} eyebrow="The journey" title="How we got to these 4" accent="#6366F1" />
          <FunnelFigure funnel={funnel} accent={accent} />
          <Takeaway
            text="These 4 are the refined output of weeks of WG deliberation, not a cold pick. Your job in the cross-WG vote is to weigh them against the 16 others advancing from WG1–5."
            tone="indigo"
          />
        </SectionShell>

        {/* Section 3 — Morning vote receipt */}
        <SectionShell tone="#f59e0b">
          <SectionHeader icon={BarChart3} eyebrow="The receipt" title="What this morning's audience said" accent="#f59e0b" />
          {morningRanking.length === 0 ? (
            <p className="mt-4 rounded-xl border border-amber-400/30 bg-amber-500/[0.06] p-4 text-amber-200">
              Morning vote tally isn't recorded for this session yet.
              {' '}
              <span className="text-amber-100/70">
                The 4 advancing questions below are this WG's chair-curated panel pool.
              </span>
            </p>
          ) : (
            <MorningVoteFigure rows={morningRanking} advancingIds={new Set(advancing.map((q) => q.id))} accent={accent} />
          )}
          {morningRanking.length > 0 && (
            <Takeaway
              text={(() => {
                const top = morningRanking.slice(0, limit);
                const next = morningRanking[limit];
                if (!next || top.length < limit) return 'Top 4 emerged with a clear gap above the rest.';
                const topAvg = top.reduce((s, r) => s + (r.avg_rank || 0), 0) / top.length;
                const gap = (next.avg_rank || 0) - topAvg;
                if (Math.abs(gap) < 0.3) {
                  return 'Top 4 were tight — the next question was within striking distance. Worth giving the close-miss a look in the cross-WG round.';
                }
                return `The top ${limit} were clearly preferred — average rank ${topAvg.toFixed(1)} vs ${next.avg_rank.toFixed(1)} for the next question, a ${gap.toFixed(1)}-rank gap.`;
              })()}
              tone="amber"
            />
          )}
        </SectionShell>

        {/* Section 4 — The 4 advancing questions, in depth */}
        <SectionShell tone={accent}>
          <SectionHeader icon={Target} eyebrow="Advancing to cross-WG" title={`The ${limit} questions on your closing rank`} accent={accent} />
          {advancing.length === 0 ? (
            <p className="mt-4 rounded-xl border border-amber-400/30 bg-amber-500/[0.06] p-6 text-amber-200">
              No questions are flagged for the cross-WG vote yet.
            </p>
          ) : (
            <ol className="mt-6 space-y-4">
              {advancing.map((q, i) => {
                // Merge in doc.questions rationale where text matches
                const docMatch = doc?.questions?.find(
                  (dq) => dq.prompt && q.text && dq.prompt.slice(0, 40).toLowerCase() === q.text.slice(0, 40).toLowerCase(),
                ) || doc?.questions?.[i];
                return (
                  <AdvancingQuestionCard
                    key={q.id}
                    index={i + 1}
                    question={q}
                    rationale={docMatch}
                    accent={accent}
                  />
                );
              })}
            </ol>
          )}
        </SectionShell>

        {/* Section 5 — R1 → R2 shifts */}
        {(shifts.up.length > 0 || shifts.down.length > 0) && (
          <SectionShell tone="#10b981">
            <SectionHeader icon={TrendingUp} eyebrow="Deliberation in motion" title="Where minds changed between R1 and R2" accent="#10b981" />
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <ShiftColumn title="Warmed to" items={shifts.up} tone="emerald" />
              <ShiftColumn title="Cooled on" items={shifts.down} tone="rose" />
            </div>
            <Takeaway
              text="The WG materially shifted its mind on several questions during deliberation — evidence of real engagement, not rubber-stamping."
              tone="emerald"
            />
          </SectionShell>
        )}

        {/* Section 6 — Cross-cutting themes + closing CTA */}
        {doc?.themes && doc.themes.length > 0 && (
          <SectionShell tone="#A78BFA">
            <SectionHeader icon={Network} eyebrow="Cross-cutting threads" title="Themes that echo across the day" accent="#A78BFA" />
            <div className="mt-6 grid gap-3 lg:grid-cols-3">
              {doc.themes.map((theme) => (
                <div
                  key={theme.title}
                  className="rounded-2xl border border-purple-400/20 bg-purple-500/[0.05] p-4"
                >
                  <h3 className="text-base font-bold text-white">{theme.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/65">{theme.body}</p>
                </div>
              ))}
            </div>
          </SectionShell>
        )}
      </div>

      {/* Closing band — sticky to the bottom of scroll */}
      <div className="mt-4 border-t border-emerald-400/25 bg-emerald-500/[0.06] px-8 py-5 sm:px-12">
        <div className="mx-auto flex max-w-7xl items-center gap-4">
          <ArrowRight className="h-6 w-6 text-emerald-300" />
          <p className="text-xl text-white/85 sm:text-2xl">
            <strong className="font-bold text-white">Next:</strong>{' '}
            rank all {wgNumber === 5 ? 21 : 21} advancing questions across WG1–5 in the cross-WG vote.
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

function SectionShell({ tone, children }) {
  return (
    <section
      className="rounded-3xl border p-6 sm:p-8"
      style={{ borderColor: `${tone}30`, backgroundColor: `${tone}0A` }}
    >
      {children}
    </section>
  );
}

function SectionHeader({ icon: Icon, eyebrow, title, accent }) {
  return (
    <div className="flex items-start gap-4">
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${accent}25`, color: accent }}
      >
        <Icon className="h-6 w-6" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em]" style={{ color: accent }}>
          {eyebrow}
        </p>
        <h2 className="mt-1 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          {title}
        </h2>
      </div>
    </div>
  );
}

function CompositionStat({ value, label, accent }) {
  return (
    <div
      className="rounded-2xl border px-4 py-4"
      style={{ borderColor: `${accent}30`, backgroundColor: `${accent}0E` }}
    >
      <p className="font-mono text-5xl font-bold tabular-nums text-white sm:text-6xl">
        {value}
      </p>
      <p className="mt-1 text-xs uppercase tracking-wider text-white/50 sm:text-sm">
        {label}
      </p>
    </div>
  );
}

function FunnelFigure({ funnel, accent }) {
  const stages = [
    { n: funnel.candidates, label: 'Candidates after WG kickoff', tone: '#94a3b8' },
    { n: funnel.toR2, label: 'Cleared R1 → advanced to R2', tone: '#60a5fa' },
    { n: funnel.panelPool, label: "Today's panel slate", tone: accent },
    { n: funnel.advance, label: 'Advance to cross-WG closing vote', tone: '#10b981' },
  ];
  return (
    <div className="mt-6 flex flex-col items-center gap-2">
      {stages.map((s, i) => (
        <div key={i} className="flex w-full flex-col items-center">
          <div
            className="flex w-full items-center justify-between rounded-2xl border px-6 py-4"
            style={{
              maxWidth: `${100 - i * 12}%`,
              borderColor: `${s.tone}45`,
              backgroundColor: `${s.tone}12`,
            }}
          >
            <span className="font-mono text-4xl font-bold tabular-nums text-white sm:text-5xl">
              {s.n ?? '—'}
            </span>
            <span className="ml-4 text-right text-sm text-white/65 sm:text-base">
              {s.label}
            </span>
          </div>
          {i < stages.length - 1 && (
            <ChevronsDown className="my-1 h-4 w-4 text-white/30" />
          )}
        </div>
      ))}
    </div>
  );
}

function MorningVoteFigure({ rows, advancingIds, accent }) {
  // Horizontal bars driven by avg_rank (lower = better, so invert for length)
  const visible = rows.slice(0, 10);
  const maxRank = Math.max(...visible.map((r) => r.avg_rank || 1));
  const minRank = Math.min(...visible.map((r) => r.avg_rank || 1));
  const span = Math.max(0.5, maxRank - minRank);
  return (
    <div className="mt-6 space-y-2.5">
      {visible.map((r, i) => {
        const qid = r.question_id ?? r.id;
        const isAdvancing = advancingIds.has(qid);
        const tone = isAdvancing ? '#10b981' : 'rgba(148, 163, 184, 0.7)';
        // Inverted: best rank = longest bar
        const width = r.avg_rank != null
          ? Math.max(8, 100 - ((r.avg_rank - minRank) / span) * 70)
          : 50;
        return (
          <div key={qid} className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3">
            <span
              className={`inline-flex h-7 w-7 items-center justify-center rounded-full font-mono text-sm font-bold ${
                isAdvancing ? 'bg-emerald-500/25 text-emerald-200' : 'bg-white/[0.06] text-white/55'
              }`}
            >
              {i + 1}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="min-w-0 flex-1 truncate text-sm text-white/85 sm:text-base">
                  {r.text || r.question_text}
                </p>
                {isAdvancing && (
                  <span className="shrink-0 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-200">
                    ✓ advances
                  </span>
                )}
              </div>
              <div
                className="mt-1.5 h-1.5 overflow-hidden rounded-full"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${width}%`, backgroundColor: tone }}
                />
              </div>
            </div>
            <span className="shrink-0 font-mono text-sm text-white/60">
              {r.avg_rank != null ? `rank ${r.avg_rank.toFixed(2)}` : '—'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function AdvancingQuestionCard({ index, question, rationale, accent }) {
  const delta = (question.r1_importance_mean != null && question.r2_importance_mean != null)
    ? question.r2_importance_mean - question.r1_importance_mean
    : null;
  return (
    <li
      className="rounded-2xl border p-5"
      style={{ borderColor: `${accent}35`, backgroundColor: `${accent}0E` }}
    >
      <div className="flex items-start gap-5">
        <span
          className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-mono text-2xl font-bold tabular-nums"
          style={{ backgroundColor: `${accent}30`, color: accent }}
        >
          {index}
        </span>
        <div className="min-w-0 flex-1">
          {rationale?.title && (
            <p className="text-sm font-semibold uppercase tracking-wide text-white/55">
              {rationale.title}
            </p>
          )}
          <p className="mt-1 text-xl leading-snug text-white/95 sm:text-2xl">
            {question.text}
          </p>

          {/* Stat strip */}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-white/55">
            {question.r2_include_pct != null && (
              <span>
                <span className="font-mono font-semibold text-white/80">
                  {Math.round(question.r2_include_pct)}%
                </span>{' '}
                include
              </span>
            )}
            {question.r2_importance_mean != null && (
              <span>
                importance{' '}
                <span className="font-mono font-semibold text-white/80">
                  {question.r2_importance_mean.toFixed(1)}
                </span>
              </span>
            )}
            {delta != null && Math.abs(delta) >= 0.15 && (
              <span
                className={`inline-flex items-center gap-1 font-mono font-semibold ${
                  delta > 0 ? 'text-emerald-300' : 'text-rose-300'
                }`}
              >
                {delta > 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                {delta > 0 ? '+' : ''}{delta.toFixed(1)} vs R1
              </span>
            )}
          </div>

          {/* Rationale grid from SUMMARY_DOCS */}
          {(rationale?.pain || rationale?.expansion || rationale?.impact) && (
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {rationale?.pain && (
                <RationaleBlock label="Pain point" body={rationale.pain} />
              )}
              {rationale?.expansion && (
                <RationaleBlock label="What it unlocks" body={rationale.expansion} />
              )}
              {rationale?.impact && (
                <RationaleBlock label="Anticipated impact" body={rationale.impact} />
              )}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

function RationaleBlock({ label, body }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">{label}</p>
      <p className="mt-1 text-sm leading-relaxed text-white/65">{body}</p>
    </div>
  );
}

function ShiftColumn({ title, items, tone }) {
  if (!items?.length) return null;
  const toneMap = {
    emerald: { color: '#34d399', bg: 'rgba(16, 185, 129, 0.10)', border: 'rgba(16, 185, 129, 0.30)' },
    rose:    { color: '#fb7185', bg: 'rgba(248, 113, 113, 0.10)', border: 'rgba(248, 113, 113, 0.30)' },
  };
  const t = toneMap[tone] || toneMap.emerald;
  const Icon = tone === 'rose' ? ArrowDownRight : ArrowUpRight;
  return (
    <div
      className="rounded-2xl border p-4"
      style={{ borderColor: t.border, backgroundColor: t.bg }}
    >
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" style={{ color: t.color }} />
        <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: t.color }}>
          {title}
        </p>
      </div>
      <ul className="mt-3 space-y-2">
        {items.map((q) => (
          <li key={q.id} className="flex items-start gap-3">
            <span className="shrink-0 font-mono text-sm font-bold" style={{ color: t.color }}>
              {q.delta > 0 ? '+' : ''}{q.delta.toFixed(1)}
            </span>
            <p className="min-w-0 flex-1 text-sm leading-snug text-white/85 line-clamp-2">
              {q.text}
            </p>
            <span className="shrink-0 font-mono text-xs text-white/45">
              {q.r1.toFixed(1)} → <span className="font-bold text-white/80">{q.r2.toFixed(1)}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Takeaway({ text, tone = 'cyan' }) {
  const toneMap = {
    cyan:    { color: '#7dd3fc', border: 'rgba(125, 211, 252, 0.30)', bg: 'rgba(125, 211, 252, 0.08)' },
    amber:   { color: '#fcd34d', border: 'rgba(252, 211, 77, 0.30)',  bg: 'rgba(252, 211, 77, 0.08)' },
    emerald: { color: '#34d399', border: 'rgba(52, 211, 153, 0.30)',  bg: 'rgba(52, 211, 153, 0.08)' },
    indigo:  { color: '#a5b4fc', border: 'rgba(165, 180, 252, 0.30)', bg: 'rgba(165, 180, 252, 0.08)' },
  };
  const t = toneMap[tone] || toneMap.cyan;
  return (
    <div
      className="mt-5 rounded-xl border-l-4 px-4 py-3"
      style={{ borderColor: t.color, backgroundColor: t.bg }}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.25em]" style={{ color: t.color }}>
        Key takeaway
      </p>
      <p className="mt-1 text-base text-white/85 sm:text-lg">{text}</p>
    </div>
  );
}

export default PresentWGStage;
