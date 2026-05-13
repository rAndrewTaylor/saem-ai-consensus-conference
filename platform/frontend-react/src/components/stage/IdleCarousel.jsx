/**
 * Idle / landing carousel — what's on the projector before the
 * conference starts and between sessions.
 *
 * Auto-rotating panels:
 *   1. Conference banner + QR code to /day
 *   2. Top R2 questions per WG (one slide per WG)
 *   3. Cross-WG stats (participants, total responses, R1->R2 progression)
 *   4. Pairwise leaderboards
 *
 * Designed for projector viewing — big typography, high contrast.
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';

const ROTATE_MS = 12_000;

const WG_NAMES = {
  1: 'Clinical Practice & Operations',
  2: 'Infrastructure & Data Ecosystems',
  3: 'Education, Training & Competency',
  4: 'Human-AI Interaction',
  5: 'Ethical, Legal & Societal',
};

const PILLAR_COLORS = {
  1: '#00B4D8',
  2: '#22d3ee',
  3: '#8b5cf6',
  4: '#10b981',
  5: '#f59e0b',
};

export function IdleCarousel({ bus }) {
  const [wgs, setWgs] = useState([]);
  const [topQuestions, setTopQuestions] = useState({}); // wg → [{id, text, score}]
  const [pairwise, setPairwise] = useState({}); // wg → rankings
  const [stats, setStats] = useState(null);
  const [slideIdx, setSlideIdx] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const wgList = await api('/api/surveys/working-groups');
        if (cancelled) return;
        setWgs(wgList || []);
        // Fetch top R2 questions and pairwise rankings per WG in parallel
        const [pairwiseResults] = await Promise.all([
          Promise.all(
            (wgList || []).map((wg) =>
              api(`/api/pairwise/rankings/${wg.wg_number}?round=round_2`).catch(() => null)
            )
          ),
        ]);
        if (cancelled) return;
        const pw = {};
        wgList.forEach((wg, i) => {
          if (pairwiseResults[i]) pw[wg.wg_number] = pairwiseResults[i].rankings || [];
        });
        setPairwise(pw);

        // Light stats from /api/admin/dashboard would need admin; instead derive
        // from working-groups list which exposes total_questions per WG.
        const totalQ = wgList.reduce((s, w) => s + (w.total_questions || 0), 0);
        setStats({ total_questions: totalQ, wgs: wgList.length });
      } catch {
        /* swallow — keep showing whatever we have */
      }
    })();
    return () => { cancelled = true; };
  }, [bus]);

  // Build slide list dynamically
  const slides = [
    { kind: 'banner' },
    ...wgs.map((wg) => ({ kind: 'wg_top', wg })),
    { kind: 'stats' },
  ];

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(() => {
      setSlideIdx((i) => (i + 1) % slides.length);
    }, ROTATE_MS);
    return () => clearInterval(t);
  }, [slides.length]);

  const slide = slides[slideIdx] || slides[0];

  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={slideIdx}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -24 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="absolute inset-0 flex items-center justify-center px-12 py-16"
        >
          {slide.kind === 'banner' && <BannerSlide />}
          {slide.kind === 'wg_top' && (
            <WgTopSlide
              wg={slide.wg}
              pairwise={pairwise[slide.wg.wg_number] || []}
            />
          )}
          {slide.kind === 'stats' && <StatsSlide stats={stats} wgs={wgs} />}
        </motion.div>
      </AnimatePresence>

      {/* Progress dots */}
      <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 gap-2">
        {slides.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              i === slideIdx ? 'w-10 bg-white/80' : 'w-1.5 bg-white/20'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function BannerSlide() {
  return (
    <div className="text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#48CAE4]">
        SAEM 2026
      </p>
      <h1 className="mt-6 text-7xl font-bold tracking-tight">
        AI Consensus Conference
      </h1>
      <p className="mt-6 text-2xl text-white/60">
        Defining the research agenda for AI in Emergency Medicine
      </p>
      <div className="mt-12 inline-flex items-center gap-4 rounded-2xl border border-white/[0.1] bg-white/[0.04] px-8 py-5">
        <div className="text-left">
          <p className="text-xs uppercase tracking-wider text-white/40">Join the conversation</p>
          <p className="mt-1 font-mono text-lg text-white">
            saem-ai-consensus-conference-production.up.railway.app/day
          </p>
        </div>
      </div>
      <p className="mt-8 text-sm text-white/40">May 21, 2026 · Atlanta Marriott Marquis</p>
    </div>
  );
}

function WgTopSlide({ wg, pairwise }) {
  const top = pairwise.slice(0, 5);
  const accent = PILLAR_COLORS[wg.wg_number] || '#00B4D8';

  return (
    <div className="w-full max-w-6xl">
      <div className="mb-8 flex items-center gap-4">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl font-bold"
          style={{ backgroundColor: `${accent}25`, color: accent }}
        >
          {wg.wg_number}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
            Working Group {wg.wg_number}
          </p>
          <h2 className="mt-1 text-4xl font-bold">{WG_NAMES[wg.wg_number] || wg.name}</h2>
        </div>
      </div>
      <p className="mb-5 text-sm font-medium uppercase tracking-wider text-white/40">
        Top Round 2 pairwise rankings
      </p>
      {top.length === 0 ? (
        <p className="text-base text-white/30">No pairwise data yet for Round 2.</p>
      ) : (
        <ol className="space-y-3">
          {top.map((q, i) => (
            <li key={q.question_id} className="flex items-start gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
              <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold" style={{ backgroundColor: `${accent}25`, color: accent }}>
                {i + 1}
              </span>
              <p className="flex-1 text-lg leading-snug text-white/90">{q.text}</p>
              <span className="shrink-0 font-mono text-sm font-semibold text-white/40">
                {Number(q.score).toFixed(0)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function StatsSlide({ stats, wgs }) {
  if (!stats) return null;
  return (
    <div className="w-full max-w-5xl text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#48CAE4]">By the numbers</p>
      <h2 className="mt-4 text-5xl font-bold">Conference at a glance</h2>
      <div className="mt-12 grid grid-cols-2 gap-8 sm:grid-cols-4">
        <Stat value={wgs.length} label="Working groups" />
        <Stat value={stats.total_questions} label="Total questions" />
        <Stat value="2" label="Delphi rounds" />
        <Stat value="May 21" label="Conference day" />
      </div>
      <p className="mt-12 text-sm text-white/40">
        Two rounds of structured Delphi prioritization + ED-physician panels + cross-WG agenda setting
      </p>
    </div>
  );
}

function Stat({ value, label }) {
  return (
    <div>
      <p className="text-5xl font-bold text-white">{value}</p>
      <p className="mt-2 text-xs uppercase tracking-wider text-white/40">{label}</p>
    </div>
  );
}
