/**
 * /present/wg/:n — full-screen, projector-ready presentation slide for
 * a single WG's 5-7 minute "Priority Presentations" slot at 2:50 PM.
 *
 * Co-leads navigate here during their turn. The page is intentionally
 * static and read-only: big title, 1-line scope, the 4 advancing
 * questions in big type, a small R2 snapshot, and a "what's next"
 * closing line. A small drill-down link to the full R2 report sits
 * in the bottom corner for questions from the audience.
 *
 * No chrome — Layout strips header/footer for /present/* routes so
 * the whole viewport is the slide.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, FileBarChart, ExternalLink } from 'lucide-react';
import { api } from '@/lib/api';
import { usePageTitle } from '@/hooks/usePageTitle';
import { PILLAR_COLORS, WG_LABELS } from '@/components/stage/panelConfig';

export function PresentWGPage() {
  const { n } = useParams();
  const wgNumber = parseInt(n, 10);
  usePageTitle(`Priority — WG ${wgNumber}`);

  const [wg, setWg] = useState(null);
  const [candidates, setCandidates] = useState(null);
  const [r2, setR2] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!wgNumber || Number.isNaN(wgNumber)) {
      setErr('Invalid WG number in URL.');
      return undefined;
    }
    let cancelled = false;
    (async () => {
      // Fetch independently — if one source fails the rest still
      // render. Previously these were Promise.all'd, so a single
      // 500 or network glitch on any leg blanked the whole slide.
      const safe = async (url) => {
        try { return await api(url); } catch (e) { return { __error: e }; }
      };
      const [wgs, panel, results] = await Promise.all([
        safe('/api/surveys/working-groups'),
        safe(`/api/conference/panel/${wgNumber}/candidates`),
        safe(`/api/surveys/results/${wgNumber}/round_2`),
      ]);
      if (cancelled) return;
      const wgsList = Array.isArray(wgs) ? wgs : (wgs?.__error ? [] : (wgs || []));
      setWg(wgsList.find((w) => w?.wg_number === wgNumber) || null);
      setCandidates(panel?.__error ? [] : (panel?.questions || []));
      setR2(results?.__error ? null : (results || null));
      // Only show a fatal error if EVERYTHING failed.
      if (wgs?.__error && panel?.__error && results?.__error) {
        setErr(`Couldn't load WG ${wgNumber}: ${wgs.__error.message || 'network error'}`);
      }
    })();
    return () => { cancelled = true; };
  }, [wgNumber]);

  const accent = PILLAR_COLORS[wgNumber] || '#00B4D8';

  // Advancing = chair-curated featured set if set, else top R2 by include%.
  // Capped at 4 (WG5 keeps all 5 themes; tweak via the variable below).
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

  // R2 snapshot for the small stat row above the closing line.
  const stats = useMemo(() => {
    const all = (r2?.questions || []).filter((q) => q.status !== 'removed');
    if (!all.length) return null;
    // Biggest positive R1→R2 importance mover
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
    // Strongest consensus (highest R2 include%)
    const settled = [...all]
      .filter((q) => q.r2_include_pct != null)
      .sort((a, b) => (b.r2_include_pct ?? 0) - (a.r2_include_pct ?? 0))[0];
    return { totalActive: all.length, topMover, topDelta, settled };
  }, [r2]);

  if (err) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A1628] text-white">
        <p className="text-sm text-rose-300">{err}</p>
      </div>
    );
  }
  if (candidates === null) {
    // Still fetching — render a calm loading state. We don't gate on `wg`
    // separately because the panel/candidates endpoint is the one that
    // matters most for the slide; WG metadata has a friendly fallback.
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A1628] text-white">
        <p className="text-sm text-white/40">Loading WG {wgNumber}…</p>
      </div>
    );
  }

  // Friendly name + scope, both defensive against missing wg metadata.
  const friendlyName = WG_LABELS[wgNumber] || wg?.name || `Working Group ${wgNumber}`;
  const rawScope = wg?.scope || '';
  const scope = rawScope.split('.')[0];
  const pillar = wg?.pillar || '';

  return (
    <div className="flex min-h-screen flex-col bg-[#0A1628] text-white">
      <Helmet>
        <title>WG {wgNumber} · Priority — SAEM 2026</title>
      </Helmet>

      {/* Cover band */}
      <div
        className="relative overflow-hidden px-8 pb-8 pt-10 sm:px-12 sm:pt-14"
        style={{
          background: `linear-gradient(180deg, ${accent}18 0%, transparent 100%)`,
        }}
      >
        <div className="pointer-events-none absolute -top-32 left-1/3 h-[500px] w-[800px] -translate-x-1/2 rounded-full blur-3xl"
             style={{ backgroundColor: `${accent}25` }} />
        <div className="relative mx-auto max-w-7xl">
          <div className="flex items-baseline gap-4">
            <p className="text-[12px] font-semibold uppercase tracking-[0.3em]" style={{ color: accent }}>
              WG {wgNumber}{pillar ? ` · ${pillar} pillar` : ''}
            </p>
          </div>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-6xl">
            {friendlyName}
          </h1>
          {scope && (
            <p className="mt-3 max-w-4xl text-lg text-white/65 sm:text-2xl">
              {scope}.
            </p>
          )}
        </div>
      </div>

      {/* Advancing questions — the centerpiece */}
      <div className="flex-1 px-8 pb-8 sm:px-12">
        <div className="mx-auto max-w-7xl">
          <p className="mb-4 text-[12px] font-semibold uppercase tracking-[0.3em] text-emerald-300">
            Advancing to the cross-WG vote · top {advanceLimit}
          </p>
          {advancing.length === 0 ? (
            <p className="rounded-2xl border border-amber-400/30 bg-amber-500/[0.06] p-6 text-amber-200">
              No questions are currently flagged for the cross-WG vote.
              Once the chair runs auto-feature (or the co-lead curates the
              panel pool), this slide will populate.
            </p>
          ) : (
            <ol className="grid gap-3 sm:gap-4">
              {advancing.map((q, i) => (
                <li
                  key={q.id}
                  className="flex items-start gap-4 rounded-2xl border p-5 sm:gap-6 sm:p-6"
                  style={{ borderColor: `${accent}35`, backgroundColor: `${accent}0E` }}
                >
                  <span
                    className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-mono text-xl font-bold tabular-nums sm:h-14 sm:w-14 sm:text-2xl"
                    style={{ backgroundColor: `${accent}30`, color: accent }}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-lg leading-snug text-white/95 sm:text-2xl">
                      {q.text}
                    </p>
                    {(q.r2_include_pct != null || q.r2_importance_mean != null) && (
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-white/45 sm:text-sm">
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

      {/* R2 snapshot strip */}
      {stats && (
        <div className="px-8 pb-6 sm:px-12">
          <div className="mx-auto max-w-7xl rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 sm:p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/45">
              Round 2 snapshot
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3 sm:gap-6">
              <StatCard
                label="Active R2 questions"
                value={stats.totalActive}
              />
              {stats.settled && (
                <StatCard
                  label="Strongest consensus"
                  value={`${Math.round(stats.settled.r2_include_pct)}%`}
                  hint={stats.settled.text}
                />
              )}
              {stats.topMover && (
                <StatCard
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
      <div className="border-t border-white/[0.06] bg-[#0E1E35] px-8 py-6 sm:px-12 sm:py-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ArrowRight className="h-5 w-5 text-emerald-300" />
            <p className="text-base text-white/85 sm:text-xl">
              Next: rank all 21 advancing questions across WG1–5 in the cross-WG vote.
            </p>
          </div>
          <Link
            to="/reports/round2"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-xs font-medium text-white/65 hover:bg-white/[0.08] hover:text-white"
          >
            <FileBarChart className="h-3.5 w-3.5" />
            Full R2 report
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, hint, tone = 'cyan' }) {
  const toneCls = {
    cyan: 'text-cyan-200',
    emerald: 'text-emerald-300',
    rose: 'text-rose-300',
  }[tone];
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
        {label}
      </p>
      <p className={`mt-1 font-mono text-2xl font-bold tabular-nums sm:text-3xl ${toneCls}`}>
        {value}
      </p>
      {hint && (
        <p className="mt-1 text-xs leading-snug text-white/45 line-clamp-2">
          {hint}
        </p>
      )}
    </div>
  );
}

export default PresentWGPage;
