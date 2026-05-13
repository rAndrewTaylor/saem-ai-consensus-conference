/**
 * Stage / Command Center for conference day.
 *
 * Renders the active display mode set on the conference_display_mode
 * singleton, with admin controls overlaid for the chair / operators.
 *
 * Modes:
 *   - idle              → auto-rotating dashboard carousel
 *   - welcome           → walkthrough slide deck (lightweight)
 *   - panel:1..5        → per-WG panel with results + chat sidebar
 *   - table_reactions   → breakout-note grid
 *   - cross_wg          → end-of-day 100-point allocation results
 *
 * The page subscribes to /api/events/day SSE so when the admin flips
 * the mode, every projector and audience client re-renders in sync.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { api, getAdminToken } from '@/lib/api';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Skeleton } from '@/components/ui/skeleton';
import { IdleCarousel } from '@/components/stage/IdleCarousel';
import { WelcomeDeck } from '@/components/stage/WelcomeDeck';
import { PanelStage } from '@/components/stage/PanelStage';
import { TableReactionsStage } from '@/components/stage/TableReactionsStage';
import { CrossWgStage } from '@/components/stage/CrossWgStage';
import { AdminControlStrip } from '@/components/stage/AdminControlStrip';

const SSE_URL = '/api/events/day';

export function StagePage() {
  usePageTitle('SAEM 2026 — Stage');

  const [mode, setMode] = useState(null);
  const [slideIndex, setSlideIndex] = useState(null);
  const [panelTab, setPanelTab] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bus, setBus] = useState(0); // bumps to force re-fetch of mode-dependent data
  const esRef = useRef(null);

  const isAdmin = Boolean(getAdminToken());

  // Initial mode fetch
  const refreshMode = useCallback(async () => {
    try {
      const data = await api('/api/conference/display-mode');
      setMode(data?.mode || 'idle');
      setSlideIndex(data?.slide_index ?? null);
      setPanelTab(data?.panel_tab ?? null);
      setError(null);
    } catch (e) {
      setError(e.message || 'Failed to load display mode');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshMode();
  }, [refreshMode]);

  // SSE — listen for display_mode_changed and chat events
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
        }
        if (
          data?.event === 'chat_message_new' ||
          data?.event === 'chat_upvote_changed' ||
          data?.event === 'chat_message_hidden' ||
          data?.event === 'chat_message_unhidden'
        ) {
          // Child components subscribe to bus to re-fetch chat
          setBus((b) => b + 1);
        }
        if (data?.event === 'session_started' || data?.event === 'phase_changed' || data?.event === 'vote_cast') {
          setBus((b) => b + 1);
        }
      } catch {
        /* malformed */
      }
    });
    es.addEventListener('error', () => {
      // Auto-reconnect handled by browser; nothing to do.
    });
    return () => {
      try { es.close(); } catch {}
    };
  }, []);

  const setDisplay = useCallback(async (patch) => {
    if (!isAdmin) return;
    const payload = { mode: patch.mode ?? mode ?? 'idle', slide_index: patch.slide_index ?? null, panel_tab: patch.panel_tab ?? null };
    await api('/api/conference/display-mode', { method: 'POST', body: payload });
    // SSE will deliver the change; optimistically update too
    setMode(payload.mode);
    setSlideIndex(payload.slide_index);
    setPanelTab(payload.panel_tab);
  }, [mode, isAdmin]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#08111F] p-12">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="mt-6 h-[60vh] w-full rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#08111F] text-white/50">
        <p>{error}</p>
      </div>
    );
  }

  const panelWgMatch = /^panel:(\d+)$/.exec(mode || '');
  const panelWgNumber = panelWgMatch ? parseInt(panelWgMatch[1], 10) : null;

  return (
    <div className="min-h-screen bg-[#08111F] text-white">
      <Helmet>
        <meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no" />
      </Helmet>

      {isAdmin && (
        <AdminControlStrip
          mode={mode}
          slideIndex={slideIndex}
          panelTab={panelTab}
          onChange={setDisplay}
        />
      )}

      <div className={isAdmin ? 'pt-16' : ''}>
        {mode === 'idle' && <IdleCarousel bus={bus} />}
        {mode === 'welcome' && (
          <WelcomeDeck slideIndex={slideIndex || 0} onAdvance={(i) => isAdmin && setDisplay({ mode: 'welcome', slide_index: i })} />
        )}
        {panelWgNumber && (
          <PanelStage wgNumber={panelWgNumber} panelTab={panelTab || 'results'} bus={bus} isAdmin={isAdmin} onTabChange={(t) => isAdmin && setDisplay({ mode: `panel:${panelWgNumber}`, panel_tab: t })} />
        )}
        {mode === 'table_reactions' && <TableReactionsStage bus={bus} />}
        {mode === 'cross_wg' && <CrossWgStage bus={bus} />}
      </div>
    </div>
  );
}

export default StagePage;
