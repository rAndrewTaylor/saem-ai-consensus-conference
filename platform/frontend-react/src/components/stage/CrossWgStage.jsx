/**
 * Cross-WG prioritization mode — end of conference day.
 *
 * Projects the live tally of the 100-point allocation across the top
 * questions from all 5 WGs. Refreshes via SSE bus when votes come in.
 */

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { CROSS_WG_PROMPT, PILLAR_COLORS } from '@/components/stage/panelConfig';

export function CrossWgStage({ bus }) {
  const [session, setSession] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/api/conference/sessions')
      .then((sessions) => {
        const match = (sessions || []).find((s) => s.session_type === 'cross_wg_prioritization');
        setSession(match || null);
      })
      .catch(() => {});
  }, [bus]);

  useEffect(() => {
    if (!session) { setLoading(false); return; }
    api(`/api/conference/results/${session.id}`)
      .then((r) => setResults(r))
      .catch(() => setResults(null))
      .finally(() => setLoading(false));
  }, [session, bus]);

  const rows = (results?.questions || results?.results || []);
  const maxPoints = Math.max(1, ...rows.map((r) => r.points || 0));

  return (
    <div className="min-h-[calc(100vh-4rem)] px-10 py-10">
      <p className="text-xs font-semibold uppercase tracking-wider text-amber-300">Closing vote</p>
      <h1 className="mt-3 text-5xl font-bold">Cross-WG prioritization</h1>
      <p className="mt-4 max-w-3xl text-lg text-white/60">{CROSS_WG_PROMPT}</p>

      {loading && <Skeleton className="mt-10 h-96 w-full rounded-2xl" />}

      {!loading && !session && (
        <p className="mt-10 text-base text-white/40">No cross-WG session created yet.</p>
      )}

      {!loading && session && rows.length === 0 && (
        <p className="mt-10 text-base text-white/40">
          Session is open. Audience members allocate 100 points across the top questions; bars appear here as votes arrive.
        </p>
      )}

      {rows.length > 0 && (
        <div className="mt-10 space-y-3">
          {rows.slice(0, 20).map((q) => {
            const pts = q.points || 0;
            const wgColor = PILLAR_COLORS[q.wg_number] || '#00B4D8';
            return (
              <div key={q.question_id || q.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="flex items-start gap-3">
                  {q.wg_number && (
                    <span
                      className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-bold"
                      style={{ backgroundColor: `${wgColor}20`, color: wgColor }}
                    >
                      {q.wg_number}
                    </span>
                  )}
                  <p className="min-w-0 flex-1 text-base text-white/90">{q.text || q.question_text}</p>
                  <span className="shrink-0 font-mono text-base font-semibold text-white">{pts}</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.04]">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${(pts / maxPoints) * 100}%`, backgroundColor: wgColor }}
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
