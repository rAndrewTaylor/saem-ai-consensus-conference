import { useState, useEffect, useCallback } from 'react';
import { api, getAdminToken, setAdminToken, clearAdminToken } from '@/lib/api';

export function useAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAdminToken();
    if (!token) { setLoading(false); return; }
    api('/api/admin/me').then(() => setIsAdmin(true)).catch(() => clearAdminToken()).finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (password) => {
    const data = await api('/api/admin/login', { method: 'POST', body: { email: 'admin', password } });
    setAdminToken(data.access_token);
    setIsAdmin(true);
  }, []);

  const logout = useCallback(() => {
    clearAdminToken();
    setIsAdmin(false);
  }, []);

  return { isAdmin, loading, login, logout };
}
