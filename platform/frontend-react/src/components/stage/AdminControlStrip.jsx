/**
 * Admin-only top bar on the stage page.
 *
 * Lets the chair flip between modes (idle / welcome / panel 1-5 /
 * table reactions / cross-WG), navigate the welcome deck, and switch
 * panel tabs (results / vote / comparison).
 *
 * In panel mode, also exposes per-session controls: start/stop the
 * voting session and toggle phase (pre-discussion / post-discussion).
 *
 * Only renders for users with an admin token; audience sees a clean
 * full-bleed projection underneath.
 */

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Home, Presentation, Users2, MessageSquare, Trophy, ChevronLeft, ChevronRight, BarChart3, Vote, Repeat, Play, Square, RotateCcw } from 'lucide-react';

const WG_LABELS = {
  1: 'Clinical Practice',
  2: 'Infrastructure',
  3: 'Education',
  4: 'Human-AI',
  5: 'Ethics/Legal',
};

const PANEL_TABS = [
  { key: 'results', label: 'Results', icon: BarChart3 },
  { key: 'vote', label: 'Live Vote', icon: Vote },
  { key: 'comparison', label: 'Pre/Post', icon: Repeat },
];

export function AdminControlStrip({ mode, slideIndex, panelTab, onChange }) {
  const panelMatch = /^panel:(\d+)$/.exec(mode || '');
  const panelWg = panelMatch ? parseInt(panelMatch[1], 10) : null;
  const [session, setSession] = useState(null);

  // Resolve the wg_presentation session for the current panel
  useEffect(() => {
    if (!panelWg && mode !== 'cross_wg' && mode !== 'table_reactions') {
      setSession(null);
      return;
    }
    api('/api/conference/sessions')
      .then((sessions) => {
        let match;
        if (mode === 'cross_wg') {
          match = (sessions || []).find((s) => s.session_type === 'cross_wg_prioritization');
        } else if (panelWg) {
          match = (sessions || [])
            .filter((s) => s.wg_number === panelWg && s.session_type === 'wg_presentation')
            .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))[0];
        }
        setSession(match || null);
      })
      .catch(() => setSession(null));
  }, [panelWg, mode]);

  const startSession = async () => {
    if (!session) return;
    try {
      await api(`/api/conference/sessions/${session.id}/start`, { method: 'POST' });
      setSession({ ...session, is_active: true, phase: 'pre_discussion' });
    } catch (e) { console.error(e); }
  };
  const stopSession = async () => {
    if (!session) return;
    try {
      await api(`/api/conference/sessions/${session.id}/stop`, { method: 'POST' });
      setSession({ ...session, is_active: false });
    } catch (e) { console.error(e); }
  };
  const togglePhase = async () => {
    if (!session) return;
    const next = session.phase === 'pre_discussion' ? 'post_discussion' : 'pre_discussion';
    try {
      await api(`/api/conference/sessions/${session.id}/phase`, { method: 'POST', body: { phase: next } });
      setSession({ ...session, phase: next });
    } catch (e) { console.error(e); }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.08] bg-[#0A1628]/95 backdrop-blur">
      <div className="flex items-center gap-2 px-4 py-2">
        <span className="mr-3 text-[10px] font-bold uppercase tracking-wider text-amber-400">Admin · Stage</span>

        <ModeButton active={mode === 'idle'} onClick={() => onChange({ mode: 'idle' })} icon={Home} label="Idle" />
        <ModeButton active={mode === 'welcome'} onClick={() => onChange({ mode: 'welcome', slide_index: 0 })} icon={Presentation} label="Welcome" />

        <div className="mx-1 h-6 w-px bg-white/[0.08]" />

        {[1, 2, 3, 4, 5].map((n) => (
          <ModeButton
            key={n}
            active={panelWg === n}
            onClick={() => onChange({ mode: `panel:${n}`, panel_tab: 'results' })}
            icon={Users2}
            label={`P${n}`}
            title={`Panel ${n} — ${WG_LABELS[n]}`}
          />
        ))}

        <div className="mx-1 h-6 w-px bg-white/[0.08]" />

        <ModeButton active={mode === 'table_reactions'} onClick={() => onChange({ mode: 'table_reactions' })} icon={MessageSquare} label="Tables" />
        <ModeButton active={mode === 'cross_wg'} onClick={() => onChange({ mode: 'cross_wg' })} icon={Trophy} label="Cross-WG" />

        <div className="ml-auto flex items-center gap-2">
          {/* Mode-specific sub-controls */}
          {mode === 'welcome' && (
            <>
              <button
                onClick={() => onChange({ mode: 'welcome', slide_index: Math.max(0, (slideIndex || 0) - 1) })}
                className="rounded p-1.5 text-white/60 hover:bg-white/[0.06] hover:text-white"
                title="Previous slide"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="font-mono text-xs text-white/60">slide {(slideIndex || 0) + 1}</span>
              <button
                onClick={() => onChange({ mode: 'welcome', slide_index: (slideIndex || 0) + 1 })}
                className="rounded p-1.5 text-white/60 hover:bg-white/[0.06] hover:text-white"
                title="Next slide"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}
          {panelWg && (
            <div className="flex items-center gap-1">
              {PANEL_TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => onChange({ mode: `panel:${panelWg}`, panel_tab: t.key })}
                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition ${
                    panelTab === t.key
                      ? 'bg-[#00B4D8]/20 text-[#48CAE4]'
                      : 'text-white/50 hover:bg-white/[0.06] hover:text-white/80'
                  }`}
                >
                  <t.icon className="h-3.5 w-3.5" />
                  {t.label}
                </button>
              ))}
            </div>
          )}

          {session && (
            <>
              <div className="ml-2 h-6 w-px bg-white/[0.08]" />
              <div className="flex items-center gap-1.5">
                <span className="rounded-full bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] text-white/50">
                  S{session.id}
                </span>
                {!session.is_active ? (
                  <button
                    onClick={startSession}
                    className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-300 hover:bg-emerald-500/25"
                  >
                    <Play className="h-3.5 w-3.5" />
                    Start vote
                  </button>
                ) : (
                  <>
                    <button
                      onClick={togglePhase}
                      title={`Toggle to ${session.phase === 'pre_discussion' ? 'post' : 'pre'}-discussion`}
                      className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-300 hover:bg-amber-500/25"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      {session.phase === 'pre_discussion' ? 'Pre' : 'Post'}
                    </button>
                    <button
                      onClick={stopSession}
                      className="inline-flex items-center gap-1.5 rounded-md bg-red-500/15 px-2.5 py-1 text-xs font-medium text-red-300 hover:bg-red-500/25"
                    >
                      <Square className="h-3.5 w-3.5" />
                      Stop
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ModeButton({ active, onClick, icon: Icon, label, title }) {
  return (
    <button
      onClick={onClick}
      title={title || label}
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition ${
        active
          ? 'bg-white/[0.1] text-white'
          : 'text-white/50 hover:bg-white/[0.05] hover:text-white/80'
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
