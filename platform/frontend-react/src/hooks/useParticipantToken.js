import { useState, useEffect } from 'react';
import { api, getToken, setToken } from '@/lib/api';

export function useParticipantToken(wgNumber) {
  const [token, setTokenState] = useState(getToken(wgNumber));
  const [loading, setLoading] = useState(!token);

  useEffect(() => {
    if (token) return;
    api('/api/surveys/token', { method: 'POST', params: { wg_number: wgNumber } })
      .then(data => {
        setToken(wgNumber, data.token);
        setTokenState(data.token);
      })
      .finally(() => setLoading(false));
  }, [wgNumber, token]);

  return { token, loading };
}
