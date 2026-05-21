/**
 * Per-WG Priority Presentation — slide deck.
 *
 * Rewritten 2026-05-20 from a single scrollable page to a 10-12 slide
 * deck modeled on WelcomeDeck. Each WG co-lead drives their own deck
 * via ←/→ during the 2:50 PM Priority Presentation slot. The audience
 * phone view (CompactPresent) is unchanged — it always shows the
 * advancing-question list.
 *
 * Slide order:
 *   0. Title — WG identity + animated mini-network background
 *   1. Mission — subtitle + background paragraph + key stats
 *   2. By the numbers — composition stats (R2 active, panel pool, etc.)
 *   3. The funnel — questions through R1 → R2 → panel → advancing
 *   4. Morning vote receipt (skipped if no votes recorded yet)
 *   5..N. One slide per advancing question with pain/expansion/impact
 *   N+1. R1 → R2 deliberation shifts (skipped if no shifts)
 *   N+2. Cross-cutting themes
 *   N+3. Closing handoff to cross-WG vote
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
  ArrowRight, ArrowUpRight, ArrowDownRight,
  ChevronsDown, Network, Target, TrendingUp,
  BarChart3, Sparkles, Layers,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { PILLAR_COLORS, WG_LABELS } from '@/components/stage/panelConfig';
import { SUMMARY_DOCS } from '@/pages/WorkingGroupsSummaryPage';

// ── Color tokens (shared with WelcomeDeck visually) ─────────────────
const C = {
  bg: '#0A1628',
  card: '#0E1E35',
  border: 'rgba(255,255,255,0.08)',
  borderLight: 'rgba(255,255,255,0.04)',
  text: '#F8FAFC',
  textSec: 'rgba(248,250,252,0.72)',
  textMuted: 'rgba(248,250,252,0.42)',
  cyan: '#48CAE4',
  cyanDeep: '#00B4D8',
  training: '#A78BFA',
  self: '#34D399',
  society: '#FBBF24',
  emerald: '#10b981',
  rose: '#fb7185',
};

// WG5 advances all 5 themed questions; others cap at 4.
function advanceLimitFor(wgNumber) {
  return wgNumber === 5 ? 5 : 4;
}

// Per-WG R1 question counts (active + removed) — pinned from the full
// DB backup on 2026-05-20. The /api/surveys/results endpoint excludes
// removed questions, so we can't derive these client-side without an
// extra round trip. These numbers are immutable historical data.
const WG_R1_TOTAL = { 1: 34, 2: 45, 3: 22, 4: 35, 5: 41 };
// Per-WG R2 response rate (R2 voters / eligible). Pinned to prod state.
const WG_R2_RESPONSE_RATE = { 1: 91, 2: 90, 3: 73, 4: 81, 5: 91 };

// ────────────────────────────────────────────────────────────────────
// Main component
// ────────────────────────────────────────────────────────────────────

export function PresentWGStage({ wgNumber, bus }) {
  const [wg, setWg] = useState(null);
  const [candidates, setCandidates] = useState(null);
  const [crossWgCandidates, setCrossWgCandidates] = useState(null);
  const [r2, setR2] = useState(null);
  const [voteResults, setVoteResults] = useState(null);
  const [slideIndex, setSlideIndex] = useState(0);

  // Reset to slide 0 whenever the chair switches between WGs so the
  // deck doesn't open mid-presentation on the wrong index.
  useEffect(() => setSlideIndex(0), [wgNumber]);

  // Fetch every data source independently so a 500 on one leg doesn't
  // blank the whole deck.
  useEffect(() => {
    if (!wgNumber) return undefined;
    let cancelled = false;
    const safe = async (url) => {
      try { return await api(url); } catch (e) { return { __error: e }; }
    };
    (async () => {
      const [wgs, panel, crossWg, results, sessions] = await Promise.all([
        safe('/api/surveys/working-groups'),
        safe(`/api/conference/panel/${wgNumber}/candidates`),
        safe('/api/conference/cross-wg/candidates'),
        safe(`/api/surveys/results/${wgNumber}/round_2`),
        safe('/api/conference/sessions'),
      ]);
      if (cancelled) return;
      const wgsList = Array.isArray(wgs) ? wgs : [];
      setWg(wgsList.find((w) => w?.wg_number === wgNumber) || null);
      setCandidates(panel?.__error ? [] : (panel?.questions || []));
      const crossGroup = crossWg?.__error
        ? null
        : (crossWg?.groups || []).find((g) => g.wg_number === wgNumber);
      setCrossWgCandidates((crossGroup?.candidates || []).map((q) => ({
        ...q,
        id: q.id || q.question_id,
      })));
      setR2(results?.__error ? null : (results || null));
      const sessList = Array.isArray(sessions) ? sessions : [];
      const sess = sessList.find(
        (s) => s.wg_number === wgNumber && s.session_type === 'wg_presentation'
      );
      if (sess) {
        const tally = await safe(`/api/conference/results/${sess.id}`);
        if (!cancelled) setVoteResults(tally?.__error ? null : (tally || null));
      } else if (!cancelled) {
        setVoteResults(null);
      }
    })();
    return () => { cancelled = true; };
  }, [wgNumber, bus]);

  const accent = PILLAR_COLORS[wgNumber] || C.cyan;
  const doc = (SUMMARY_DOCS || []).find((d) => d.wg === wgNumber);
  const limit = advanceLimitFor(wgNumber);

  const allActive = useMemo(
    () => (r2?.questions || []).filter((q) => q.status !== 'removed'),
    [r2],
  );

  // Advancing slate: cross-WG curated set if available, else panel pool top-N.
  const advancing = useMemo(() => {
    const source = crossWgCandidates?.length ? crossWgCandidates : candidates;
    if (!source) return [];
    const featured = source.filter((q) => q.is_featured);
    const pool = featured.length > 0 ? featured : source;
    return [...pool]
      .sort((a, b) => {
        if (a.avg_rank != null && b.avg_rank != null) return a.avg_rank - b.avg_rank;
        if (a.avg_rank != null) return -1;
        if (b.avg_rank != null) return 1;
        return (b.r2_include_pct ?? 0) - (a.r2_include_pct ?? 0)
          || (b.r2_importance_mean ?? 0) - (a.r2_importance_mean ?? 0);
      })
      .slice(0, limit);
  }, [candidates, crossWgCandidates, limit]);

  // Morning vote tally
  const morningRanking = useMemo(() => {
    const rows = (voteResults?.questions || voteResults?.results || [])
      .filter((r) => r.avg_rank != null || r.points != null || r.importance_mean != null);
    if (!rows.length) return [];
    return [...rows].sort((a, b) => {
      if (a.avg_rank != null && b.avg_rank != null) return a.avg_rank - b.avg_rank;
      return (b.points ?? b.importance_mean ?? 0) - (a.points ?? a.importance_mean ?? 0);
    });
  }, [voteResults]);

  // R1 → R2 shifts
  const shifts = useMemo(() => {
    const withShift = allActive
      .filter((q) => q.r1_importance_mean != null && q.r2_importance_mean != null)
      .map((q) => ({
        id: q.id, text: q.text,
        r1: q.r1_importance_mean, r2: q.r2_importance_mean,
        delta: q.r2_importance_mean - q.r1_importance_mean,
      }));
    const up = [...withShift].sort((a, b) => b.delta - a.delta).slice(0, 3);
    const down = [...withShift].sort((a, b) => a.delta - b.delta)
      .filter((q) => q.delta < 0).slice(0, 3);
    return { up, down };
  }, [allActive]);

  // Process funnel — three numbers come from data, R1-total is pinned
  // because the surveys/results endpoint filters out removed questions.
  const funnel = useMemo(() => {
    const r2Active = allActive.length;
    const featured = (candidates || []).filter((q) => q.is_featured);
    // Curated pool: prefer the chair-curated featured set. Fall back to
    // the full candidate set if no curation exists (early dry-run state)
    // so the slide doesn't show "0 on today's slate".
    const panelPool = featured.length > 0 ? featured.length : (candidates?.length ?? r2Active);
    return {
      candidates: WG_R1_TOTAL[wgNumber] || (r2Active || null),
      toR2: r2Active || null,
      panelPool,
      advance: limit,
    };
  }, [allActive, candidates, limit, wgNumber]);

  // Build the slide list dynamically — skip slides with no data.
  // QuestionSlide × N (the per-advancing-question deep-dive slides
  // labeled "Advancing question 1 of N", etc.) were removed at the
  // chair's request — the spoken presentation is a 5-min thematic
  // framing, not a walk-through of each advancing question.
  const slides = useMemo(() => {
    const list = [];
    list.push((p) => <TitleSlide {...p} />);
    list.push((p) => <MissionSlide {...p} />);
    list.push((p) => <NumbersSlide {...p} />);
    list.push((p) => <FunnelSlide {...p} />);
    if (morningRanking.length > 0) list.push((p) => <MorningVoteSlide {...p} />);
    if (shifts.up.length > 0 || shifts.down.length > 0) {
      list.push((p) => <ShiftsSlide {...p} />);
    }
    if (doc?.themes && doc.themes.length > 0) {
      list.push((p) => <ThemesSlide {...p} />);
    }
    list.push((p) => <ClosingSlide {...p} />);
    return list;
  }, [doc, morningRanking, shifts]);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        setSlideIndex((i) => Math.min(slides.length - 1, i + 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setSlideIndex((i) => Math.max(0, i - 1));
      } else if (e.key === 'Home') {
        e.preventDefault();
        setSlideIndex(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        setSlideIndex(slides.length - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [slides.length]);

  if (candidates === null) {
    return <Skeleton className="h-full w-full rounded-2xl" />;
  }

  const idx = Math.max(0, Math.min(slides.length - 1, slideIndex));
  const Slide = slides[idx];

  const context = {
    wgNumber, wg, doc, accent, limit,
    advancing, morningRanking, shifts, funnel, allActive,
  };

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: C.bg }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -24 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0 flex items-center justify-center px-12 py-12 sm:px-16"
        >
          <Slide {...context} />
        </motion.div>
      </AnimatePresence>

      {/* Progress dots */}
      <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 gap-1.5">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setSlideIndex(i)}
            className="h-1 rounded-full transition-all duration-300"
            style={{
              width: i === idx ? 36 : 6,
              background: i === idx ? accent : 'rgba(255,255,255,0.18)',
              cursor: 'pointer',
            }}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>

      {/* Slide counter + WG strip */}
      <div
        className="absolute bottom-5 left-8 z-20 font-mono text-xs"
        style={{ color: C.textMuted }}
      >
        WG {wgNumber} · {WG_LABELS[wgNumber]}
      </div>
      <div
        className="absolute bottom-5 right-8 z-20 font-mono text-xs"
        style={{ color: C.textMuted }}
      >
        {String(idx + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Reusable primitives
// ────────────────────────────────────────────────────────────────────

function H1({ children, className = '', size = 'xl', color }) {
  const sizes = {
    hero: 'text-7xl sm:text-8xl lg:text-9xl',
    xl: 'text-5xl sm:text-6xl lg:text-7xl',
    lg: 'text-4xl sm:text-5xl lg:text-6xl',
    md: 'text-3xl sm:text-4xl lg:text-5xl',
  };
  return (
    <h1
      className={`font-bold tracking-tight leading-[1.05] ${sizes[size]} ${className}`}
      style={{ color: color || C.text }}
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
        setDisplay(Math.round((value || 0) * eased));
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
      {(display || 0).toLocaleString()}
      {suffix}
    </span>
  );
}

function StatBlock({ value, label, sub, accent, delay = 0, suffix = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: delay / 1000, ease: 'easeOut' }}
      className="rounded-2xl border p-5 sm:p-6"
      style={{ borderColor: `${accent}33`, background: `${accent}0E` }}
    >
      <p className="text-5xl font-bold tabular-nums sm:text-6xl lg:text-7xl" style={{ color: accent }}>
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
// Title slide — animated background
// ────────────────────────────────────────────────────────────────────

function TitleBackground({ accent }) {
  const canvasRef = useRef(null);
  const rafRef = useRef();
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // Concentric rings + drifting particles, accent-colored
    const N = 60;
    const nodes = Array.from({ length: N }, () => ({
      x: Math.random(), y: Math.random(),
      vx: (Math.random() - 0.5) * 0.0006,
      vy: (Math.random() - 0.5) * 0.0006,
      r: 0.8 + Math.random() * 1.6,
      phase: Math.random() * Math.PI * 2,
    }));

    function draw(now) {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);

      // Center glow
      const cx = w / 2, cy = h * 0.4;
      const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.55);
      grd.addColorStop(0, `${accent}1A`);
      grd.addColorStop(1, `${accent}00`);
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, w, h);

      // Concentric rings
      for (let r = 80; r < Math.max(w, h); r += 80) {
        ctx.strokeStyle = `${accent}10`;
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.arc(cx, cy, r + Math.sin(now / 2000) * 4, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Particles
      for (const n of nodes) {
        if (!reduced.current) {
          n.x += n.vx; n.y += n.vy;
          if (n.x < 0 || n.x > 1) n.vx *= -1;
          if (n.y < 0 || n.y > 1) n.vy *= -1;
        }
        const px = n.x * w, py = n.y * h;
        const pulse = 0.7 + 0.3 * Math.sin(now / 800 + n.phase);
        ctx.fillStyle = accent;
        ctx.globalAlpha = 0.35 * pulse;
        ctx.beginPath();
        ctx.arc(px, py, n.r * pulse, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      if (!reduced.current) rafRef.current = requestAnimationFrame(draw);
    }

    resize();
    rafRef.current = requestAnimationFrame(draw);
    window.addEventListener('resize', resize);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [accent]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
    />
  );
}

function TitleSlide({ wgNumber, wg, doc, accent }) {
  const friendlyName = WG_LABELS[wgNumber] || doc?.title || wg?.name || `Working Group ${wgNumber}`;
  const coLeads = doc?.meta?.replace(/^Co-leads:\s*/i, '').split(/[·,]/).map((s) => s.trim()).filter(Boolean) || [];
  const pillar = wg?.pillar || doc?.questions?.[0]?.pillar || '';

  return (
    <div className="relative h-full w-full">
      <TitleBackground accent={accent} />
      <div className="relative flex h-full flex-col items-center justify-center text-center">
        <Eyebrow tone={accent}>
          Priority Presentation · WG {wgNumber}{pillar ? ` · ${pillar} pillar` : ''}
        </Eyebrow>
        <H1 size="hero" className="mt-8">
          <span style={{ color: accent }}>WG {wgNumber}</span>
        </H1>
        <h2
          className="mt-3 max-w-5xl text-4xl font-semibold leading-tight sm:text-5xl"
          style={{ color: C.text }}
        >
          {friendlyName}
        </h2>
        {doc?.subtitle && (
          <p
            className="mt-6 max-w-3xl text-xl sm:text-2xl"
            style={{ color: C.textSec }}
          >
            {doc.subtitle}
          </p>
        )}
        {coLeads.length > 0 && (
          <div
            className="mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-mono text-sm"
            style={{ color: C.textMuted }}
          >
            {coLeads.map((cl, i) => (
              <span key={cl}>
                {i > 0 && <span style={{ color: C.borderLight, marginRight: '1rem' }}>·</span>}
                {cl}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Mission slide
// ────────────────────────────────────────────────────────────────────

function MissionSlide({ doc, accent, wg, funnel, limit }) {
  const background = doc?.background || (wg?.scope || '').split('.').slice(0, 2).join('.');
  return (
    <div className="mx-auto w-full max-w-6xl">
      <Eyebrow tone={accent}>The mission</Eyebrow>
      {doc?.subtitle && (
        <H1 size="lg" className="mt-8" color={C.text}>
          {doc.subtitle}.
        </H1>
      )}
      {background && (
        <p
          className="mt-8 max-w-5xl text-xl leading-relaxed sm:text-2xl"
          style={{ color: C.textSec }}
        >
          {background}
        </p>
      )}
      <div className="mt-12 grid grid-cols-3 gap-5">
        <CompositionStat value={funnel.toR2 ?? '—'} label="R2 questions" accent={accent} />
        <CompositionStat value={funnel.panelPool ?? '—'} label="On today's slate" accent={accent} />
        <CompositionStat value={limit} label="Advance to cross-WG" accent={C.emerald} />
      </div>
    </div>
  );
}

function CompositionStat({ value, label, accent }) {
  return (
    <div
      className="rounded-2xl border px-5 py-5"
      style={{ borderColor: `${accent}30`, background: `${accent}0E` }}
    >
      <p className="font-mono text-5xl font-bold tabular-nums sm:text-6xl" style={{ color: accent }}>
        {typeof value === 'number' ? <AnimatedNumber value={value} /> : value}
      </p>
      <p className="mt-2 text-xs uppercase tracking-wider sm:text-sm" style={{ color: C.text }}>
        {label}
      </p>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// By the numbers slide
// ────────────────────────────────────────────────────────────────────

function NumbersSlide({ accent, wgNumber, funnel, limit }) {
  return (
    <div className="mx-auto w-full max-w-7xl">
      <Eyebrow tone={accent}>By the numbers</Eyebrow>
      <H1 size="lg" className="mt-6">
        What this WG built before today.
      </H1>
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatBlock
          value={funnel.candidates || 0}
          label="Questions proposed"
          sub="R1 candidate set"
          accent={accent}
          delay={0}
        />
        <StatBlock
          value={funnel.toR2 || 0}
          label="Active going into R2"
          sub={`${(funnel.candidates || 0) - (funnel.toR2 || 0)} retired, merged, or absorbed`}
          accent={C.cyan}
          delay={120}
        />
        <StatBlock
          value={funnel.panelPool || 0}
          label="On today's panel slate"
          sub="Curated by co-leads"
          accent={C.training}
          delay={240}
        />
        <StatBlock
          value={WG_R2_RESPONSE_RATE[wgNumber] ?? 0}
          suffix="%"
          label="R2 response rate"
          sub="Of eligible WG members"
          accent={C.society}
          delay={360}
        />
      </div>
      <p className="mt-12 text-center text-sm" style={{ color: C.textMuted }}>
        Six weeks of asynchronous deliberation,{' '}
        <span style={{ color: accent }}>{funnel.panelPool ?? '—'}</span> questions on today's panel,{' '}
        <span style={{ color: C.emerald }}>{limit}</span> advancing to cross-WG.
      </p>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Funnel slide
// ────────────────────────────────────────────────────────────────────

function FunnelSlide({ funnel, accent, limit }) {
  const stages = [
    { n: funnel.candidates ?? 0, label: 'Candidates after kickoff', sub: 'R1 question set', tone: C.textMuted },
    { n: funnel.toR2 ?? 0, label: 'Advanced through R1', sub: 'R2 active question set', tone: C.cyan },
    { n: funnel.panelPool ?? 0, label: "Today's panel slate", sub: 'Curated by co-leads', tone: accent },
    { n: limit, label: 'Advance to cross-WG vote', sub: 'Top by audience ranking', tone: C.emerald },
  ];
  return (
    <div className="mx-auto w-full max-w-5xl">
      <Eyebrow tone={accent}>The journey</Eyebrow>
      <H1 size="lg" className="mt-6">
        How we got to{' '}
        <span style={{ color: accent }} className="font-mono">{limit}</span>.
      </H1>
      <div className="mt-10 flex flex-col items-center gap-2">
        {stages.map((s, i) => {
          const width = 100 - i * 14;
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.45, delay: 0.15 + i * 0.13, ease: 'easeOut' }}
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
      <p className="mt-10 text-center text-sm" style={{ color: C.textMuted }}>
        Each step is a refinement — the items that didn't advance still shaped the ones that did.
      </p>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Morning vote slide
// ────────────────────────────────────────────────────────────────────

function MorningVoteSlide({ morningRanking, advancing, accent, limit }) {
  const visible = morningRanking.slice(0, 10);
  const advancingIds = new Set(advancing.map((q) => q.id || q.question_id));
  const maxRank = Math.max(...visible.map((r) => r.avg_rank || 1));
  const minRank = Math.min(...visible.map((r) => r.avg_rank || 1));
  const span = Math.max(0.5, maxRank - minRank);
  return (
    <div className="mx-auto w-full max-w-6xl">
      <Eyebrow tone={accent}>The receipt</Eyebrow>
      <H1 size="lg" className="mt-6">
        What this morning's room said.
      </H1>
      <div className="mt-10 space-y-2">
        {visible.map((r, i) => {
          const qid = r.question_id ?? r.id;
          const adv = advancingIds.has(qid);
          const tone = adv ? C.emerald : 'rgba(148, 163, 184, 0.7)';
          const width = r.avg_rank != null
            ? Math.max(8, 100 - ((r.avg_rank - minRank) / span) * 70)
            : 50;
          return (
            <motion.div
              key={qid}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, delay: 0.1 + i * 0.04 }}
              className="grid grid-cols-[2.25rem_minmax(0,1fr)_5.5rem] items-center gap-3 rounded-xl border px-4 py-2.5"
              style={{ borderColor: C.borderLight, background: C.card }}
            >
              <span
                className="inline-flex h-7 w-7 items-center justify-center rounded-full font-mono text-sm font-bold"
                style={{
                  background: adv ? `${C.emerald}28` : 'rgba(255,255,255,0.04)',
                  color: adv ? C.emerald : C.textMuted,
                }}
              >
                {i + 1}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="min-w-0 flex-1 truncate text-sm sm:text-base" style={{ color: C.text }}>
                    {r.text || r.question_text}
                  </p>
                  {adv && (
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                      style={{ background: `${C.emerald}20`, color: C.emerald }}
                    >
                      ✓ advances
                    </span>
                  )}
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.04]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${width}%` }}
                    transition={{ duration: 0.7, delay: 0.2 + i * 0.05 }}
                    className="h-full rounded-full"
                    style={{ background: tone }}
                  />
                </div>
              </div>
              <span className="text-right font-mono text-xs" style={{ color: C.textMuted }}>
                {r.avg_rank != null ? `rank ${r.avg_rank.toFixed(2)}` : '—'}
              </span>
            </motion.div>
          );
        })}
      </div>
      {(() => {
        const top = morningRanking.slice(0, limit);
        const next = morningRanking[limit];
        if (!next || top.length < limit) return null;
        const topAvg = top.reduce((s, r) => s + (r.avg_rank || 0), 0) / top.length;
        const gap = (next.avg_rank || 0) - topAvg;
        const tight = Math.abs(gap) < 0.3;
        return (
          <div
            className="mt-8 rounded-xl border-l-4 px-5 py-3"
            style={{
              borderColor: tight ? C.society : C.emerald,
              background: tight ? `${C.society}10` : `${C.emerald}10`,
            }}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.25em]" style={{ color: tight ? C.society : C.emerald }}>
              Key takeaway
            </p>
            <p className="mt-1 text-base" style={{ color: C.text }}>
              {tight
                ? `Top ${limit} were tight — the next question was within striking distance. Worth a look in the cross-WG round.`
                : `The top ${limit} were clearly preferred — avg rank ${topAvg.toFixed(1)} vs ${next.avg_rank.toFixed(1)} for the next question, a ${gap.toFixed(1)}-rank gap.`}
            </p>
          </div>
        );
      })()}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// One slide per advancing question
// ────────────────────────────────────────────────────────────────────

function QuestionSlide({ question, index, total, doc, accent }) {
  // Match SUMMARY_DOCS rationale by 40-char prefix, then positional fallback.
  const rationale = useMemo(() => {
    const direct = doc?.questions?.find(
      (dq) => dq.prompt && question.text &&
        dq.prompt.slice(0, 40).toLowerCase() === question.text.slice(0, 40).toLowerCase(),
    );
    return direct || doc?.questions?.[index - 1];
  }, [doc, question, index]);

  const delta = (question.r1_importance_mean != null && question.r2_importance_mean != null)
    ? question.r2_importance_mean - question.r1_importance_mean
    : null;

  return (
    <div className="mx-auto w-full max-w-6xl">
      {rationale?.title && (
        <p
          className="mt-6 text-sm font-bold uppercase tracking-wider"
          style={{ color: C.textMuted }}
        >
          {rationale.title}
        </p>
      )}
      <h2
        className="mt-2 max-w-5xl text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl"
        style={{ color: C.text }}
      >
        {question.text}
      </h2>

      {/* Stat strip */}
      <div className="mt-6 flex flex-wrap items-center gap-4 text-base" style={{ color: C.textSec }}>
        {question.r2_include_pct != null && (
          <span className="rounded-full border px-3 py-1 font-mono" style={{ borderColor: `${accent}30` }}>
            <span style={{ color: accent }} className="font-bold">{Math.round(question.r2_include_pct)}%</span>{' '}
            <span style={{ color: C.textMuted }}>include</span>
          </span>
        )}
        {question.r2_importance_mean != null && (
          <span className="rounded-full border px-3 py-1 font-mono" style={{ borderColor: `${accent}30` }}>
            <span style={{ color: C.textMuted }}>importance</span>{' '}
            <span style={{ color: accent }} className="font-bold">{question.r2_importance_mean.toFixed(1)}</span>
          </span>
        )}
        {question.pairwise_score != null && question.pairwise_score > 0 && (
          <span className="rounded-full border px-3 py-1 font-mono" style={{ borderColor: `${accent}30` }}>
            <span style={{ color: C.textMuted }}>pairwise</span>{' '}
            <span style={{ color: accent }} className="font-bold">{Math.round(question.pairwise_score)}</span>
          </span>
        )}
        {delta != null && Math.abs(delta) >= 0.15 && (
          <span
            className="inline-flex items-center gap-1 font-mono font-bold"
            style={{ color: delta > 0 ? C.emerald : C.rose }}
          >
            {delta > 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
            {delta > 0 ? '+' : ''}{delta.toFixed(1)} vs R1
          </span>
        )}
      </div>

      {/* Rationale grid */}
      {(rationale?.pain || rationale?.expansion || rationale?.impact) && (
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {rationale?.pain && <RationaleBlock label="Pain point" body={rationale.pain} accent={accent} />}
          {rationale?.expansion && <RationaleBlock label="What it unlocks" body={rationale.expansion} accent={accent} />}
          {rationale?.impact && <RationaleBlock label="Anticipated impact" body={rationale.impact} accent={accent} />}
        </div>
      )}
    </div>
  );
}

function RationaleBlock({ label, body, accent }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="rounded-2xl border p-5"
      style={{ borderColor: `${accent}25`, background: `${accent}08` }}
    >
      <p
        className="text-[10px] font-bold uppercase tracking-[0.25em]"
        style={{ color: accent }}
      >
        {label}
      </p>
      <p className="mt-3 text-base leading-relaxed lg:text-lg" style={{ color: C.text }}>
        {body}
      </p>
    </motion.div>
  );
}

// ────────────────────────────────────────────────────────────────────
// R1 → R2 shifts slide
// ────────────────────────────────────────────────────────────────────

function ShiftsSlide({ shifts, accent }) {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <Eyebrow tone={accent}>Deliberation in motion</Eyebrow>
      <H1 size="lg" className="mt-6">
        Where the WG <span style={{ color: accent }}>changed its mind</span>{' '}
        between R1 and R2.
      </H1>
      <div className="mt-10 grid gap-5 lg:grid-cols-2">
        <ShiftColumn title="Warmed to" items={shifts.up} tone={C.emerald} />
        <ShiftColumn title="Cooled on" items={shifts.down} tone={C.rose} />
      </div>
      <div
        className="mt-10 rounded-xl border-l-4 px-5 py-3"
        style={{ borderColor: C.emerald, background: `${C.emerald}10` }}
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.25em]" style={{ color: C.emerald }}>
          Key takeaway
        </p>
        <p className="mt-1 text-base" style={{ color: C.text }}>
          The WG materially shifted its mind on several questions during deliberation — evidence
          of real engagement, not rubber-stamping.
        </p>
      </div>
    </div>
  );
}

function ShiftColumn({ title, items, tone }) {
  if (!items?.length) {
    return (
      <div
        className="rounded-2xl border p-5"
        style={{ borderColor: `${tone}30`, background: `${tone}08`, opacity: 0.4 }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: tone }}>
          {title}
        </p>
        <p className="mt-3 text-sm" style={{ color: C.textMuted }}>
          No shifts in this direction.
        </p>
      </div>
    );
  }
  const Icon = tone === C.rose ? ArrowDownRight : ArrowUpRight;
  return (
    <div
      className="rounded-2xl border p-5"
      style={{ borderColor: `${tone}40`, background: `${tone}0E` }}
    >
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5" style={{ color: tone }} />
        <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: tone }}>
          {title}
        </p>
      </div>
      <ul className="mt-4 space-y-3">
        {items.map((q) => (
          <li key={q.id} className="flex items-start gap-3">
            <span className="shrink-0 font-mono text-base font-bold tabular-nums" style={{ color: tone }}>
              {q.delta > 0 ? '+' : ''}{q.delta.toFixed(1)}
            </span>
            <p className="min-w-0 flex-1 text-sm leading-snug line-clamp-3" style={{ color: C.text }}>
              {q.text}
            </p>
            <span className="shrink-0 font-mono text-xs" style={{ color: C.textMuted }}>
              {q.r1.toFixed(1)} →{' '}
              <span className="font-bold" style={{ color: C.text }}>{q.r2.toFixed(1)}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Cross-cutting themes slide
// ────────────────────────────────────────────────────────────────────

function ThemesSlide({ doc, accent }) {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <Eyebrow tone={accent}>Cross-cutting threads</Eyebrow>
      <H1 size="lg" className="mt-6">
        The themes that echo across this WG.
      </H1>
      <div className="mt-10 grid gap-5 lg:grid-cols-3">
        {(doc?.themes || []).map((theme, i) => (
          <motion.div
            key={theme.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.2 + i * 0.12 }}
            className="rounded-2xl border p-6"
            style={{ borderColor: `${accent}30`, background: `${accent}08` }}
          >
            <div
              className="mb-4 h-1 w-12 rounded-full"
              style={{ background: accent }}
            />
            <h3 className="text-lg font-bold leading-snug" style={{ color: C.text }}>
              {theme.title}
            </h3>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: C.textSec }}>
              {theme.body}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Closing slide
// ────────────────────────────────────────────────────────────────────

function ClosingSlide({ accent, limit, doc, wgNumber }) {
  return (
    <div className="mx-auto w-full max-w-5xl text-center">
      <Eyebrow tone={accent}>What happens next</Eyebrow>
      <H1 size="xl" className="mt-8">
        Rank these <span className="font-mono">{limit}</span> against{' '}
        the other <span className="font-mono">{wgNumber === 5 ? 16 : 17}</span> — and{' '}
        <span style={{ color: accent }}>shape the agenda.</span>
      </H1>
      {doc?.callToAction && (
        <p
          className="mx-auto mt-10 max-w-3xl text-lg leading-relaxed"
          style={{ color: C.textSec }}
        >
          {doc.callToAction}
        </p>
      )}
      <div
        className="mx-auto mt-12 inline-flex items-center gap-3 rounded-2xl border px-6 py-4"
        style={{ borderColor: `${C.emerald}40`, background: `${C.emerald}10` }}
      >
        <ArrowRight className="h-6 w-6" style={{ color: C.emerald }} />
        <p className="text-xl sm:text-2xl" style={{ color: C.text }}>
          Cross-WG ranking opens after the last priority presentation.
        </p>
      </div>
    </div>
  );
}

export default PresentWGStage;
