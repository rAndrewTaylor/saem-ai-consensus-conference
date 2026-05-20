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
  if (mode === 'world_cafe') return <CompactWorldCafe bus={bus} />;
  if (mode === 'cross_wg') return <CompactCrossWg bus={bus} />;
  if (mode === 'final_synthesis') return <CompactSynthesis bus={bus} />;
  if (mode === 'summary') return <CompactSummary bus={bus} />;
  if (mode === 'adjourn') return <CompactAdjourn />;
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

// Mirror of the 10-slide deck in components/stage/WelcomeDeck.jsx —
// keep in sync. Each entry has a title and a one-line hint so phones
// see what slot they're watching while the projector renders the
// animated full-screen version.
const WELCOME_SLIDE_TITLES = [
  { title: 'AI Consensus Conference', hint: 'Welcome — the 10-year research agenda for AI in EM.' },
  { title: 'Why we\'re here', hint: 'AI is already in the ED. What we study next is up to us.' },
  { title: 'By the numbers', hint: '74 experts · 177 questions · 1,310 R2 responses · 5,962 pairwise.' },
  { title: 'Five working groups', hint: 'Technology · Training · Self · Society.' },
  { title: 'The methodology', hint: 'Modified Delphi + AI synthesis + pairwise ranking.' },
  { title: 'The funnel', hint: 'From 177 candidates to 10 final priorities.' },
  { title: 'Cross-pollination', hint: '24 cross-WG question pairs at sim ≥ 0.55.' },
  { title: 'Today\'s flow', hint: '8 hours, 5 panels, one agenda.' },
  { title: 'How to participate', hint: 'Scan the QR. Your phone is the room.' },
  { title: 'Thank you', hint: 'To the 74 working-group members who built this.' },
];

function CompactWelcome({ slideIndex }) {
  const idx = Math.max(0, Math.min(WELCOME_SLIDE_TITLES.length - 1, slideIndex));
  const slide = WELCOME_SLIDE_TITLES[idx];
  return (
    <div className="rounded-2xl border border-[#48CAE4]/25 bg-gradient-to-br from-[#0C2340] to-[#0E1E35] p-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#48CAE4]">
        Slide {idx + 1} of {WELCOME_SLIDE_TITLES.length} · Welcome
      </p>
      <h2 className="mt-1 text-xl font-bold text-white">{slide.title}</h2>
      <p className="mt-2 text-sm text-white/65 leading-relaxed">{slide.hint}</p>
      <p className="mt-3 text-[11px] text-white/40">↑ Watch the projector — full visuals there.</p>
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
    api('/api/conference/cross-wg/candidates')
      .then((d) => {
        const group = (d?.groups || []).find((g) => g.wg_number === wgNumber);
        setCandidates((group?.candidates || []).map((q) => ({
          ...q,
          id: q.id || q.question_id,
        })));
      })
      .catch(() => setCandidates([]));
  }, [wgNumber, bus]);

  const accent = PILLAR_COLORS[wgNumber] || '#00B4D8';
  const wgName = WG_LABELS[wgNumber] || `Working Group ${wgNumber}`;
  const advanceLimit = wgNumber === 5 ? 5 : 4;
  const advancing = (candidates || []).slice().sort((a, b) => {
    if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1;
    if (a.avg_rank != null && b.avg_rank != null) return a.avg_rank - b.avg_rank;
    if (a.avg_rank != null) return -1;
    if (b.avg_rank != null) return 1;
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
            No advancing questions yet — chair can auto-feature top 4 from /command.
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

// Audience phone version of the final synthesis card. Pulls the same
// markdown the projector renders and shows the room a readable preview;
// regen is admin-only and lives on the projector flow.
function CompactSynthesis({ bus }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    api('/api/conference/synthesis/latest')
      .then((d) => setData(d?.markdown ? d : null))
      .catch(() => setData(null));
  }, [bus]);
  return (
    <div className="rounded-2xl border border-amber-400/30 bg-amber-500/[0.04] p-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300">Closing synthesis</p>
      <h2 className="mt-1 text-base font-bold text-white">Final results &amp; synthesis</h2>
      {!data && (
        <p className="mt-2 text-xs text-white/55">
          The chair will draft the room's closing synthesis in a moment — appears here once generated.
        </p>
      )}
      {data && (
        <>
          <p className="mt-2 text-[10px] text-white/45">
            Drafted at {new Date(data.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
          </p>
          <div className="mt-3 max-h-[60vh] overflow-y-auto rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 text-[13px] leading-relaxed text-white/85">
            {data.markdown.split(/\n+/).slice(0, 60).map((line, i) => (
              <p key={i} className={line.startsWith('## ') ? 'mt-3 text-amber-200 font-bold' : line.startsWith('### ') ? 'mt-2 text-white font-semibold' : 'mt-1'}>
                {line.replace(/^#+\s*/, '')}
              </p>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Phone version of Summary & next steps. Pulls the latest synthesis +
// top cross-WG ranks so the audience can read the closing recap while
// they pack up. Read-only — no chair controls.
function CompactSummary({ bus }) {
  const [synth, setSynth] = useState(null);
  const [rows, setRows] = useState([]);
  useEffect(() => {
    let cancelled = false;
    api('/api/conference/synthesis/latest').then((d) => {
      if (!cancelled) setSynth(d?.markdown ? d : null);
    }).catch(() => {});
    api('/api/conference/sessions').then(async (sessions) => {
      const cross = (sessions || []).find((s) => s.session_type === 'cross_wg_prioritization');
      if (!cross) return;
      try {
        const r = await api(`/api/conference/results/${cross.id}`);
        if (cancelled) return;
        const top = (r?.results || [])
          .filter((x) => (x.vote_type || '').startsWith('ranking') && x.avg_rank != null)
          .sort((a, b) => a.avg_rank - b.avg_rank)
          .slice(0, 5);
        setRows(top);
      } catch { /* keep empty */ }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [bus]);

  const nextSteps = parseNextStepsCompact(synth?.markdown);

  return (
    <div className="rounded-2xl border border-amber-400/30 bg-amber-500/[0.04] p-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300">Closing reflection</p>
      <h2 className="mt-1 text-base font-bold text-white">Summary &amp; next steps</h2>

      {rows.length > 0 && (
        <div className="mt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-cyan-300/85">Top priorities</p>
          <div className="mt-2 space-y-1.5">
            {rows.map((r, i) => {
              const c = PILLAR_COLORS[r.wg_number] || '#48CAE4';
              return (
                <div key={r.question_id || r.id} className="flex items-start gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-2">
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold"
                        style={{ backgroundColor: `${c}25`, color: c }}>
                    {i + 1}
                  </span>
                  <p className="flex-1 text-xs leading-snug text-white/90 line-clamp-3">{r.text || r.question_text}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {nextSteps.length > 0 && (
        <div className="mt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-300">Next steps</p>
          <ul className="mt-2 space-y-1.5">
            {nextSteps.map((s, i) => (
              <li key={i} className="rounded-lg border border-amber-400/20 bg-amber-500/[0.04] p-2 text-xs text-white/85">
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!rows.length && !nextSteps.length && (
        <p className="mt-2 text-xs text-white/55">Summary appears once the chair runs the closing synthesis.</p>
      )}
    </div>
  );
}

function CompactAdjourn() {
  return (
    <div className="rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-500/[0.10] to-cyan-500/[0.05] p-5 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300">SAEM 2026</p>
      <h2 className="mt-2 text-xl font-bold text-white">Thank you.</h2>
      <p className="mt-2 text-sm text-white/65">
        Watch your inbox for the full synthesis and dataset. Safe travels home.
      </p>
    </div>
  );
}

function parseNextStepsCompact(md) {
  if (!md) return [];
  const lines = md.split(/\r?\n/);
  let inSection = false;
  const items = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (/^##\s+/i.test(line)) {
      inSection = /next\s+step|recommendation/i.test(line.replace(/^##\s+/, ''));
      continue;
    }
    if (!inSection) continue;
    const m = line.match(/^[-*]\s+(.+)$/);
    if (m) items.push(m[1].replace(/\*\*(.+?)\*\*/g, '$1'));
  }
  return items.slice(0, 4);
}

// Fallback shown only on non-focused pages — the audience phone in
// /day shows the dedicated WorldCafeCard via focused mode instead.
function CompactWorldCafe() {
  return (
    <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/[0.04] p-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">World Café</p>
      <h2 className="mt-1 text-base font-bold text-white">Three 20-minute rotations</h2>
      <p className="mt-2 text-xs text-white/55">
        Visit at least two stations outside your home WG. Tap your current station
        on the World Café card below and submit notes before you rotate.
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
  const ranks = rows.map((r) => r.avg_rank).filter((v) => v != null);
  const maxRank = Math.max(1, ...ranks);
  const minRank = Math.min(...(ranks.length ? ranks : [1]));
  const rankSpan = Math.max(0.5, maxRank - minRank);

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
                  <span className="shrink-0 font-mono text-xs font-semibold text-white">
                    {q.avg_rank != null ? q.avg_rank.toFixed(1) : ''}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.04]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: q.avg_rank != null
                        ? `${Math.max(8, 100 - ((q.avg_rank - minRank) / rankSpan) * 70)}%`
                        : '8%',
                      backgroundColor: c,
                    }}
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
