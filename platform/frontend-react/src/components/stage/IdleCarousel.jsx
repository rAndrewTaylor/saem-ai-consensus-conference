/**
 * Idle / landing carousel — projector content before the conference
 * starts and between sessions.
 *
 * Auto-rotating slides, designed for big-screen viewing. Every slide
 * is constrained to fit within calc(100vh - 4rem) — no scrolling on
 * the projector, ever. Slides that have variable content (leaderboards,
 * lists) clip via overflow-hidden + content sizing.
 *
 * Rotation: 9s per slide. All data is pulled live from existing public
 * endpoints — no admin auth needed so the projector runs unattended.
 */

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis,
  CartesianGrid, Tooltip, BarChart, Bar,
} from 'recharts';
import { api } from '@/lib/api';

const ROTATE_MS = 9_000;

const WG_NAMES = {
  1: 'Clinical Practice & Operations',
  2: 'Infrastructure & Data Ecosystems',
  3: 'Education, Training & Competency',
  4: 'Human-AI Interaction',
  5: 'Ethical, Legal & Societal',
};
const WG_SHORT = {
  1: 'Clinical',
  2: 'Infrastructure',
  3: 'Education',
  4: 'Human-AI',
  5: 'Ethics',
};
const PILLAR_COLORS = {
  1: '#00B4D8',
  2: '#22d3ee',
  3: '#8b5cf6',
  4: '#10b981',
  5: '#f59e0b',
};

// ─── Reusable slide chrome ───────────────────────────────────────────────

/**
 * Every slide uses this so the title is in a fixed spot and the body
 * has a guaranteed bounded area. The body uses min-h-0 + overflow-hidden
 * so child charts/lists don't push past the viewport.
 */
function Slide({ eyebrow, title, subtitle, children, maxWidth = 'max-w-6xl' }) {
  return (
    <div className={`flex h-full w-full ${maxWidth} flex-col`}>
      <div className="shrink-0">
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#48CAE4] sm:text-sm">{eyebrow}</p>}
        {title && <h2 className="mt-2 text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">{title}</h2>}
        {subtitle && <p className="mt-2 text-sm text-white/55 sm:text-base">{subtitle}</p>}
      </div>
      <div className="mt-5 min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  );
}

export function IdleCarousel({ bus }) {
  const [wgs, setWgs] = useState([]);
  const [allQuestions, setAllQuestions] = useState({});
  const [pairwise, setPairwise] = useState({});
  const [stats, setStats] = useState(null);
  const [slideIdx, setSlideIdx] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [wgList, publicStats] = await Promise.all([
          api('/api/surveys/working-groups'),
          api('/api/conference/public-stats').catch(() => null),
        ]);
        if (cancelled) return;
        setWgs(wgList || []);
        if (publicStats) setStats(publicStats);
        const [qResults, pwResults] = await Promise.all([
          Promise.all((wgList || []).map((w) =>
            api(`/api/surveys/results/${w.wg_number}/round_2`).catch(() => ({ questions: [] }))
          )),
          Promise.all((wgList || []).map((w) =>
            api(`/api/pairwise/rankings/${w.wg_number}?round=round_2`).catch(() => null)
          )),
        ]);
        if (cancelled) return;
        const qMap = {}, pwMap = {};
        (wgList || []).forEach((w, i) => {
          qMap[w.wg_number] = (qResults[i]?.questions || []).filter((q) => q.status !== 'removed');
          pwMap[w.wg_number] = pwResults[i]?.rankings || [];
        });
        setAllQuestions(qMap);
        setPairwise(pwMap);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [bus]);

  // Derived datasets
  const crossWgTop = useMemo(() => {
    const all = [];
    Object.entries(pairwise).forEach(([wg, rankings]) => {
      (rankings || []).forEach((r) => all.push({ ...r, wg_number: parseInt(wg, 10) }));
    });
    return all.sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 8);
  }, [pairwise]);

  const scatterData = useMemo(() => {
    const out = [];
    Object.entries(allQuestions).forEach(([wg, qs]) => {
      const pw = pairwise[wg] || [];
      const pwById = {};
      pw.forEach((p) => { pwById[p.question_id] = p.score; });
      (qs || []).forEach((q) => {
        const inc = q.r2_include_pct ?? q.r1_include_pct;
        const imp = q.r2_importance_mean ?? q.r1_importance_mean;
        if (inc == null || imp == null) return;
        out.push({
          wg_number: parseInt(wg, 10),
          x: imp,
          y: inc,
          z: Math.max(20, (pwById[q.id] || 50)),
          text: q.text,
        });
      });
    });
    return out;
  }, [allQuestions, pairwise]);

  const dispositionData = useMemo(() => {
    // For each WG, compute average include / modify / exclude across all
    // R2 questions where we have R1 stats (R2 stats may not exist yet).
    return Object.entries(allQuestions).map(([wg, qs]) => {
      let n = 0, inc = 0, mod = 0, exc = 0;
      (qs || []).forEach((q) => {
        const i = q.r2_include_pct ?? q.r1_include_pct;
        const m = q.r2_modify_pct ?? q.r1_modify_pct;
        const e = q.r2_exclude_pct ?? q.r1_exclude_pct;
        if (i == null) return;
        n += 1;
        inc += i;
        mod += (m ?? 0);
        exc += (e ?? 0);
      });
      if (n === 0) return null;
      return {
        wg: `WG${wg}`,
        wg_number: parseInt(wg, 10),
        Include: +(inc / n).toFixed(1),
        Modify: +(mod / n).toFixed(1),
        Exclude: +(exc / n).toFixed(1),
      };
    }).filter(Boolean).sort((a, b) => a.wg_number - b.wg_number);
  }, [allQuestions]);

  const evolution = useMemo(() => {
    // R1 questions = the total set across WGs from R1; R2 questions = currently
    // active set. We can derive the deltas from the questions list status.
    let r1 = 0, kept = 0, retired = 0, fresh = 0;
    Object.values(allQuestions).forEach((qs) => {
      (qs || []).forEach((q) => {
        if (q.source === 'chair_round_2') fresh += 1;
        else { kept += 1; r1 += 1; }
      });
    });
    // For retired count, look at status across full questions list if we had it.
    // public-stats gives n_active_questions; we don't have a count of REMOVED easily
    // without admin endpoint. Approximate: use status_breakdown if we had it.
    return { r1, kept, retired, fresh, r2: kept + fresh };
  }, [allQuestions]);

  const topImportance = useMemo(() => {
    const all = [];
    Object.entries(allQuestions).forEach(([wg, qs]) => {
      (qs || []).forEach((q) => {
        const imp = q.r2_importance_mean ?? q.r1_importance_mean;
        const inc = q.r2_include_pct ?? q.r1_include_pct;
        if (imp == null || inc == null) return;
        all.push({ ...q, wg_number: parseInt(wg, 10), imp, inc });
      });
    });
    return all.sort((a, b) => (b.imp || 0) - (a.imp || 0)).slice(0, 8);
  }, [allQuestions]);

  const slides = useMemo(() => {
    const list = [{ kind: 'banner' }];
    if (scatterData.length > 0) list.push({ kind: 'scatter' });
    if (crossWgTop.length > 0) list.push({ kind: 'crosswg_top' });
    if (dispositionData.length > 0) list.push({ kind: 'disposition' });
    if (topImportance.length > 0) list.push({ kind: 'top_importance' });
    (wgs || []).forEach((w) => list.push({ kind: 'wg_top', wg: w }));
    list.push({ kind: 'process' });
    return list;
  }, [wgs, scatterData, crossWgTop, dispositionData, topImportance]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(() => setSlideIdx((i) => (i + 1) % slides.length), ROTATE_MS);
    return () => clearInterval(t);
  }, [slides.length]);

  const slide = slides[slideIdx % slides.length] || slides[0];

  return (
    <div className="relative h-[calc(100vh-4rem)] overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={slideIdx}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="absolute inset-0 flex items-center justify-center px-8 py-8 sm:px-12 sm:py-10"
        >
          {slide.kind === 'banner' && <BannerSlide />}
          {slide.kind === 'scatter' && <ScatterSlide data={scatterData} />}
          {slide.kind === 'crosswg_top' && <CrossWgTopSlide rows={crossWgTop} />}
          {slide.kind === 'disposition' && <DispositionSlide data={dispositionData} />}
          {slide.kind === 'top_importance' && <TopImportanceSlide rows={topImportance} />}
          {slide.kind === 'wg_top' && <WgTopSlide wg={slide.wg} pairwise={pairwise[slide.wg.wg_number] || []} />}
          {slide.kind === 'process' && <ProcessSlide stats={stats} evolution={evolution} />}
        </motion.div>
      </AnimatePresence>

      <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-1.5">
        {slides.map((_, i) => (
          <div key={i} className={`h-1 rounded-full transition-all ${i === slideIdx ? 'w-7 bg-white/85' : 'w-1 bg-white/20'}`} />
        ))}
      </div>
    </div>
  );
}

// ─── Banner ──────────────────────────────────────────────────────────────

function BannerSlide() {
  return (
    <div className="flex h-full w-full max-w-5xl items-center justify-center text-center">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#48CAE4] sm:text-sm">SAEM 2026</p>
        <h1 className="mt-4 text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">AI Consensus Conference</h1>
        <p className="mt-4 text-lg text-white/60 sm:text-xl">Defining the research agenda for AI in Emergency Medicine</p>
        <div className="mt-8 flex items-center justify-center gap-6">
          <div className="rounded-2xl bg-white p-3 sm:p-4">
            <img
              alt="Scan to join"
              src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent('https://saem-ai-consensus-conference-production.up.railway.app/day')}`}
              className="block h-32 w-32 sm:h-40 sm:w-40"
            />
          </div>
          <div className="text-left">
            <p className="text-[10px] uppercase tracking-wider text-white/40 sm:text-xs">Join the conversation</p>
            <p className="mt-1 font-mono text-base text-white sm:text-lg">/day</p>
            <p className="mt-3 text-xs text-white/50 sm:text-sm">May 21, 2026<br/>Atlanta Marriott Marquis</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Concordance scatter ─────────────────────────────────────────────────

function ScatterSlide({ data }) {
  const byWg = useMemo(() => {
    const out = {};
    data.forEach((d) => { (out[d.wg_number] ||= []).push(d); });
    return out;
  }, [data]);

  return (
    <Slide
      maxWidth="max-w-7xl"
      eyebrow="Where the agenda lives"
      title="Importance × consensus across every R2 question"
      subtitle="Each dot is one question. Bubble size = pairwise rank. Top-right is the strongest consensus."
    >
      <div className="flex h-full flex-col">
        <div className="min-h-0 flex-1 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 20, bottom: 40, left: 40 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" />
              <XAxis
                type="number" dataKey="x" name="Importance" domain={[1, 9]} ticks={[1, 3, 5, 7, 9]}
                tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
                label={{ value: 'Importance (1–9)', position: 'insideBottom', offset: -20, fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
              />
              <YAxis
                type="number" dataKey="y" name="Include %" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]}
                tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
                label={{ value: 'Include %', angle: -90, position: 'insideLeft', offset: 10, fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
              />
              <ZAxis type="number" dataKey="z" range={[40, 400]} />
              <Tooltip
                cursor={{ strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.15)' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0].payload;
                  return (
                    <div className="max-w-sm rounded-lg border border-white/[0.1] bg-[#0A1628] px-3 py-2 text-xs shadow-xl">
                      <p className="font-semibold" style={{ color: PILLAR_COLORS[p.wg_number] }}>WG{p.wg_number} · {WG_SHORT[p.wg_number]}</p>
                      <p className="mt-1 text-white/85">{p.text}</p>
                      <p className="mt-2 font-mono text-[10px] text-white/50">imp {p.x.toFixed(1)} · inc {Math.round(p.y)}%</p>
                    </div>
                  );
                }}
              />
              {Object.entries(byWg).map(([wg, points]) => (
                <Scatter key={wg} name={`WG${wg}`} data={points} fill={PILLAR_COLORS[parseInt(wg, 10)]} fillOpacity={0.75} />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 flex shrink-0 flex-wrap justify-center gap-3">
          {Object.keys(WG_NAMES).map((wg) => (
            <div key={wg} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PILLAR_COLORS[wg] }} />
              <span className="text-xs text-white/60">{WG_SHORT[wg]}</span>
            </div>
          ))}
        </div>
      </div>
    </Slide>
  );
}

// ─── Cross-WG Top 8 ─────────────────────────────────────────────────────

function CrossWgTopSlide({ rows }) {
  const max = Math.max(1, ...rows.map((r) => r.score || 0));
  return (
    <Slide
      eyebrow="Across every working group"
      title="Top 8 questions — Round 2"
      subtitle="Ranked by pairwise score, color-coded by WG."
    >
      <ol className="flex h-full flex-col justify-between gap-2">
        {rows.map((r, i) => {
          const c = PILLAR_COLORS[r.wg_number] || '#00B4D8';
          const pct = (r.score / max) * 100;
          return (
            <li key={r.question_id || i} className="flex min-h-0 items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-2.5">
              <span className="w-6 shrink-0 text-center font-mono text-lg font-bold text-white/30">{i + 1}</span>
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-[11px] font-bold" style={{ backgroundColor: `${c}25`, color: c }}>{r.wg_number}</span>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm leading-snug text-white/90 sm:text-base">{r.text}</p>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.04]">
                  <motion.div
                    initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.9, delay: 0.04 * i, ease: 'easeOut' }}
                    className="h-full rounded-full" style={{ backgroundColor: c }}
                  />
                </div>
              </div>
              <span className="shrink-0 font-mono text-sm font-semibold text-white/70">{Math.round(r.score)}</span>
            </li>
          );
        })}
      </ol>
    </Slide>
  );
}

// ─── Disposition stacks ──────────────────────────────────────────────────

function DispositionSlide({ data }) {
  return (
    <Slide
      eyebrow="How the room voted"
      title="Include · Modify · Exclude across the five WGs"
      subtitle="Average disposition across each WG's R2 question set."
    >
      <div className="flex h-full flex-col">
        <div className="min-h-0 flex-1 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 10, right: 30, bottom: 10, left: 70 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} unit="%" />
              <YAxis type="category" dataKey="wg" tick={{ fill: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: 600 }} />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="rounded-lg border border-white/[0.1] bg-[#0A1628] px-3 py-2 text-xs shadow-xl">
                      <p className="font-semibold text-white">{label}</p>
                      {payload.map((p) => (
                        <p key={p.name} className="mt-1 font-mono text-[11px]" style={{ color: p.color }}>
                          {p.name}: {p.value.toFixed(1)}%
                        </p>
                      ))}
                    </div>
                  );
                }}
              />
              <Bar dataKey="Include" stackId="d" fill="#10b981" />
              <Bar dataKey="Modify" stackId="d" fill="#f59e0b" />
              <Bar dataKey="Exclude" stackId="d" fill="#ef4444" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 flex shrink-0 justify-center gap-4 text-xs text-white/60">
          <Legend swatch="#10b981" label="Include" />
          <Legend swatch="#f59e0b" label="Include with modifications" />
          <Legend swatch="#ef4444" label="Exclude" />
        </div>
      </div>
    </Slide>
  );
}

function Legend({ swatch, label }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: swatch }} />
      <span>{label}</span>
    </div>
  );
}

// ─── Top by Importance ──────────────────────────────────────────────────

function TopImportanceSlide({ rows }) {
  return (
    <Slide
      eyebrow="The questions the group cares about most"
      title="Top 8 by importance — Round 2"
      subtitle="Independently of include%, these are the questions that scored highest on the 1–9 importance scale."
    >
      <ol className="flex h-full flex-col justify-between gap-2">
        {rows.map((r, i) => {
          const c = PILLAR_COLORS[r.wg_number] || '#00B4D8';
          const impPct = ((r.imp - 1) / 8) * 100;
          return (
            <li key={r.id || i} className="flex min-h-0 items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-2.5">
              <span className="w-6 shrink-0 text-center font-mono text-lg font-bold text-white/30">{i + 1}</span>
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-[11px] font-bold" style={{ backgroundColor: `${c}25`, color: c }}>{r.wg_number}</span>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm leading-snug text-white/90 sm:text-base">{r.text}</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.04]">
                    <motion.div
                      initial={{ width: 0 }} animate={{ width: `${impPct}%` }}
                      transition={{ duration: 0.9, delay: 0.04 * i, ease: 'easeOut' }}
                      className="h-full rounded-full bg-amber-400"
                    />
                  </div>
                  <span className="shrink-0 font-mono text-[10px] text-white/40">inc {Math.round(r.inc)}%</span>
                </div>
              </div>
              <span className="shrink-0 font-mono text-sm font-semibold text-amber-300">{r.imp.toFixed(1)}</span>
            </li>
          );
        })}
      </ol>
    </Slide>
  );
}

// ─── Per-WG top questions ────────────────────────────────────────────────

function WgTopSlide({ wg, pairwise }) {
  const top = pairwise.slice(0, 5);
  const accent = PILLAR_COLORS[wg.wg_number] || '#00B4D8';
  return (
    <Slide
      eyebrow={`Working Group ${wg.wg_number}`}
      title={WG_NAMES[wg.wg_number] || wg.name}
      subtitle="Top Round 2 pairwise rankings"
    >
      <div className="flex h-full items-start">
        {top.length === 0 ? (
          <p className="text-base text-white/30">No Round 2 pairwise data yet.</p>
        ) : (
          <ol className="w-full space-y-3">
            {top.map((q, i) => (
              <li key={q.question_id} className="flex items-start gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ backgroundColor: `${accent}25`, color: accent }}>{i + 1}</span>
                <p className="flex-1 text-base leading-snug text-white/90 sm:text-lg">{q.text}</p>
                <span className="shrink-0 font-mono text-sm font-semibold text-white/40">{Number(q.score).toFixed(0)}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </Slide>
  );
}

// ─── Process flow + numbers ─────────────────────────────────────────────

function ProcessSlide({ stats, evolution }) {
  const steps = [
    { label: 'Literature scan', kind: 'done' },
    { label: 'Question gen', kind: 'done' },
    { label: 'Delphi R1', kind: 'done' },
    { label: 'Chair curation', kind: 'done' },
    { label: 'Delphi R2', kind: 'done' },
    { label: 'Conference day', kind: 'now' },
    { label: 'Manuscript', kind: 'upcoming' },
  ];
  return (
    <Slide
      eyebrow="The process so far"
      title="From a literature scan to a research agenda"
      maxWidth="max-w-5xl"
    >
      <div className="flex h-full flex-col justify-around">
        <div className="flex items-center justify-between">
          {steps.map((s, i) => (
            <div key={i} className="flex flex-1 items-center">
              <div className="flex flex-col items-center">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold ${
                  s.kind === 'done' ? 'bg-emerald-500/25 text-emerald-300' :
                  s.kind === 'now' ? 'bg-amber-500/30 text-amber-200 ring-2 ring-amber-400/50 animate-pulse' :
                  'bg-white/[0.06] text-white/30'
                }`}>{s.kind === 'done' ? '✓' : i + 1}</div>
                <p className={`mt-2 max-w-[80px] text-center text-[10px] font-medium leading-tight ${
                  s.kind === 'now' ? 'text-amber-200' : s.kind === 'done' ? 'text-white/60' : 'text-white/30'
                }`}>{s.label}</p>
              </div>
              {i < steps.length - 1 && <div className={`mx-1 h-px flex-1 ${i < 4 ? 'bg-emerald-500/30' : 'bg-white/[0.08]'}`} />}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-4 gap-3">
          <BigStat value={stats?.n_participants ?? '—'} label="Expert reviewers" />
          <BigStat value={stats?.n_active_questions ?? '—'} label="R2 questions" />
          <BigStat value={evolution?.fresh ?? '—'} label="New in R2" accent="#48CAE4" />
          <BigStat value="2" label="Delphi rounds" />
        </div>
      </div>
    </Slide>
  );
}

function BigStat({ value, label, accent }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-center">
      <p className="text-3xl font-bold sm:text-4xl" style={accent ? { color: accent } : { color: 'white' }}>{value}</p>
      <p className="mt-1 text-[10px] uppercase tracking-wider text-white/40">{label}</p>
    </div>
  );
}
