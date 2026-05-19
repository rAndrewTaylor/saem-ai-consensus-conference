/**
 * Projector view for the 2:50 PM Priority Presentations slot.
 *
 * One WG at a time — the chair cycles WG1 → WG2 → ... → WG5 from
 * /command using the Next/Prev controls. Each WG's slide shows:
 *
 *   - Title + pillar
 *   - The 4 advancing questions in big read-from-the-back type
 *   - A Round 2 snapshot strip the co-lead can riff on
 *   - Closing line that hands off to the cross-WG vote
 *
 * The audience phone version (CompactPresentWG, in CompactStageView)
 * mirrors the same 4 questions in read-only card form so participants
 * can follow on their phones while the co-lead presents. NO voting
 * happens during this slot — the cross-WG session stays inactive until
 * 3:35 PM.
 *
 * Mirrors PresentWGPage but renders at projector scale and pulls its
 * WG number from the display-mode 'present:N' string instead of the
 * URL params.
 */

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { PILLAR_COLORS, WG_LABELS } from '@/components/stage/panelConfig';

export function PresentWGStage({ wgNumber, bus }) {
  const [wg, setWg] = useState(null);
  const [candidates, setCandidates] = useState(null);
  const [r2, setR2] = useState(null);

  useEffect(() => {
    if (!wgNumber) return undefined;
    let cancelled = false;
    const safe = async (url) => {
      try { return await api(url); } catch (e) { return { __error: e }; }
    };
    (async () => {
      const [wgs, panel, results] = await Promise.all([
        safe('/api/surveys/working-groups'),
        safe(`/api/conference/panel/${wgNumber}/candidates`),
        safe(`/api/surveys/results/${wgNumber}/round_2`),
      ]);
      if (cancelled) return;
      const wgsList = Array.isArray(wgs) ? wgs : [];
      setWg(wgsList.find((w) => w?.wg_number === wgNumber) || null);
      setCandidates(panel?.__error ? [] : (panel?.questions || []));
      setR2(results?.__error ? null : (results || null));
    })();
    return () => { cancelled = true; };
  }, [wgNumber, bus]);

  const accent = PILLAR_COLORS[wgNumber] || '#00B4D8';
  const advanceLimit = wgNumber === 5 ? 5 : 4;

  const advancing = useMemo(() => {
    if (!candidates) return [];
    const featured = candidates.filter((q) => q.is_featured);
    const pool = featured.length > 0 ? featured : candidates;
    return [...pool]
      .sort((a, b) => (b.r2_include_pct ?? 0) - (a.r2_include_pct ?? 0)
                   || (b.r2_importance_mean ?? 0) - (a.r2_importance_mean ?? 0))
      .slice(0, advanceLimit);
  }, [candidates, advanceLimit]);

  const stats = useMemo(() => {
    const all = (r2?.questions || []).filter((q) => q.status !== 'removed');
    if (!all.length) return null;
    let topMover = null;
    let topDelta = 0;
    all.forEach((q) => {
      if (q.r1_importance_mean != null && q.r2_importance_mean != null) {
        const d = q.r2_importance_mean - q.r1_importance_mean;
        if (Math.abs(d) > Math.abs(topDelta)) {
          topDelta = d;
          topMover = q;
        }
      }
    });
    const settled = [...all]
      .filter((q) => q.r2_include_pct != null)
      .sort((a, b) => (b.r2_include_pct ?? 0) - (a.r2_include_pct ?? 0))[0];
    return { totalActive: all.length, topMover, topDelta, settled };
  }, [r2]);

  if (candidates === null) {
    return <Skeleton className="h-full w-full rounded-2xl" />;
  }

  const friendlyName = WG_LABELS[wgNumber] || wg?.name || `Working Group ${wgNumber}`;
  const scope = (wg?.scope || '').split('.')[0];
  const pillar = wg?.pillar || '';

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#0A1628] text-white">
      {/* Cover band */}
      <div
        className="relative shrink-0 overflow-hidden px-12 pb-6 pt-10"
        style={{ background: `linear-gradient(180deg, ${accent}18 0%, transparent 100%)` }}
      >
        <div className="pointer-events-none absolute -top-32 left-1/3 h-[500px] w-[800px] -translate-x-1/2 rounded-full blur-3xl"
             style={{ backgroundColor: `${accent}25` }} />
        <div className="relative mx-auto max-w-7xl">
          <p className="text-[12px] font-semibold uppercase tracking-[0.3em]" style={{ color: accent }}>
            Priority presentation · WG {wgNumber}{pillar ? ` · ${pillar} pillar` : ''}
          </p>
          <h1 className="mt-2 text-5xl font-bold tracking-tight">
            {friendlyName}
          </h1>
          {scope && (
            <p className="mt-2 max-w-5xl text-xl text-white/65">
              {scope}.
            </p>
          )}
        </div>
      </div>

      {/* Advancing questions — centerpiece */}
      <div className="min-h-0 flex-1 overflow-y-auto px-12 py-4">
        <div className="mx-auto max-w-7xl">
          <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.3em] text-emerald-300">
            Advancing to the cross-WG vote · top {advanceLimit}
          </p>
          {advancing.length === 0 ? (
            <p className="rounded-2xl border border-amber-400/30 bg-amber-500/[0.06] p-6 text-amber-200">
              No questions are flagged for the cross-WG vote yet. The chair
              can auto-feature top 4 from /command before the slot opens.
            </p>
          ) : (
            <ol className="grid gap-3">
              {advancing.map((q, i) => (
                <li
                  key={q.id}
                  className="flex items-start gap-6 rounded-2xl border p-5"
                  style={{ borderColor: `${accent}35`, backgroundColor: `${accent}0E` }}
                >
                  <span
                    className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full font-mono text-2xl font-bold tabular-nums"
                    style={{ backgroundColor: `${accent}30`, color: accent }}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-2xl leading-snug text-white/95">{q.text}</p>
                    {(q.r2_include_pct != null || q.r2_importance_mean != null) && (
                      <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-white/45">
                        {q.r2_include_pct != null && (
                          <span>
                            <span className="font-mono font-semibold text-white/75">
                              {Math.round(q.r2_include_pct)}%
                            </span>{' '}
                            include
                          </span>
                        )}
                        {q.r2_importance_mean != null && (
                          <span>
                            importance{' '}
                            <span className="font-mono font-semibold text-white/75">
                              {q.r2_importance_mean.toFixed(1)}
                            </span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      {/* R2 snapshot */}
      {stats && (
        <div className="shrink-0 px-12 pb-4">
          <div className="mx-auto max-w-7xl rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
            <div className="grid gap-3 sm:grid-cols-3 sm:gap-6">
              <Snap label="Active R2 questions" value={stats.totalActive} />
              {stats.settled && (
                <Snap
                  label="Strongest consensus"
                  value={`${Math.round(stats.settled.r2_include_pct)}%`}
                  hint={stats.settled.text}
                />
              )}
              {stats.topMover && (
                <Snap
                  label="Biggest R1 → R2 mover"
                  value={`${stats.topDelta > 0 ? '+' : ''}${stats.topDelta.toFixed(1)}`}
                  hint={stats.topMover.text}
                  tone={stats.topDelta > 0 ? 'emerald' : 'rose'}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Closing band */}
      <div className="shrink-0 border-t border-white/[0.06] bg-[#0E1E35] px-12 py-5">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <ArrowRight className="h-5 w-5 text-emerald-300" />
          <p className="text-xl text-white/85">
            Next: rank all 21 advancing questions across WG1–5 in the cross-WG vote.
          </p>
        </div>
      </div>
    </div>
  );
}

function Snap({ label, value, hint, tone = 'cyan' }) {
  const cls = { cyan: 'text-cyan-200', emerald: 'text-emerald-300', rose: 'text-rose-300' }[tone];
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">{label}</p>
      <p className={`mt-1 font-mono text-3xl font-bold tabular-nums ${cls}`}>{value}</p>
      {hint && <p className="mt-1 text-sm leading-snug text-white/45 line-clamp-2">{hint}</p>}
    </div>
  );
}

export default PresentWGStage;
