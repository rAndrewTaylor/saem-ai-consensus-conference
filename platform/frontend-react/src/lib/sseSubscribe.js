/**
 * Resilient EventSource subscriber.
 *
 * Browsers auto-reconnect on `readyState === CONNECTING`, but Cloudflare /
 * Railway frequently return a permanent 502 on transient failures and the
 * EventSource lands in `CLOSED` (readyState 2). Without retry logic the
 * subscription dies silently — exactly what happened in the dry-run when
 * the SSE went away after the first venue-wifi blip and follow-the-stage
 * stopped working.
 *
 * Usage:
 *   const stop = subscribeSSE('/api/events/day', (data) => { ... });
 *   // ... later
 *   stop();
 */

const DEFAULT_RETRY_MS = 3000;
const MAX_RETRY_MS = 30000;

export function subscribeSSE(url, onMessage, { onOpen, onError } = {}) {
  let es = null;
  let stopped = false;
  let retryMs = DEFAULT_RETRY_MS;
  let retryTimer = null;

  const connect = () => {
    if (stopped) return;
    try {
      es = new EventSource(url);
    } catch (err) {
      // EventSource constructor itself failing — schedule retry
      onError && onError(err);
      scheduleRetry();
      return;
    }
    es.onopen = () => {
      retryMs = DEFAULT_RETRY_MS;
      onOpen && onOpen();
    };
    es.onmessage = (evt) => {
      let data;
      try { data = JSON.parse(evt.data); } catch { return; }
      try { onMessage(data); } catch (err) {
        // Don't let a consumer throw kill the subscription
        console.warn('[sse] consumer threw on event', data?.event, err);
      }
    };
    es.onerror = (evt) => {
      onError && onError(evt);
      // readyState 2 = CLOSED. Browser won't reconnect on its own — we do.
      if (es && es.readyState === 2) {
        try { es.close(); } catch {}
        es = null;
        scheduleRetry();
      }
      // readyState 0 = CONNECTING; browser is retrying for us, leave alone.
    };
  };

  const scheduleRetry = () => {
    if (stopped) return;
    if (retryTimer) return;
    retryTimer = setTimeout(() => {
      retryTimer = null;
      retryMs = Math.min(retryMs * 2, MAX_RETRY_MS);
      connect();
    }, retryMs);
  };

  connect();

  return () => {
    stopped = true;
    if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
    if (es) { try { es.close(); } catch {} es = null; }
  };
}
