/**
 * Mode-driven stage content, reusable across:
 *   - /stage  (full-bleed projector view)
 *   - /day    (embedded above the audience widgets)
 *
 * Subscribes to /api/conference/display-mode via SSE so when admin
 * flips modes, every client (projector + every phone) re-renders in
 * sync.
 *
 * Renders only the content — no page chrome, no admin control strip.
 * The host page is responsible for the control strip and surrounding
 * layout.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { IdleCarousel } from '@/components/stage/IdleCarousel';
import { WelcomeDeck } from '@/components/stage/WelcomeDeck';
import { PanelStage } from '@/components/stage/PanelStage';
import { TableReactionsStage } from '@/components/stage/TableReactionsStage';
import { CrossWgStage } from '@/components/stage/CrossWgStage';

const SSE_URL = '/api/events/day';

/**
 * Hook: subscribes to the display-mode singleton + SSE events.
 * Returns { mode, slideIndex, panelTab, bus, setDisplay, isLoaded }
 *
 * - `bus` increments on each chat/vote/phase event so child views can
 *   re-fetch without each one wiring its own EventSource.
 * - `setDisplay` is the admin-only mutator. No-op if not admin.
 */
export function useStageDisplay(isAdmin) {
  const [mode, setMode] = useState(null);
  const [slideIndex, setSlideIndex] = useState(null);
  const [panelTab, setPanelTab] = useState(null);
  const [bus, setBus] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const esRef = useRef(null);

  useEffect(() => {
    api('/api/conference/display-mode')
      .then((d) => {
        setMode(d?.mode || 'idle');
        setSlideIndex(d?.slide_index ?? null);
        setPanelTab(d?.panel_tab ?? null);
      })
      .catch(() => setMode('idle'))
      .finally(() => setIsLoaded(true));
  }, []);

  useEffect(() => {
    if (typeof EventSource === 'undefined') return;
    const es = new EventSource(SSE_URL);
    esRef.current = es;
    es.addEventListener('message', (evt) => {
      try {
        const data = JSON.parse(evt.data);
        if (data?.event === 'display_mode_changed') {
          setMode(data.mode);
          setSlideIndex(data.slide_index ?? null);
          setPanelTab(data.panel_tab ?? null);
        } else if (
          data?.event === 'chat_message_new' ||
          data?.event === 'chat_upvote_changed' ||
          data?.event === 'chat_message_hidden' ||
          data?.event === 'chat_message_unhidden' ||
          data?.event === 'vote_cast' ||
          data?.event === 'session_started' ||
          data?.event === 'session_stopped' ||
          data?.event === 'phase_changed' ||
          data?.event === 'ai_prompts_changed'
        ) {
          setBus((b) => b + 1);
        }
      } catch { /* malformed */ }
    });
    return () => { try { es.close(); } catch {} };
  }, []);

  const setDisplay = useCallback(async (patch) => {
    if (!isAdmin) return;
    const payload = {
      mode: patch.mode ?? mode ?? 'idle',
      slide_index: patch.slide_index ?? null,
      panel_tab: patch.panel_tab ?? null,
    };
    try {
      await api('/api/conference/display-mode', { method: 'POST', body: payload });
      setMode(payload.mode);
      setSlideIndex(payload.slide_index);
      setPanelTab(payload.panel_tab);
    } catch (e) { /* no-op */ }
  }, [mode, isAdmin]);

  return { mode, slideIndex, panelTab, bus, setDisplay, isLoaded };
}

/**
 * Renders the active stage mode given the values from useStageDisplay.
 * `compact=true` strips the min-height so the view shrinks to its
 * content (used when embedded inside /day above audience widgets).
 */
export function StageView({ mode, slideIndex, panelTab, bus, isAdmin, onChange, compact = false }) {
  if (mode == null) {
    return <Skeleton className="h-[40vh] w-full rounded-2xl" />;
  }

  const panelWgMatch = /^panel:(\d+)$/.exec(mode || '');
  const panelWgNumber = panelWgMatch ? parseInt(panelWgMatch[1], 10) : null;
  // Full-bleed projector mode: fill the parent flex slot. Compact mode
  // (embedded in /day) shrinks to content.
  const heightClass = compact ? '' : 'h-full overflow-hidden';

  return (
    <div className={heightClass}>
      {mode === 'idle' && <IdleCarousel bus={bus} />}
      {mode === 'welcome' && (
        <WelcomeDeck
          slideIndex={slideIndex || 0}
          onAdvance={(i) => isAdmin && onChange?.({ mode: 'welcome', slide_index: i })}
        />
      )}
      {panelWgNumber && (
        <PanelStage
          wgNumber={panelWgNumber}
          panelTab={panelTab || 'results'}
          bus={bus}
          isAdmin={isAdmin}
          onTabChange={(t) => isAdmin && onChange?.({ mode: `panel:${panelWgNumber}`, panel_tab: t })}
        />
      )}
      {mode === 'table_reactions' && <TableReactionsStage bus={bus} />}
      {mode === 'cross_wg' && <CrossWgStage bus={bus} />}
    </div>
  );
}
