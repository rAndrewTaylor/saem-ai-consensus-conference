/**
 * Persistent "Signed in as Jane · WG3" chip for conference day.
 *
 * Shown on /day and /vote so participants always see their identity
 * and can sign out without hunting through menus. Also houses the
 * follow-the-stage toggle (auto-navigate to active vote when one
 * opens) — same row, since both relate to the "who am I and how do I
 * stay oriented" question.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, LogOut, Navigation } from 'lucide-react';
import { api, getAnyParticipantToken } from '@/lib/api';

const FOLLOW_KEY = 'saem_follow_stage';

export function getFollowStage() {
  // Default: true. Anything but the literal string "0" or "false" counts as on.
  const v = localStorage.getItem(FOLLOW_KEY);
  if (v === '0' || v === 'false') return false;
  return true;
}

export function setFollowStage(on) {
  localStorage.setItem(FOLLOW_KEY, on ? '1' : '0');
}

export function SignedInChip({ compact = false }) {
  const [me, setMe] = useState(null);
  const [follow, setFollow] = useState(() => getFollowStage());

  useEffect(() => {
    const token = getAnyParticipantToken();
    if (!token) { setMe({ name: null }); return; }
    // Send the token via Authorization header (not querystring) so it
    // doesn't end up in Railway/Cloudflare access logs or referer headers.
    api('/api/participants/me', { token })
      .then(setMe)
      .catch(() => setMe(null));
  }, []);

  const toggleFollow = () => {
    const next = !follow;
    setFollow(next);
    setFollowStage(next);
  };

  // Not signed in — show a quiet sign-in link instead
  if (!me?.name) {
    return (
      <Link
        to="/join"
        className="inline-flex items-center gap-1 rounded-full border border-amber-300/30 bg-amber-400/[0.08] px-2.5 py-1 text-[11px] font-medium text-amber-200 hover:bg-amber-400/15"
      >
        Sign in
      </Link>
    );
  }

  const wgLabel = me.wg_number ? `WG${me.wg_number}` : '';
  const wgName = me.wg_short_name ? ` · ${me.wg_short_name}` : '';

  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] py-1 pl-2 pr-1 text-[11px] text-white/75">
      <CheckCircle2 className="h-3 w-3 text-emerald-400" />
      <span className="font-medium text-white">{me.name}</span>
      {!compact && wgLabel && (
        <span className="text-white/45">{wgLabel}{wgName}</span>
      )}
      <button
        type="button"
        onClick={toggleFollow}
        title={follow ? 'Follow stage: ON — your phone jumps to active votes' : 'Follow stage: OFF — stay where you are'}
        className={`ml-1 inline-flex h-5 items-center gap-1 rounded-full px-2 text-[10px] font-medium ${
          follow ? 'bg-cyan-400/15 text-cyan-300' : 'bg-white/[0.04] text-white/45'
        }`}
      >
        <Navigation className="h-3 w-3" />
        Follow {follow ? 'on' : 'off'}
      </button>
      <button
        type="button"
        onClick={() => {
          if (!window.confirm('Sign out? Your votes are saved; you can sign back in any time with your invite link.')) return;
          // Wipe per-WG tokens + the active marker so the next visit prompts re-claim
          for (let i = localStorage.length - 1; i >= 0; i -= 1) {
            const k = localStorage.key(i);
            if (k && (k.startsWith('saem_token_wg') || k === 'saem_active_wg')) {
              localStorage.removeItem(k);
            }
          }
          window.location.href = '/join';
        }}
        title="Sign out"
        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-white/40 hover:bg-white/[0.06] hover:text-white/70"
      >
        <LogOut className="h-3 w-3" />
      </button>
    </div>
  );
}
