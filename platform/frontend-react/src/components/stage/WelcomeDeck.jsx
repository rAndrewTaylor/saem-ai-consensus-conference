/**
 * Welcome / opening deck — projector-grade slides for the 8:00 AM slot.
 *
 * Rewritten 2026-05-20 to add animated visuals and detailed stats.
 * Editorial-dark aesthetic borrowed from the ED Digital Twin lecture
 * (Anthropic-inspired serif headings + mono numerals + animated SVG
 * visualizations), tuned to the existing SAEM brand (#0A1628 base,
 * cyan accent #48CAE4, pillar colors per WG).
 *
 * Ten slides:
 *   0. Title — animated particle network behind "SAEM 2026"
 *   1. The mission — editorial typography
 *   2. By the numbers — animated counters (74 participants, etc.)
 *   3. Five working groups — grid with pillars + co-leads
 *   4. The methodology — process timeline (R1 → Synthesis → R2 → PW → Day)
 *   5. The funnel — SVG animated funnel 177 → 104 → 49 → 21
 *   6. Cross-WG network — radial graph of cross-WG question similarity
 *   7. Today's flow — agenda timeline
 *   8. How to participate — QR code + chat
 *   9. Thank you
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { api } from '@/lib/api';

const PLATFORM_URL = 'https://saem-ai-consensus-conference-production.up.railway.app/day';

// ── Color tokens ────────────────────────────────────────────────────
const C = {
  bg: '#0A1628',
  card: '#0E1E35',
  elevated: '#13294A',
  border: 'rgba(255,255,255,0.08)',
  borderLight: 'rgba(255,255,255,0.04)',
  text: '#F8FAFC',
  textSec: 'rgba(248,250,252,0.72)',
  textMuted: 'rgba(248,250,252,0.42)',
  // Brand accent
  cyan: '#48CAE4',
  cyanDeep: '#00B4D8',
  // Pillar palette
  tech: '#48CAE4',
  training: '#A78BFA',
  self: '#34D399',
  society: '#FBBF24',
};
const PILLAR_COLOR = {
  Technology: C.tech,
  Training: C.training,
  Self: C.self,
  Society: C.society,
};

// ── Ground-truth numbers (verified May 20 2026 from prod) ───────────
const GROUND_TRUTH = {
  invited: 74,
  r1Voters: 62,
  r2Voters: 63,
  r2ResponseRate: 85,
  questionsCreated: 177,
  activeR2: 104,
  removed: 73,
  featuredForPanels: 49,
  crossWgAdvancing: 21,
  r2Responses: 1310,
  pairwiseTotal: 5962,
  workingGroups: 5,
};

// ── WG metadata ─────────────────────────────────────────────────────
const WG_META = [
  {
    n: 1,
    title: 'Clinical Practice & Operations',
    pillar: 'Technology',
    coLeads: ['Rohit Sangal', 'Brian Patterson'],
    panelCount: 12,
    activeR2: 20,
    responseRate: 91,
  },
  {
    n: 2,
    title: 'Infrastructure & Data',
    pillar: 'Technology',
    coLeads: ['Fran Riley', 'Ethan Abbott'],
    panelCount: 10,
    activeR2: 25,
    responseRate: 90,
  },
  {
    n: 3,
    title: 'Education & Training',
    pillar: 'Training',
    coLeads: ['Christian Rose', 'Carl Preiksaitis'],
    panelCount: 10,
    activeR2: 19,
    responseRate: 73,
  },
  {
    n: 4,
    title: 'Human-AI Interaction',
    pillar: 'Self',
    coLeads: ['Maame Yiadom', 'Tehreem Rehman'],
    panelCount: 12,
    activeR2: 23,
    responseRate: 81,
  },
  {
    n: 5,
    title: 'Ethics, Legal & Society',
    pillar: 'Society',
    coLeads: ['Arwen Declan', 'Kennedy Hall', 'Yohan Sumathipala'],
    panelCount: 5,
    activeR2: 17,
    responseRate: 91,
  },
];

// ────────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────────

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
    <div className="relative h-full w-full overflow-hidden" style={{ background: C.bg }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -24 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0 flex items-center justify-center px-12 py-12 sm:px-16 sm:py-14"
        >
          <Slide />
        </motion.div>
      </AnimatePresence>

      {/* Progress dots */}
      <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-1.5">
        {SLIDES.map((_, i) => (
          <div
            key={i}
            className="h-1 rounded-full transition-all duration-300"
            style={{
              width: i === idx ? 36 : 6,
              background: i === idx ? C.cyan : 'rgba(255,255,255,0.18)',
            }}
          />
        ))}
      </div>

      {/* Slide counter */}
      <div
        className="absolute bottom-6 right-8 z-20 font-mono text-xs"
        style={{ color: C.textMuted }}
      >
        {String(idx + 1).padStart(2, '0')} / {String(SLIDES.length).padStart(2, '0')}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Reusable primitives
// ────────────────────────────────────────────────────────────────────

function H1({ children, className = '', size = 'xl' }) {
  const sizes = {
    hero: 'text-7xl sm:text-8xl lg:text-9xl',
    xl: 'text-5xl sm:text-6xl lg:text-7xl',
    lg: 'text-4xl sm:text-5xl lg:text-6xl',
  };
  return (
    <h1
      className={`font-bold tracking-tight leading-[1.05] ${sizes[size]} ${className}`}
      style={{ color: C.text }}
    >
      {children}
    </h1>
  );
}

function Eyebrow({ children, tone = C.cyan }) {
  return (
    <p
      className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.32em]"
      style={{ color: tone }}
    >
      {children}
    </p>
  );
}

function AnimatedNumber({ value, duration = 1200, suffix = '', delay = 0 }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-10%' });
  useEffect(() => {
    if (!inView) return;
    let raf;
    const timeoutId = setTimeout(() => {
      const start = performance.now();
      const step = (now) => {
        const t = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        setDisplay(Math.round(value * eased));
        if (t < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }, delay);
    return () => {
      clearTimeout(timeoutId);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [inView, value, duration, delay]);
  return (
    <span ref={ref} className="font-mono tabular-nums">
      {display.toLocaleString()}
      {suffix}
    </span>
  );
}

function StatBlock({ value, label, sub, accent = C.cyan, delay = 0, suffix = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: delay / 1000, ease: 'easeOut' }}
      className="rounded-2xl border p-5 sm:p-6"
      style={{ borderColor: `${accent}33`, background: `${accent}0E` }}
    >
      <p
        className="overflow-hidden truncate text-4xl font-bold leading-none tabular-nums sm:text-5xl lg:text-6xl"
        style={{ color: accent }}
      >
        <AnimatedNumber value={value} delay={delay} suffix={suffix} />
      </p>
      <p className="mt-3 text-sm font-semibold uppercase tracking-wider" style={{ color: C.text }}>
        {label}
      </p>
      {sub && (
        <p className="mt-1 text-xs" style={{ color: C.textMuted }}>
          {sub}
        </p>
      )}
    </motion.div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Slide 0 — Title with animated particle network
// ────────────────────────────────────────────────────────────────────

function ParticleNetwork() {
  const canvasRef = useRef(null);
  const nodesRef = useRef([]);
  const rafRef = useRef();
  const reducedMotionRef = useRef(false);
  // Color buckets for the nodes — match the pillar palette so it reads
  // as a real Delphi/consensus network rather than abstract decoration.
  const palette = [C.cyan, C.training, C.self, C.society, C.cyanDeep];

  useEffect(() => {
    reducedMotionRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function initNodes() {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      // ~74 nodes — one per invited working-group member.
      nodesRef.current = Array.from({ length: GROUND_TRUTH.invited }, (_, i) => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        r: 1.4 + Math.random() * 1.8,
        color: palette[i % palette.length],
        phase: Math.random() * Math.PI * 2,
      }));
    }

    function draw(now) {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);

      // Soft radial glow behind the title
      const grd = ctx.createRadialGradient(w / 2, h * 0.45, 0, w / 2, h * 0.45, w * 0.55);
      grd.addColorStop(0, 'rgba(72,202,228,0.10)');
      grd.addColorStop(1, 'rgba(72,202,228,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, w, h);

      const nodes = nodesRef.current;

      // Update + draw edges first so nodes sit on top
      ctx.lineWidth = 0.5;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 110) {
            ctx.strokeStyle = `rgba(255,255,255,${0.06 * (1 - d / 110)})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // Update + draw nodes
      for (const n of nodes) {
        if (!reducedMotionRef.current) {
          n.x += n.vx;
          n.y += n.vy;
          if (n.x < 0 || n.x > w) n.vx *= -1;
          if (n.y < 0 || n.y > h) n.vy *= -1;
        }
        const pulse = 0.85 + 0.15 * Math.sin(now / 700 + n.phase);
        ctx.fillStyle = n.color;
        ctx.globalAlpha = 0.45 * pulse;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * pulse, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      if (!reducedMotionRef.current) {
        rafRef.current = requestAnimationFrame(draw);
      }
    }

    resize();
    initNodes();
    rafRef.current = requestAnimationFrame(draw);
    window.addEventListener('resize', () => { resize(); initNodes(); });
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
    />
  );
}

function TitleSlide() {
  return (
    <div className="relative h-full w-full">
      <ParticleNetwork />
      <div className="relative flex h-full flex-col items-center justify-center text-center">
        <Eyebrow>SAEM 2026 · Atlanta</Eyebrow>
        <H1 size="hero" className="mt-8">
          AI Consensus
          <br />
          <span style={{ color: C.cyan }}>Conference</span>
        </H1>
        <p
          className="mt-10 max-w-3xl text-xl sm:text-2xl"
          style={{ color: C.textSec }}
        >
          The 10-year research agenda for AI in emergency medicine —
          decided today, by the room.
        </p>
        <div
          className="mt-16 flex items-center gap-6 font-mono text-xs sm:text-sm"
          style={{ color: C.textMuted }}
        >
          <span>Thursday · May 21, 2026</span>
          <span style={{ color: C.borderLight }}>·</span>
          <span>Atlanta Marriott Marquis</span>
          <span style={{ color: C.borderLight }}>·</span>
          <span>{GROUND_TRUTH.invited} experts · 5 working groups</span>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Slide 1 — Mission
// ────────────────────────────────────────────────────────────────────

function MissionSlide() {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <Eyebrow>Why we're here</Eyebrow>
      <H1 size="xl" className="mt-8">
        AI is already in the ED.
        <br />
        <span style={{ color: C.cyan }}>What we study next</span> is up to us.
      </H1>
      <div className="mt-12 grid gap-5 sm:grid-cols-3">
        {[
          { eyebrow: 'The reality', body: 'Ambient scribes, sepsis surveillance, imaging AI, and LLMs are deployed in EDs today — faster than the evidence base.' },
          { eyebrow: 'The gap', body: 'No shared research agenda exists for AI in emergency medicine. Each program defines its own questions.' },
          { eyebrow: 'Today', body: 'A modified Delphi process with the field\'s subspecialty experts produces the questions worth answering next.' },
        ].map((card, i) => (
          <motion.div
            key={card.eyebrow}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 + i * 0.12 }}
            className="rounded-2xl border p-6"
            style={{ borderColor: C.border, background: C.card }}
          >
            <Eyebrow tone={C.textMuted}>{card.eyebrow}</Eyebrow>
            <p className="mt-3 text-lg leading-relaxed" style={{ color: C.text }}>
              {card.body}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Slide 2 — By the numbers (animated counters)
// ────────────────────────────────────────────────────────────────────

function ByTheNumbersSlide() {
  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="text-center">
        <Eyebrow>Before today, by the numbers</Eyebrow>
        <H1 size="xl" className="mt-6">
          Six weeks. Two rounds. Five working groups.
        </H1>
      </div>
      <div className="mt-14 grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatBlock
          value={GROUND_TRUTH.invited}
          label="Invited experts"
          sub="Across 5 working groups"
          accent={C.cyan}
          delay={0}
        />
        <StatBlock
          value={GROUND_TRUTH.questionsCreated}
          label="Questions proposed"
          sub={`${GROUND_TRUTH.removed} retired or merged`}
          accent={C.cyanDeep}
          delay={120}
        />
        <StatBlock
          value={GROUND_TRUTH.r2Responses}
          label="R2 Delphi responses"
          sub={`${GROUND_TRUTH.r2Voters} of ${GROUND_TRUTH.invited} voters`}
          accent={C.training}
          delay={240}
        />
        <StatBlock
          value={GROUND_TRUTH.pairwiseTotal}
          label="Pairwise comparisons"
          sub="Bradley-Terry priority ranking"
          accent={C.self}
          delay={360}
        />
        <StatBlock
          value={GROUND_TRUTH.r2ResponseRate}
          suffix="%"
          label="R2 response rate"
          sub="Across all working groups"
          accent={C.society}
          delay={480}
        />
        <StatBlock
          value={GROUND_TRUTH.featuredForPanels}
          label="On today's slate"
          sub={`${GROUND_TRUTH.crossWgAdvancing} advance to closing vote`}
          accent={C.cyan}
          delay={600}
        />
      </div>
      <p className="mt-12 text-center text-sm" style={{ color: C.textMuted }}>
        Every number on this slide is the result of someone choosing to participate.
      </p>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Slide 3 — Five working groups (grid)
// ────────────────────────────────────────────────────────────────────

function WGGridSlide() {
  return (
    <div className="mx-auto w-full max-w-7xl">
      <Eyebrow>The agenda</Eyebrow>
      <H1 size="lg" className="mt-6">
        Five working groups, four pillars,{' '}
        <span style={{ color: C.cyan }}>{GROUND_TRUTH.invited} voices.</span>
      </H1>
      <div className="mt-10 grid gap-4 lg:grid-cols-5">
        {WG_META.map((wg, i) => {
          const tone = PILLAR_COLOR[wg.pillar];
          return (
            <motion.div
              key={wg.n}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.15 + i * 0.08 }}
              className="flex flex-col rounded-2xl border p-5"
              style={{ borderColor: `${tone}40`, background: `${tone}0E` }}
            >
              <div className="flex items-baseline justify-between">
                <span
                  className="font-mono text-3xl font-bold"
                  style={{ color: tone }}
                >
                  {wg.n}
                </span>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                  style={{ background: `${tone}20`, color: tone }}
                >
                  {wg.pillar}
                </span>
              </div>
              <h3 className="mt-3 text-base font-bold leading-snug" style={{ color: C.text }}>
                {wg.title}
              </h3>
              <ul className="mt-3 space-y-1 text-xs" style={{ color: C.textSec }}>
                {wg.coLeads.map((cl) => (
                  <li key={cl} className="leading-snug">
                    {cl}
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-4">
                <div className="flex justify-between border-t pt-3" style={{ borderColor: C.borderLight }}>
                  <Mini label="R2" value={wg.activeR2} />
                  <Mini label="Panel" value={wg.panelCount} accent={tone} />
                  <Mini label="Resp" value={`${wg.responseRate}%`} />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
      <div className="mt-8 flex justify-center gap-6 text-xs" style={{ color: C.textMuted }}>
        <PillarLegend pillar="Technology" />
        <PillarLegend pillar="Training" />
        <PillarLegend pillar="Self" />
        <PillarLegend pillar="Society" />
      </div>
    </div>
  );
}

function Mini({ label, value, accent }) {
  return (
    <div className="text-center">
      <p
        className="font-mono text-base font-bold tabular-nums"
        style={{ color: accent || C.text }}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[9px] uppercase tracking-wider" style={{ color: C.textMuted }}>
        {label}
      </p>
    </div>
  );
}

function PillarLegend({ pillar }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ background: PILLAR_COLOR[pillar] }}
      />
      {pillar}
    </span>
  );
}

// ────────────────────────────────────────────────────────────────────
// Slide 4 — Methodology process timeline
// ────────────────────────────────────────────────────────────────────

const PROCESS_STEPS = [
  {
    label: 'Recruitment',
    sub: 'Apr 9–18',
    detail: `${GROUND_TRUTH.invited} subspecialty experts invited across 5 WGs`,
    color: C.textSec,
  },
  {
    label: 'Round 1 Delphi',
    sub: 'Apr 20 – May 2',
    detail: `${GROUND_TRUTH.r1Voters} voters · importance + disposition ratings`,
    color: C.cyan,
  },
  {
    label: 'AI synthesis',
    sub: 'May 2–5',
    detail: 'Claude Opus synthesis · cluster themes · cross-WG overlap',
    color: C.training,
  },
  {
    label: 'Round 2 Delphi',
    sub: 'May 5–12',
    detail: `${GROUND_TRUTH.r2Voters} voters · ${GROUND_TRUTH.r2ResponseRate}% response · revised question set`,
    color: C.cyanDeep,
  },
  {
    label: 'Pairwise ranking',
    sub: 'May 5–18',
    detail: `${GROUND_TRUTH.pairwiseTotal.toLocaleString()} comparisons · Bradley-Terry model`,
    color: C.self,
  },
  {
    label: 'Conference day',
    sub: 'May 21',
    detail: 'Panels · audience polling · cross-WG synthesis · final vote',
    color: C.society,
  },
];

function MethodologySlide() {
  return (
    <div className="mx-auto w-full max-w-7xl">
      <Eyebrow>How we got here</Eyebrow>
      <H1 size="lg" className="mt-6">
        Modified Delphi <span style={{ color: C.cyan }}>+ AI synthesis</span>{' '}
        <span style={{ color: C.cyan }}>+ pairwise ranking.</span>
      </H1>

      <div className="relative mt-14">
        {/* Horizontal track */}
        <div
          className="absolute left-0 right-0 top-[18px] h-px"
          style={{ background: `linear-gradient(90deg, ${C.cyan}00, ${C.cyan}, ${C.society}, ${C.society}00)` }}
        />
        <div className="relative grid grid-cols-6 gap-2">
          {PROCESS_STEPS.map((step, i) => (
            <motion.div
              key={step.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 + i * 0.1 }}
              className="flex flex-col items-center text-center"
            >
              <div
                className="flex h-9 w-9 items-center justify-center rounded-full font-mono text-sm font-bold"
                style={{
                  background: step.color,
                  color: C.bg,
                  boxShadow: `0 0 24px ${step.color}40`,
                }}
              >
                {i + 1}
              </div>
              <p
                className="mt-4 text-sm font-bold leading-snug"
                style={{ color: C.text }}
              >
                {step.label}
              </p>
              <p
                className="mt-1 font-mono text-[10px] tracking-wider"
                style={{ color: step.color }}
              >
                {step.sub}
              </p>
              <p
                className="mt-2 text-xs leading-relaxed"
                style={{ color: C.textSec }}
              >
                {step.detail}
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      <div
        className="mt-12 mx-auto max-w-3xl rounded-xl border-l-4 px-5 py-3 text-base"
        style={{ borderColor: C.cyan, background: `${C.cyan}10`, color: C.textSec }}
      >
        <span className="font-semibold" style={{ color: C.text }}>The point of the method:</span>{' '}
        anonymous individual judgment, statistically aggregated, with multiple rounds and
        AI-assisted synthesis — so the room decides without the room dynamics.
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Slide 5 — Question funnel
// ────────────────────────────────────────────────────────────────────

const FUNNEL_STAGES = [
  { n: GROUND_TRUTH.questionsCreated, label: 'Questions proposed', sub: 'WG kickoffs · R1 candidates', tone: C.textSec },
  { n: GROUND_TRUTH.activeR2, label: 'Active after R1', sub: `${GROUND_TRUTH.removed} retired, merged, or absorbed`, tone: C.cyan },
  { n: GROUND_TRUTH.featuredForPanels, label: "Today's panel slate", sub: 'Curated by WG co-leads', tone: C.training },
  { n: GROUND_TRUTH.crossWgAdvancing, label: 'Advancing to cross-WG vote', sub: 'Top 4 per WG · top 5 for WG5', tone: C.self },
  { n: 10, label: 'Final research agenda', sub: 'Decided by tonight', tone: C.society },
];

function FunnelSlide() {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <Eyebrow>The funnel</Eyebrow>
      <H1 size="lg" className="mt-6">
        From <span className="font-mono">177</span>{' '}
        <span style={{ color: C.textSec }}>candidates</span> to{' '}
        <span style={{ color: C.cyan }} className="font-mono">10</span>{' '}
        <span style={{ color: C.textSec }}>priorities.</span>
      </H1>
      <div className="mt-10 flex flex-col items-center gap-2">
        {FUNNEL_STAGES.map((s, i) => {
          const width = 100 - i * 13;
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.45, delay: 0.2 + i * 0.13, ease: 'easeOut' }}
              className="flex w-full justify-center"
            >
              <div
                className="flex items-center gap-6 rounded-2xl border px-6 py-4 sm:px-8 sm:py-5"
                style={{
                  width: `${width}%`,
                  borderColor: `${s.tone}50`,
                  background: `${s.tone}10`,
                  boxShadow: `0 0 32px ${s.tone}1A`,
                }}
              >
                <span
                  className="shrink-0 font-mono text-5xl font-bold tabular-nums sm:text-6xl"
                  style={{ color: s.tone }}
                >
                  <AnimatedNumber value={s.n} delay={200 + i * 130} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-bold sm:text-xl" style={{ color: C.text }}>
                    {s.label}
                  </p>
                  <p className="text-xs sm:text-sm" style={{ color: C.textMuted }}>
                    {s.sub}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
      <p
        className="mt-10 text-center text-sm"
        style={{ color: C.textMuted }}
      >
        Each step is a refinement, not a cut — questions that didn't advance
        still informed the ones that did.
      </p>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Slide 6 — Cross-WG network
// ────────────────────────────────────────────────────────────────────

function CrossWGNetworkSlide() {
  // SVG radial layout — 5 WG hubs connected by cross-WG similarity arcs.
  // Position WGs equally around a circle.
  const W = 720;
  const H = 460;
  const cx = W / 2;
  const cy = H / 2;
  const r = 160;
  const hubs = WG_META.map((wg, i) => {
    const angle = (-Math.PI / 2) + (i * 2 * Math.PI) / WG_META.length;
    return {
      ...wg,
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
      color: PILLAR_COLOR[wg.pillar],
    };
  });
  // Edges with weights — roughly mirror the 24 overlap pairs found in the
  // platform's cross-WG analysis (sim ≥ 0.55).
  const edges = [
    [0, 1, 0.74], [0, 3, 0.76], [0, 2, 0.77], [0, 4, 0.72],
    [1, 3, 0.74], [1, 4, 0.77],
    [2, 3, 0.86], [2, 4, 0.72],
    [3, 4, 0.81],
  ];
  return (
    <div className="mx-auto w-full max-w-7xl">
      <Eyebrow>Cross-pollination</Eyebrow>
      <H1 size="lg" className="mt-6">
        The hardest questions{' '}
        <span style={{ color: C.cyan }}>cross working groups.</span>
      </H1>
      <div className="mt-10 grid items-center gap-10 lg:grid-cols-[1.4fr_1fr]">
        <div className="relative">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
            {/* Edges */}
            {edges.map(([a, b, w], i) => {
              const A = hubs[a];
              const B = hubs[b];
              return (
                <motion.line
                  key={i}
                  x1={A.x} y1={A.y} x2={B.x} y2={B.y}
                  stroke={C.cyan}
                  strokeOpacity={0.15 + w * 0.5}
                  strokeWidth={1 + w * 2}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 0.9, delay: 0.3 + i * 0.06, ease: 'easeOut' }}
                />
              );
            })}
            {/* Hubs */}
            {hubs.map((h, i) => (
              <motion.g
                key={h.n}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.15 + i * 0.08 }}
                style={{ transformOrigin: `${h.x}px ${h.y}px`, transformBox: 'fill-box' }}
              >
                <circle cx={h.x} cy={h.y} r={42} fill={h.color} fillOpacity={0.12} />
                <circle cx={h.x} cy={h.y} r={32} fill={h.color} fillOpacity={0.32} stroke={h.color} strokeWidth={1.5} />
                <text
                  x={h.x}
                  y={h.y - 2}
                  textAnchor="middle"
                  fontSize="22"
                  fontFamily="monospace"
                  fontWeight="700"
                  fill={C.text}
                >
                  {h.n}
                </text>
                <text
                  x={h.x}
                  y={h.y + 14}
                  textAnchor="middle"
                  fontSize="9"
                  fontFamily="monospace"
                  fontWeight="600"
                  fill={C.textMuted}
                  letterSpacing="1"
                >
                  WG
                </text>
                {/* WG label outside the node */}
                <text
                  x={h.x}
                  y={h.y + 56}
                  textAnchor="middle"
                  fontSize="11"
                  fill={C.textSec}
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  {h.title.length > 26 ? h.title.slice(0, 24) + '…' : h.title}
                </text>
              </motion.g>
            ))}
          </svg>
        </div>
        <div className="space-y-5">
          <div>
            <p
              className="font-mono text-5xl font-bold tabular-nums"
              style={{ color: C.cyan }}
            >
              <AnimatedNumber value={24} delay={400} />
            </p>
            <p className="mt-2 text-sm uppercase tracking-wider" style={{ color: C.text }}>
              Cross-WG question pairs
            </p>
            <p className="text-xs" style={{ color: C.textMuted }}>
              Semantic similarity ≥ 0.55
            </p>
          </div>
          <p
            className="text-base leading-relaxed"
            style={{ color: C.textSec }}
          >
            The platform identified 24 question pairs across different
            working groups with high content overlap. The thickest edges
            on this graph — WG3 ↔ WG4 (skill retention vs.
            diagnostic reasoning), WG4 ↔ WG5 (consent and patient
            experience) — are exactly where the room needs to
            converge in the cross-pollination block this afternoon.
          </p>
          <div
            className="rounded-xl border-l-4 px-4 py-3"
            style={{ borderColor: C.cyan, background: `${C.cyan}10` }}
          >
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: C.cyan }}>
              Today's job
            </p>
            <p className="mt-1 text-sm" style={{ color: C.text }}>
              Where two WGs overlap, the field needs one well-framed question — not two.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Slide 7 — Today's flow
// ────────────────────────────────────────────────────────────────────

const AGENDA = [
  { time: '8:00', title: 'Welcome + opening pulse', body: 'Frame the day · word-cloud snapshot', color: C.textSec },
  { time: '8:20', title: 'Panels 1 & 2 — Technology', body: 'Clinical Practice · Infrastructure & Data', color: C.cyan },
  { time: '9:55', title: 'Break · table reactions', body: 'What did the morning panels miss?', color: C.textSec },
  { time: '10:15', title: 'Panels 3, 4, 5 — Training / Self / Society', body: 'Education · Human-AI Interaction · Ethics', color: C.training },
  { time: '12:30', title: 'Networking lunch', body: 'Cluster the table-reaction submissions', color: C.textSec },
  { time: '1:30', title: 'World Café cross-pollination', body: 'Three 20-min rotations · find the gaps', color: C.self },
  { time: '2:50', title: 'Priority presentations + live vote', body: 'Each WG\'s top 5 · audience ranks all 21', color: C.society },
  { time: '4:05', title: 'Final results + synthesis', body: 'The 10-year agenda, decided', color: C.cyan },
];

function AgendaSlide() {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <Eyebrow>How today flows</Eyebrow>
      <H1 size="lg" className="mt-6">
        <span className="font-mono">8</span> hours.{' '}
        <span className="font-mono">5</span> panels.{' '}
        <span style={{ color: C.cyan }}>One agenda.</span>
      </H1>
      <ol className="mt-10 space-y-3">
        {AGENDA.map((a, i) => (
          <motion.li
            key={a.time}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0.15 + i * 0.06 }}
            className="grid grid-cols-[80px_1fr] items-baseline gap-5 rounded-xl border px-5 py-3"
            style={{ borderColor: C.borderLight, background: C.card }}
          >
            <span className="font-mono text-base font-bold" style={{ color: a.color }}>
              {a.time}
            </span>
            <div>
              <p className="text-lg font-bold leading-snug" style={{ color: C.text }}>
                {a.title}
              </p>
              <p className="text-sm" style={{ color: C.textMuted }}>
                {a.body}
              </p>
            </div>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Slide 8 — How to participate (QR)
// ────────────────────────────────────────────────────────────────────

function ParticipateSlide() {
  return (
    <div className="mx-auto grid w-full max-w-6xl items-center gap-14 lg:grid-cols-[1.1fr_1fr]">
      <div>
        <Eyebrow>Your phone is the room</Eyebrow>
        <H1 size="lg" className="mt-6">
          Scan to join.<br />
          <span style={{ color: C.cyan }}>Vote · rank · comment.</span>
        </H1>
        <ul className="mt-10 space-y-4 text-lg" style={{ color: C.textSec }}>
          <li className="flex items-start gap-3">
            <span
              className="mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-sm font-bold"
              style={{ background: `${C.cyan}25`, color: C.cyan }}
            >
              1
            </span>
            <span>Open the camera. Scan the QR. No app, no account, no login.</span>
          </li>
          <li className="flex items-start gap-3">
            <span
              className="mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-sm font-bold"
              style={{ background: `${C.training}25`, color: C.training }}
            >
              2
            </span>
            <span>Vote and rank during panels. Submit anonymous comments and questions.</span>
          </li>
          <li className="flex items-start gap-3">
            <span
              className="mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-sm font-bold"
              style={{ background: `${C.self}25`, color: C.self }}
            >
              3
            </span>
            <span>Watch the room shift in real time. The slides update as you vote.</span>
          </li>
        </ul>
      </div>
      <div className="flex flex-col items-center">
        <a href={PLATFORM_URL} target="_blank" rel="noreferrer" className="block">
          <div className="rounded-3xl bg-white p-5 shadow-2xl transition hover:scale-[1.02]">
            <img
              alt="Scan to join"
              src={`https://api.qrserver.com/v1/create-qr-code/?size=360x360&data=${encodeURIComponent(PLATFORM_URL)}`}
              className="block h-72 w-72"
            />
          </div>
        </a>
        <a
          href={PLATFORM_URL}
          target="_blank"
          rel="noreferrer"
          className="mt-5 font-mono text-sm hover:opacity-80"
          style={{ color: C.cyan }}
        >
          saem-ai-consensus-conference.up.railway.app/day
        </a>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Slide 9 — Thank you
// ────────────────────────────────────────────────────────────────────

function ThanksSlide() {
  return (
    <div className="mx-auto w-full max-w-5xl text-center">
      <Eyebrow>Acknowledgments</Eyebrow>
      <H1 size="lg" className="mt-8">
        Thank you to the{' '}
        <span style={{ color: C.cyan }}>{GROUND_TRUTH.invited} working group members</span>{' '}
        who built this agenda.
      </H1>
      <div className="mt-12 grid gap-3 text-left sm:grid-cols-2">
        {WG_META.map((wg) => {
          const tone = PILLAR_COLOR[wg.pillar];
          return (
            <div
              key={wg.n}
              className="rounded-xl border px-5 py-3"
              style={{ borderColor: `${tone}30`, background: `${tone}08` }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: tone }}>
                WG {wg.n} · {wg.pillar}
              </p>
              <p className="mt-0.5 text-sm font-bold" style={{ color: C.text }}>
                {wg.title}
              </p>
              <p className="mt-1 text-xs" style={{ color: C.textSec }}>
                {wg.coLeads.join(' · ')}
              </p>
            </div>
          );
        })}
      </div>
      <p className="mt-10 text-base" style={{ color: C.textSec }}>
        Planning committee · Andy Muck · Tom Hartka · Matt Trowbridge · Moira Smith
      </p>
      <p className="mt-2 text-base" style={{ color: C.textSec }}>
        Project management · Hope Duncan
      </p>
      <p className="mt-2 text-base" style={{ color: C.textSec }}>
        Supported by SAEM · CORD · ABEM · UVA Department of Emergency Medicine
      </p>
      <p className="mt-10 font-mono text-xs" style={{ color: C.textMuted }}>
        R. Andrew Taylor, MD MHS — Conference Chair
      </p>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Slide index
// ────────────────────────────────────────────────────────────────────

const SLIDES = [
  TitleSlide,
  MissionSlide,
  ByTheNumbersSlide,
  WGGridSlide,
  MethodologySlide,
  FunnelSlide,
  CrossWGNetworkSlide,
  AgendaSlide,
  ParticipateSlide,
  ThanksSlide,
];

export default WelcomeDeck;
