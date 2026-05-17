import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      // Wait a tick for the destination route's lazy chunk to mount the
      // target element, then scroll it into view.
      const id = hash.startsWith('#') ? hash.slice(1) : hash;
      requestAnimationFrame(() => {
        const tryScroll = (attempt = 0) => {
          const el = document.getElementById(id);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
          }
          if (attempt < 20) setTimeout(() => tryScroll(attempt + 1), 100);
          else window.scrollTo(0, 0);
        };
        tryScroll();
      });
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname, hash]);
  return null;
}
