/**
 * Global chair-drives-audience navigation for the conference day.
 *
 * Mounted once at the app root. Watches the conference day-state
 * (active session, stage mode) via /day-state poll + SSE, and when
 * the user has `saem_follow_stage` ON (default), automatically moves
 * them to the right page when the chair flips a switch.
 *
 * Only fires on conference-day routes (/day, /vote/:id). Anyone
 * deliberately reading /wg/* or /reports/* is left alone.
 *
 * Transitions handled:
 *   1. Vote opens     (active id changes) → /vote/:id   (4s grace)
 *   2. Vote closes    (active id → null)  → /day        (1.5s grace)
 *   3. Mode → cross_wg with no active session → /day#cross-wg
 *   4. Mode → table_reactions                → /day#world-cafe
 *   5. Mode → panel:N                        → /day#panel-N
 *
 * Mode-based transitions only fire when the user is not in the middle
 * of voting — we never yank someone off an active /vote/:id mid-rank.
 */

import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api, getAnyParticipantToken } from '@/lib/api';
import { subscribeSSE } from '@/lib/sseSubscribe';
import { useToast } from '@/components/ui/toast';
import { getFollowStage } from '@/components/conference/SignedInChip';

// Routes where the orchestrator may issue an auto-navigation. This used
// to be just /day and /vote/*, but that meant anyone reading /welcome,
// /background, /reports, /working-groups, or a WG detail page when the
// chair started a session got zero auto-push and sat on the wrong page
// for the entire panel. Day-of, every reader-style route should also
// follow the stage when follow-stage is on.
const DAY_ROUTE_PATTERNS = [
  /^\/$/,
  /^\/day$/,
  /^\/vote\//,
  /^\/welcome$/,
  /^\/background$/,
  /^\/reports/,
  /^\/working-groups/,
  /^\/wg(\/|$)/,
  /^\/guide$/,
];
const POLL_MS = 15000;

function isOnDayRoute(pathname) {
  return DAY_ROUTE_PATTERNS.some((re) => re.test(pathname));
}

export function StageFollowOrchestrator() {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();

  const [activeSessionId, setActiveSessionId] = useState(null);
  const [mode, setMode] = useState(null);

  const prevActiveRef = useRef(undefined);   // undefined = not yet observed; null = explicitly inactive
  const prevModeRef = useRef(undefined);
  const sseRef = useRef(null);
  const pendingTimerRef = useRef(null);

  // Only run subscriptions when we have a participant token and we're on a day route
  const hasParticipant = !!getAnyParticipantToken();
  const onDayRoute = isOnDayRoute(location.pathname);
  const active = hasParticipant && onDayRoute;

  // Initial fetch + poll for the day state
  useEffect(() => {
    if (!active) return;
    let cancelled = false;

    const refresh = async () => {
      try {
        const d = await api('/api/conference/day-state');
        if (cancelled) return;
        setActiveSessionId(d?.active_session_id || null);
      } catch {
        /* keep polling; transient network failures are expected in the room */
      }
      try {
        const dm = await api('/api/conference/display-mode');
        if (cancelled) return;
        setMode(dm?.mode || 'idle');
      } catch {
        /* keep polling; transient network failures are expected in the room */
      }
    };

    refresh();
    const t = setInterval(refresh, POLL_MS);

    let stopSSE = null;
    if (typeof EventSource !== 'undefined') {
      stopSSE = subscribeSSE('/api/events/day', (data) => {
        if (data?.event === 'display_mode_changed') {
          setMode(data.mode || 'idle');
        } else if (['session_started', 'session_stopped', 'phase_changed'].includes(data?.event)) {
          refresh();
        }
      });
    }

    return () => {
      cancelled = true;
      clearInterval(t);
      if (stopSSE) stopSSE();
      // Legacy sseRef cleanup (left for safety if any older direct EventSource use exists)
      if (sseRef.current) {
        try { sseRef.current.close(); } catch {
          /* close is best-effort */
        }
        sseRef.current = null;
      }
    };
  }, [active]);

  // React to transitions
  useEffect(() => {
    if (!active) return;
    if (!getFollowStage()) {
      prevActiveRef.current = activeSessionId;
      prevModeRef.current = mode;
      return;
    }

    const prevActive = prevActiveRef.current;
    const prevMode = prevModeRef.current;
    const firstObservation = prevActive === undefined && prevMode === undefined;

    // Skip the first observation — we don't want to yank a user who lands
    // mid-vote or mid-panel. Only fire on subsequent transitions.
    if (firstObservation) {
      prevActiveRef.current = activeSessionId;
      prevModeRef.current = mode;
      return;
    }

    // Helper to schedule a delayed navigation, replacing any pending one
    const scheduleNav = (target, ms, message) => {
      if (location.pathname === target) return;
      if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
      if (message) {
        toast({ message, type: 'info', duration: Math.max(2000, ms) });
      }
      pendingTimerRef.current = setTimeout(() => {
        pendingTimerRef.current = null;
        navigate(target);
      }, ms);
    };

    // 1. Vote opened (new active session)
    if (activeSessionId && activeSessionId !== prevActive) {
      scheduleNav(`/vote/${activeSessionId}`, 4000,
        'A vote just opened — opening ranking in 4s.');
    }

    // 2. Vote closed (active session went away while user is mid-rank)
    if (!activeSessionId && prevActive) {
      if (/^\/vote\//.test(location.pathname)) {
        scheduleNav('/day', 1500, 'Vote closed — back to agenda.');
      }
    }

    // 3-5. Mode transitions (only if no active session, so we don't yank
    // a voter off the ranking page when the chair flips the projector).
    if (mode !== prevMode && !activeSessionId) {
      if (/^panel:(\d+)$/.test(mode || '')) {
        const wg = mode.split(':')[1];
        scheduleNav(`/day#panel-${wg}`, 1500,
          `Panel ${wg} is live — opening agenda.`);
      } else if (mode === 'table_reactions') {
        scheduleNav('/day', 1500,
          'Table reactions — back to agenda.');
      } else if (mode === 'world_cafe') {
        scheduleNav('/day#world-cafe', 1500,
          'World Café starting — back to agenda.');
      } else if (mode === 'cross_wg') {
        scheduleNav('/day#cross-wg', 1500,
          'Closing round — back to agenda.');
      } else if (/^present:(\d+)$/.test(mode || '')) {
        const wg = mode.split(':')[1];
        scheduleNav('/day', 1500,
          `Priority presentation for WG ${wg} — back to agenda.`);
      } else if (mode === 'break') {
        // Bring everyone to the agenda so they see the break countdown
        scheduleNav('/day', 1500, 'On break — see countdown.');
      } else if (mode === 'idle' || mode === 'welcome') {
        // Quietly return mid-vote users to the agenda
        if (/^\/vote\//.test(location.pathname)) {
          scheduleNav('/day', 1500, 'Back to agenda.');
        }
      }
    }

    prevActiveRef.current = activeSessionId;
    prevModeRef.current = mode;
  }, [activeSessionId, mode, active, location.pathname, navigate, toast]);

  // Cancel any pending nav if the route changes manually (user navigated away)
  useEffect(() => {
    return () => {
      if (pendingTimerRef.current) {
        clearTimeout(pendingTimerRef.current);
        pendingTimerRef.current = null;
      }
    };
  }, [location.pathname]);

  return null;
}
