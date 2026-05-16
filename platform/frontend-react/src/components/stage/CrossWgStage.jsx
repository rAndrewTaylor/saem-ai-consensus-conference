/**
 * Cross-WG closing-round mode — end of conference day.
 *
 * Two states:
 *   1. Preview (no votes yet): list every question the chair has advanced
 *      into the closing pool, grouped/colour-coded by WG, so the room can
 *      read the slate before they rank.
 *   2. Live tally: as drag-to-rank votes arrive, order questions by
 *      average rank (lower = higher priority) and show a bar based on
 *      inverse rank so the front-runners pull ahead visually.
 *
 * Refreshes off the SSE bus so the projector updates within ~1s of new
 * votes hitting the backend.
 */

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { CROSS_WG_PROMPT, PILLAR_COLORS } from '@/components/stage/panelConfig';

export function CrossWgStage({ bus }) {
  const [session, setSession] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);

  // Resolve the cross-WG session
  useEffect(() => {
    api('/api/conference/sessions')
      .then((sessions) => {
        const match = (sessions || []).find((s) => s.session_type === 'cross_wg_prioritization');
        setSession(match || null);
      })
      .catch(() => {});
  }, [bus]);

  // Load the question pool (featured set or fallback)
  useEffect(() => {
    if (!session) { setLoading(false); return; }
    api(`/api/conference/sessions/${session.id}/questions`)
      .then((d) => setQuestions(d?.questions || []))
      .catch(() => setQuestions([]));
  }, [session, bus]);

  // Load live tally
  useEffect(() => {
    if (!session) { setLoading(false); return; }
    api(`/api/conference/results/${session.id}`)
      .then((r) => setResults(r))
      .catch(() => setResults(null))
      .finally(() => setLoading(false));
  }, [session, bus]);

  // Only ranking_* vote types matter here. Build per-question average rank.
  const rankRows = (results?.results || []).filter((r) => (r.vote_type || '').startsWith('ranking'));
  const rankByQid = new Map(rankRows.map((r) => [r.question_id, r]));
  const totalVoters = results?.unique_voters || 0;
  const hasVotes = rankRows.length > 0;

  // Combine static question pool with live ranking data
  const combined = questions.map((q) => {
    const r = rankByQid.get(q.id);
    return {
      ...q,
      avg_rank: r ? r.mean : null,
      n_votes: r ? r.n_votes : 0,
    };
  });

  // Order: by avg_rank ascending (lower = higher priority) when votes exist,
  // otherwise by WG number then question id
  combined.sort((a, b) => {
    if (a.avg_rank != null && b.avg_rank != null) return a.avg_rank - b.avg_rank;
    if (a.avg_rank != null) return -1;
    if (b.avg_rank != null) return 1;
    return (a.wg_number || 0) - (b.wg_number || 0) || a.id - b.id;
  });

  // Visual bar: invert the rank so a question with avg_rank=1 shows full bar.
  // Cap at #voters (1..min(8, totalVoters)) for a sensible scale.
  const maxRank = Math.max(1, ...combined.filter((q) => q.avg_rank != null).map((q) => q.avg_rank));
  const barFraction = (rank) => {
    if (rank == null) return 0;
    // Lower rank => longer bar. (max - rank + 1) / max gives 1.0 for best.
    return Math.max(0.05, (maxRank - rank + 1) / maxRank);
  };

  return (
    // Fit-to-viewport projector layout. Header is fixed-height; the
    // question list scrolls internally if it has too many to fit.
    <div className="flex h-full flex-col overflow-hidden px-10 py-6">
      <div className="flex shrink-0 flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-amber-300">Closing vote</p>
          <h1 className="mt-1 text-4xl font-bold">Cross-WG prioritization</h1>
        </div>
        <div className="text-right">
          <p className="font-mono text-2xl font-semibold text-white">{totalVoters}</p>
          <p className="text-[11px] uppercase tracking-wider text-white/40">
            {totalVoters === 1 ? 'person ranking' : 'people ranking'}
          </p>
        </div>
      </div>
      <p className="mt-2 shrink-0 max-w-4xl text-base text-white/65">{CROSS_WG_PROMPT}</p>

      {loading && <Skeleton className="mt-6 h-64 w-full rounded-2xl" />}

      {!loading && !session && (
        <p className="mt-6 text-lg text-white/40">
          Cross-WG session hasn't been created yet — admin will set it up before the closing block.
        </p>
      )}

      {!loading && session && combined.length === 0 && (
        <div className="mt-6 rounded-2xl border border-amber-300/20 bg-amber-300/5 p-6">
          <p className="text-base text-amber-200">No questions advanced yet.</p>
          <p className="mt-2 text-sm text-white/60">
            Chairs and co-leads, use the panel "Star" button (or the Cross-WG funnel on /command)
            to advance questions into this round.
          </p>
        </div>
      )}

      {combined.length > 0 && (
        <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden">
          {!hasVotes && (
            <p className="mb-2 shrink-0 text-sm text-white/55">
              {combined.length} questions advancing from {new Set(combined.map((q) => q.wg_number).filter(Boolean)).size}{' '}
              working groups. Audience drag-ranks on phones; live tally appears here.
            </p>
          )}
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {combined.map((q, idx) => {
              const wgColor = PILLAR_COLORS[q.wg_number] || '#00B4D8';
              const frac = barFraction(q.avg_rank);
              return (
                <div key={q.id} className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-2.5">
                  <div className="flex items-start gap-2">
                    {hasVotes && q.avg_rank != null && (
                      <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded font-mono text-xs font-bold text-white"
                            style={{ backgroundColor: `${wgColor}30` }}>
                        {idx + 1}
                      </span>
                    )}
                    {q.wg_number && (
                      <span
                        className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-bold"
                        style={{ backgroundColor: `${wgColor}25`, color: wgColor }}
                      >
                        {q.wg_number}
                      </span>
                    )}
                    <p className="min-w-0 flex-1 text-base leading-snug text-white/95">{q.text}</p>
                    {hasVotes && q.avg_rank != null && (
                      <span className="shrink-0 text-right">
                        <p className="font-mono text-base font-semibold text-white">{q.avg_rank.toFixed(1)}</p>
                      </span>
                    )}
                  </div>
                  {hasVotes && q.avg_rank != null && (
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.04]">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${frac * 100}%`, backgroundColor: wgColor }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
