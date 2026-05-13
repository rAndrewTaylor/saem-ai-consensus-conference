/**
 * Welcome / walkthrough slide deck — light, projector-friendly.
 *
 * Six slides at the top of the conference:
 *   1. Welcome
 *   2. Why we're here
 *   3. What we've already done (R1 + R2 by the numbers)
 *   4. How the day flows
 *   5. How to participate (QR + chat)
 *   6. Acknowledgments
 *
 * Admin advances slides via keyboard (←/→) or the control strip.
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';

const PLATFORM_URL = 'https://saem-ai-consensus-conference-production.up.railway.app/day';

export function WelcomeDeck({ slideIndex = 0, onAdvance }) {
  const idx = Math.max(0, Math.min(SLIDES.length - 1, slideIndex));
  const Slide = SLIDES[idx];

  useEffect(() => {
    if (!onAdvance) return;
    const onKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        onAdvance(Math.min(SLIDES.length - 1, idx + 1));
      } else if (e.key === 'ArrowLeft') {
        onAdvance(Math.max(0, idx - 1));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [idx, onAdvance]);

  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -24 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="absolute inset-0 flex items-center justify-center px-16 py-16"
        >
          <Slide />
        </motion.div>
      </AnimatePresence>

      <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 gap-2">
        {SLIDES.map((_, i) => (
          <div key={i} className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-10 bg-white/80' : 'w-1.5 bg-white/20'}`} />
        ))}
      </div>
    </div>
  );
}

// ---- Slides ---------------------------------------------------------------

function WelcomeSlide() {
  return (
    <div className="text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#48CAE4]">
        SAEM 2026
      </p>
      <h1 className="mt-8 text-8xl font-bold tracking-tight">Welcome</h1>
      <p className="mt-8 text-2xl text-white/60">
        AI Consensus Conference — Emergency Medicine's research agenda for AI
      </p>
      <p className="mt-16 text-sm text-white/30">
        May 21, 2026 · Atlanta Marriott Marquis
      </p>
    </div>
  );
}

function WhySlide() {
  return (
    <div className="max-w-5xl">
      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#48CAE4]">Why we're here</p>
      <h2 className="mt-6 text-6xl font-bold tracking-tight leading-tight">
        AI is already in the ED.
      </h2>
      <p className="mt-8 text-3xl text-white/70 leading-relaxed">
        Today we decide which questions we want answered next.
      </p>
    </div>
  );
}

function WhatWeveDoneSlide() {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    api('/api/conference/public-stats')
      .then((s) => setStats({ wgs: s.n_working_groups, total: s.n_active_questions, participants: s.n_participants }))
      .catch(() => {});
  }, []);
  return (
    <div className="w-full max-w-5xl text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#48CAE4]">Before today</p>
      <h2 className="mt-6 text-5xl font-bold">Two rounds. Five working groups.</h2>
      <div className="mt-16 grid grid-cols-2 gap-12 sm:grid-cols-4">
        <BigStat value={stats?.wgs ?? '5'} label="Working groups" />
        <BigStat value={stats?.total ?? '—'} label="Questions reviewed" />
        <BigStat value="2" label="Delphi rounds" />
        <BigStat value={stats?.participants ?? '—'} label="Expert reviewers" />
      </div>
      <p className="mt-16 text-lg text-white/50">
        Today is where we close the loop — together.
      </p>
    </div>
  );
}

function HowTheDayFlowsSlide() {
  return (
    <div className="max-w-5xl">
      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#48CAE4]">How today flows</p>
      <h2 className="mt-6 text-5xl font-bold">Five panels, then we vote together.</h2>
      <ol className="mt-12 space-y-5">
        <FlowStep n="1" title="Clinical Practice & Operations" />
        <FlowStep n="2" title="Infrastructure & Data Ecosystems" />
        <FlowStep n="3" title="Education, Training & Competency" />
        <FlowStep n="4" title="Human-AI Interaction & the Perception of Self" />
        <FlowStep n="5" title="Ethical, Legal & Societal Implications" />
        <FlowStep n="★" title="Cross-WG prioritization vote — your top three" highlight />
      </ol>
    </div>
  );
}

function FlowStep({ n, title, highlight = false }) {
  return (
    <li className="flex items-center gap-5">
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg font-bold ${highlight ? 'bg-amber-500/20 text-amber-300' : 'bg-white/[0.06] text-white/70'}`}>
        {n}
      </span>
      <span className={`text-2xl ${highlight ? 'font-semibold text-amber-200' : 'text-white/80'}`}>{title}</span>
    </li>
  );
}

function HowToParticipateSlide() {
  return (
    <div className="grid w-full max-w-6xl grid-cols-2 items-center gap-16">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#48CAE4]">Join in</p>
        <h2 className="mt-6 text-5xl font-bold leading-tight">Your phone is the room.</h2>
        <ul className="mt-10 space-y-4 text-xl text-white/70">
          <li>📱 Scan to vote and submit questions</li>
          <li>💬 Anonymous chat — upvote what resonates</li>
          <li>📊 Watch the room shift in real time</li>
        </ul>
      </div>
      <div className="flex flex-col items-center">
        <div className="rounded-3xl bg-white p-6">
          {/* Inline QR placeholder — generates via Google Charts */}
          <img
            alt="Scan to join"
            src={`https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(PLATFORM_URL)}`}
            className="block h-72 w-72"
          />
        </div>
        <p className="mt-4 font-mono text-sm text-white/40">/day</p>
      </div>
    </div>
  );
}

function ThanksSlide() {
  return (
    <div className="max-w-5xl text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#48CAE4]">Thank you</p>
      <h2 className="mt-6 text-5xl font-bold leading-tight">
        To everyone who wrote, rated, ranked, and showed up today.
      </h2>
      <p className="mt-10 text-xl text-white/60">
        Working group co-leads · Planning committee · SAEM · Every participant
      </p>
      <p className="mt-16 text-sm text-white/30">
        R. Andrew Taylor, MD MHS — Conference Chair
      </p>
    </div>
  );
}

function BigStat({ value, label }) {
  return (
    <div>
      <p className="text-6xl font-bold text-white">{value}</p>
      <p className="mt-2 text-xs uppercase tracking-wider text-white/40">{label}</p>
    </div>
  );
}

const SLIDES = [WelcomeSlide, WhySlide, WhatWeveDoneSlide, HowTheDayFlowsSlide, HowToParticipateSlide, ThanksSlide];
