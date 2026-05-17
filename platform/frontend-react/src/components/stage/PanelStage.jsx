/**
 * Per-panel stage view — the workhorse of conference day.
 *
 * Layout:
 *   - Header strip: WG name + panel number + active discussion prompt
 *   - Main stage (left): tabbed — Results | Live Vote | Pre/Post comparison
 *   - Chat sidebar (right): anonymous audience messages, sortable by upvotes
 *   - Footer strip: phase indicator + breakout timer (admin-controlled)
 *
 * Audience phones see chat input on /day; this stage is the projection.
 */

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ScatterChart, Scatter, ReferenceLine, Cell,
} from 'recharts';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { ChatSidebar } from '@/components/stage/ChatSidebar';
import { WordCloud } from '@/components/stage/WordCloud';
import { PANEL_PROMPTS, WG_LABELS, PILLAR_COLORS } from '@/components/stage/panelConfig';

export function PanelStage({ wgNumber, panelTab, bus, isAdmin, onTabChange }) {
  const [sessionId, setSessionId] = useState(null);
  const [resolving, setResolving] = useState(true);
  const [aiPrompts, setAiPrompts] = useState([]);

  // Find the active wg_presentation session for this WG.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setResolving(true);
      try {
        const sessions = await api('/api/conference/sessions');
        if (cancelled) return;
        const match = (sessions || [])
          .filter((s) => s.wg_number === wgNumber && s.session_type === 'wg_presentation')
          .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))[0];
        setSessionId(match ? match.id : null);
      } catch {
        setSessionId(null);
      } finally {
        if (!cancelled) setResolving(false);
      }
    })();
    return () => { cancelled = true; };
  }, [wgNumber, bus]);

  // Fetch AI-promoted prompts for this session. Refreshes when the bus
  // ticks (StageView increments it on ai_prompts_changed via SSE).
  useEffect(() => {
    if (!sessionId) { setAiPrompts([]); return; }
    let cancelled = false;
    api(`/api/conference/ai/prompts/${sessionId}`)
      .then((d) => { if (!cancelled) setAiPrompts(d?.prompts || []); })
      .catch(() => { if (!cancelled) setAiPrompts([]); });
    return () => { cancelled = true; };
  }, [sessionId, bus]);

  const accent = PILLAR_COLORS[wgNumber] || '#00B4D8';
  const wgName = WG_LABELS[wgNumber] || `Working Group ${wgNumber}`;
  const prompts = PANEL_PROMPTS[wgNumber] || [];

  return (
    // Three-row layout: header (small), prompts strip (prominent), body
    // (two-column results+chat). Everything fixed-height except the
    // body, which fills the remainder and scrolls internally.
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-4 px-8 pb-2 pt-4">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl font-bold"
          style={{ backgroundColor: `${accent}25`, color: accent }}
        >
          {wgNumber}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40">Panel {wgNumber}</p>
          <h1 className="text-2xl font-bold sm:text-3xl">{wgName}</h1>
        </div>
      </div>

      {/* Discussion prompts — promoted to a prominent full-width strip
          so panelists and audience always know where the conversation
          is supposed to land. Each card gets a slightly different hue
          so they read as three distinct angles, not a triplet.
          AI-promoted prompts from chat appear as a second row below
          the static ones with a glowing "Live from chat" badge. */}
      {(prompts.length > 0 || aiPrompts.length > 0) && (
        <div className="mx-8 mb-3 shrink-0 rounded-xl border p-3"
             style={{ borderColor: `${accent}30`, backgroundColor: `${accent}08` }}>
          <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: accent }}>
            Discussion prompts
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {prompts.slice(0, 3).map((p, i) => {
              // Three palette slots: accent (WG color), warm, cool. Each
              // card uses its slot for the label + a subtle border accent.
              const palette = [accent, '#F472B6', '#A78BFA'][i % 3];
              return (
                <div
                  key={i}
                  className="rounded-lg p-2.5"
                  style={{
                    backgroundColor: `${palette}10`,
                    borderLeft: `3px solid ${palette}80`,
                  }}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wider"
                     style={{ color: palette }}>
                    {p.label}
                  </p>
                  <p className="mt-1 text-sm leading-snug text-white/95 line-clamp-3">{p.text}</p>
                </div>
              );
            })}
          </div>

          {aiPrompts.length > 0 && (
            <AnimatePresence>
              <motion.div
                key={aiPrompts.length}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="mt-2 grid gap-2 sm:grid-cols-3"
              >
                {aiPrompts.slice(0, 3).map((text, i) => (
                  <div
                    key={`ai-${i}`}
                    className="relative overflow-hidden rounded-lg p-2.5"
                    style={{
                      backgroundColor: 'rgba(139, 92, 246, 0.10)',
                      borderLeft: '3px solid rgba(167, 139, 250, 0.7)',
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex h-1.5 w-1.5 rounded-full bg-purple-300 animate-pulse" />
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-purple-300">
                        Live from chat
                      </p>
                    </div>
                    <p className="mt-1 text-sm leading-snug text-white/95 line-clamp-3">{text}</p>
                  </div>
                ))}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      )}

      {/* Body: three columns — text/questions (L), figures (M), chat (R).
          On the Vote and Comparison tabs the left+middle merge so the
          live tally / shift comparison gets the full visual width. */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 overflow-hidden lg:grid-cols-[1fr_1.1fr_1fr]">
        {/* LEFT — questions + text insights, two stacked cycling panels */}
        {panelTab === 'results' ? (
          <div className="flex h-full min-h-0 flex-col gap-3 border-r border-white/[0.06] px-5 pb-3">
            <div className="flex min-h-0 flex-[1.6] flex-col">
              <ResultsView wgNumber={wgNumber} bus={bus} accent={accent} />
            </div>
            <div className="flex min-h-0 flex-1 flex-col">
              <FacetCarousel wgNumber={wgNumber} bus={bus} accent={accent} />
            </div>
          </div>
        ) : (
          // Vote / Comparison: take the full left+middle width
          <div className="col-span-2 flex h-full min-h-0 flex-col border-r border-white/[0.06] px-6 pb-3">
            <AnimatePresence mode="wait">
              <motion.div
                key={panelTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="flex min-h-0 flex-1 flex-col"
              >
                {panelTab === 'vote' && <VoteView sessionId={sessionId} resolving={resolving} bus={bus} />}
                {panelTab === 'comparison' && <ComparisonView wgNumber={wgNumber} bus={bus} accent={accent} />}
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        {/* MIDDLE — figures (only on results tab; vote/compare take this col) */}
        {panelTab === 'results' && (
          <div className="flex h-full min-h-0 flex-col border-r border-white/[0.06] px-5 pb-3">
            <FigureCarousel wgNumber={wgNumber} bus={bus} accent={accent} />
          </div>
        )}

        {/* RIGHT — word cloud on top, chat takes the rest */}
        <div className="flex h-full min-h-0 flex-col gap-3 px-4 pb-3">
          <div className="h-[160px] shrink-0">
            <WordCloud sessionId={sessionId} bus={bus} accent={accent} />
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            <ChatSidebar sessionId={sessionId} resolving={resolving} bus={bus} accent={accent} isAdmin={isAdmin} />
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Results tab -----------------------------------------------------------

// Subtle palette derived from the WG accent — each card on a results
// page gets one of these tones in rotation so the column reads as a
// stack of distinct moments rather than a monotone list.
const CARD_OPACITIES = [0.05, 0.08, 0.04, 0.07];
const TEXT_OPACITIES = [0.95, 0.90, 0.88, 0.92];

const PAGE_SIZE = 3;
const CYCLE_MS = 10_000;

function ResultsView({ wgNumber, bus, accent }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api(`/api/surveys/results/${wgNumber}/round_2`)
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setData({ questions: [] }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [wgNumber, bus]);

  // Reset to page 0 whenever the WG changes
  useEffect(() => { setPage(0); }, [wgNumber]);

  const questions = (data?.questions || []).filter((q) => q.status !== 'removed');
  const sorted = useMemo(() => [...questions].sort(
    (a, b) => (b.r2_importance_mean || 0) - (a.r2_importance_mean || 0)
              || (b.r2_include_pct || 0) - (a.r2_include_pct || 0)
  ), [questions]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));

  // Auto-rotate through pages
  useEffect(() => {
    if (totalPages <= 1) return;
    const t = setInterval(() => setPage((p) => (p + 1) % totalPages), CYCLE_MS);
    return () => clearInterval(t);
  }, [totalPages]);

  if (loading) return <Skeleton className="h-64 w-full rounded-2xl" />;

  const startIdx = page * PAGE_SIZE;
  const pageItems = sorted.slice(startIdx, startIdx + PAGE_SIZE);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-baseline justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/45">
          Round 2 results
        </p>
        <p className="font-mono text-[10px] text-white/35">
          {sorted.length === 0
            ? '—'
            : `${startIdx + 1}–${Math.min(startIdx + PAGE_SIZE, sorted.length)} of ${sorted.length}`}
        </p>
      </div>

      <AnimatePresence mode="wait">
        <motion.ol
          key={page}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="mt-3 flex min-h-0 flex-1 flex-col gap-3"
        >
          {pageItems.map((q, i) => {
            const imp = q.r2_importance_mean ?? q.r1_importance_mean ?? 0;
            const frac = Math.max(0.05, imp / 9);
            const cardBg = `rgba(255, 255, 255, ${CARD_OPACITIES[i % CARD_OPACITIES.length]})`;
            const textOpacity = TEXT_OPACITIES[i % TEXT_OPACITIES.length];
            const absoluteIdx = startIdx + i;
            return (
              <li
                key={q.id}
                className="flex min-h-0 flex-1 flex-col justify-center overflow-hidden rounded-xl p-3"
                style={{ backgroundColor: cardBg }}
              >
                <div className="flex min-w-0 items-start gap-2.5">
                  <span
                    className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded font-mono text-xs font-bold"
                    style={{ backgroundColor: `${accent}25`, color: accent }}
                  >
                    {absoluteIdx + 1}
                  </span>
                  <p
                    className="min-w-0 flex-1 text-[13px] leading-snug line-clamp-4"
                    style={{ color: `rgba(255, 255, 255, ${textOpacity})` }}
                  >
                    {q.text}
                  </p>
                  <span className="shrink-0 self-start font-mono text-lg font-semibold text-white/90">
                    {imp.toFixed(1)}
                  </span>
                </div>
                <div className="mt-2 h-1.5 shrink-0 overflow-hidden rounded-full bg-white/[0.05]">
                  <motion.div
                    className="h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${frac * 100}%` }}
                    transition={{ duration: 0.7, ease: 'easeOut' }}
                    style={{ backgroundColor: accent, opacity: 0.85 }}
                  />
                </div>
              </li>
            );
          })}
          {pageItems.length === 0 && (
            <li className="rounded-xl bg-white/[0.04] p-8 text-center text-sm text-white/40 list-none">
              No Round 2 data available yet.
            </li>
          )}
        </motion.ol>
      </AnimatePresence>

      {totalPages > 1 && (
        <div className="mt-3 flex shrink-0 justify-center gap-1.5">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: i === page ? 24 : 6,
                backgroundColor: i === page ? accent : 'rgba(255,255,255,0.15)',
              }}
              aria-label={`Page ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// --- Vote tab --------------------------------------------------------------

function VoteView({ sessionId, resolving, bus }) {
  const [results, setResults] = useState(null);
  const [session, setSession] = useState(null);

  useEffect(() => {
    if (!sessionId) return;
    Promise.all([
      api(`/api/conference/results/${sessionId}`),
      api(`/api/conference/sessions/${sessionId}/questions`),
    ])
      .then(([r, s]) => { setResults(r); setSession(s); })
      .catch(() => { setResults(null); setSession(null); });
  }, [sessionId, bus]);

  if (resolving) return <Skeleton className="h-64 w-full rounded-2xl" />;
  if (!sessionId) {
    return (
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-8 text-center">
        <p className="text-amber-200">No active conference session yet for this WG.</p>
        <p className="mt-2 text-sm text-white/50">Create one in the admin dashboard, then return here.</p>
      </div>
    );
  }
  if (!results) return <Skeleton className="h-64 w-full rounded-2xl" />;

  const rows = (results?.questions || results?.results || []);
  // If we have session questions but no votes yet, show the question list as a preview
  const preview = rows.length === 0 ? (session?.questions || []) : [];
  const maxRank = Math.max(1, ...rows.map((r) => r.avg_rank || 0));
  const maxImp = Math.max(1, ...rows.map((r) => r.importance_mean || 0));
  const maxPts = Math.max(1, ...rows.map((r) => r.points || 0));

  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
          Live vote — session {sessionId}
        </p>
        {session?.phase && (
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
            session.phase === 'pre_discussion' ? 'bg-amber-500/15 text-amber-300' : 'bg-emerald-500/15 text-emerald-300'
          }`}>
            {session.phase === 'pre_discussion' ? 'Pre-discussion' : 'Post-discussion'}
          </span>
        )}
        {session?.is_active === false && (
          <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/50">
            Inactive
          </span>
        )}
      </div>

      {preview.length > 0 && (
        <>
          <p className="mb-3 text-xs text-white/40">
            Vote not yet started — these are the questions audience will see:
          </p>
          <div className="space-y-2">
            {preview.slice(0, 10).map((q) => (
              <div key={q.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <p className="text-sm text-white/85">{q.text}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {rows.length > 0 && (
        <div className="space-y-2">
          {rows.slice(0, 12).map((r) => {
            const inc = r.r2_include_pct || r.r1_include_pct;
            const denom = r.points != null ? maxPts : r.avg_rank != null ? maxRank : r.importance_mean != null ? maxImp : 1;
            const val = r.points || r.importance_mean || (maxRank - (r.avg_rank || 0) + 1);
            return (
              <div key={r.question_id || r.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <p className="text-sm text-white/90">{r.text || r.question_text}</p>
                <div className="mt-2 flex items-center gap-3 text-xs text-white/50">
                  {r.avg_rank != null && (
                    <span>avg rank <span className="font-mono text-white">{Number(r.avg_rank).toFixed(2)}</span></span>
                  )}
                  {r.importance_mean != null && (
                    <span>importance <span className="font-mono text-white">{Number(r.importance_mean).toFixed(1)}</span></span>
                  )}
                  {r.points != null && (
                    <span>points <span className="font-mono text-white">{r.points}</span></span>
                  )}
                  {r.n_votes != null && (
                    <span>n=<span className="font-mono text-white">{r.n_votes}</span></span>
                  )}
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.04]">
                  <div
                    className="h-full rounded-full bg-[#00B4D8] transition-all"
                    style={{ width: `${Math.min(100, (val / denom) * 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// --- Comparison tab --------------------------------------------------------

function ComparisonView({ wgNumber, bus }) {
  const [shifts, setShifts] = useState(null);
  useEffect(() => {
    api(`/api/conference/deliberation-shift/${wgNumber}`)
      .then((d) => setShifts(d?.shifts || []))
      .catch(() => setShifts([]));
  }, [wgNumber, bus]);

  if (shifts === null) return <Skeleton className="h-64 w-full rounded-2xl" />;
  if (shifts.length === 0) {
    return (
      <p className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-sm text-white/40">
        Pre/post comparison appears here after the breakout discussion + re-vote.
      </p>
    );
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
        Pre vs. post deliberation — what shifted
      </p>
      <div className="mt-5 space-y-2">
        {shifts.slice(0, 10).map((s) => (
          <div key={s.question_id} className="flex items-start gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <span className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
              s.direction === 'up' ? 'bg-emerald-500/20 text-emerald-300' : s.direction === 'down' ? 'bg-red-500/20 text-red-300' : 'bg-white/[0.06] text-white/40'
            }`}>
              {s.direction === 'up' ? '↑' : s.direction === 'down' ? '↓' : '—'}
            </span>
            <p className="flex-1 text-sm text-white/90">{s.question_text}</p>
            <span className="shrink-0 font-mono text-xs text-white/50">
              {s.shift != null ? (s.shift > 0 ? '+' : '') + Number(s.shift).toFixed(2) : '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Facet carousel (bottom of left column) -------------------------------
// Cycles through different angles on the same R2 data: strongest
// consensus, biggest deliberation shifts, pairwise winners. Each facet
// is on screen for ~15s so audience eyes can land on whichever is
// fresh. The cycling here is slower than the results panel above so the
// motion in the column staggers nicely.

const FACET_CYCLE_MS = 15_000;

function FacetCarousel({ wgNumber, bus, accent }) {
  const [data, setData] = useState(null);
  const [facetIdx, setFacetIdx] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api(`/api/surveys/results/${wgNumber}/round_2`)
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setData({ questions: [] }); });
    return () => { cancelled = true; };
  }, [wgNumber, bus]);

  const questions = useMemo(
    () => (data?.questions || []).filter((q) => q.status !== 'removed'),
    [data]
  );

  const facets = useMemo(() => {
    if (!questions.length) return [];

    const byConsensus = [...questions]
      .filter((q) => q.r2_include_pct != null)
      .sort((a, b) => (b.r2_include_pct || 0) - (a.r2_include_pct || 0))
      .slice(0, 3);

    const byShift = [...questions]
      .filter((q) => q.r1_importance_mean != null && q.r2_importance_mean != null)
      .map((q) => ({
        ...q,
        shift: (q.r2_importance_mean || 0) - (q.r1_importance_mean || 0),
      }))
      .sort((a, b) => Math.abs(b.shift) - Math.abs(a.shift))
      .slice(0, 3);

    const byPairwise = [...questions]
      .filter((q) => q.pairwise_score != null)
      .sort((a, b) => (b.pairwise_score || 0) - (a.pairwise_score || 0))
      .slice(0, 3);

    const result = [
      { key: 'consensus', label: 'Strongest consensus', items: byConsensus, render: (q) => `${Math.round(q.r2_include_pct || 0)}% include` },
    ];
    if (byShift.length) {
      result.push({
        key: 'shift',
        label: 'Biggest R1 → R2 shifts',
        items: byShift,
        render: (q) => `${q.shift > 0 ? '+' : ''}${q.shift.toFixed(1)} importance`,
      });
    }
    if (byPairwise.length) {
      result.push({
        key: 'pairwise',
        label: 'Pairwise leaders',
        items: byPairwise,
        render: (q) => `${Math.round(q.pairwise_score || 0)} pts`,
      });
    }
    return result;
  }, [questions]);

  useEffect(() => {
    if (facets.length <= 1) return;
    const t = setInterval(() => setFacetIdx((i) => (i + 1) % facets.length), FACET_CYCLE_MS);
    return () => clearInterval(t);
  }, [facets.length]);

  useEffect(() => { setFacetIdx(0); }, [wgNumber]);

  if (!data) return <Skeleton className="h-full w-full rounded-2xl" />;
  if (!facets.length) return null;

  const facet = facets[facetIdx % facets.length];

  return (
    <div className="flex h-full min-h-0 flex-col rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
      <div className="flex shrink-0 items-baseline justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: accent }}>
          {facet.label}
        </p>
        <div className="flex items-center gap-1">
          {facets.map((f, i) => (
            <span
              key={f.key}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: i === facetIdx ? 16 : 4,
                backgroundColor: i === facetIdx ? accent : 'rgba(255,255,255,0.18)',
              }}
            />
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.ol
          key={facet.key}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="mt-2 flex min-h-0 flex-1 flex-col justify-center gap-1.5"
        >
          {facet.items.map((q, i) => (
            <li key={q.id} className="flex min-w-0 items-start gap-2 overflow-hidden rounded-lg bg-white/[0.03] p-2">
              <span
                className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded font-mono text-[10px] font-bold"
                style={{ backgroundColor: `${accent}25`, color: accent }}
              >
                {i + 1}
              </span>
              <p className="min-w-0 flex-1 text-[12px] leading-snug text-white/90 line-clamp-2">
                {q.text}
              </p>
              <span className="shrink-0 font-mono text-[11px] font-semibold text-white/75 whitespace-nowrap">
                {facet.render(q)}
              </span>
            </li>
          ))}
        </motion.ol>
      </AnimatePresence>
    </div>
  );
}

// --- Middle column: figures carousel --------------------------------------
// Three rotating charts that summarize R2 visually — meant to draw the
// audience's eye after they've read the question list on the left.

const FIGURE_CYCLE_MS = 12_000;
const IMPORTANCE_BUCKETS = [
  { label: '1–3', min: 1, max: 3 },
  { label: '3–5', min: 3, max: 5 },
  { label: '5–7', min: 5, max: 7 },
  { label: '7–9', min: 7, max: 9.01 },
];

function FigureCarousel({ wgNumber, bus, accent }) {
  const [data, setData] = useState(null);
  const [figIdx, setFigIdx] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api(`/api/surveys/results/${wgNumber}/round_2`)
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setData({ questions: [] }); });
    return () => { cancelled = true; };
  }, [wgNumber, bus]);

  const questions = useMemo(
    () => (data?.questions || []).filter((q) => q.status !== 'removed'),
    [data]
  );

  // Build per-figure datasets
  const importanceBuckets = useMemo(() => {
    return IMPORTANCE_BUCKETS.map((b) => ({
      bucket: b.label,
      count: questions.filter((q) => {
        const v = q.r2_importance_mean ?? q.r1_importance_mean ?? null;
        return v != null && v >= b.min && v < b.max;
      }).length,
    }));
  }, [questions]);

  // Per-question importance bar chart — sorted, with shift colored
  const rankedRows = useMemo(() => questions
    .filter((q) => q.r2_importance_mean != null)
    .map((q) => {
      const r1 = q.r1_importance_mean;
      const r2 = q.r2_importance_mean;
      const shift = r1 != null && r2 != null ? r2 - r1 : null;
      return {
        name: q.short_text || `Q${q.id}`,
        text: q.text,
        importance: r2,
        shift,
        // Bar color encodes shift direction
        fill: shift == null
          ? accent
          : shift > 0.2 ? '#10b981'
          : shift < -0.2 ? '#f87171'
          : accent,
      };
    })
    .sort((a, b) => (b.importance || 0) - (a.importance || 0))
    .slice(0, 10),
  [questions, accent]);

  const shiftScatter = useMemo(() => questions
    .filter((q) => q.r1_importance_mean != null && q.r2_importance_mean != null)
    .map((q, i) => {
      const r1 = q.r1_importance_mean;
      const r2 = q.r2_importance_mean;
      const diff = r2 - r1;
      return {
        x: r1,
        y: r2,
        label: q.short_text || `Q${i + 1}`,
        fill: diff > 0.2 ? '#10b981' : diff < -0.2 ? '#f87171' : 'rgba(255,255,255,0.55)',
      };
    }),
  [questions]);

  const figures = useMemo(() => {
    const out = [];

    if (rankedRows.length >= 1) {
      out.push({ key: 'ranked', label: 'Importance by question', render: () => (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={rankedRows}
            margin={{ top: 4, right: 32, bottom: 4, left: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
            <XAxis
              type="number" domain={[0, 9]}
              tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 13 }}
              axisLine={false} tickLine={false}
            />
            <YAxis
              type="category" dataKey="name" width={90}
              tick={{ fill: 'rgba(255,255,255,0.75)', fontSize: 13 }}
              axisLine={false} tickLine={false}
              interval={0}
            />
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.03)' }}
              contentStyle={{ background: '#0E1E35', border: `1px solid ${accent}55`, borderRadius: 8, fontSize: 13 }}
              labelStyle={{ color: 'rgba(255,255,255,0.65)', maxWidth: 320 }}
              formatter={(v, _name, p) => [`${Number(v).toFixed(1)} importance`, p?.payload?.text || '']}
            />
            <Bar dataKey="importance" radius={[0, 6, 6, 0]} label={{ position: 'right', fill: 'rgba(255,255,255,0.85)', fontSize: 13, formatter: (v) => Number(v).toFixed(1) }}>
              {rankedRows.map((r, i) => (<Cell key={i} fill={r.fill} />))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )});
    }

    if (shiftScatter.length >= 3) {
      out.push({ key: 'shift', label: 'R1 → R2 deliberation shift', render: () => (
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 8, right: 16, bottom: 28, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              type="number" dataKey="x" name="R1" domain={[1, 9]}
              tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 13 }}
              axisLine={false} tickLine={false}
              label={{ value: 'Round 1 importance', fill: 'rgba(255,255,255,0.5)', fontSize: 13, position: 'insideBottom', offset: -8 }}
            />
            <YAxis
              type="number" dataKey="y" name="R2" domain={[1, 9]}
              tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 13 }}
              axisLine={false} tickLine={false}
              label={{ value: 'R2', fill: 'rgba(255,255,255,0.5)', fontSize: 13, angle: -90, position: 'insideLeft' }}
            />
            <ReferenceLine
              segment={[{ x: 1, y: 1 }, { x: 9, y: 9 }]}
              stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4"
            />
            <Tooltip
              cursor={{ stroke: 'rgba(255,255,255,0.1)' }}
              contentStyle={{ background: '#0E1E35', border: `1px solid ${accent}55`, borderRadius: 8, fontSize: 13 }}
            />
            <Scatter data={shiftScatter}>
              {shiftScatter.map((r, i) => (<Cell key={i} fill={r.fill} />))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      )});
    }

    if (importanceBuckets.some((b) => b.count > 0)) {
      out.push({ key: 'distribution', label: 'How importance is distributed', render: () => (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={importanceBuckets} margin={{ top: 12, right: 16, bottom: 12, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="bucket" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 14 }} axisLine={false} tickLine={false}
                   label={{ value: 'Importance band', fill: 'rgba(255,255,255,0.5)', fontSize: 12, position: 'insideBottom', offset: -2 }} />
            <YAxis tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 13 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.03)' }}
              contentStyle={{ background: '#0E1E35', border: `1px solid ${accent}55`, borderRadius: 8, fontSize: 13 }}
              labelStyle={{ color: 'rgba(255,255,255,0.65)' }}
              formatter={(v) => [`${v} question${v === 1 ? '' : 's'}`, '']}
            />
            <Bar dataKey="count" fill={accent} radius={[8, 8, 0, 0]}
                 label={{ position: 'top', fill: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: 600 }} />
          </BarChart>
        </ResponsiveContainer>
      )});
    }

    return out;
  }, [rankedRows, shiftScatter, importanceBuckets, accent]);

  useEffect(() => {
    if (figures.length <= 1) return;
    const t = setInterval(() => setFigIdx((i) => (i + 1) % figures.length), FIGURE_CYCLE_MS);
    return () => clearInterval(t);
  }, [figures.length]);

  useEffect(() => { setFigIdx(0); }, [wgNumber]);

  if (!data) return <Skeleton className="h-full w-full rounded-2xl" />;
  if (!figures.length) {
    return (
      <div className="flex h-full flex-col rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/45">Figures</p>
        <div className="flex flex-1 items-center justify-center">
          <p className="text-xs text-white/40">Charts appear once R1/R2 data is in.</p>
        </div>
      </div>
    );
  }

  const fig = figures[figIdx % figures.length];

  return (
    <div className="flex h-full flex-col rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
      <div className="flex shrink-0 items-baseline justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: accent }}>
          {fig.label}
        </p>
        <div className="flex items-center gap-1">
          {figures.map((f, i) => (
            <span
              key={f.key}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: i === figIdx ? 16 : 4,
                backgroundColor: i === figIdx ? accent : 'rgba(255,255,255,0.18)',
              }}
            />
          ))}
        </div>
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={fig.key}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="mt-2 min-h-0 flex-1"
        >
          {fig.render()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
