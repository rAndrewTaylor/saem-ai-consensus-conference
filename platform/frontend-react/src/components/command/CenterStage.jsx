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
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-black">
      <div className="aspect-video w-full">
        <iframe
          title="Stage preview"
          src="/stage"
          className="h-full w-full"
          style={{ border: 0 }}
        />
      </div>
      <a
        href="/stage"
        target="_blank"
        rel="noreferrer"
        className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 text-[10px] font-medium text-white/80 hover:bg-black/80 backdrop-blur"
      >
        <ExternalLink className="h-3 w-3" />
        Open projector view
      </a>
      <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-md bg-black/60 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300 backdrop-blur">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
        Live on projector
      </span>
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

  const start = async () => {
    if (!session) return;
    try { await api(`/api/conference/sessions/${session.id}/start`, { method: 'POST' }); refresh(); } catch (e) { console.error(e); }
  };
  const stop = async () => {
    if (!session) return;
    try { await api(`/api/conference/sessions/${session.id}/stop`, { method: 'POST' }); refresh(); } catch (e) { console.error(e); }
  };
  const togglePhase = async () => {
    if (!session) return;
    const next = session.phase === 'pre_discussion' ? 'post_discussion' : 'pre_discussion';
    try { await api(`/api/conference/sessions/${session.id}/phase`, { method: 'POST', body: { phase: next } }); refresh(); } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-2">
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
        <SecondaryAction onClick={() => onChange?.({ mode: 'table_reactions' })} icon={ArrowRight}>
          Move to breakout
        </SecondaryAction>
        {wgNumber < 5 && (
          <PrimaryAction onClick={() => onChange?.({ mode: `panel:${wgNumber + 1}`, panel_tab: 'results' })} icon={ArrowRight}>
            Next: Panel {wgNumber + 1}
          </PrimaryAction>
        )}
        {wgNumber === 5 && (
          <PrimaryAction onClick={() => onChange?.({ mode: 'cross_wg' })} icon={ArrowRight}>
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
    <ActionRow>
      <PrimaryAction onClick={() => onChange?.({ mode: 'idle' })} icon={ArrowRight}>
        Close conference → Idle
      </PrimaryAction>
    </ActionRow>
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
