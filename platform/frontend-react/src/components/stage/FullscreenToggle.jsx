/**
 * Floating fullscreen toggle for the projector view.
 *
 * One-click entry into the browser's Fullscreen API so the projector
 * PC fills the whole screen with the slide — no tab bar, no URL bar,
 * no chrome. ESC (or clicking the button again) exits.
 *
 * Auto-hides after a few seconds of mouse inactivity once fullscreen
 * is engaged, so the button isn't visible in the projected image.
 * Any mouse movement brings it back briefly.
 */

import { useCallback, useEffect, useState } from 'react';
import { Maximize, Minimize } from 'lucide-react';

const IDLE_HIDE_MS = 3000;

export function FullscreenToggle() {
  const [isFs, setIsFs] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const onChange = () => setIsFs(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // While fullscreen, hide the button after mouse stops moving so it
  // doesn't show in the projected image. Move mouse → button reappears.
  useEffect(() => {
    if (!isFs) { setVisible(true); return; }
    let timer = setTimeout(() => setVisible(false), IDLE_HIDE_MS);
    const onMove = () => {
      setVisible(true);
      clearTimeout(timer);
      timer = setTimeout(() => setVisible(false), IDLE_HIDE_MS);
    };
    window.addEventListener('mousemove', onMove);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousemove', onMove);
    };
  }, [isFs]);

  const toggle = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={toggle}
      title={isFs ? 'Exit fullscreen (Esc)' : 'Enter fullscreen — projector mode'}
      className="fixed right-3 top-3 z-50 inline-flex items-center gap-1.5 rounded-lg border border-white/[0.1] bg-[#0A1628]/80 px-2.5 py-1.5 text-xs font-medium text-white/70 shadow-lg backdrop-blur hover:border-white/[0.2] hover:bg-[#0E1E35] hover:text-white"
    >
      {isFs ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
      <span className="hidden sm:inline">{isFs ? 'Exit fullscreen' : 'Fullscreen'}</span>
    </button>
  );
}
