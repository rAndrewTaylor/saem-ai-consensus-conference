const BASE = '';  // Same origin in dev (Vite proxy), production serves from FastAPI

class ApiError extends Error {
  constructor(status, detail) {
    super(detail);
    this.status = status;
  }
}

export async function api(url, { method = 'GET', body, token, params } = {}) {
  const urlObj = new URL(url, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v != null) urlObj.searchParams.set(k, v);
    });
  }

  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else {
    // Auth fallback chain: admin first (covers admin endpoints), then any
    // participant token in localStorage (covers endpoints that accept
    // either admin or participant auth, e.g. the Round 1 report data,
    // conference day-state, /me/contributions). Endpoints that require
    // admin specifically still 401 a participant token, so this only
    // adds capability where the backend allows it.
    const adminToken = localStorage.getItem('saem_admin_token');
    if (adminToken) {
      headers['Authorization'] = `Bearer ${adminToken}`;
    } else {
      // Fall back to the most recently used participant token
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (key && key.startsWith('saem_token_wg')) {
          const ptoken = localStorage.getItem(key);
          if (ptoken) {
            headers['Authorization'] = `Bearer ${ptoken}`;
            break;
          }
        }
      }
    }
  }

  if (body) headers['Content-Type'] = 'application/json';

  const res = await fetch(urlObj.toString(), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let detail = `Error ${res.status}`;
    try {
      const json = await res.json();
      detail = json.detail || detail;
    } catch {}
    throw new ApiError(res.status, detail);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// Authenticated file download — fetches with the admin Bearer token,
// then triggers a browser save. <a href download> doesn't send custom
// headers, so it can't be used for endpoints that require auth.
export async function downloadFile(url, fallbackFilename = 'download') {
  const adminToken = localStorage.getItem('saem_admin_token');
  const headers = {};
  if (adminToken) headers['Authorization'] = `Bearer ${adminToken}`;

  const res = await fetch(url, { headers });
  if (!res.ok) {
    let detail = `Download failed (${res.status})`;
    try {
      const json = await res.json();
      detail = json.detail || detail;
    } catch {}
    throw new ApiError(res.status, detail);
  }

  // Prefer the server's filename if it sent Content-Disposition
  let filename = fallbackFilename;
  const cd = res.headers.get('Content-Disposition') || '';
  const match = cd.match(/filename\*?=(?:UTF-8'')?["']?([^;"'\n]+)["']?/i);
  if (match) filename = decodeURIComponent(match[1]);

  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Allow the browser to start the download before revoking
  setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
}

// Token management
export const getToken = (wg) => localStorage.getItem(`saem_token_wg${wg}`);
export const setToken = (wg, token) => {
  localStorage.setItem(`saem_token_wg${wg}`, token);
  localStorage.setItem('saem_active_wg', String(wg));
};
export const getActiveWg = () => {
  const v = localStorage.getItem('saem_active_wg');
  return v ? parseInt(v, 10) : null;
};
export const getAnyParticipantToken = () => {
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key && key.startsWith('saem_token_wg')) {
      const token = localStorage.getItem(key);
      if (token) return token;
    }
  }
  return null;
};
export const getAdminToken = () => localStorage.getItem('saem_admin_token');
export const setAdminToken = (token) => localStorage.setItem('saem_admin_token', token);
export const clearAdminToken = () => localStorage.removeItem('saem_admin_token');

// Co-lead token (invite-link-based, same pattern as participant tokens)
export const getLeadToken = () => localStorage.getItem('saem_lead_token');
export const setLeadToken = (token) => localStorage.setItem('saem_lead_token', token);
export const clearLeadToken = () => localStorage.removeItem('saem_lead_token');
