/**
 * Center column of the command page: live preview of what's on the
 * projector + per-mode quick actions for the chair.
 *
 * The preview uses an <iframe src="/stage"> sized to a 16:9 box.
 * Iframe + SSE means the preview updates automatically when the chair
 * (or anyone else) flips the display mode. No special wiring.
 *
 * Quick actions are mode-specific:
 *   - idle:    Open with Welcome → switches to welcome slide 0
 *   - welcome: Slide ← / → + "End Welcome → Panel 1"
 *   - panel:N: Start/Stop vote, Phase toggle, Tab switcher,
 *              "Next: Panel N+1" or "Move to Breakout"
 *   - tables:  "End breakout → next panel"
 *   - cross_wg: Start, "Close conference"
 */

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { useTheme } from '@/hooks/useTheme';
import { Play, Square, RotateCcw, ChevronLeft, ChevronRight, ExternalLink, BarChart3, Vote, Repeat, ArrowRight } from 'lucide-react';

const WG_NAMES = {
  1: 'Clinical Practice & Operations',
  2: 'Infrastructure & Data Ecosystems',
  3: 'Education, Training & Competency',
  4: 'Human-AI Interaction',
  5: 'Ethics, Legal & Societal',
};

export function CenterStage({ mode, slideIndex, panelTab, onChange }) {
  const panelMatch = /^panel:(\d+)$/.exec(mode || '');
  const panelWg = panelMatch ? parseInt(panelMatch[1], 10) : null;

  return (
    <div className="flex h-full flex-col gap-3">
      <StagePreview />
      <ModeBanner mode={mode} slideIndex={slideIndex} panelWg={panelWg} />
      {mode === 'idle' && <IdleActions onChange={onChange} />}
      {mode === 'welcome' && <WelcomeActions slideIndex={slideIndex} onChange={onChange} />}
      {panelWg && <PanelActions wgNumber={panelWg} panelTab={panelTab} onChange={onChange} />}
      {mode === 'table_reactions' && <TableActions onChange={onChange} />}
      {mode === 'cross_wg' && <CrossWgActions onChange={onChange} />}
    </div>
  );
}

// ---- Preview frame -------------------------------------------------------

function StagePreview() {
  // Pass the parent's theme to the iframe so the preview matches the
  // command page's theme. The src key includes the theme so the iframe
  // remounts on toggle (cheaper than postMessage for this scale).
  const { theme } = useTheme();
  const src = `/stage?theme=${theme}&minimal=1`;
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-black overflow-hidden">
      {/* External toolbar — sits above the iframe so it never covers
          the admin control strip / tabs that render inside /stage. */}
      <div className="flex items-center justify-between gap-2 border-b border-white/[0.08] bg-white/[0.02] px-3 py-1.5">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          Live on projector
        </span>
        <a
          href="/stage"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium text-white/60 hover:bg-white/[0.06] hover:text-white"
        >
          <ExternalLink className="h-3 w-3" />
          Open in new window
        </a>
      </div>
      <div className="aspect-video w-full">
        <iframe
          key={theme}
          title="Stage preview"
          src={src}
          className="h-full w-full"
          style={{ border: 0 }}
        />
      </div>
    </div>
  );
}

// ---- Banner / status -----------------------------------------------------

function ModeBanner({ mode, slideIndex, panelWg }) {
  const label = (() => {
    if (panelWg) return `Panel ${panelWg} — ${WG_NAMES[panelWg]}`;
    if (mode === 'idle') return 'Idle — auto-rotating dashboard';
    if (mode === 'welcome') return `Welcome slide ${(slideIndex || 0) + 1} of 6`;
    if (mode === 'table_reactions') return 'Table reactions — breakout';
    if (mode === 'cross_wg') return 'Cross-WG prioritization';
    return mode || '—';
  })();
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Current mode</p>
      <p className="mt-0.5 text-sm font-semibold text-white">{label}</p>
    </div>
  );
}

// ---- Action sets --------------------------------------------------------

function IdleActions({ onChange }) {
  return (
    <ActionRow>
      <PrimaryAction onClick={() => onChange?.({ mode: 'welcome', slide_index: 0 })} icon={ArrowRight}>
        Open with Welcome
      </PrimaryAction>
      <SecondaryAction onClick={() => onChange?.({ mode: 'panel:1', panel_tab: 'results' })}>
        Skip to Panel 1
      </SecondaryAction>
    </ActionRow>
  );
}

function WelcomeActions({ slideIndex, onChange }) {
  const i = slideIndex || 0;
  return (
    <ActionRow>
      <SecondaryAction onClick={() => onChange?.({ mode: 'welcome', slide_index: Math.max(0, i - 1) })} icon={ChevronLeft}>
        Previous
      </SecondaryAction>
      <span className="rounded-md bg-white/[0.04] px-3 py-1.5 font-mono text-xs text-white/60">{i + 1} / 6</span>
      <SecondaryAction onClick={() => onChange?.({ mode: 'welcome', slide_index: Math.min(5, i + 1) })} icon={ChevronRight}>
        Next
      </SecondaryAction>
      <PrimaryAction onClick={() => onChange?.({ mode: 'panel:1', panel_tab: 'results' })} icon={ArrowRight}>
        End Welcome → Panel 1
      </PrimaryAction>
    </ActionRow>
  );
}

function PanelActions({ wgNumber, panelTab, onChange }) {
  const [session, setSession] = useState(null);
  const refresh = useCallback(() => {
    api('/api/conference/sessions').then((sessions) => {
      const m = (sessions || [])
        .filter((s) => s.wg_number === wgNumber && s.session_type === 'wg_presentation')
        .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))[0];
      setSession(m || null);
    }).catch(() => setSession(null));
  }, [wgNumber]);
  useEffect(() => { refresh(); }, [refresh]);

  // Re-mount the panel pool curator when the WG changes so it re-fetches.
  // (the wgNumber key forces remount; refresh inside happens on its own).

  const start = async () => {
    if (!session) return;
    try { await api(`/api/conference/sessions/${session.id}/start`, { method: 'POST' }); refresh(); } catch (e) { console.error(e); }
  };
  const stop = async () => {
    if (!session) return;
    if (!window.confirm('Stop the current vote? Audience phones will lock out further submissions.')) return;
    try { await api(`/api/conference/sessions/${session.id}/stop`, { method: 'POST' }); refresh(); } catch (e) { console.error(e); }
  };
  const togglePhase = async () => {
    if (!session) return;
    const next = session.phase === 'pre_discussion' ? 'post_discussion' : 'pre_discussion';
    try { await api(`/api/conference/sessions/${session.id}/phase`, { method: 'POST', body: { phase: next } }); refresh(); } catch (e) { console.error(e); }
  };

  const transition = (next) => {
    if (session?.is_active) {
      const target = next.mode === 'cross_wg' ? 'the cross-WG round' : next.mode === 'table_reactions' ? 'breakout mode' : next.mode?.replace('panel:', 'Panel ');
      if (!window.confirm(`Vote is still open for WG${wgNumber}. Move to ${target} anyway?`)) return;
    }
    onChange?.(next);
  };

  return (
    <div className="space-y-2">
      <PanelPoolCurator key={wgNumber} wgNumber={wgNumber} />

      <ActionRow>
        {/* Tab switcher for what's shown on the projector */}
        <TabBtn active={panelTab === 'results'} onClick={() => onChange?.({ mode: `panel:${wgNumber}`, panel_tab: 'results' })} icon={BarChart3}>Results</TabBtn>
        <TabBtn active={panelTab === 'vote'} onClick={() => onChange?.({ mode: `panel:${wgNumber}`, panel_tab: 'vote' })} icon={Vote}>Live Vote</TabBtn>
        <TabBtn active={panelTab === 'comparison'} onClick={() => onChange?.({ mode: `panel:${wgNumber}`, panel_tab: 'comparison' })} icon={Repeat}>Pre/Post</TabBtn>
      </ActionRow>

      {session && (
        <ActionRow>
          {!session.is_active ? (
            <PrimaryAction onClick={start} icon={Play}>Start vote</PrimaryAction>
          ) : (
            <>
              <SecondaryAction onClick={togglePhase} icon={RotateCcw}>
                Phase: {session.phase === 'pre_discussion' ? 'Pre-discussion (toggle to Post)' : 'Post-discussion (toggle to Pre)'}
              </SecondaryAction>
              <DangerAction onClick={stop} icon={Square}>Stop vote</DangerAction>
            </>
          )}
          <span className="ml-auto rounded-md bg-white/[0.04] px-2 py-1 font-mono text-[10px] text-white/50">
            session {session.id}
          </span>
        </ActionRow>
      )}

      <ActionRow>
        <SecondaryAction onClick={() => transition({ mode: 'table_reactions' })} icon={ArrowRight}>
          Move to breakout
        </SecondaryAction>
        {wgNumber < 5 && (
          <PrimaryAction onClick={() => transition({ mode: `panel:${wgNumber + 1}`, panel_tab: 'results' })} icon={ArrowRight}>
            Next: Panel {wgNumber + 1}
          </PrimaryAction>
        )}
        {wgNumber === 5 && (
          <PrimaryAction onClick={() => transition({ mode: 'cross_wg' })} icon={ArrowRight}>
            Move to Cross-WG vote
          </PrimaryAction>
        )}
      </ActionRow>
    </div>
  );
}

function TableActions({ onChange }) {
  return (
    <ActionRow>
      <PrimaryAction onClick={() => onChange?.({ mode: 'panel:1', panel_tab: 'results' })} icon={ArrowRight}>
        Back to Panel 1
      </PrimaryAction>
      <SecondaryAction onClick={() => onChange?.({ mode: 'idle' })}>
        Return to Idle
      </SecondaryAction>
    </ActionRow>
  );
}

function CrossWgActions({ onChange }) {
  return (
    <div className="space-y-2">
      <CrossWgFunnel />
      <ActionRow>
        <PrimaryAction onClick={() => onChange?.({ mode: 'idle' })} icon={ArrowRight}>
          Close conference → Idle
        </PrimaryAction>
      </ActionRow>
    </div>
  );
}

const PILLAR_COLORS = {
  1: '#00B4D8', 2: '#22d3ee', 3: '#8b5cf6', 4: '#10b981', 5: '#f59e0b',
};

/**
 * Inline picker so the chair can curate which questions appear in this
 * panel's vote pool. Shows all R2 questions for the WG with checkboxes;
 * a count + one-click 'Auto-pick top 5' button up top.
 */
function PanelPoolCurator({ wgNumber }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const d = await api(`/api/conference/panel/${wgNumber}/candidates`);
      setData(d);
    } catch (e) { console.error(e); }
  }, [wgNumber]);
  useEffect(() => { refresh(); }, [refresh]);

  const autoPick = async () => {
    setLoading(true);
    try {
      await api(`/api/conference/panel/${wgNumber}/auto-feature?n=5`, { method: 'POST' });
      await refresh();
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const toggleOne = async (questionId, willBeFeatured) => {
    if (!data) return;
    const ids = new Set(data.questions.filter((q) => q.is_featured).map((q) => q.id));
    if (willBeFeatured) ids.add(questionId);
    else ids.delete(questionId);
    setLoading(true);
    try {
      await api('/api/conference/panel/feature', {
        method: 'POST',
        body: { wg_number: wgNumber, question_ids: [...ids], replace: true },
      });
      await refresh();
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  if (!data) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-xs text-white/40">
        Loading panel pool…
      </div>
    );
  }

  const n = data.n_featured;
  const total = data.questions.length;

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02]">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Panel pool</p>
          <p className="mt-0.5 text-sm text-white/85">
            {n === 0
              ? `Using fallback (top R2 of ${total} questions). Curate to control what audience ranks.`
              : `${n} of ${total} R2 questions in the panel pool`}
          </p>
        </div>
        <button
          onClick={autoPick}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#00B4D8]/20 px-2.5 py-1.5 text-xs font-semibold text-[#48CAE4] hover:bg-[#00B4D8]/30 disabled:opacity-40"
        >
          {loading ? '…' : 'Auto-pick top 5'}
        </button>
        <button
          onClick={() => setExpanded(!expanded)}
          className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] px-2.5 py-1.5 text-xs font-medium text-white/70 hover:bg-white/[0.04]"
        >
          {expanded ? 'Hide' : 'Edit'}
        </button>
      </div>

      {expanded && (
        <div className="max-h-72 overflow-y-auto border-t border-white/[0.04] px-3 py-2">
          <ul className="space-y-1">
            {data.questions.map((q) => {
              const inc = q.r2_include_pct ?? q.r1_include_pct ?? 0;
              const imp = q.r2_importance_mean ?? q.r1_importance_mean ?? 0;
              return (
                <li key={q.id} className="flex items-start gap-2 rounded border border-white/[0.04] p-1.5">
                  <label className="flex flex-1 cursor-pointer items-start gap-2">
                    <input
                      type="checkbox"
                      checked={q.is_featured}
                      onChange={(e) => toggleOne(q.id, e.target.checked)}
                      disabled={loading}
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded accent-[#00B4D8]"
                    />
                    <p className="min-w-0 flex-1 text-[11px] leading-snug text-white/85">{q.text}</p>
                  </label>
                  <span className="shrink-0 font-mono text-[9px] text-white/40 whitespace-nowrap">
                    {Math.round(inc)}% · {imp.toFixed(1)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function CrossWgFunnel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const refresh = useCallback(async () => {
    try {
      const d = await api('/api/conference/cross-wg/candidates');
      setData(d);
    } catch (e) { console.error(e); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const autoFeature = async () => {
    setLoading(true);
    try {
      await api('/api/conference/cross-wg/auto-feature', { method: 'POST' });
      await refresh();
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const toggleOne = async (questionId, willBeFeatured) => {
    setLoading(true);
    try {
      // Compute new full set: collect every currently-featured id, then add/remove the toggled one.
      const featuredIds = new Set();
      (data?.groups || []).forEach((g) =>
        g.candidates.forEach((c) => { if (c.is_featured) featuredIds.add(c.question_id); })
      );
      if (willBeFeatured) featuredIds.add(questionId);
      else featuredIds.delete(questionId);
      await api('/api/conference/cross-wg/feature', {
        method: 'POST',
        body: { question_ids: [...featuredIds], replace: true },
      });
      await refresh();
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  if (!data) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-xs text-white/40">
        Loading cross-WG candidates…
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
            Cross-WG funnel
          </p>
          <p className="mt-0.5 text-sm text-white/80">
            {data.featured_total} question{data.featured_total === 1 ? '' : 's'} featured for the closing round
          </p>
        </div>
        <button
          onClick={autoFeature}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#00B4D8]/20 px-3 py-1.5 text-xs font-semibold text-[#48CAE4] hover:bg-[#00B4D8]/30 disabled:opacity-40"
        >
          {loading ? 'Working…' : 'Auto-feature top 2 / WG'}
        </button>
      </div>

      <div className="space-y-2">
        {(data.groups || []).map((g) => {
          const c = PILLAR_COLORS[g.wg_number] || '#48CAE4';
          return (
            <div key={g.wg_number} className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-2.5">
              <div className="mb-1.5 flex items-center gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold" style={{ backgroundColor: `${c}25`, color: c }}>
                  {g.wg_number}
                </span>
                <span className="text-xs font-medium text-white/80">{g.wg_name}</span>
              </div>
              {g.candidates.length === 0 ? (
                <p className="text-[11px] text-white/40">No vote data yet for this panel.</p>
              ) : (
                <ul className="space-y-1">
                  {g.candidates.map((cd) => (
                    <li key={cd.question_id} className="flex items-start gap-2 rounded border border-white/[0.04] p-1.5">
                      <label className="flex flex-1 cursor-pointer items-start gap-2">
                        <input
                          type="checkbox"
                          checked={cd.is_featured}
                          onChange={(e) => toggleOne(cd.question_id, e.target.checked)}
                          disabled={loading}
                          className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded accent-[#00B4D8]"
                        />
                        <p className="min-w-0 flex-1 text-[11px] leading-snug text-white/85">{cd.text}</p>
                      </label>
                      <span className="shrink-0 font-mono text-[9px] text-white/40">
                        {cd.avg_rank != null ? `rk ${cd.avg_rank.toFixed(2)}` : cd.fallback ? 'fallback' : '—'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---- Action primitives --------------------------------------------------

function ActionRow({ children }) {
  return <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">{children}</div>;
}

function PrimaryAction({ onClick, icon: Icon, children }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1.5 rounded-lg bg-[#00B4D8]/20 px-3 py-1.5 text-xs font-semibold text-[#48CAE4] hover:bg-[#00B4D8]/30">
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {children}
    </button>
  );
}
function SecondaryAction({ onClick, icon: Icon, children }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/[0.08]">
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {children}
    </button>
  );
}
function DangerAction({ onClick, icon: Icon, children }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/15 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/25">
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {children}
    </button>
  );
}
function TabBtn({ active, onClick, icon: Icon, children }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
        active ? 'bg-[#00B4D8]/20 text-[#48CAE4]' : 'border border-white/[0.08] text-white/60 hover:bg-white/[0.06]'
      }`}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {children}
    </button>
  );
}
