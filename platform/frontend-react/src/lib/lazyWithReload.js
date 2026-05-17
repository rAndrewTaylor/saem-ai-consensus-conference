/**
 * lazyWithReload — survive stale chunks after a deploy.
 *
 * Every Vite build hashes chunk filenames. When the production server
 * deploys a new bundle but a user has an existing tab open, the next
 * lazy import in that tab tries to fetch an old filename that no
 * longer exists and throws (Chrome surfaces this as
 * "Failed to fetch dynamically imported module" or similar).
 *
 * Wrap each route's `lazy()` with this helper. On the first chunk
 * failure of a session it triggers a one-shot full reload to pick up
 * the fresh bundle. A sessionStorage flag prevents a loop in case the
 * underlying error is something real (in which case Suspense throws
 * normally on the second attempt and the ErrorBoundary takes over).
 */

import { lazy } from 'react';

const RELOAD_FLAG = 'saem_chunk_reload';

export function lazyWithReload(importFn) {
  return lazy(() =>
    importFn().catch((err) => {
      const looksLikeChunkError =
        /Loading chunk|Failed to fetch dynamically imported module|Importing a module script failed/i
          .test(String(err?.message || ''));

      if (looksLikeChunkError && !sessionStorage.getItem(RELOAD_FLAG)) {
        sessionStorage.setItem(RELOAD_FLAG, String(Date.now()));
        window.location.reload();
        // Hold Suspense indefinitely while the page reloads.
        return new Promise(() => {});
      }

      // Either we've already reloaded once this session (likely a real
      // bug) or this isn't a chunk error — let Suspense surface it.
      throw err;
    })
  );
}

// Call this from a top-level component on first successful mount so the
// next stale-chunk event in this session is allowed to reload again.
export function clearChunkReloadFlag() {
  try { sessionStorage.removeItem(RELOAD_FLAG); } catch {}
}
