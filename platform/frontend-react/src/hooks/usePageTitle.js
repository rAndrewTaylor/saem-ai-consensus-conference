import { useEffect } from 'react';

export function usePageTitle(title) {
  useEffect(() => {
    const prev = document.title;
    document.title = title ? `${title} | SAEM AI Consensus` : 'SAEM 2026 AI Consensus Conference';
    return () => { document.title = prev; };
  }, [title]);
}
