/**
 * World Café mode — projected during the 1:30 PM block.
 *
 * Shows the five WG stations + the rotation rhythm so the room can
 * quickly see where to go. Audience phones get the WorldCafeCard
 * station picker (via ConferenceDayPage focused mode). Submitted notes
 * still flow into breakout_notes against the chosen WG session and can
 * be viewed in the Round-2 report afterwards — no need to grid them on
 * the projector during the rotations themselves; the room is up and
 * moving, not reading the screen.
 */

import { Globe, Clock, ArrowRight } from 'lucide-react';
import { PILLAR_COLORS, WG_LABELS } from '@/components/stage/panelConfig';

const STATIONS = [1, 2, 3, 4, 5];

export function WorldCafeStage() {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#0A1628] px-12 py-8 text-white">
      <div className="mb-6 flex shrink-0 items-end justify-between gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-300/80">
            1:30 PM · breakout
          </p>
          <h1 className="mt-1 flex items-center gap-3 text-4xl font-bold tracking-tight sm:text-5xl">
            <Globe className="h-8 w-8 text-emerald-300" />
            World Café
          </h1>
          <p className="mt-2 max-w-3xl text-lg text-white/65">
            Three 20-minute rotations. Visit at least two stations outside your home WG.
            Submit your table's notes from your phone before you rotate.
          </p>
        </div>
        <div className="shrink-0 rounded-2xl border border-emerald-400/30 bg-emerald-500/[0.06] px-4 py-3 text-right">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300/80">
            Rotation
          </p>
          <p className="mt-0.5 inline-flex items-center gap-1.5 text-lg font-bold text-emerald-200">
            <Clock className="h-4 w-4" />
            20 min
          </p>
          <p className="text-[11px] text-emerald-300/60">× 3 rounds</p>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {STATIONS.map((n) => {
          const accent = PILLAR_COLORS[n] || '#48CAE4';
          const name = WG_LABELS[n] || `Working Group ${n}`;
          return (
            <div
              key={n}
              className="flex flex-col rounded-2xl border p-5"
              style={{ borderColor: `${accent}40`, backgroundColor: `${accent}10` }}
            >
              <div
                className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl text-xl font-bold"
                style={{ backgroundColor: `${accent}25`, color: accent }}
              >
                {n}
              </div>
              <p
                className="text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: accent }}
              >
                Station {n}
              </p>
              <p className="mt-1 text-lg font-bold leading-tight text-white/95">
                {name}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-5 shrink-0 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-center text-sm text-white/55">
        <ArrowRight className="mr-2 inline h-4 w-4 text-emerald-300" />
        Audience: tap your current station on the World Café card on your phone, then submit notes.
      </div>
    </div>
  );
}

export default WorldCafeStage;
