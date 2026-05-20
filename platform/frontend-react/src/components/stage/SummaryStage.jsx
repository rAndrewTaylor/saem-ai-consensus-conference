/**
 * Summary & next steps — projected during the 4:35 PM closing.
 *
 * Pulls the most recent ConferenceSynthesis row, surfaces:
 *   - The top 5 cross-WG questions (the room's headline priorities)
 *   - The "Recommendations for SAEM's next steps" section parsed
 *     out of the synthesis markdown
 *   - A handful of by-the-numbers stats from /day-state + /synthesis
 *
 * Read-only — no chair controls. If the synthesis hasn't been
 * generated yet, falls back to a card that nudges the chair back to
 * /final_synthesis.
 */

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, Target, ArrowRight, Flag } from 'lucide-react';
import { PILLAR_COLORS } from '@/components/stage/panelConfig';

export function SummaryStage({ bus }) {
  const [synth, setSynth] = useState(null);
  const [crossRows, setCrossRows] = useState([]);
  const [day, setDay] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api('/api/conference/synthesis/latest').catch(() => null),
      api('/api/conference/sessions').catch(() => []),
      api('/api/conference/day-state').catch(() => null),
    ]).then(async ([synthD, sessions, dayD]) => {
      if (cancelled) return;
      setSynth(synthD?.markdown ? synthD : null);
      setDay(dayD || null);
      const cross = (sessions || []).find((s) => s.session_type === 'cross_wg_prioritization');
      if (cross) {
        try {
          const r = await api(`/api/conference/results/${cross.id}`);
          if (cancelled) return;
          const rows = (r?.results || [])
            .filter((x) => (x.vote_type || '').startsWith('ranking') && x.avg_rank != null)
            .sort((a, b) => a.avg_rank - b.avg_rank)
            .slice(0, 5);
          setCrossRows(rows);
        } catch { /* keep empty */ }
      }
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [bus]);

  const nextSteps = parseNextSteps(synth?.markdown);

  // Aggregate stats: voters, sessions, breakout notes
  const totalVoters = day?.sessions
    ? Math.max(...day.sessions.map((s) => s.unique_voters || 0))
    : 0;
  const totalSessions = day?.sessions?.length || 0;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#0A1628] text-white">
      <div className="shrink-0 px-12 pb-3 pt-6">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-300/85">
          4:35 PM · closing reflection
        </p>
        <h1 className="mt-1 flex items-center gap-3 text-4xl font-bold tracking-tight">
          <Flag className="h-7 w-7 text-amber-300" />
          Summary &amp; next steps
        </h1>
      </div>

      {loading && (
        <div className="px-12 pb-12">
          <Skeleton className="h-[60vh] w-full rounded-2xl" />
        </div>
      )}

      {!loading && (
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 overflow-hidden px-12 pb-8 lg:grid-cols-[1.1fr_1fr]">
          {/* LEFT — Top 5 priorities */}
          <div className="flex min-h-0 min-w-0 flex-col">
            <div className="mb-3 flex shrink-0 items-baseline justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-cyan-300/85">
                Top priorities — the room's headline
              </p>
              <p className="text-[10px] text-white/40">
                {crossRows.length > 0 ? `from ${totalVoters} ranked` : 'awaiting cross-WG vote'}
              </p>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
              {crossRows.length === 0 && (
                <p className="rounded-xl border border-amber-400/25 bg-amber-500/[0.06] p-4 text-sm text-amber-100">
                  Cross-WG vote hasn't produced a ranking yet. Once the closing round is run,
                  the top 5 questions appear here as the conference's headline output.
                </p>
              )}
              {crossRows.map((r, idx) => {
                const color = PILLAR_COLORS[r.wg_number] || '#00B4D8';
                return (
                  <div
                    key={r.question_id || r.id}
                    className="rounded-xl border p-4"
                    style={{
                      borderColor: `${color}40`,
                      backgroundColor: `${color}0E`,
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-mono text-lg font-bold"
                        style={{ backgroundColor: `${color}30`, color }}
                      >
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-semibold uppercase tracking-wider"
                           style={{ color }}>
                          WG{r.wg_number} · avg rank {r.avg_rank.toFixed(2)}
                        </p>
                        <p className="mt-1 text-base leading-snug text-white/95">
                          {r.text || r.question_text}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* By-the-numbers strip */}
            <div className="mt-3 grid shrink-0 grid-cols-3 gap-2">
              <Stat label="Working groups" value={5} />
              <Stat label="Sessions" value={totalSessions || '—'} />
              <Stat label="Ranked by" value={totalVoters || '—'} suffix={totalVoters === 1 ? ' voter' : ' voters'} />
            </div>
          </div>

          {/* RIGHT — Brief "what's next" — kept understated on purpose. */}
          <div className="flex min-h-0 min-w-0 flex-col rounded-2xl border border-amber-400/30 bg-amber-500/[0.06] p-5">
            <div className="mb-3 flex shrink-0 items-baseline justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-200">
                What's next
              </p>
              <p className="text-[10px] text-amber-300/60">
                directions the planning committee is exploring
              </p>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
              {nextSteps.length > 0 ? (
                nextSteps.slice(0, 3).map((step, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 rounded-xl border border-amber-400/25 bg-amber-500/[0.04] p-3"
                  >
                    <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-amber-300/80" />
                    <p
                      className="flex-1 text-sm leading-snug text-white/90"
                      dangerouslySetInnerHTML={{ __html: inlineBold(step) }}
                    />
                  </div>
                ))
              ) : (
                <>
                  <NextBullet>Write up the consensus and share the dataset.</NextBullet>
                  <NextBullet>Follow-on papers from each working group.</NextBullet>
                  <NextBullet>Explore light-touch research networks to take on the top priorities — and reconvene at next year's SAEM.</NextBullet>
                </>
              )}
            </div>

            <p className="mt-3 shrink-0 text-[11px] leading-snug text-amber-200/65">
              <Sparkles className="mr-1 inline h-3 w-3" />
              Full synthesis lands in your inbox — possibilities, not commitments.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function NextBullet({ children }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-400/25 bg-amber-500/[0.04] p-3">
      <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-amber-300/80" />
      <p className="flex-1 text-sm leading-snug text-white/90">{children}</p>
    </div>
  );
}

function Stat({ label, value, suffix = '' }) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
      <p className="font-mono text-2xl font-bold text-white tabular-nums">
        {value}{suffix && <span className="ml-0.5 text-xs font-normal text-white/45">{suffix}</span>}
      </p>
      <p className="text-[10px] uppercase tracking-wider text-white/45">{label}</p>
    </div>
  );
}

// Extract bullet points from the "Recommendations for SAEM's next steps"
// (or "Next steps") H2 section of the synthesis markdown.
function parseNextSteps(md) {
  if (!md) return [];
  const lines = md.split(/\r?\n/);
  let inSection = false;
  const items = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (/^##\s+/i.test(line)) {
      const heading = line.replace(/^##\s+/, '').toLowerCase();
      inSection = /next\s+step|recommendation/.test(heading);
      continue;
    }
    if (!inSection) continue;
    // Stop when we hit the next ## heading (handled above)
    const m = line.match(/^[-*]\s+(.+)$/);
    if (m) items.push(m[1]);
  }
  return items.slice(0, 6);
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function inlineBold(s) {
  return escapeHtml(s).replace(/\*\*(.+?)\*\*/g, '<strong class="text-amber-100">$1</strong>');
}

export default SummaryStage;
