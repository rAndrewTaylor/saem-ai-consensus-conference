/**
 * Offline-resilient POST queue for conference-day submissions.
 *
 * Flow:
 *   queueSubmit({ url, body, kind }) returns a Promise that:
 *     - Tries fetch immediately if online; resolves on success.
 *     - If offline OR fetch fails, persists to localStorage and resolves
 *       with { queued: true } so the UI can show "queued for sync".
 *   On `online` events, drains the queue in order with retry.
 *
 * Conference-day usage: vote/comment/breakout submissions wrap themselves
 * in queueSubmit() so a flaky venue Wi-Fi doesn't cause silent data loss.
 */

const STORAGE_KEY = 'saem_conf_offline_queue_v1';
const listeners = new Set();
let draining = false;

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(arr) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  } catch {
    /* quota; non-fatal */
  }
}

function notify() {
  const q = load();
  listeners.forEach((cb) => {
    try { cb(q.length); } catch {}
  });
}

export function pendingCount() {
  return load().length;
}

export function subscribe(cb) {
  listeners.add(cb);
  cb(pendingCount());
  return () => listeners.delete(cb);
}

async function attemptOne(item) {
  const headers = { 'Content-Type': 'application/json' };
  if (item.token) headers.Authorization = `Bearer ${item.token}`;
  const res = await fetch(item.url, {
    method: item.method || 'POST',
    headers,
    body: item.body ? JSON.stringify(item.body) : undefined,
  });
  if (!res.ok) {
    // 4xx (other than 429) → don't retry; drop
    if (res.status >= 400 && res.status < 500 && res.status !== 429) {
      const err = new Error(`HTTP ${res.status}`);
      err.status = res.status;
      err.permanent = true;
      throw err;
    }
    throw new Error(`HTTP ${res.status}`);
  }
  // Try to parse JSON; not fatal if empty
  try { return await res.json(); } catch { return null; }
}

export async function drainQueue() {
  if (draining) return;
  if (!navigator.onLine) return;
  draining = true;
  try {
    let q = load();
    while (q.length) {
      const head = q[0];
      try {
        await attemptOne(head);
        q = load(); q.shift(); save(q); notify();
      } catch (e) {
        if (e.permanent) {
          // Drop poisoned items so they don't block the queue
          q = load(); q.shift(); save(q); notify();
          continue;
        }
        // Transient — stop and try again later
        break;
      }
    }
  } finally {
    draining = false;
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', drainQueue);
  // Periodic drain in case the `online` event missed (mobile flakiness)
  setInterval(drainQueue, 30000);
}

/**
 * Submit a request, falling back to the queue if the network is down or
 * the call fails transiently.
 *
 * Returns either the parsed response (success) or { queued: true } when
 * the request was persisted for later replay.
 */
export async function queueSubmit({ url, body, method = 'POST', token, kind }) {
  if (navigator.onLine) {
    try {
      return await attemptOne({ url, body, method, token, kind });
    } catch (e) {
      if (e.permanent) throw e;
      // Fall through to queue
    }
  }
  const q = load();
  q.push({ url, body, method, token, kind, ts: Date.now() });
  save(q);
  notify();
  return { queued: true };
}
