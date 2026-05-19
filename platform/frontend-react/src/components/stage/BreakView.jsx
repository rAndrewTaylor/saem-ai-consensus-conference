/**
 * Stage view shown when the chair clicks a break segment from
 * /command's timeline. Tells the room "we're on break" and, if the
 * chair selected the break from the timeline (which carries the next
 * segment time), shows when to come back. Stays calm and uncluttered
 * — this is the "go get coffee" screen, not a data view.
 *
 * The next-segment label is passed via `panelTab` (encoded by
 * CommandPage.pickSegment as "10:15 AM · Panel 3 — Education").
 * Falls back to a generic "Back shortly" line when missing.
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Coffee, Clock } from 'lucide-react';

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

export default BreakView;
