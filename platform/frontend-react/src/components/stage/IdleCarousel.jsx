/**
 * Idle / landing carousel — projector content before the conference
 * starts and between sessions.
 *
 * Auto-rotating slides, designed for big-screen viewing:
 *   1. Banner + QR
 *   2. Cross-WG concordance scatter (importance × include% × pairwise)
 *   3. Cross-WG top-10 leaderboard
 *   4. Per-WG top R2 questions (5 slides — one per WG)
 *   5. Methodology flow + by-the-numbers
 *
 * All data is pulled live from existing public endpoints — no admin
 * auth needed so the projector can run unattended.
 */

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis,
  CartesianGrid, Tooltip,
} from 'recharts';
import { api } from '@/lib/api';

const ROTATE_MS = 14_000;

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

export function IdleCarousel({ bus }) {
  const [wgs, setWgs] = useState([]);
  const [allQuestions, setAllQuestions] = useState({}); // wg → questions
  const [pairwise, setPairwise] = useState({}); // wg → rankings
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
      } catch { /* silent — projector keeps rotating regardless */ }
    })();
    return () => { cancelled = true; };
  }, [bus]);

  // Cross-WG aggregated leaderboard
  const crossWgTop = useMemo(() => {
    const all = [];
    Object.entries(pairwise).forEach(([wg, rankings]) => {
      (rankings || []).forEach((r) => {
        all.push({ ...r, wg_number: parseInt(wg, 10) });
      });
    });
    return all.sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 10);
  }, [pairwise]);

  // Scatter data: importance × include%, joined w/ pairwise score for bubble size
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
          z: Math.max(15, (pwById[q.id] || 50)),
          text: q.text,
        });
      });
    });
    return out;
  }, [allQuestions, pairwise]);

  const slides = useMemo(() => {
    const list = [{ kind: 'banner' }];
    if (scatterData.length > 0) list.push({ kind: 'scatter' });
    if (crossWgTop.length > 0) list.push({ kind: 'crosswg_top' });
    (wgs || []).forEach((w) => list.push({ kind: 'wg_top', wg: w }));
    list.push({ kind: 'process' });
    return list;
  }, [wgs, scatterData, crossWgTop]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(() => setSlideIdx((i) => (i + 1) % slides.length), ROTATE_MS);
    return () => clearInterval(t);
  }, [slides.length]);

  const slide = slides[slideIdx % slides.length] || slides[0];

  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={slideIdx}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -24 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="absolute inset-0 flex items-center justify-center px-10 py-12"
        >
          {slide.kind === 'banner' && <BannerSlide />}
          {slide.kind === 'scatter' && <ScatterSlide data={scatterData} />}
          {slide.kind === 'crosswg_top' && <CrossWgTopSlide rows={crossWgTop} />}
          {slide.kind === 'wg_top' && <WgTopSlide wg={slide.wg} pairwise={pairwise[slide.wg.wg_number] || []} />}
          {slide.kind === 'process' && <ProcessSlide stats={stats} />}
        </motion.div>
      </AnimatePresence>

      <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 gap-1.5">
        {slides.map((_, i) => (
          <div key={i} className={`h-1.5 rounded-full transition-all ${i === slideIdx ? 'w-8 bg-white/80' : 'w-1.5 bg-white/20'}`} />
        ))}
      </div>
    </div>
  );
}

// ─── Banner ──────────────────────────────────────────────────────────────

function BannerSlide() {
  return (
    <div className="text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#48CAE4]">SAEM 2026</p>
      <h1 className="mt-6 text-7xl font-bold tracking-tight">AI Consensus Conference</h1>
      <p className="mt-6 text-2xl text-white/60">Defining the research agenda for AI in Emergency Medicine</p>
      <div className="mt-12 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
        <div className="rounded-2xl bg-white p-4">
          <img
            alt="Scan to join"
            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent('https://saem-ai-consensus-conference-production.up.railway.app/day')}`}
            className="block h-44 w-44"
          />
        </div>
        <div className="text-left">
          <p className="text-xs uppercase tracking-wider text-white/40">Join the conversation</p>
          <p className="mt-1 font-mono text-base text-white">/day</p>
          <p className="mt-4 text-sm text-white/50">May 21, 2026<br/>Atlanta Marriott Marquis</p>
        </div>
      </div>
    </div>
  );
}

// ─── Concordance scatter ─────────────────────────────────────────────────

function ScatterSlide({ data }) {
  // Group data by WG so each WG gets a distinct Scatter series + color
  const byWg = useMemo(() => {
    const out = {};
    data.forEach((d) => {
      if (!out[d.wg_number]) out[d.wg_number] = [];
      out[d.wg_number].push(d);
    });
    return out;
  }, [data]);

  return (
    <div className="w-full max-w-7xl">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#48CAE4]">Where the agenda lives</p>
        <h2 className="mt-3 text-5xl font-bold leading-tight">Importance × consensus across every question</h2>
        <p className="mt-3 text-base text-white/55">
          Each dot is a Round 2 question. Bubble size = pairwise rank.
          Top-right is the strongest consensus — high importance, high agreement.
        </p>
      </div>
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
        <ResponsiveContainer width="100%" height={460}>
          <ScatterChart margin={{ top: 20, right: 30, bottom: 50, left: 50 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.04)" />
            <XAxis
              type="number"
              dataKey="x"
              name="Importance"
              domain={[1, 9]}
              ticks={[1, 3, 5, 7, 9]}
              tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
              label={{ value: 'Importance (1–9)', position: 'insideBottom', offset: -25, fill: 'rgba(255,255,255,0.5)', fontSize: 13 }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="Include %"
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
              label={{ value: 'Include %', angle: -90, position: 'insideLeft', offset: 10, fill: 'rgba(255,255,255,0.5)', fontSize: 13 }}
            />
            <ZAxis type="number" dataKey="z" range={[60, 600]} />
            <Tooltip
              cursor={{ strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.15)' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload;
                return (
                  <div className="max-w-sm rounded-lg border border-white/[0.1] bg-[#0A1628] px-3 py-2 text-xs shadow-xl">
                    <p className="font-semibold" style={{ color: PILLAR_COLORS[p.wg_number] }}>
                      WG{p.wg_number} · {WG_SHORT[p.wg_number]}
                    </p>
                    <p className="mt-1 text-white/85">{p.text}</p>
                    <p className="mt-2 font-mono text-[10px] text-white/50">imp {p.x.toFixed(1)} · inc {Math.round(p.y)}% · pw {Math.round(p.z)}</p>
                  </div>
                );
              }}
            />
            {Object.entries(byWg).map(([wg, points]) => (
              <Scatter
                key={wg}
                name={`WG${wg}`}
                data={points}
                fill={PILLAR_COLORS[parseInt(wg, 10)]}
                fillOpacity={0.7}
              />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-4">
        {Object.keys(WG_NAMES).map((wg) => (
          <div key={wg} className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: PILLAR_COLORS[wg] }} />
            <span className="text-xs text-white/60">{WG_SHORT[wg]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Cross-WG Top 10 ─────────────────────────────────────────────────────

function CrossWgTopSlide({ rows }) {
  const max = Math.max(1, ...rows.map((r) => r.score || 0));
  return (
    <div className="w-full max-w-6xl">
      <div className="mb-7">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#48CAE4]">Across every working group</p>
        <h2 className="mt-3 text-5xl font-bold leading-tight">Top 10 questions — Round 2</h2>
        <p className="mt-3 text-base text-white/55">By pairwise score across all five WGs.</p>
      </div>
      <ol className="space-y-2.5">
        {rows.map((r, i) => {
          const c = PILLAR_COLORS[r.wg_number] || '#00B4D8';
          const pct = (r.score / max) * 100;
          return (
            <li key={r.question_id || i} className="flex items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <span className="w-7 text-center font-mono text-2xl font-bold text-white/30">{i + 1}</span>
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded text-xs font-bold" style={{ backgroundColor: `${c}25`, color: c }}>
                {r.wg_number}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-base text-white/90">{r.text}</p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.04]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 1, delay: 0.05 * i, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: c }}
                  />
                </div>
              </div>
              <span className="shrink-0 font-mono text-base font-semibold text-white/70">{Math.round(r.score)}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ─── Per-WG top questions ────────────────────────────────────────────────

function WgTopSlide({ wg, pairwise }) {
  const top = pairwise.slice(0, 5);
  const accent = PILLAR_COLORS[wg.wg_number] || '#00B4D8';
  return (
    <div className="w-full max-w-6xl">
      <div className="mb-8 flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl font-bold" style={{ backgroundColor: `${accent}25`, color: accent }}>
          {wg.wg_number}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-white/40">Working Group {wg.wg_number}</p>
          <h2 className="mt-1 text-4xl font-bold">{WG_NAMES[wg.wg_number] || wg.name}</h2>
        </div>
      </div>
      <p className="mb-5 text-sm font-medium uppercase tracking-wider text-white/40">
        Top Round 2 pairwise rankings
      </p>
      {top.length === 0 ? (
        <p className="text-base text-white/30">No Round 2 pairwise data yet.</p>
      ) : (
        <ol className="space-y-3">
          {top.map((q, i) => (
            <li key={q.question_id} className="flex items-start gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
              <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold" style={{ backgroundColor: `${accent}25`, color: accent }}>{i + 1}</span>
              <p className="flex-1 text-lg leading-snug text-white/90">{q.text}</p>
              <span className="shrink-0 font-mono text-sm font-semibold text-white/40">{Number(q.score).toFixed(0)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

// ─── Process flow + stats ────────────────────────────────────────────────

function ProcessSlide({ stats }) {
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
    <div className="w-full max-w-5xl">
      <div className="mb-10 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#48CAE4]">The process so far</p>
        <h2 className="mt-3 text-5xl font-bold leading-tight">From a literature scan to a research agenda</h2>
      </div>

      <div className="mb-10 flex items-center justify-between">
        {steps.map((s, i) => (
          <div key={i} className="flex flex-1 items-center">
            <div className="flex flex-col items-center">
              <div className={`flex h-9 w-9 items-center justify-center rounded-full ${
                s.kind === 'done' ? 'bg-emerald-500/25 text-emerald-300' :
                s.kind === 'now' ? 'bg-amber-500/25 text-amber-200 ring-2 ring-amber-400/50 animate-pulse' :
                'bg-white/[0.06] text-white/30'
              } text-xs font-bold`}>
                {s.kind === 'done' ? '✓' : i + 1}
              </div>
              <p className={`mt-2 text-center text-[11px] font-medium ${s.kind === 'now' ? 'text-amber-200' : s.kind === 'done' ? 'text-white/55' : 'text-white/30'}`}>
                {s.label}
              </p>
            </div>
            {i < steps.length - 1 && (
              <div className={`mx-1 h-px flex-1 ${i < 4 ? 'bg-emerald-500/30' : 'bg-white/[0.08]'}`} />
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
        <BigStat value={stats?.n_participants ?? '—'} label="Expert reviewers" />
        <BigStat value={stats?.n_active_questions ?? '—'} label="R2 questions" />
        <BigStat value="2" label="Delphi rounds" />
        <BigStat value="5" label="Working groups" />
      </div>
    </div>
  );
}

function BigStat({ value, label }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 text-center">
      <p className="text-4xl font-bold text-white">{value}</p>
      <p className="mt-1 text-[11px] uppercase tracking-wider text-white/40">{label}</p>
    </div>
  );
}
