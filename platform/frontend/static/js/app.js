/**
 * SAEM AI Consensus Platform — Shared JavaScript
 */

// --- API Helper ---

async function api(url, options = {}) {
    const { method = 'GET', body = null, params = {} } = options;

    // Build URL with query params
    const urlObj = new URL(url, window.location.origin);
    for (const [k, v] of Object.entries(params)) {
        if (v !== null && v !== undefined) urlObj.searchParams.set(k, v);
    }

    const fetchOptions = {
        method,
        headers: {},
    };

    if (body !== null) {
        fetchOptions.headers['Content-Type'] = 'application/json';
        fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(urlObj.toString(), fetchOptions);
    if (!response.ok) {
        const err = await response.text();
        console.error(`API ${method} ${url}:`, response.status, err);
        throw new Error(err);
    }
    return response.json();
}


// --- Token Management (localStorage) ---

function getToken(wgNumber) {
    return localStorage.getItem(`saem_token_wg${wgNumber}`);
}

function setToken(wgNumber, token) {
    localStorage.setItem(`saem_token_wg${wgNumber}`, token);
}


// --- Toast Notifications ---

function showToast(message, duration = 3000) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), duration);
}
