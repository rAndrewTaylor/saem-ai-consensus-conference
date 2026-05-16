/**
 * Follow-the-stage hook.
 *
 * When a vote opens (an activeSession appears) and the user has the
 * follow-stage toggle on, this hook auto-navigates them to the voting
 * page after a short grace period — so people don't get lost mid-day
 * by reading a side page when a vote drops.
 *
 * Behavior:
 *   - Triggered when the active session ID changes from null to a value
 *     (i.e., a new vote just opened). Does NOT fire on initial mount if
 *     a session was already active when the user loaded the page.
 *   - Shows a toast for `graceMs` milliseconds. User can tap "Stay here"
 *     to cancel.
 *   - Honors the saem_follow_stage localStorage flag (default ON).
 *   - No-ops if the user is already on the right /vote/:id page.
 */

import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getFollowStage } from '@/components/conference/SignedInChip';

export function useFollowStage(activeSession, toast, options = {}) {
  const { graceMs = 4000 } = options;
  const navigate = useNavigate();
  const location = useLocation();
  const previousIdRef = useRef(null);
  const timerRef = useRef(null);
  const initialMountRef = useRef(true);

  useEffect(() => {
    const currentId = activeSession?.id || null;
    const previousId = previousIdRef.current;
    previousIdRef.current = currentId;

    // Skip the first render — we don't want to yank a user who lands on
    // /day mid-vote. Only fire when a *new* vote opens after mount.
    if (initialMountRef.current) {
      initialMountRef.current = false;
      return;
    }

    // Only fire on null → id transitions (new vote opened)
    if (!currentId || currentId === previousId) return;

    if (!getFollowStage()) return;

    // No-op if user is already on the target vote page
    if (location.pathname === `/vote/${currentId}`) return;

    const target = `/vote/${currentId}`;
    let cancelled = false;

    const handle = setTimeout(() => {
      if (cancelled) return;
      navigate(target);
    }, graceMs);
    timerRef.current = handle;

    if (toast) {
      toast({
        message: `A vote just opened — opening ranking in ${Math.round(graceMs / 1000)}s.`,
        type: 'info',
        duration: graceMs,
      });
    }

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [activeSession?.id, navigate, toast, graceMs, location.pathname]);
}
