/**
 * Compact phone-friendly version of the stage content.
 *
 * The full-bleed components (IdleCarousel, WelcomeDeck, etc.) are
 * designed for projector viewing with text-7xl / text-8xl typography
 * and absolute positioning that takes the whole viewport. Those don't
 * embed into /day cleanly on a phone.
 *
 * This compact view renders the same DATA but in a phone-first card
 * layout — short text, bounded height, no absolute positioning. The
 * projector continues to use the full-bleed components via /stage.
 */

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { WG_LABELS, PILLAR_COLORS, PANEL_PROMPTS } from '@/components/stage/panelConfig';
import { BreakView } from '@/components/stage/BreakView';

export function CompactStageView({ mode, slideIndex, panelTab, bus }) {
  if (!mode) return <Skeleton className="h-24 w-full rounded-xl" />;

  const panelMatch = /^panel:(\d+)$/.exec(mode);
  if (panelMatch) return <CompactPanel wgNumber={parseInt(panelMatch[1], 10)} bus={bus} />;
  const presentMatch = /^present:(\d+)$/.exec(mode);
  if (presentMatch) return <CompactPresent wgNumber={parseInt(presentMatch[1], 10)} bus={bus} />;
  if (mode === 'idle') return <CompactIdle bus={bus} />;
  if (mode === 'welcome') return <CompactWelcome slideIndex={slideIndex || 0} />;
  if (mode === 'table_reactions') return <CompactTables bus={bus} />;
  if (mode === 'cross_wg') return <CompactCrossWg bus={bus} />;
  if (mode === 'break') return <BreakView panelTab={panelTab} compact />;
  return null;
}

// ---- Idle ----------------------------------------------------------------

function CompactIdle({ bus }) {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    api('/api/conference/public-stats')
      .then((s) => setStats(s))
      .catch(() => {});
  }, [bus]);
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#0C2340] to-[#0E1E35] p-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#48CAE4]">SAEM 2026</p>
      <h2 className="mt-1 text-xl font-bold text-white">AI Consensus Conference</h2>
      <p className="mt-1 text-xs text-white/50">Conference starting soon — see agenda below</p>
      {stats && (
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <MiniStat value={stats.n_participants} label="participants" />
          <MiniStat value={stats.n_active_questions} label="questions" />
          <MiniStat value={stats.n_working_groups} label="WGs" />
        </div>
      )}
    </div>
  );
}

function MiniStat({ value, label }) {
  return (
    <div className="rounded-lg bg-white/[0.04] py-2">
      <p className="text-xl font-bold text-white">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-white/40">{label}</p>
    </div>
  );
}

// ---- Welcome -------------------------------------------------------------

const WELCOME_SLIDE_TITLES = [
  'Welcome',
  'Why we\'re here',
  'Two rounds. Five working groups.',
  'How today flows',
  'Your phone is the room',
  'Thank you',
];

function CompactWelcome({ slideIndex }) {
  const idx = Math.max(0, Math.min(WELCOME_SLIDE_TITLES.length - 1, slideIndex));
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#48CAE4]">
        Slide {idx + 1} of {WELCOME_SLIDE_TITLES.length}
      </p>
      <h2 className="mt-1 text-xl font-bold text-white">{WELCOME_SLIDE_TITLES[idx]}</h2>
      <p className="mt-2 text-xs text-white/50">Watch the projector for the slides</p>
    </div>
  );
}

// ---- Panel ---------------------------------------------------------------

function CompactPanel({ wgNumber, bus }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    api(`/api/surveys/results/${wgNumber}/round_2`)
      .then(setData)
      .catch(() => setData(null));
  }, [wgNumber, bus]);

  const accent = PILLAR_COLORS[wgNumber] || '#00B4D8';
  const wgName = WG_LABELS[wgNumber] || `Working Group ${wgNumber}`;
  const prompts = PANEL_PROMPTS[wgNumber] || [];
  const questions = (data?.questions || []).filter((q) => q.status !== 'removed');
  const top = [...questions]
    .sort((a, b) => (b.r2_include_pct || 0) - (a.r2_include_pct || 0))
    .slice(0, 5);

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
      <div className="flex items-center gap-3 p-4" style={{ backgroundColor: `${accent}15` }}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base font-bold" style={{ backgroundColor: `${accent}30`, color: accent }}>
          {wgNumber}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Live · Panel {wgNumber}</p>
          <h2 className="text-sm font-bold text-white truncate">{wgName}</h2>
        </div>
      </div>
      <div className="space-y-2 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Top R2 questions</p>
        {top.length === 0 ? (
          <p className="text-xs text-white/40">Loading…</p>
        ) : (
          top.map((q, i) => (
            <div key={q.id} className="flex items-start gap-2 rounded-lg border border-white/[0.05] bg-white/[0.02] p-2.5">
              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold" style={{ backgroundColor: `${accent}25`, color: accent }}>
                {i + 1}
              </span>
              <p className="flex-1 text-xs leading-snug text-white/85 line-clamp-3">{q.text}</p>
            </div>
          ))
        )}
        {prompts.length > 0 && (
          <details className="pt-2">
            <summary className="cursor-pointer list-none text-[11px] font-medium text-white/50 hover:text-white/80">
              Discussion prompts ({prompts.length})
            </summary>
            <div className="mt-2 space-y-2">
              {prompts.map((p, i) => (
                <div key={i} className="rounded-lg border border-white/[0.05] p-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: accent }}>{p.label}</p>
                  <p className="mt-1 text-xs leading-snug text-white/75">{p.text}</p>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

// ---- Priority presentation (2:50 PM, no voting yet) ---------------------

function CompactPresent({ wgNumber, bus }) {
  const [candidates, setCandidates] = useState(null);
  useEffect(() => {
    if (!wgNumber) return;
    api(`/api/conference/panel/${wgNumber}/candidates`)
      .then((d) => setCandidates(d?.questions || []))
      .catch(() => setCandidates([]));
  }, [wgNumber, bus]);

  const accent = PILLAR_COLORS[wgNumber] || '#00B4D8';
  const wgName = WG_LABELS[wgNumber] || `Working Group ${wgNumber}`;
  const advanceLimit = wgNumber === 5 ? 5 : 4;
  const advancing = (candidates || []).slice().sort((a, b) => {
    if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1;
    return (b.r2_include_pct ?? 0) - (a.r2_include_pct ?? 0);
  }).slice(0, advanceLimit);

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
      <div className="flex items-center gap-3 p-4" style={{ backgroundColor: `${accent}15` }}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base font-bold"
             style={{ backgroundColor: `${accent}30`, color: accent }}>
          {wgNumber}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-300">
            Priority presentation · live
          </p>
          <h2 className="text-sm font-bold text-white truncate">{wgName}</h2>
        </div>
      </div>
      <div className="px-4 py-3">
        <p className="text-[11px] text-white/55">
          The co-lead is presenting these {advanceLimit} questions. Voting opens at the cross-WG round.
        </p>
      </div>
      <div className="space-y-2 px-4 pb-4">
        {candidates === null && <p className="text-xs text-white/40">Loading…</p>}
        {candidates !== null && advancing.length === 0 && (
          <p className="rounded-lg border border-amber-400/30 bg-amber-500/[0.06] p-3 text-xs text-amber-200">
            Co-lead hasn't curated the panel pool yet — chair can auto-feature top 4 from /command.
          </p>
        )}
        {advancing.map((q, i) => (
          <div key={q.id}
               className="flex items-start gap-2 rounded-lg border p-2.5"
               style={{ borderColor: `${accent}25`, backgroundColor: `${accent}08` }}>
            <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-[11px] font-bold"
                  style={{ backgroundColor: `${accent}30`, color: accent }}>
              {i + 1}
            </span>
            <p className="flex-1 text-xs leading-snug text-white/90 line-clamp-4">{q.text}</p>
          </div>
        ))}
      </div>
      <div className="border-t border-white/[0.04] bg-white/[0.02] px-4 py-2.5">
        <p className="text-[10px] text-white/45">
          You'll rank all {wgNumber === 5 ? 21 : 21} advancing questions across WG1–5 in the cross-WG vote next.
        </p>
      </div>
    </div>
  );
}

// ---- Tables --------------------------------------------------------------

function CompactTables() {
  return (
    <div className="rounded-2xl border border-amber-400/20 bg-amber-500/[0.04] p-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300">Breakout in progress</p>
      <h2 className="mt-1 text-base font-bold text-white">Table reactions</h2>
      <p className="mt-2 text-xs text-white/55">
        Discuss with your table. Facilitators: submit your notes from the form below.
      </p>
    </div>
  );
}

// ---- Cross-WG ------------------------------------------------------------

function CompactCrossWg({ bus }) {
  const [results, setResults] = useState(null);
  useEffect(() => {
    api('/api/conference/sessions')
      .then(async (sessions) => {
        const xwg = (sessions || []).find((s) => s.session_type === 'cross_wg_prioritization');
        if (!xwg) return;
        const r = await api(`/api/conference/results/${xwg.id}`);
        setResults(r);
      })
      .catch(() => {});
  }, [bus]);

  const rows = (results?.questions || results?.results || []).slice(0, 8);
  const maxPts = Math.max(1, ...rows.map((r) => r.points || 0));

  return (
    <div className="rounded-2xl border border-amber-400/20 bg-amber-500/[0.04] p-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300">Closing vote</p>
      <h2 className="mt-1 text-base font-bold text-white">Cross-WG prioritization</h2>
      {rows.length === 0 ? (
        <p className="mt-2 text-xs text-white/55">Tap below to drag-rank the top questions across working groups.</p>
      ) : (
        <div className="mt-3 space-y-1.5">
          {rows.map((q) => {
            const c = PILLAR_COLORS[q.wg_number] || '#f59e0b';
            return (
              <div key={q.question_id || q.id} className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-2.5">
                <div className="flex items-start gap-2">
                  {q.wg_number && (
                    <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold" style={{ backgroundColor: `${c}25`, color: c }}>
                      {q.wg_number}
                    </span>
                  )}
                  <p className="min-w-0 flex-1 text-xs leading-snug text-white/85 line-clamp-2">{q.text || q.question_text}</p>
                  <span className="shrink-0 font-mono text-xs font-semibold text-white">{q.points || 0}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.04]">
                  <div className="h-full rounded-full" style={{ width: `${((q.points || 0) / maxPts) * 100}%`, backgroundColor: c }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
