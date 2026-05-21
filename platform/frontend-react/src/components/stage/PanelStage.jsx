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

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { ChatSidebar } from '@/components/stage/ChatSidebar';
import { WordCloud } from '@/components/stage/WordCloud';
import { PANEL_PROMPTS, WG_LABELS, PILLAR_COLORS } from '@/components/stage/panelConfig';

// Side-of-the-room readable infographic for biggest deliberation shifts.
// No hover, no tooltips — admins won't be hovering on a projector view.
function ShiftSection({ title, tone, items }) {
  const toneMap = {
    emerald: { color: '#34d399', bg: 'rgba(16, 185, 129, 0.10)', border: 'rgba(16, 185, 129, 0.30)' },
    rose:    { color: '#fb7185', bg: 'rgba(248, 113, 113, 0.10)', border: 'rgba(248, 113, 113, 0.30)' },
  };
  const t = toneMap[tone] || toneMap.emerald;
  const Icon = tone === 'rose' ? ArrowDownRight : ArrowUpRight;
  if (!items?.length) return null;
  return (
    <div className="rounded-xl border p-2.5" style={{ borderColor: t.border, backgroundColor: t.bg }}>
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5" style={{ color: t.color }} />
        <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: t.color }}>
          {title}
        </p>
      </div>
      <div className="mt-2 space-y-1.5">
        {items.map((q) => (
          <div key={q.id} className="flex items-start gap-2">
            <span className="font-mono text-xs font-bold" style={{ color: t.color }}>
              {q.delta > 0 ? '+' : ''}{q.delta.toFixed(1)}
            </span>
            <p className="min-w-0 flex-1 text-[12px] leading-snug text-white/85 line-clamp-2">
              {q.text}
            </p>
            <span className="shrink-0 font-mono text-[11px] text-white/55">
              {q.r1.toFixed(1)} → <span className="font-bold text-white/90">{q.r2.toFixed(1)}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PanelStage({ wgNumber, panelTab, bus, isAdmin, onTabChange }) {
  const [sessionId, setSessionId] = useState(null);
  const [resolving, setResolving] = useState(true);
  const [aiPrompts, setAiPrompts] = useState([]);
  const [sessionIsActive, setSessionIsActive] = useState(false);

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
        setSessionIsActive(Boolean(match?.is_active));
      } catch {
        setSessionId(null);
        setSessionIsActive(false);
      } finally {
        if (!cancelled) setResolving(false);
      }
    })();
    return () => { cancelled = true; };
  }, [wgNumber, bus]);

  // Auto-switch to the vote view whenever audience voting is open. This
  // override is local — it doesn't persist back to display-mode, so the
  // chair's manually-chosen panel_tab is preserved and restored as soon
  // as the session stops.
  const effectivePanelTab = sessionIsActive ? 'vote' : panelTab;

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
      {/* Header — sized for ballroom-scale readability */}
      <div className="flex shrink-0 items-center gap-5 px-10 pb-3 pt-5">
        <div
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-3xl font-bold"
          style={{ backgroundColor: `${accent}25`, color: accent }}
        >
          {wgNumber}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/55">Panel {wgNumber}</p>
          <h1 className="text-4xl font-bold leading-tight sm:text-5xl">{wgName}</h1>
        </div>
      </div>

      {/* Discussion prompts — single full-width strip of exactly 3 slots.
          Starts with 3 static prompts; as AI-promoted prompts arrive from
          the chat, the oldest static prompt is dropped and the new AI one
          takes the third slot. Maximum 3 visible at any time so the
          projector never overflows the strip vertically.

          Hidden during the Live Vote tab so the full leaderboard +
          advancing-to-cross-WG sidebar can fit on one screen without
          auto-scrolling. Returns on the Results / Comparison tabs. */}
      {effectivePanelTab !== 'vote' && (prompts.length > 0 || aiPrompts.length > 0) && (() => {
        // Build a combined list with chronological order: static prompts
        // come first (initial seed), AI prompts append. Take the last 3.
        const combined = [
          ...prompts.map((p, idx) => ({
            key: `static-${idx}`,
            label: p.label,
            text: p.text,
            isAI: false,
          })),
          ...aiPrompts.map((text, idx) => ({
            key: `ai-${idx}-${text.slice(0, 24)}`,
            label: 'Live from chat',
            text,
            isAI: true,
          })),
        ];
        const visible = combined.slice(-3);
        return (
          <div className="mx-8 mb-3 shrink-0 rounded-xl border p-3"
               style={{ borderColor: `${accent}30`, backgroundColor: `${accent}08` }}>
            <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: accent }}>
              Discussion prompts
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              <AnimatePresence initial={false} mode="popLayout">
                {visible.map((p, i) => {
                  // Three palette slots: accent, warm, cool. AI prompts
                  // override with the purple "live from chat" treatment.
                  const palette = p.isAI ? '#A78BFA' : [accent, '#F472B6', '#A78BFA'][i % 3];
                  return (
                    <motion.div
                      key={p.key}
                      layout
                      initial={{ opacity: 0, y: -8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      transition={{ duration: 0.4 }}
                      className="rounded-lg p-2.5"
                      style={{
                        backgroundColor: p.isAI ? 'rgba(139, 92, 246, 0.10)' : `${palette}10`,
                        borderLeft: p.isAI ? '3px solid rgba(167, 139, 250, 0.7)' : `3px solid ${palette}80`,
                      }}
                    >
                      <div className="flex items-center gap-1.5">
                        {p.isAI && (
                          <span className="inline-flex h-1.5 w-1.5 rounded-full bg-purple-300 animate-pulse" />
                        )}
                        <p className="text-[10px] font-semibold uppercase tracking-wider"
                           style={{ color: palette }}>
                          {p.label}
                        </p>
                      </div>
                      <p className="mt-1 text-sm leading-snug text-white/95 line-clamp-3">{p.text}</p>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        );
      })()}

      {/* Body layout.
          - Results (discussion view): three columns — curated panel
            pool on the left, figures in the middle, word cloud + chat
            on the right. (Previously also had a "How we got here"
            funnel + pairwise leaders card on the left; those are
            removed so the curated pool gets the full left column.)
          - Vote / Comparison: full-width — chat / cloud would compete
            with the live tally. */}
      {effectivePanelTab === 'results' ? (
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 overflow-hidden lg:grid-cols-[1.5fr_1fr]">
          {/* LEFT — chair-curated panel pool (what the audience will rank) */}
          <div className="flex h-full min-h-0 flex-col border-r border-white/[0.06] px-5 pb-3">
            <PanelPoolView
              sessionId={sessionId}
              resolving={resolving}
              bus={bus}
              accent={accent}
            />
          </div>

          {/* RIGHT — word cloud on top, audience chat below */}
          <div className="flex h-full min-h-0 flex-col gap-3 px-4 pb-3">
            <div
              className="h-[160px] shrink-0 rounded-2xl border p-2"
              style={{ borderColor: 'rgba(252, 211, 77, 0.18)', backgroundColor: 'rgba(252, 211, 77, 0.05)' }}
            >
              <WordCloud sessionId={sessionId} bus={bus} accent={accent} />
            </div>
            <div
              className="min-h-0 flex-1 overflow-hidden rounded-2xl border p-2"
              style={{ borderColor: 'rgba(248, 113, 113, 0.18)', backgroundColor: 'rgba(248, 113, 113, 0.05)' }}
            >
              <ChatSidebar sessionId={sessionId} resolving={resolving} bus={bus} accent={accent} isAdmin={isAdmin} />
            </div>
          </div>
        </div>
      ) : (
        // Vote / Comparison: single column, full width.
        <div className="flex min-h-0 flex-1 flex-col px-8 pb-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={effectivePanelTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="flex min-h-0 flex-1 flex-col"
            >
              {effectivePanelTab === 'vote' && <VoteView sessionId={sessionId} resolving={resolving} bus={bus} accent={accent} />}
              {effectivePanelTab === 'comparison' && <ComparisonView wgNumber={wgNumber} bus={bus} accent={accent} />}
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

// --- Discussion view (results tab) ----------------------------------------

// Single full-bleed panel of the chair's curated question pool —
// what the room is about to rank. No funnel infographic, no pairwise
// chart, no chat sidebar; the discussion view exists so the audience
// can READ the questions from the back of the room while the panel
// talks through them.
function PanelPoolView({ sessionId, resolving, bus, accent }) {
  const [pool, setPool] = useState(null);

  useEffect(() => {
    if (!sessionId) { setPool([]); return; }
    let cancelled = false;
    api(`/api/conference/sessions/${sessionId}/questions`)
      .then((d) => { if (!cancelled) setPool(d?.questions || []); })
      .catch(() => { if (!cancelled) setPool([]); });
    return () => { cancelled = true; };
  }, [sessionId, bus]);

  if (resolving || pool === null) {
    return <Skeleton className="h-[60vh] w-full rounded-2xl" />;
  }

  if (!pool.length) {
    return (
      <div className="rounded-2xl border border-amber-400/30 bg-amber-500/[0.06] p-8">
        <p className="text-2xl font-semibold text-amber-200">No panel pool curated yet</p>
        <p className="mt-2 text-lg text-white/65">
          Open the chair's Panel Pool curator on /command and pick the 6–8 questions
          the audience will rank. They'll appear here once saved.
        </p>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-0 flex-1 flex-col rounded-2xl border p-4"
      style={{ borderColor: `${accent}30`, backgroundColor: `${accent}08` }}
    >
      <div className="mb-3 flex shrink-0 items-baseline justify-between">
        <p className="text-base font-semibold uppercase tracking-[0.2em]" style={{ color: accent }}>
          Questions · audience ranks next
        </p>
        <p className="font-mono text-sm text-white/55">
          {pool.length} curated
        </p>
      </div>
      <ol className="grid min-h-0 flex-1 auto-rows-min grid-cols-1 gap-3 overflow-y-auto pr-1 lg:grid-cols-2">
        {pool.map((q, idx) => (
          <li
            key={q.id}
            className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"
          >
            <span
              className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg font-mono text-xl font-bold"
              style={{ backgroundColor: `${accent}25`, color: accent }}
            >
              {idx + 1}
            </span>
            <p className="min-w-0 flex-1 text-lg leading-snug text-white/95">
              {q.text}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}

// --- Results tab -----------------------------------------------------------

// Subtle palette derived from the WG accent — each card on a results
// page gets one of these tones in rotation so the column reads as a
// stack of distinct moments rather than a monotone list.
const CARD_OPACITIES = [0.05, 0.08, 0.04, 0.07];
const TEXT_OPACITIES = [0.95, 0.90, 0.88, 0.92];

// Fewer items per page = each question reads clearly from the back of
// the ballroom. Cycles every 10s so people who arrive mid-rotation
// still see the full set within ~30s.
const PAGE_SIZE = 2;
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

// How many questions advance from each WG panel to the cross-WG round.
// Drives the "Advancing" highlight on the live-vote stage and matches
// the documented funnel (4 × 4 WGs + WG5's 5 themes = 21).
const ADVANCING_PER_WG = 4;

// Gently auto-scroll an overflowing container so audience at the back of
// the room sees the full list without anyone touching the projector. Pauses
// at the top and bottom, then loops. No-op when content fits.
function useAutoScroll(ref, deps = []) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    let rafId;
    let cancelled = false;
    let paused = Date.now() + 1500;   // 1.5s read time at the top
    const PX_PER_SEC = 40;            // visibly cycling, not crawling
    const PAUSE_END_MS = 2000;        // brief pause at the bottom

    let lastTs = null;
    const tick = (ts) => {
      if (cancelled) return;
      if (lastTs == null) lastTs = ts;
      const dt = ts - lastTs;
      lastTs = ts;
      const now = Date.now();
      const overflow = el.scrollHeight - el.clientHeight;
      if (overflow > 4 && now > paused) {
        const next = el.scrollTop + (PX_PER_SEC * dt) / 1000;
        if (next >= overflow) {
          el.scrollTop = overflow;
          paused = now + PAUSE_END_MS;
          // Snap back after the pause and start over from the top
          setTimeout(() => {
            if (cancelled || !el) return;
            el.scrollTop = 0;
            paused = Date.now() + 1500;
            lastTs = null;
          }, PAUSE_END_MS);
        } else {
          el.scrollTop = next;
        }
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => { cancelled = true; cancelAnimationFrame(rafId); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

// Left column of the live vote view: full leaderboard of every question
// in this panel's pool. Designed to fit ~10 rows without scrolling now
// that the prompts strip is hidden on this tab. Rows are kept compact
// — single-line clamp on the question text, stats + bar on the same
// flex row as the rank chip — so the projector can show the whole pool
// at a glance from the back of the ballroom.
function FullRankingColumn({ accent, sortedRows, advancingIds, maxRank, maxImp }) {
  const scrollRef = useRef(null);
  // Auto-scroll only kicks in if rows actually overflow (long pools).
  // For the standard ~10-question pool there's nothing to scroll.
  useAutoScroll(scrollRef, [sortedRows.length]);

  // Pick ONE axis for the whole leaderboard so all bars are visually
  // comparable. If any row has avg_rank, treat the whole pool as a
  // ranking display (lower rank value → wider bar; invert via
  // maxRank - rank + 1). Otherwise fall back to importance.
  const useRank = sortedRows.some((r) => r.avg_rank != null);

  const valueFor = (r) => {
    if (useRank) return Math.max(0, maxRank - (r.avg_rank ?? maxRank) + 1);
    return r.importance_mean || 0;
  };
  const denom = useRank ? maxRank : maxImp;
  const scoreLabel = (r) => {
    if (useRank) return r.avg_rank != null ? Number(r.avg_rank).toFixed(1) : '—';
    return r.importance_mean != null ? Number(r.importance_mean).toFixed(1) : '—';
  };

  return (
    <div
      className="flex min-h-0 min-w-0 flex-1 flex-col rounded-2xl border p-4"
      style={{ borderColor: `${accent}25`, backgroundColor: `${accent}08` }}
    >
      <div className="mb-3 flex shrink-0 items-baseline justify-between">
        <p className="text-base font-semibold uppercase tracking-wider" style={{ color: accent }}>
          Full ranking
        </p>
        <p className="text-sm text-white/45">
          {sortedRows.length} question{sortedRows.length === 1 ? '' : 's'} · {useRank ? 'avg rank' : 'importance'}
        </p>
      </div>
      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto pr-1">
        {sortedRows.map((r, idx) => {
          const qid = r.question_id || r.id;
          const advancing = advancingIds.has(qid);
          const val = valueFor(r);
          const width = denom > 0 ? Math.min(100, (val / denom) * 100) : 0;
          return (
            <div
              key={qid}
              className="rounded-lg border px-3 py-2.5"
              style={{
                borderColor: advancing ? 'rgba(16, 185, 129, 0.35)' : 'rgba(255,255,255,0.06)',
                backgroundColor: advancing ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255,255,255,0.02)',
              }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg font-mono text-lg font-bold"
                  style={{
                    backgroundColor: advancing ? 'rgba(16, 185, 129, 0.25)' : `${accent}25`,
                    color: advancing ? '#34d399' : accent,
                  }}
                >
                  {idx + 1}
                </span>
                <p className="min-w-0 flex-1 truncate text-xl leading-tight text-white/95">
                  {r.text || r.question_text}
                </p>
                <span className="w-16 shrink-0 text-right font-mono text-lg font-semibold tabular-nums text-white/85">
                  {scoreLabel(r)}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.04]">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${width}%`,
                    backgroundColor: advancing ? '#10b981' : accent,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VoteView({ sessionId, resolving, bus, accent = '#00B4D8' }) {
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

  // The curated pool is the source of truth for what the audience is
  // ranking. Pull session.questions (always the curated set) and join
  // any matching vote rows from /results onto it. This guarantees every
  // curated question is visible on the leaderboard — even ones that
  // haven't been ranked yet, which would otherwise silently disappear.
  const pool = session?.questions || [];
  const voteRows = results?.results || [];
  const rankByQid = new Map();
  const impByQid = new Map();
  for (const r of voteRows) {
    const qid = r.question_id || r.id;
    if (r.avg_rank != null) rankByQid.set(qid, r);
    else if (r.importance_mean != null) impByQid.set(qid, r);
  }
  const rows = pool.map((q) => {
    const rk = rankByQid.get(q.id);
    const im = impByQid.get(q.id);
    return {
      id: q.id,
      question_id: q.id,
      text: q.text,
      wg_number: q.wg_number,
      avg_rank: rk?.mean ?? rk?.avg_rank ?? null,
      importance_mean: im?.importance_mean ?? im?.mean ?? null,
      n_votes: (rk?.n_votes ?? 0) || (im?.n_votes ?? 0),
    };
  });

  // Pool empty = chair hasn't curated this panel's question set yet.
  const noPool = pool.length === 0;

  // Sort: ranking (lower = better) when present. Unranked rows always
  // sink to the bottom in their original pool order so the audience sees
  // "here's everyone, here's where the live order sits".
  const sortedRows = [...rows].sort((a, b) => {
    const ar = a.avg_rank, br = b.avg_rank;
    if (ar != null && br != null) return ar - br;
    if (ar != null) return -1;
    if (br != null) return 1;
    return (b.importance_mean || 0) - (a.importance_mean || 0);
  });
  const advancingIds = new Set(sortedRows.slice(0, ADVANCING_PER_WG).map((r) => r.id));

  // One denominator for the leaderboard's progress bar so widths are
  // visually comparable. When ranking, the longest bar = rank 1 (top);
  // we invert so "lower rank value = wider bar".
  const maxRank = Math.max(1, ...rows.map((r) => r.avg_rank || 0));
  const maxImp = Math.max(1, ...rows.map((r) => r.importance_mean || 0));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Header — phase pill removed (single-rank funnel, no pre/post split) */}
      <div className="mb-3 flex shrink-0 items-center gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/45">
          Live vote · audience ranking
        </p>
        {results?.unique_voters != null && (
          <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/65">
            {results.unique_voters} voter{results.unique_voters === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {noPool && (
        <div className="rounded-2xl border border-amber-400/30 bg-amber-500/[0.06] p-6">
          <p className="text-sm font-semibold text-amber-200">No panel pool curated yet</p>
          <p className="mt-1 text-xs text-white/55">
            Open the chair's Panel Pool curator on /command and pick the 6–8 questions
            the audience will rank. They'll appear here as soon as you save.
          </p>
        </div>
      )}

      {rows.length > 0 && (
        // Stacked layout: "Advancing to cross-WG" strip on top (always
        // visible — what the audience cares about most), then the full
        // leaderboard beneath. Avoids the side-by-side grid that was
        // letting long question text push the sidebar off the right edge
        // at projector scale.
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <AdvancingStrip sortedRows={sortedRows} unique_voters={results?.unique_voters || 0} />
          <FullRankingColumn
            accent={accent}
            sortedRows={sortedRows}
            advancingIds={advancingIds}
            maxRank={maxRank}
            maxImp={maxImp}
          />
        </div>
      )}
    </div>
  );
}

// Horizontal "Advancing to cross-WG" strip — top 4 (or 5 for WG5) cards
// in one row above the full leaderboard. Always-visible so the audience
// knows what's currently winning a spot in the closing round.
function AdvancingStrip({ sortedRows, unique_voters }) {
  const top = sortedRows.slice(0, ADVANCING_PER_WG);
  const empties = Math.max(0, ADVANCING_PER_WG - top.length);
  return (
    <div
      className="shrink-0 rounded-2xl border p-4"
      style={{ borderColor: 'rgba(16, 185, 129, 0.35)', backgroundColor: 'rgba(16, 185, 129, 0.06)' }}
    >
      <div className="mb-3 flex shrink-0 items-baseline justify-between">
        <p className="text-base font-semibold uppercase tracking-wider text-emerald-300">
          Advancing to cross-WG — top {ADVANCING_PER_WG}
        </p>
        <p className="font-mono text-sm text-white/55">
          {unique_voters} {unique_voters === 1 ? 'voter' : 'voters'} · live
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {top.map((r, idx) => {
          const qid = r.question_id || r.id;
          return (
            <div
              key={qid}
              className="flex items-start gap-3 rounded-xl border border-emerald-400/30 bg-emerald-500/[0.05] p-3"
            >
              <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/30 font-mono text-xl font-bold text-emerald-200">
                {idx + 1}
              </span>
              <p className="min-w-0 flex-1 text-lg leading-snug text-white/95 line-clamp-4">
                {r.text || r.question_text}
              </p>
            </div>
          );
        })}
        {Array.from({ length: empties }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="rounded-xl border border-dashed border-white/[0.1] bg-white/[0.02] p-3"
          >
            <p className="text-base text-white/30">Slot {top.length + i + 1} — open</p>
          </div>
        ))}
      </div>
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

  // Consensus rows — every question with an R2 include% reading,
  // sorted CONTESTED FIRST so the audience sees where the WG is still
  // dividing. Color encodes "settled" (≥85%) vs "live debate" (50-84%)
  // vs "low support" (<50%, rare since these typically got removed).
  const consensusRows = useMemo(() => questions
    .filter((q) => q.r2_include_pct != null)
    .map((q) => {
      const incl = q.r2_include_pct;
      const r2 = q.r2_importance_mean;
      const tone = incl >= 85 ? 'settled' : incl >= 50 ? 'live' : 'low';
      const fill = tone === 'settled' ? '#10b981' : tone === 'live' ? '#fbbf24' : '#f87171';
      return {
        id: q.id,
        text: q.text,
        short: q.short_text || `Q${q.id}`,
        include: incl,
        importance: r2,
        tone,
        fill,
      };
    })
    // contested first, then descending by importance within a tier
    .sort((a, b) => {
      // Live debate sorted by closeness-to-50, then settled by include desc
      const tonePriority = { live: 0, settled: 1, low: 2 };
      const tp = tonePriority[a.tone] - tonePriority[b.tone];
      if (tp !== 0) return tp;
      if (a.tone === 'live') {
        // Most contested = closest to 50%
        return Math.abs(a.include - 67) - Math.abs(b.include - 67);
      }
      return (b.include || 0) - (a.include || 0);
    }),
  [questions]);

  // Biggest movers between R1 and R2 — used by the shift infographic.
  // We pick the three biggest positive shifts and three biggest negative
  // shifts so the audience sees both "what the group warmed to" and
  // "what cooled" without a chart.
  const topShifts = useMemo(() => {
    const withShift = questions
      .filter((q) => q.r1_importance_mean != null && q.r2_importance_mean != null)
      .map((q) => ({
        id: q.id,
        text: q.text,
        short: q.short_text || `Q${q.id}`,
        r1: q.r1_importance_mean,
        r2: q.r2_importance_mean,
        delta: q.r2_importance_mean - q.r1_importance_mean,
      }));
    const up = [...withShift].sort((a, b) => b.delta - a.delta).slice(0, 3);
    const down = [...withShift].sort((a, b) => a.delta - b.delta).slice(0, 3);
    return { up, down };
  }, [questions]);

  const totalQs = questions.length;

  // Process funnel counts for the "How we got here" infographic.
  const funnelCounts = useMemo(() => {
    // Active = anything in R2 that wasn't removed
    const active = questions.length;
    // Confirmed = strong consensus (≥85% include)
    const confirmed = consensusRows.filter((r) => r.tone === 'settled').length;
    // Live debate = 50–84% include
    const live = consensusRows.filter((r) => r.tone === 'live').length;
    // Removed = status === 'removed' from the original data
    const removed = (data?.questions || []).filter((q) => q.status === 'removed').length;
    return { active, confirmed, live, removed };
  }, [questions, consensusRows, data]);

  const figures = useMemo(() => {
    const out = [];

    // ── Infographic 1: Where consensus is still forming ──
    // The most actionable view: which questions still divide the WG.
    // Contested rows (50–84% include) appear first; settled rows last.
    // Tells the audience where panel time should go AND prompts their
    // own ranking on questions still in play.
    if (consensusRows.length >= 1) {
      out.push({
        key: 'consensus',
        label: 'Where consensus is still forming',
        render: () => {
          const live = consensusRows.filter((r) => r.tone === 'live');
          const settled = consensusRows.filter((r) => r.tone === 'settled');
          const renderRow = (r) => (
            <div
              key={r.id}
              className="rounded-xl border p-2.5"
              style={{ borderColor: `${r.fill}40`, backgroundColor: `${r.fill}0F` }}
            >
              <div className="flex items-start gap-3">
                <div className="flex shrink-0 flex-col items-center">
                  <span className="font-mono text-2xl font-bold tabular-nums text-white">
                    {Math.round(r.include)}
                  </span>
                  <span className="text-[8px] font-semibold uppercase tracking-wider" style={{ color: r.fill }}>
                    % include
                  </span>
                </div>
                <p className="min-w-0 flex-1 text-[12px] leading-snug text-white/90 line-clamp-3">
                  {r.text}
                </p>
              </div>
            </div>
          );
          return (
            <div className="flex h-full min-h-0 flex-col gap-2 overflow-y-auto">
              {live.length > 0 && (
                <div>
                  <div className="mb-1 flex items-center gap-1.5">
                    <span className="inline-flex h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-300">
                      Live debate · {live.length}
                    </p>
                  </div>
                  <div className="space-y-1.5">{live.slice(0, 3).map(renderRow)}</div>
                </div>
              )}
              {settled.length > 0 && (
                <div className="mt-1">
                  <div className="mb-1 flex items-center gap-1.5">
                    <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                      Settled consensus · {settled.length}
                    </p>
                  </div>
                  <div className="space-y-1.5">{settled.slice(0, 2).map(renderRow)}</div>
                </div>
              )}
            </div>
          );
        },
      });
    }

    // ── Infographic 2: Where minds changed (kept; tightened) ──
    if (topShifts.up.length || topShifts.down.length) {
      out.push({
        key: 'shift',
        label: 'Where minds changed (R1 → R2)',
        render: () => (
          <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto">
            <ShiftSection title="Warmed to" tone="emerald" items={topShifts.up} />
            <ShiftSection title="Cooled on" tone="rose" items={topShifts.down} />
          </div>
        ),
      });
    }

    // ── Infographic 3: How we got here (process funnel) ──
    // Trust-building: shows the audience that today's slate is the
    // refined output of weeks of WG deliberation. Big tabular numerals
    // because the audience reads from across the ballroom.
    out.push({
      key: 'funnel',
      label: 'How we got here',
      render: () => {
        const stages = [
          { n: funnelCounts.active + funnelCounts.removed, label: 'Candidates after WG kickoff', tone: '#94a3b8' },
          { n: funnelCounts.active, label: `Cleared R1 → advanced to R2`, tone: '#60a5fa' },
          { n: funnelCounts.confirmed + funnelCounts.live, label: 'On today’s slate (panel pool)', tone: accent },
          { n: 4, label: 'Advance to the cross-WG closing round', tone: '#10b981' },
        ];
        return (
          <div className="flex h-full min-h-0 flex-col justify-center gap-2">
            {stages.map((s, i) => {
              // Funnel taper: each row visually narrower than the one above
              const widthPct = 100 - i * 10;
              return (
                <div key={i} className="flex flex-col items-center">
                  <div
                    className="flex w-full items-center justify-between rounded-xl border px-4 py-2.5"
                    style={{
                      width: `${widthPct}%`,
                      borderColor: `${s.tone}45`,
                      backgroundColor: `${s.tone}12`,
                    }}
                  >
                    <span className="font-mono text-3xl font-bold tabular-nums text-white sm:text-4xl">
                      {s.n}
                    </span>
                    <span className="ml-3 text-right text-[11px] leading-snug text-white/65 sm:text-xs">
                      {s.label}
                    </span>
                  </div>
                  {i < stages.length - 1 && (
                    <span className="my-0.5 text-white/30">▼</span>
                  )}
                </div>
              );
            })}
            <p className="mt-2 text-center text-[10px] text-white/35">
              Your phone vote picks the top 4 from today’s slate.
            </p>
          </div>
        );
      },
    });

    return out;
  }, [consensusRows, topShifts, funnelCounts, accent]);

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
