/**
 * Adjourn — final 5:00 PM slot. Single centered "Thank you" hero with
 * sponsor / organizer recognition. No QR, no credit roll, no chair
 * controls — the room is filing out and the projector just needs to
 * be a dignified close.
 */

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

const SPONSORS = [
  'SAEM — Society for Academic Emergency Medicine',
  'CORD — Council of Residency Directors in Emergency Medicine',
  'University of Virginia School of Medicine',
];

export function AdjournStage() {
  return (
    <div className="relative flex h-full flex-col items-center justify-center overflow-hidden bg-[#0A1628] text-white">
      {/* Background flourishes — mirror the opening welcome hero */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[800px] w-[1400px] -translate-x-1/2 rounded-full bg-gradient-to-b from-amber-500/[0.14] to-transparent blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 right-0 h-[600px] w-[900px] rounded-full bg-gradient-to-t from-cyan-500/[0.10] to-transparent blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="relative flex w-full max-w-5xl flex-col items-center px-12 text-center"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0C2340] to-amber-500">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-300/90">
            SAEM 2026 · AI Consensus Conference
          </p>
        </div>

        <h1 className="mt-10 text-7xl font-extrabold leading-[1.02] tracking-tight sm:text-8xl xl:text-9xl">
          <span className="block">Thank</span>
          <span className="block bg-gradient-to-r from-amber-200 via-amber-300 to-[#48CAE4] bg-clip-text text-transparent">
            you.
          </span>
        </h1>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-16 w-full"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/45">
            With gratitude to our organizers &amp; sponsors
          </p>
          <ul className="mt-5 flex flex-col items-center gap-2">
            {SPONSORS.map((s) => (
              <li key={s} className="text-xl font-semibold text-white/80 sm:text-2xl">
                {s}
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.9 }}
          className="mt-16 text-sm text-white/40"
        >
          Atlanta Marriott Marquis · Thursday, May 21, 2026 · safe travels home
        </motion.p>
      </motion.div>
    </div>
  );
}

export default AdjournStage;
