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
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { ChatSidebar } from '@/components/stage/ChatSidebar';
import { WordCloud } from '@/components/stage/WordCloud';
import { PANEL_PROMPTS, WG_LABELS, PILLAR_COLORS } from '@/components/stage/panelConfig';

export function PanelStage({ wgNumber, panelTab, bus, isAdmin, onTabChange }) {
  const [sessionId, setSessionId] = useState(null);
  const [resolving, setResolving] = useState(true);

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
          is supposed to land. */}
      {prompts.length > 0 && (
        <div className="mx-8 mb-3 shrink-0 rounded-xl border p-3"
             style={{ borderColor: `${accent}30`, backgroundColor: `${accent}08` }}>
          <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: accent }}>
            Discussion prompts
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {prompts.slice(0, 3).map((p, i) => (
              <div key={i} className="rounded-lg bg-white/[0.04] p-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50">
                  {p.label}
                </p>
                <p className="mt-1 text-sm leading-snug text-white/95 line-clamp-3">{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Body: prior results (left) | chat column (right) */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 overflow-hidden lg:grid-cols-[1.2fr_1fr]">
        {/* LEFT — prior results, visual */}
        <div className="flex h-full min-h-0 flex-col border-r border-white/[0.06] px-6 pb-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={panelTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="flex min-h-0 flex-1 flex-col"
            >
              {panelTab === 'results' && <ResultsView wgNumber={wgNumber} bus={bus} accent={accent} />}
              {panelTab === 'vote' && <VoteView sessionId={sessionId} resolving={resolving} bus={bus} />}
              {panelTab === 'comparison' && <ComparisonView wgNumber={wgNumber} bus={bus} accent={accent} />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* RIGHT — word cloud, chat, then question list at bottom */}
        <div className="flex h-full min-h-0 flex-col gap-3 px-4 pb-3">
          {/* Word cloud — bounded height so it never grows */}
          <div className="h-[180px] shrink-0">
            <WordCloud sessionId={sessionId} bus={bus} accent={accent} />
          </div>
          {/* Chat — flex-1, scrolls internally */}
          <div className="min-h-0 flex-1 overflow-hidden">
            <ChatSidebar sessionId={sessionId} resolving={resolving} bus={bus} accent={accent} isAdmin={isAdmin} />
          </div>
          {/* Question list — compact strip at bottom */}
          <div className="h-[140px] shrink-0">
            <QuestionStrip wgNumber={wgNumber} bus={bus} accent={accent} />
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Compact question-pool strip (bottom of right column) -----------------

function QuestionStrip({ wgNumber, bus, accent }) {
  const [items, setItems] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api(`/api/conference/panel/${wgNumber}/candidates`)
      .then((d) => { if (!cancelled) setItems(d?.questions || []); })
      .catch(() => { if (!cancelled) setItems([]); });
    return () => { cancelled = true; };
  }, [wgNumber, bus]);

  const featured = (items || []).filter((q) => q.is_featured);
  const showList = featured.length > 0 ? featured : (items || []).slice(0, 5);
  const hero = featured.length > 0 ? 'On phones' : 'Top R2';

  return (
    <div className="flex h-full flex-col rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
      <p className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-white/45">
        Questions in play · <span style={{ color: accent }}>{hero}</span>
      </p>
      <ol className="mt-1.5 min-h-0 flex-1 list-decimal overflow-y-auto pl-4 pr-1 marker:text-white/35">
        {(showList || []).slice(0, 8).map((q) => (
          <li key={q.id} className="text-[12px] leading-snug text-white/85 line-clamp-2 my-0.5">
            {q.text}
          </li>
        ))}
        {(items || []).length === 0 && (
          <li className="text-[12px] text-white/40 list-none">Loading…</li>
        )}
      </ol>
    </div>
  );
}

// --- Results tab -----------------------------------------------------------

function ResultsView({ wgNumber, bus, accent }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api(`/api/surveys/results/${wgNumber}/round_2`)
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setData({ questions: [] }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [wgNumber, bus]);

  if (loading) return <Skeleton className="h-64 w-full rounded-2xl" />;

  const questions = (data?.questions || []).filter((q) => q.status !== 'removed');
  const sorted = [...questions].sort(
    (a, b) => (b.r2_importance_mean || 0) - (a.r2_importance_mean || 0)
              || (b.r2_include_pct || 0) - (a.r2_include_pct || 0)
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <p className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-white/45">
        Round 2 results · {sorted.length} questions · sorted by importance
      </p>
      <ol className="mt-2 min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
        {sorted.map((q, i) => {
          const imp = q.r2_importance_mean ?? q.r1_importance_mean ?? 0;
          const inc = q.r2_include_pct ?? q.r1_include_pct ?? 0;
          const frac = Math.max(0.04, imp / 9);
          return (
            <li key={q.id} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded font-mono text-[10px] font-bold text-white/70"
                      style={{ backgroundColor: `${accent}25` }}>
                  {i + 1}
                </span>
                <p className="min-w-0 flex-1 text-[13px] leading-snug text-white/90 line-clamp-2">
                  {q.text}
                </p>
                <span className="shrink-0 font-mono text-xs font-semibold text-white/85">
                  {imp.toFixed(1)}
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.04]">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${frac * 100}%`, backgroundColor: accent, opacity: 0.85 }}
                  />
                </div>
                <span className="shrink-0 font-mono text-[10px] text-white/40">{Math.round(inc)}%</span>
              </div>
            </li>
          );
        })}
        {sorted.length === 0 && (
          <li className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 text-center text-xs text-white/40 list-none">
            No Round 2 data available yet.
          </li>
        )}
      </ol>
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
