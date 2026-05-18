/**
 * Round 2 report — leaner companion to the Round 1 page.
 *
 * Headline: how the deliberation moved between R1 and R2, which
 * questions survived, where pairwise voting landed, and where R2
 * response coverage is still thin (so the chair can chase before May
 * 21). No DOCX export, no embedding/cluster work — that's R1's job.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  ArrowRight, BarChart3, Loader2, Lock, AlertCircle, TrendingUp, TrendingDown,
  Minus, Trophy, Users, CheckCircle2, Network, Sparkles, ChevronLeft,
} from 'lucide-react';
import {
  NetworkSVG, OverlapPairsTable, ThemeBars, PillarMatrix, CrossCuttingMatrix,
} from '@/pages/Round1ReportPage';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { usePageTitle } from '@/hooks/usePageTitle';

const WG_COLORS = {
  1: '#00B4D8',
  2: '#4F8AB7',
  3: '#6366F1',
  4: '#10B981',
  5: '#F59E0B',
};

const fmtPct = (v) => (v == null ? '—' : `${Math.round(v * (v <= 1 ? 100 : 1))}%`);
const fmtNum = (v, d = 1) => (v == null ? '—' : Number(v).toFixed(d));

export function Round2ReportPage() {
  usePageTitle('Round 2 Report');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedWg, setSelectedWg] = useState(null);

  useEffect(() => {
    setLoading(true);
    api('/api/admin/reports/round2/data')
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const questionsByWg = useMemo(() => {
    const m = new Map();
    (data?.questions || []).forEach((q) => {
      if (!m.has(q.wg_number)) m.set(q.wg_number, []);
      m.get(q.wg_number).push(q);
    });
    return m;
  }, [data]);

  // R1's viz components key by question_id; build a map compatible with
  // their shape (they expect r1_* fields). The R2 report's questions
  // payload already includes those columns from the per_question_rows
  // service, so this is a direct mapping.
  const questionsById = useMemo(() => {
    const m = new Map();
    (data?.questions || []).forEach((q) => m.set(q.question_id, q));
    return m;
  }, [data]);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <Skeleton className="h-8 w-72" />
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (error) {
    const isAuth = error.includes('401') || error.toLowerCase().includes('authoriz');
    const here = typeof window !== 'undefined' ? window.location.pathname : '/reports/round2';
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400">
          <Lock className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-bold text-white">
          {isAuth ? 'Sign in required' : 'Could not load report'}
        </h1>
        <p className="mt-3 text-sm text-white/60">{error}</p>
        {isAuth && (
          <Link to={`/join?redirect=${encodeURIComponent(here)}`}>
            <Button className="mt-6">Sign in</Button>
          </Link>
        )}
      </div>
    );
  }

  const ov = data.overall;
  const wgs = data.working_groups || [];
  const shifts = data.top_shifts || [];
  const pairLeaders = data.pairwise_leaders || [];

  return (
    <div className="bg-[#0A1628] pb-16">
      <Helmet>
        <title>Round 2 Report · SAEM 2026 AI Consensus</title>
      </Helmet>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/[0.06] px-4 py-10 sm:px-6 sm:py-14">
        <div className="pointer-events-none absolute -top-32 left-1/2 h-[440px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-b from-purple-500/15 to-transparent blur-3xl" />
        <div className="relative mx-auto max-w-5xl">
          <Link
            to="/reports"
            className="mb-4 inline-flex items-center gap-1 text-xs text-white/40 transition hover:text-white/70"
          >
            <ChevronLeft className="h-3 w-3" />
            Back to Reports
          </Link>
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-purple-300">
            Round 2 — deliberation report
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            What survived, what shifted
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-white/55 sm:text-base">
            Round 2 took the revised question set back to working-group members for inclusion + importance ratings,
            plus pairwise comparison. Below: where coverage stands today, which questions moved most between rounds,
            and the pairwise leaderboard.
          </p>

          {/* Headline stats */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile icon={Users} label="R2 responders"
                      value={`${ov.r2_unique_participants} / ${ov.n_eligible_participants}`}
                      hint={ov.r2_response_rate != null ? `${Math.round(ov.r2_response_rate * 100)}% response rate` : null} />
            <StatTile icon={CheckCircle2} label="Active questions"
                      value={ov.n_questions_active}
                      hint={`${ov.n_questions_removed} removed in R1→R2`} />
            <StatTile icon={BarChart3} label="R2 ratings cast"
                      value={ov.r2_responses.toLocaleString()}
                      hint={`${ov.r1_unique_participants} unique R1 voters`} />
            <StatTile icon={Trophy} label="Working groups"
                      value={ov.n_working_groups}
                      hint="Five WGs in flight" />
          </div>
        </div>
      </section>

      {/* Per-WG response coverage table */}
      <section className="mx-auto max-w-5xl px-4 pt-10 sm:px-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-cyan-400" />
              Per-working-group coverage
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-white/[0.05] bg-white/[0.02] text-xs uppercase tracking-wider text-white/40">
                  <tr>
                    <th className="px-4 py-3 text-left">WG</th>
                    <th className="px-4 py-3 text-left">Pillar</th>
                    <th className="px-4 py-3 text-right">Active Qs</th>
                    <th className="px-4 py-3 text-right">R2 responders</th>
                    <th className="px-4 py-3 text-right">Coverage</th>
                    <th className="px-4 py-3 text-right">Avg incl.</th>
                    <th className="px-4 py-3 text-right">Avg import.</th>
                    <th className="px-4 py-3 text-right">Pairwise</th>
                  </tr>
                </thead>
                <tbody>
                  {wgs.map((w) => {
                    const color = WG_COLORS[w.wg_number] || '#94A3B8';
                    const cov = w.r2_response_rate;
                    return (
                      <tr key={w.wg_id} className="border-b border-white/[0.04] hover:bg-white/[0.03]">
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setSelectedWg(w.wg_number === selectedWg ? null : w.wg_number)}
                            className="flex items-center gap-2 text-left"
                          >
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded font-bold"
                                  style={{ backgroundColor: `${color}25`, color }}>
                              {w.wg_number}
                            </span>
                            <span className="font-medium text-white/85">{w.short_name || w.name}</span>
                          </button>
                        </td>
                        <td className="px-4 py-3 text-xs text-white/55">{w.pillar || '—'}</td>
                        <td className="px-4 py-3 text-right font-mono text-white/85">{w.n_questions_active}</td>
                        <td className="px-4 py-3 text-right font-mono text-white/85">
                          {w.r2_responders} / {w.n_eligible}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-mono ${cov != null && cov < 0.7 ? 'text-amber-300' : 'text-emerald-300'}`}>
                            {cov != null ? `${Math.round(cov * 100)}%` : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-white/85">
                          {fmtPct(w.avg_r2_include_pct)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-white/85">
                          {fmtNum(w.avg_r2_importance, 1)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-white/55">{w.n_pairwise_comparisons}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Top deliberation shifts */}
      <section className="mx-auto max-w-5xl px-4 pt-8 sm:px-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              Biggest R1 → R2 importance shifts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {shifts.length === 0 ? (
              <p className="text-sm text-white/40">No questions have shift data yet.</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={Math.max(220, shifts.length * 32)}>
                  <BarChart
                    layout="vertical"
                    data={shifts.map((s) => ({
                      name: `WG${s.wg_number} · ${s.short_text || `Q${s.question_id}`}`.slice(0, 60),
                      shift: s.importance_shift,
                      text: s.text,
                      wg_number: s.wg_number,
                    }))}
                    margin={{ top: 4, right: 32, bottom: 4, left: 12 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                    <XAxis type="number" domain={[-4, 4]}
                           tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={220}
                           tick={{ fill: 'rgba(255,255,255,0.75)', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                      contentStyle={{ background: '#0E1E35', border: '1px solid #1e3a5f', borderRadius: 8, fontSize: 12 }}
                      formatter={(v, _, p) => [`${v > 0 ? '+' : ''}${v.toFixed(2)} importance`, p?.payload?.text || '']}
                    />
                    <Bar dataKey="shift" radius={[0, 4, 4, 0]}>
                      {shifts.map((s, i) => (
                        <Cell key={i} fill={s.importance_shift > 0 ? '#10b981' : '#f87171'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <p className="mt-2 text-[11px] text-white/40">
                  Green: gained importance after deliberation. Red: lost.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Pairwise leaderboard */}
      {pairLeaders.length > 0 && (
        <section className="mx-auto max-w-5xl px-4 pt-8 sm:px-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Trophy className="h-4 w-4 text-amber-400" />
                Pairwise leaderboard (top 10)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ol className="divide-y divide-white/[0.04]">
                {pairLeaders.map((q, i) => {
                  const color = WG_COLORS[q.wg_number] || '#94A3B8';
                  return (
                    <li key={q.question_id} className="flex items-start gap-3 px-4 py-3">
                      <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded font-mono text-xs font-bold text-white/70"
                            style={{ backgroundColor: `${color}25` }}>
                        {i + 1}
                      </span>
                      <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-bold"
                            style={{ backgroundColor: `${color}25`, color }}>
                        {q.wg_number}
                      </span>
                      <p className="min-w-0 flex-1 text-sm text-white/85 line-clamp-2">{q.text}</p>
                      <span className="shrink-0 font-mono text-sm font-semibold text-white/90">
                        {Math.round(q.pairwise_score)}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Per-WG drill-down (selected via the coverage table) */}
      {selectedWg && (
        <section className="mx-auto max-w-5xl px-4 pt-8 sm:px-6">
          <WgDetailCard
            wgNumber={selectedWg}
            questions={(questionsByWg.get(selectedWg) || [])}
            onClose={() => setSelectedWg(null)}
          />
        </section>
      )}

      {/* === D-series cross-WG analytics (parity with R1) ============== */}

      {data.network && (
        <section className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network className="h-4 w-4 text-purple-400" />
                D.1 Question similarity network
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-xs text-white/55">
                Force-directed graph of the post-R2 question set. Nodes colored by working group,
                sized by Round 2 importance. Cross-WG edges shown in red. Hover for question text;
                click to isolate a node and its connections.
              </p>
              <NetworkSVG network={data.network} />
            </CardContent>
          </Card>
        </section>
      )}

      {(data.overlap_pairs || []).length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-400" />
                D.2 Top cross-WG overlap pairs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-xs text-white/55">
                Pairs of questions in different working groups with cosine similarity ≥ 0.55,
                sorted highest first. Co-leads can review for merge / coordinate / keep-both.
              </p>
              <OverlapPairsTable pairs={data.overlap_pairs} />
            </CardContent>
          </Card>
        </section>
      )}

      {(data.themes || []).length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-400" />
                D.3 Thematic clusters across the post-R2 agenda
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-xs text-white/55">
                Hierarchical Ward clustering on question similarity. Each bar is a theme;
                segments stacked by WG composition. Theme labels generated by Claude.
              </p>
              <ThemeBars themes={data.themes} />
            </CardContent>
          </Card>
        </section>
      )}

      {(data.pillar_matrix || []).length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-400" />
                D.4 Pillar × Working-Group matrix
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-xs text-white/55">
                How each WG's post-R2 questions distribute across the four foundational pillars
                (Technology · Training · Self · Society). Click a cell to inspect the questions.
              </p>
              <PillarMatrix matrix={data.pillar_matrix} questionsById={questionsById} />
            </CardContent>
          </Card>
        </section>
      )}

      {(data.cross_cutting_matrix || []).length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-400" />
                D.5 Cross-cutting themes × Working-Group matrix
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-xs text-white/55">
                Cross-cutting concerns (equity, safety, evaluation, etc.) tagged by Claude
                across the post-R2 set. Cells show how often each WG surfaces each theme.
              </p>
              <CrossCuttingMatrix matrix={data.cross_cutting_matrix} questionsById={questionsById} />
            </CardContent>
          </Card>
        </section>
      )}

      {/* Footer */}
      <section className="mx-auto max-w-5xl px-4 pt-10 sm:px-6">
        <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <p className="text-xs text-white/45">
            Showing R2 data as of right now. Conference day on May 21 will lock the final set.
          </p>
          <Link to="/welcome">
            <Button variant="secondary" size="sm">
              Back to welcome
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}

function StatTile({ icon: Icon, label, value, hint }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-cyan-400/80" />
        <span className="text-[10px] uppercase tracking-wider text-white/40">{label}</span>
      </div>
      <p className="mt-1 text-xl font-bold text-white sm:text-2xl">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-white/40">{hint}</p>}
    </div>
  );
}

function WgDetailCard({ wgNumber, questions, onClose }) {
  const color = WG_COLORS[wgNumber] || '#94A3B8';
  const sorted = [...questions].sort(
    (a, b) => (b.r2_importance_mean || 0) - (a.r2_importance_mean || 0)
              || (b.r2_include_pct || 0) - (a.r2_include_pct || 0)
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded font-bold"
                style={{ backgroundColor: `${color}25`, color }}>
            {wgNumber}
          </span>
          Working Group {wgNumber} — all active questions
          <button onClick={onClose} className="ml-auto text-xs text-white/40 hover:text-white/70">
            Close
          </button>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-white/[0.05] bg-white/[0.02] text-xs uppercase tracking-wider text-white/40">
              <tr>
                <th className="px-4 py-2 text-left">Question</th>
                <th className="px-4 py-2 text-right">R1 incl.</th>
                <th className="px-4 py-2 text-right">R2 incl.</th>
                <th className="px-4 py-2 text-right">R1 import.</th>
                <th className="px-4 py-2 text-right">R2 import.</th>
                <th className="px-4 py-2 text-right">Δ</th>
                <th className="px-4 py-2 text-right">Pairwise</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((q) => {
                const shift = q.importance_shift;
                const ShiftIcon = shift == null ? Minus : shift > 0.1 ? TrendingUp : shift < -0.1 ? TrendingDown : Minus;
                const shiftColor = shift == null ? 'text-white/30'
                  : shift > 0.1 ? 'text-emerald-400'
                  : shift < -0.1 ? 'text-red-400' : 'text-white/40';
                return (
                  <tr key={q.question_id} className="border-b border-white/[0.04] hover:bg-white/[0.03]">
                    <td className="px-4 py-2 text-white/85">
                      <p className="line-clamp-2">{q.text}</p>
                      {q.featured_in_panel && (
                        <Badge variant="primary" className="mt-1 text-[10px]">In panel pool</Badge>
                      )}
                      {q.featured_in_cross_wg && (
                        <Badge variant="warning" className="ml-1 mt-1 text-[10px]">Advanced cross-WG</Badge>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-white/65">{fmtPct(q.r1_include_pct)}</td>
                    <td className="px-4 py-2 text-right font-mono text-white/85">{fmtPct(q.r2_include_pct)}</td>
                    <td className="px-4 py-2 text-right font-mono text-white/65">{fmtNum(q.r1_importance_mean)}</td>
                    <td className="px-4 py-2 text-right font-mono text-white/85">{fmtNum(q.r2_importance_mean)}</td>
                    <td className={`px-4 py-2 text-right font-mono ${shiftColor}`}>
                      <span className="inline-flex items-center gap-1 justify-end">
                        <ShiftIcon className="h-3 w-3" />
                        {shift != null ? `${shift > 0 ? '+' : ''}${shift.toFixed(2)}` : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-white/65">
                      {q.pairwise_score != null ? Math.round(q.pairwise_score) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export default Round2ReportPage;
