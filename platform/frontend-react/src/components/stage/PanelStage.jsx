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
    (a, b) => (b.r2_include_pct || 0) - (a.r2_include_pct || 0)
              || (b.r2_importance_mean || 0) - (a.r2_importance_mean || 0)
  );

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
        Round 2 results — {sorted.length} questions
      </p>
      <div className="mt-5 space-y-2">
        {sorted.slice(0, 12).map((q) => {
          const inc = q.r2_include_pct ?? q.r1_include_pct ?? 0;
          const imp = q.r2_importance_mean ?? q.r1_importance_mean ?? 0;
          return (
            <div key={q.id} className="flex items-start gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-snug text-white/90">{q.text}</p>
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
        })}
      </div>
      {sorted.length > 12 && (
        <p className="mt-3 text-xs text-white/30">+ {sorted.length - 12} more questions in the platform</p>
      )}
    </div>
  );
}

// --- Vote tab --------------------------------------------------------------

function VoteView({ sessionId, resolving, bus }) {
  const [results, setResults] = useState(null);
  useEffect(() => {
    if (!sessionId) return;
    api(`/api/conference/results/${sessionId}`)
      .then(setResults)
      .catch(() => setResults(null));
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

  const rows = (results?.questions || results?.results || []).slice(0, 10);
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-white/40">Live vote — session {sessionId}</p>
      <div className="mt-5 space-y-2">
        {rows.length === 0 && <p className="text-sm text-white/40">No votes yet.</p>}
        {rows.map((r) => (
          <div key={r.question_id || r.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="text-sm text-white/90">{r.text || r.question_text}</p>
            <div className="mt-2 flex gap-4 text-xs text-white/50">
              {r.avg_rank != null && <span>avg rank: <span className="font-mono text-white">{Number(r.avg_rank).toFixed(2)}</span></span>}
              {r.importance_mean != null && <span>imp: <span className="font-mono text-white">{Number(r.importance_mean).toFixed(1)}</span></span>}
              {r.points != null && <span>pts: <span className="font-mono text-white">{r.points}</span></span>}
            </div>
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
