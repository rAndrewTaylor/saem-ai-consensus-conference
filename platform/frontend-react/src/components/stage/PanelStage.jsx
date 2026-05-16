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
    <div className="grid grid-cols-1 gap-0 lg:grid-cols-[2fr_1fr]">
      {/* Main stage */}
      <div className="min-h-[calc(100vh-4rem)] border-r border-white/[0.06] px-10 py-10">
        <div className="mb-8 flex items-start gap-5">
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-3xl font-bold"
            style={{ backgroundColor: `${accent}25`, color: accent }}
          >
            {wgNumber}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/40">Panel {wgNumber}</p>
            <h1 className="mt-1 text-3xl font-bold sm:text-4xl">{wgName}</h1>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={panelTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
          >
            {panelTab === 'results' && <ResultsView wgNumber={wgNumber} bus={bus} accent={accent} />}
            {panelTab === 'vote' && <VoteView sessionId={sessionId} resolving={resolving} bus={bus} />}
            {panelTab === 'comparison' && <ComparisonView wgNumber={wgNumber} bus={bus} accent={accent} />}
          </motion.div>
        </AnimatePresence>

        {/* Discussion prompts strip */}
        {prompts.length > 0 && (
          <div className="mt-10 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/40">Discussion prompts</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {prompts.map((p, i) => (
                <div key={i} className="rounded-xl border border-white/[0.06] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: accent }}>
                    {p.label}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-white/80">{p.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Chat sidebar */}
      <ChatSidebar sessionId={sessionId} resolving={resolving} bus={bus} accent={accent} isAdmin={isAdmin} />
    </div>
  );
}

// --- Results tab -----------------------------------------------------------

function ResultsView({ wgNumber, bus, accent }) {
  const [data, setData] = useState(null);
  const [pool, setPool] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api(`/api/surveys/results/${wgNumber}/round_2`).catch(() => ({ questions: [] })),
      api(`/api/conference/panel/${wgNumber}/candidates`).catch(() => null),
    ])
      .then(([results, panelPool]) => {
        if (cancelled) return;
        setData(results);
        setPool(panelPool);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [wgNumber, bus]);

  if (loading) return <Skeleton className="h-64 w-full rounded-2xl" />;

  const questions = (data?.questions || []).filter((q) => q.status !== 'removed');
  const sorted = [...questions].sort(
    (a, b) => (b.r2_include_pct || 0) - (a.r2_include_pct || 0)
              || (b.r2_importance_mean || 0) - (a.r2_importance_mean || 0)
  );
  const featuredIds = new Set(
    (pool?.questions || []).filter((q) => q.is_featured).map((q) => q.id)
  );
  const inPool = sorted.filter((q) => featuredIds.has(q.id));
  const others = sorted.filter((q) => !featuredIds.has(q.id));
  const hasCuratedPool = inPool.length > 0;

  const renderRow = (q, isFeatured) => {
    const inc = q.r2_include_pct ?? q.r1_include_pct ?? 0;
    const imp = q.r2_importance_mean ?? q.r1_importance_mean ?? 0;
    return (
      <div
        key={q.id}
        className={`flex items-start gap-4 rounded-xl border p-4 ${
          isFeatured
            ? 'border-amber-300/30 bg-amber-300/[0.04]'
            : 'border-white/[0.06] bg-white/[0.02]'
        }`}
      >
        {isFeatured && (
          <span className="mt-0.5 inline-flex h-6 shrink-0 items-center rounded bg-amber-300/15 px-2 text-[10px] font-semibold uppercase tracking-wider text-amber-200">
            On phone
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className={`leading-snug ${isFeatured ? 'text-base text-white' : 'text-sm text-white/85'}`}>{q.text}</p>
        </div>
        <div className="flex shrink-0 items-center gap-4 text-xs text-white/60">
          <div className="text-right">
            <p className="font-mono font-semibold text-white" style={{ color: inc >= 80 ? '#10b981' : '#fff' }}>
              {Math.round(inc)}%
            </p>
            <p className="text-[10px] uppercase tracking-wider text-white/30">incl</p>
          </div>
          <div className="text-right">
            <p className="font-mono font-semibold text-white">{Number(imp).toFixed(1)}</p>
            <p className="text-[10px] uppercase tracking-wider text-white/30">imp</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      {hasCuratedPool && (
        <>
          <p className="text-sm font-semibold uppercase tracking-wider text-amber-300">
            Audience is ranking these {inPool.length} questions
          </p>
          <div className="mt-3 space-y-2">
            {inPool.map((q) => renderRow(q, true))}
          </div>
          <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-white/40">
            Other Round 2 questions for context
          </p>
        </>
      )}
      {!hasCuratedPool && (
        <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
          Round 2 results — {sorted.length} questions
        </p>
      )}
      <div className={`${hasCuratedPool ? 'mt-3' : 'mt-5'} space-y-2`}>
        {(hasCuratedPool ? others : sorted).slice(0, 12).map((q) => renderRow(q, false))}
      </div>
      {!hasCuratedPool && sorted.length > 12 && (
        <p className="mt-3 text-xs text-white/30">+ {sorted.length - 12} more questions in the platform</p>
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
