/**
 * Stage view shown when the chair clicks a break segment from
 * /command's timeline. Two variants:
 *
 *  - OPENING WELCOME (next segment label contains "welcome"): hero
 *    with conference branding + large QR code so arriving attendees
 *    can join the platform during the 7:30 AM coffee window.
 *  - STANDARD BREAK: calm "we're on break · back at X" countdown
 *    used between segments later in the day.
 *
 * The next-segment label is passed via `panelTab` (encoded by
 * CommandPage.pickSegment as "10:15 AM · Panel 3 — Education").
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Coffee, Clock, Sparkles, MapPin } from 'lucide-react';
import QRCode from 'qrcode';

function parseNextTimeAtlanta(label) {
  if (!label) return null;
  // Pull the first "H:MM AM/PM" run out of the label
  const m = label.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  const ap = m[3].toUpperCase();
  if (ap === 'PM' && h !== 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  // EDT in May = UTC-4. The conference is Atlanta, fixed date.
  const utcH = h + 4;
  // Anchor on today's date in UTC — close enough for a same-day countdown.
  const now = new Date();
  const d = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),
    utcH, mm, 0,
  ));
  // If parsed time is more than 12h behind "now", roll forward a day.
  if (d.getTime() - now.getTime() < -12 * 3600 * 1000) {
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return d;
}

export function BreakView({ panelTab, compact = false }) {
  // Pulled out so the next-time + countdown stays in sync without
  // re-parsing on every tick.
  const nextLabel = panelTab || '';
  const nextDate = parseNextTimeAtlanta(nextLabel);
  const isOpening = /welcome/i.test(nextLabel);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  let countdown = null;
  if (nextDate) {
    const remaining = nextDate.getTime() - now;
    if (remaining > 0) {
      const total = Math.floor(remaining / 1000);
      const mins = Math.floor(total / 60);
      const secs = total % 60;
      countdown = `${mins}:${String(secs).padStart(2, '0')}`;
    } else {
      countdown = 'now';
    }
  }

  // Opening welcome hero — used for the 7:30 AM coffee/networking slot
  // when the next agenda item is the Welcome session. Mirrors the
  // /welcome landing hero with a very large QR for arriving attendees.
  // OpeningHero anchors its own countdown to the fixed conference start
  // (May 21, 2026 08:00 ET) so it reads correctly during day-before
  // previews — the generic break countdown collapses to "now" if the
  // parsed time is already past today.
  if (isOpening && !compact) {
    return <OpeningHero nextLabel={nextLabel} />;
  }

  // Compact = embedded in /day (mobile/phone). Full = projector.
  const compactCls = compact ? 'py-8' : 'py-16 sm:py-24';

  return (
    <div className={`flex h-full min-h-0 flex-col items-center justify-center text-center ${compactCls}`}>
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="flex flex-col items-center"
      >
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/15 sm:h-24 sm:w-24">
          <Coffee className="h-10 w-10 text-amber-300 sm:h-12 sm:w-12" />
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-amber-300/90">
          We're on a break
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-5xl">
          Stretch, refill, say hi.
        </h1>
        {nextLabel && (
          <div className="mt-8 flex flex-col items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.04] px-4 py-1.5">
              <Clock className="h-3.5 w-3.5 text-white/60" />
              <span className="text-xs font-semibold uppercase tracking-wider text-white/70">
                Back at
              </span>
            </div>
            <p className="max-w-3xl text-2xl font-bold text-white sm:text-4xl">
              {nextLabel}
            </p>
            {countdown && (
              <div className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-amber-400/30 bg-amber-500/[0.06] px-6 py-3">
                <Clock className="h-4 w-4 text-amber-300" />
                <span className="font-mono text-3xl font-bold tabular-nums text-amber-200 sm:text-4xl">
                  {countdown}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-amber-300/70">
                  to resume
                </span>
              </div>
            )}
          </div>
        )}
        {!nextLabel && (
          <p className="mt-6 text-base text-white/55 sm:text-lg">
            Back shortly — the chair will reconvene.
          </p>
        )}
      </motion.div>
    </div>
  );
}

// Opening welcome hero — large QR + branding for the pre-conference
// arrival period. Designed to be the FIRST thing attendees see when
// they walk into the ballroom for the 7:30 AM coffee window.
function OpeningHero({ nextLabel }) {
  const joinUrl = `${window.location.origin}/welcome?access=ai26`;
  const [qrDataUrl, setQrDataUrl] = useState(null);

  // Conference start is a fixed event: Thursday May 21, 2026 at 08:00 ET
  // (UTC-4 during May). Hardcoding so the day-before preview reads
  // correctly instead of resolving "8:00 AM" to today (already past) and
  // collapsing the countdown to "now".
  const CONFERENCE_START_MS = Date.UTC(2026, 4, 21, 12, 0, 0);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  let heroCountdown = null;
  const remaining = CONFERENCE_START_MS - now;
  if (remaining > 0) {
    const total = Math.floor(remaining / 1000);
    const hours = Math.floor(total / 3600);
    const mins = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    heroCountdown = hours > 0
      ? `${hours}h ${String(mins).padStart(2, '0')}m`
      : `${mins}:${String(secs).padStart(2, '0')}`;
  } else {
    heroCountdown = 'now';
  }

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(joinUrl, {
      width: 720,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#0A1628', light: '#FFFFFF' },
    })
      .then((dataUrl) => { if (!cancelled) setQrDataUrl(dataUrl); })
      .catch(() => { /* keep going without QR */ });
    return () => { cancelled = true; };
  }, [joinUrl]);

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-[#0A1628] text-white">
      {/* Background flourish — matches /welcome hero's radial glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[800px] w-[1400px] -translate-x-1/2 rounded-full bg-gradient-to-b from-cyan-500/15 to-transparent blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 right-0 h-[600px] w-[900px] rounded-full bg-gradient-to-t from-purple-500/[0.08] to-transparent blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative flex h-full flex-1 items-center justify-center px-12 py-10"
      >
        <div className="grid w-full max-w-7xl items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
          {/* Left — branding + intro */}
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0C2340] to-[#00B4D8]">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300/90">
                SAEM 2026
              </p>
            </div>

            <h1 className="mt-6 text-6xl font-extrabold tracking-tight leading-[1.02] sm:text-7xl xl:text-8xl">
              Welcome to the{' '}
              <span className="block bg-gradient-to-r from-[#48CAE4] via-[#00B4D8] to-[#7c3aed] bg-clip-text text-transparent">
                AI Consensus
              </span>
              Conference
            </h1>

            <div className="mt-8 space-y-3 text-xl text-white/65 sm:text-2xl">
              <p className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-cyan-300" />
                Thursday, May 21, 2026 · doors open 7:30 AM ET
              </p>
              <p className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-cyan-300" />
                Atlanta Marriott Marquis
              </p>
            </div>

            {heroCountdown && (
              <div className="mt-8 inline-flex items-center gap-3 rounded-2xl border border-amber-400/30 bg-amber-500/[0.06] px-6 py-4">
                <Clock className="h-5 w-5 text-amber-300" />
                <span className="text-sm font-semibold uppercase tracking-wider text-amber-300/80">
                  Conference starts in
                </span>
                <span className="font-mono text-4xl font-bold tabular-nums text-amber-200">
                  {heroCountdown}
                </span>
              </div>
            )}
          </div>

          {/* Right — large QR + scan instruction */}
          <div className="flex flex-col items-center justify-center">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300/90">
              Scan to join
            </p>
            <div className="rounded-3xl bg-white p-6 shadow-2xl shadow-cyan-500/10">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Scan to join SAEM 2026 AI Consensus"
                  className="h-[420px] w-[420px] sm:h-[480px] sm:w-[480px]"
                />
              ) : (
                <div className="flex h-[420px] w-[420px] items-center justify-center text-slate-400 sm:h-[480px] sm:w-[480px]">
                  Generating QR…
                </div>
              )}
            </div>
            <div className="mt-5 text-center">
              <p className="font-mono text-base text-white/65 sm:text-lg">
                saem-ai-consensus-conference-production.up.railway.app
              </p>
              <p className="mt-2 text-sm text-white/45 sm:text-base">
                or use conference code{' '}
                <span className="font-mono font-bold text-amber-200">ai26</span>
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Coffee/networking strip at the bottom */}
      <div className="relative shrink-0 border-t border-white/[0.06] bg-[#0E1E35] px-12 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Coffee className="h-5 w-5 text-amber-300" />
            <span className="text-base font-semibold text-white/85 sm:text-lg">
              Coffee &amp; networking · grab a seat — we begin at 8:00 AM
            </span>
          </div>
          {nextLabel && (
            <span className="text-sm text-white/45 sm:text-base">
              Up next: <span className="font-semibold text-white/75">{nextLabel}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default BreakView;
