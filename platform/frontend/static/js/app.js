/**
 * SAEM AI Consensus Platform — Shared JavaScript
 * Handles API calls, auth, autosave, XSS prevention, and notifications.
 */

// ---------------------------------------------------------------------------
// HTML Escaping — prevent XSS when rendering user content
// ---------------------------------------------------------------------------

function esc(str) {
    if (str == null) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
}

// ---------------------------------------------------------------------------
// API Helper — sends token in Authorization header, structured error handling
// ---------------------------------------------------------------------------

async function api(url, options = {}) {
    const { method = 'GET', body = null, params = {}, token = null, silent = false } = options;

    const urlObj = new URL(url, window.location.origin);
    for (const [k, v] of Object.entries(params)) {
        if (v !== null && v !== undefined) urlObj.searchParams.set(k, v);
    }

    const headers = {};

    // Attach participant or admin token
    const authToken = token || getAdminToken();
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

    if (body !== null) {
        headers['Content-Type'] = 'application/json';
    }

    let response;
    try {
        response = await fetch(urlObj.toString(), {
            method,
            headers,
            body: body !== null ? JSON.stringify(body) : undefined,
        });
    } catch (e) {
        if (!silent) showToast('Network error — check your connection.');
        throw e;
    }

    if (!response.ok) {
        let detail = `Error ${response.status}`;
        try {
            const errJson = await response.json();
            detail = errJson.detail || detail;
        } catch {
            // Response wasn't JSON — use status text
            detail = response.statusText || detail;
        }
        if (!silent) showToast(detail);
        const err = new Error(detail);
        err.status = response.status;
        throw err;
    }

    // Handle empty responses (204 No Content)
    const text = await response.text();
    if (!text) return null;
    return JSON.parse(text);
}


// ---------------------------------------------------------------------------
// Token Management — participant tokens in localStorage
// ---------------------------------------------------------------------------

function getToken(wgNumber) {
    return localStorage.getItem(`saem_token_wg${wgNumber}`);
}

function setToken(wgNumber, token) {
    localStorage.setItem(`saem_token_wg${wgNumber}`, token);
}

// Admin JWT
function getAdminToken() {
    return localStorage.getItem('saem_admin_token');
}

function setAdminToken(token) {
    localStorage.setItem('saem_admin_token', token);
}

function clearAdminToken() {
    localStorage.removeItem('saem_admin_token');
}


// ---------------------------------------------------------------------------
// Autosave — save/restore form state to localStorage
// ---------------------------------------------------------------------------

const _autosavePrefix = 'saem_autosave_';

function autosaveKey(pageId) {
    return _autosavePrefix + pageId;
}

function autosave(pageId, data) {
    try {
        localStorage.setItem(autosaveKey(pageId), JSON.stringify({
            data,
            savedAt: Date.now(),
        }));
    } catch { /* localStorage full — ignore */ }
}

function autosaveRestore(pageId, maxAgeMs = 24 * 60 * 60 * 1000) {
    try {
        const raw = localStorage.getItem(autosaveKey(pageId));
        if (!raw) return null;
        const { data, savedAt } = JSON.parse(raw);
        if (Date.now() - savedAt > maxAgeMs) {
            localStorage.removeItem(autosaveKey(pageId));
            return null;
        }
        return data;
    } catch {
        return null;
    }
}

function autosaveClear(pageId) {
    localStorage.removeItem(autosaveKey(pageId));
}


// ---------------------------------------------------------------------------
// Unsaved changes warning
// ---------------------------------------------------------------------------

let _hasUnsaved = false;

function markUnsaved() {
    _hasUnsaved = true;
}

function clearUnsaved() {
    _hasUnsaved = false;
}

window.addEventListener('beforeunload', (e) => {
    if (_hasUnsaved) {
        e.preventDefault();
        e.returnValue = '';
    }
});


// ---------------------------------------------------------------------------
// Toast Notifications — with ARIA live region support
// ---------------------------------------------------------------------------

function showToast(message, duration = 3500) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'polite');
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), duration);
}


// ---------------------------------------------------------------------------
// SSE — Server-Sent Events for live conference updates
// ---------------------------------------------------------------------------

function connectSSE(sessionId, onEvent) {
    const es = new EventSource(`/api/events/${sessionId}`);
    es.addEventListener('vote_update', (e) => {
        try { onEvent(JSON.parse(e.data)); } catch {}
    });
    es.addEventListener('connected', () => {
        console.log(`SSE connected to session ${sessionId}`);
    });
    es.onerror = () => {
        console.warn('SSE connection error — will auto-reconnect');
    };
    return es;
}


// ---------------------------------------------------------------------------
// Admin Auth UI helpers
// ---------------------------------------------------------------------------

async function adminLogin(email, password) {
    const result = await api('/api/admin/login', {
        method: 'POST',
        body: { email, password },
    });
    if (result.access_token) {
        setAdminToken(result.access_token);
    }
    return result;
}

function isAdminLoggedIn() {
    return !!getAdminToken();
}

async function requireAdminLogin() {
    if (isAdminLoggedIn()) {
        // Verify token is still valid
        try {
            await api('/api/admin/me', { silent: true });
            return true;
        } catch {
            clearAdminToken();
        }
    }
    // Show login prompt
    const password = prompt('Admin password:');
    if (!password) return false;
    try {
        await adminLogin('admin', password);
        return true;
    } catch {
        showToast('Invalid admin credentials.');
        return false;
    }
}
