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
  if (token) headers['Authorization'] = `Bearer ${token}`;

  // Also check localStorage for admin token
  const adminToken = localStorage.getItem('saem_admin_token');
  if (!token && adminToken) headers['Authorization'] = `Bearer ${adminToken}`;

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

// Token management
export const getToken = (wg) => localStorage.getItem(`saem_token_wg${wg}`);
export const setToken = (wg, token) => localStorage.setItem(`saem_token_wg${wg}`, token);
export const getAdminToken = () => localStorage.getItem('saem_admin_token');
export const setAdminToken = (token) => localStorage.setItem('saem_admin_token', token);
export const clearAdminToken = () => localStorage.removeItem('saem_admin_token');

// Co-lead token (invite-link-based, same pattern as participant tokens)
export const getLeadToken = () => localStorage.getItem('saem_lead_token');
export const setLeadToken = (token) => localStorage.setItem('saem_lead_token', token);
export const clearLeadToken = () => localStorage.removeItem('saem_lead_token');
