import { useMemo } from 'react';
import { getAnyParticipantToken, getToken } from '@/lib/api';

export function useParticipantToken(wgNumber) {
  const token = useMemo(
    () => (Number(wgNumber) === 0 ? getAnyParticipantToken() : getToken(wgNumber)),
    [wgNumber]
  );
  return { token, loading: false };
}
