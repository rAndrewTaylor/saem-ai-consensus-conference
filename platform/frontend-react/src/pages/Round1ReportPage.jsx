import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  ArrowRight, Network, Sparkles, BarChart3, Loader2, Lock, Download,
  AlertCircle, ChevronDown, ChevronUp,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell, Legend,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { api, downloadFile, getAdminToken } from '@/lib/api';
import { usePageTitle } from '@/hooks/usePageTitle';

// WG → color (matches the platform's pillar palette)
const WG_COLORS = {
  1: '#00B4D8',
  2: '#4F8AB7',
  3: '#6366F1',
  4: '#10B981',
  5: '#F59E0B',
};
const PILLAR_COLORS = {
  Technology: '#00B4D8',
  Training:   '#4F8AB7',
  Self:       '#10B981',
  Society:    '#F59E0B',
};

export function Round1ReportPage() {
  usePageTitle('Round 1 Report');
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadingDocx, setDownloadingDocx] = useState(false);

  const isAdmin = !!getAdminToken();

  useEffect(() => {
    setLoading(true);
    api('/api/admin/reports/round1/data')
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleDownloadDocx = async () => {
    setDownloadingDocx(true);
    try {
      await downloadFile('/api/admin/reports/round1', 'Round_1_Report.docx');
      toast({ message: 'Report downloaded', type: 'success' });
    } catch (err) {
      toast({ message: err.message || 'Download failed', type: 'error' });
    } finally {
      setDownloadingDocx(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <Skeleton className="h-8 w-72" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-48" /><Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (error) {
    const isAuth = error.includes('401') || error.toLowerCase().includes('authoriz');
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400">
          <Lock className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-bold text-white">
          {isAuth ? 'Sign in required' : 'Could not load report'}
        </h1>
        <p className="mt-3 text-sm text-white/60">{error}</p>
        <Link to="/join" className="mt-6 inline-block">
          <Button variant="secondary" size="sm">Sign in</Button>
        </Link>
      </div>
    );
  }

  const overall = data?.overall || {};
  const wgs = data?.working_groups || [];
  const themes = data?.themes || [];
  const pillarMatrix = data?.pillar_matrix || [];
  const ccMatrix = data?.cross_cutting_matrix || [];
  const overlapPairs = data?.overlap_pairs || [];
  const network = data?.network || null;

  return (
    <div className="flex flex-col bg-[#0A1628]">
      <Helmet>
        <meta name="description" content="SAEM 2026 AI Consensus — Round 1 Report" />
      </Helmet>

      <div className="relative overflow-hidden px-4 py-12 sm:px-6">
        <div className="pointer-events-none absolute -top-32 left-1/2 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-b from-[#1B5E8A]/10 to-transparent blur-3xl" />
        <div className="relative mx-auto max-w-6xl">
          <Badge variant="primary" className="mb-3">Round 1 Inter-Round Report</Badge>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            What Round 1 surfaced
          </h1>
          <p className="mt-2 max-w-3xl text-white/55">
            Modified Delphi · pairwise comparison · AI synthesis. Snapshot at{' '}
            {overall.snapshot_at?.replace('T', ' ').slice(0, 19)} UTC.
          </p>
          <p className="mt-3 inline-block rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-[11px] font-medium text-amber-300">
            Pre-publication — SAEM 2026 working draft, do not distribute
          </p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6">

        {/* Overview cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <OverviewStat label="Active questions" value={overall.n_questions_total} />
          <OverviewStat label="Confirmed" value={overall.n_confirmed_total} accent="emerald" />
          <OverviewStat label="Gray-zone" value={overall.n_gray_total} accent="slate" />
          <OverviewStat label="Removed" value={overall.n_removed_total} accent="red" />
          <OverviewStat label="Members responded" value={overall.n_r1_responders_total} sub={`/ ${overall.n_invited_total}`} />
          <OverviewStat label="R1 ratings" value={overall.n_r1_responses_total} />
          <OverviewStat label="Pairwise votes" value={overall.n_pairwise_votes_total} />
          <OverviewStat
            label="Delphi × pairwise ρ"
            value={overall.spearman_rho_delphi_pairwise_overall?.toFixed(2) ?? '—'}
            accent="cyan"
          />
        </div>

        {/* Per-WG quick links */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-cyan-400" />
              Working group results (per-WG figures)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {wgs.map((w) => (
                <Link key={w.wg_id} to={`/results/${w.wg_number}`}
                      className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 transition hover:border-white/[0.15] hover:bg-white/[0.05]">
                  <div className="flex items-center justify-between">
                    <Badge variant="primary" className="text-[10px]">WG {w.wg_number}</Badge>
                    <ArrowRight className="h-3.5 w-3.5 text-white/30 transition group-hover:translate-x-0.5 group-hover:text-white/70" />
                  </div>
                  <p className="mt-2 text-sm font-medium text-white/85">{w.short_name}</p>
                  <div className="mt-2 grid grid-cols-3 gap-1 text-[10px] text-white/45">
                    <span><strong className="text-emerald-300">{w.n_confirmed}</strong> conf.</span>
                    <span><strong className="text-amber-300">{w.n_gray}</strong> gray</span>
                    <span><strong className="text-red-300">{w.n_removed}</strong> rem.</span>
                  </div>
                  <div className="mt-1 text-[10px] text-white/40">
                    {w.n_r1_responses} R1 ratings · {w.n_pairwise_votes} pairwise
                    {w.pairwise_low_confidence && (
                      <span className="ml-1 text-amber-300"> · low PW conf</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* D.1 Similarity network */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network className="h-4 w-4 text-purple-400" />
              D.1 Question similarity network
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-xs text-white/55">
              Force-directed graph (Kamada-Kawai layout, server-computed). Nodes
              colored by working group, sized by Round 1 importance. Cross-WG
              edges shown in red — these are the candidate overlap pairs.
              Hover a node for the question text.
            </p>
            <NetworkSVG network={network} />
          </CardContent>
        </Card>

        {/* D.2 Cross-WG overlap pairs (NEW — was only in DOCX) */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-400" />
              D.2 Top cross-WG overlap pairs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-xs text-white/55">
              Pairs of questions in different working groups with cosine
              similarity ≥ 0.55, sorted highest first. Co-leads should review
              and decide: complementary (keep both), coordinate (align scope),
              or merge.
            </p>
            <OverlapPairsTable pairs={overlapPairs} />
          </CardContent>
        </Card>

        {/* D.3 Theme cluster bars */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-400" />
              D.3 Thematic clusters across the agenda
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-xs text-white/55">
              Hierarchical (Ward) clustering on question similarity. Each bar
              is a theme; bar segments are stacked by working-group composition
              (which WGs contributed how many questions to the theme). Theme
              labels generated by Claude Opus.
            </p>
            <ThemeBars themes={themes} />
          </CardContent>
        </Card>

        {/* D.4 Pillar coverage */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-400" />
              D.4 Pillar coverage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-xs text-white/55">
              Question count per primary pillar × working group. The (n×) note
              in a cell shows how many of those questions were tagged as
              cross-cutting (touching ≥ 3 pillars).
            </p>
            <PillarMatrix matrix={pillarMatrix} />
          </CardContent>
        </Card>

        {/* D.5 Cross-cutting topics */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-400" />
              D.5 Cross-cutting topic distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-xs text-white/55">
              Each question can be tagged with zero or more cross-cutting
              topics. Cell intensity is the number of questions in that WG that
              touch the topic.
            </p>
            <CrossCuttingMatrix matrix={ccMatrix} />
          </CardContent>
        </Card>

        {isAdmin && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-4 w-4 text-cyan-400" />
                Full DOCX (admin only)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-white/55 mb-3">
                Word version contains the same figures plus the Section A/B
                tables, Opus-written interpretive openers per WG, and the
                per-respondent disposition heatmap (admin/co-lead view).
              </p>
              <Button size="sm" loading={downloadingDocx} onClick={handleDownloadDocx}>
                <Download className="h-3.5 w-3.5" />
                Download Round 1 DOCX
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}


// ─── Components ────────────────────────────────────────────────────────

function OverviewStat({ label, value, sub, accent = 'default' }) {
  const colorMap = {
    emerald: 'text-emerald-300',
    red: 'text-red-300',
    slate: 'text-slate-300',
    cyan: 'text-cyan-300',
    default: 'text-white',
  };
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
      <p className="text-[10px] uppercase tracking-wider text-white/40">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${colorMap[accent]}`}>
        {value ?? '—'}
        {sub && <span className="ml-1 text-sm text-white/40 font-normal">{sub}</span>}
      </p>
    </div>
  );
}


// ─── F6 — Interactive similarity network (SVG, server-positioned) ─────

function NetworkSVG({ network }) {
  const [hover, setHover] = useState(null);
  const [crossOnly, setCrossOnly] = useState(false);

  if (!network || !network.nodes?.length) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg bg-white/[0.02] text-sm text-white/40">
        No connections above similarity threshold
      </div>
    );
  }

  const { nodes, edges, threshold, n_dropped_unconnected } = network;
  const visibleEdges = crossOnly ? edges.filter((e) => e.cross_wg) : edges;

  const nodeById = useMemo(() => {
    const m = new Map();
    nodes.forEach((n) => m.set(n.id, n));
    return m;
  }, [nodes]);

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-white/55">
        <div>
          {edges.length} edges (cosine ≥ {threshold.toFixed(2)});{' '}
          {edges.filter((e) => e.cross_wg).length} cross-WG;{' '}
          {n_dropped_unconnected} unconnected hidden
        </div>
        <label className="inline-flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={crossOnly}
            onChange={(e) => setCrossOnly(e.target.checked)}
            className="rounded"
          />
          Show only cross-WG edges
        </label>
      </div>

      <div className="relative rounded-lg border border-white/[0.06] bg-[#0E1E35]">
        <svg viewBox="-30 -30 1060 1060" className="w-full h-auto">
          {visibleEdges.map((e, i) => {
            const a = nodeById.get(e.a);
            const b = nodeById.get(e.b);
            if (!a || !b) return null;
            const isHover = hover && (hover.id === e.a || hover.id === e.b);
            return (
              <line
                key={`e-${i}`}
                x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke={e.cross_wg ? '#EF4444' : '#9CA3AF'}
                strokeWidth={e.cross_wg ? 1.0 + (e.sim - threshold) * 5 : 0.4}
                strokeOpacity={isHover ? 0.95 : (e.cross_wg ? 0.55 : 0.25)}
              />
            );
          })}
          {nodes.map((n) => {
            const r = 6 + Math.max(0, n.importance - 4) * 1.6;
            const isHover = hover?.id === n.id;
            return (
              <circle
                key={`n-${n.id}`}
                cx={n.x} cy={n.y} r={r}
                fill={WG_COLORS[n.wg] || '#9CA3AF'}
                stroke={isHover ? '#FFFFFF' : 'rgba(255,255,255,0.6)'}
                strokeWidth={isHover ? 2 : 0.8}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(null)}
                style={{ cursor: 'pointer' }}
              />
            );
          })}
        </svg>

        {hover && (
          <div className="pointer-events-none absolute left-3 top-3 max-w-md rounded-lg border border-white/[0.1] bg-[#0A1628]/95 p-3 text-xs shadow-xl">
            <div className="mb-1 flex items-center gap-2">
              <span className="rounded px-1.5 py-0.5 text-[10px] font-bold text-white"
                    style={{ background: WG_COLORS[hover.wg] }}>
                WG {hover.wg}
              </span>
              <span className="text-white/40">Q{hover.id} · degree {hover.degree} · importance {hover.importance.toFixed(1)}</span>
            </div>
            <p className="text-white/85">{hover.short_text}</p>
          </div>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-white/55">
        {Object.entries(WG_COLORS).map(([wg, color]) => (
          <span key={wg} className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
            WG {wg}
          </span>
        ))}
        <span className="ml-2 inline-flex items-center gap-1">
          <span className="h-px w-4 bg-[#9CA3AF]" /> within-WG
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-px w-4 bg-[#EF4444]" /> cross-WG
        </span>
      </div>
    </div>
  );
}


// ─── D.2 — Sortable overlap pairs table ───────────────────────────────

function OverlapPairsTable({ pairs }) {
  const [sortKey, setSortKey] = useState('similarity');
  const [sortDir, setSortDir] = useState('desc');

  const sorted = useMemo(() => {
    if (!pairs) return [];
    const out = [...pairs];
    out.sort((a, b) => {
      let av = a[sortKey], bv = b[sortKey];
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === 'asc' ? av - bv : bv - av;
    });
    return out;
  }, [pairs, sortKey, sortDir]);

  if (!pairs?.length) {
    return <p className="text-xs text-white/40">No cross-WG overlap pairs above threshold.</p>;
  }

  const headerClass = "px-3 py-2 text-left font-medium text-white/55 cursor-pointer hover:text-white";
  const setSort = (key) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };
  const sortIcon = (key) => sortKey === key ? (sortDir === 'asc' ? <ChevronUp className="inline h-3 w-3" /> : <ChevronDown className="inline h-3 w-3" />) : null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-b border-white/[0.08] text-[11px] uppercase tracking-wider">
            <th className={headerClass} onClick={() => setSort('wg_a')}>WG A {sortIcon('wg_a')}</th>
            <th className={headerClass}>Question A</th>
            <th className={headerClass} onClick={() => setSort('wg_b')}>WG B {sortIcon('wg_b')}</th>
            <th className={headerClass}>Question B</th>
            <th className={headerClass + ' text-right'} onClick={() => setSort('similarity')}>
              Sim {sortIcon('similarity')}
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((p, i) => (
            <tr key={`${p.qid_a}-${p.qid_b}`} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
              <td className="px-3 py-2">
                <span className="rounded px-1.5 py-0.5 text-[10px] font-bold text-white"
                      style={{ background: WG_COLORS[p.wg_a] }}>WG{p.wg_a}</span>
                <span className="ml-1 text-white/40">Q{p.qid_a}</span>
              </td>
              <td className="px-3 py-2 max-w-[360px] text-white/80">{p.text_a}</td>
              <td className="px-3 py-2">
                <span className="rounded px-1.5 py-0.5 text-[10px] font-bold text-white"
                      style={{ background: WG_COLORS[p.wg_b] }}>WG{p.wg_b}</span>
                <span className="ml-1 text-white/40">Q{p.qid_b}</span>
              </td>
              <td className="px-3 py-2 max-w-[360px] text-white/80">{p.text_b}</td>
              <td className="px-3 py-2 text-right font-mono text-white/85">{p.similarity.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


// ─── D.3 — Theme cluster stacked bar ──────────────────────────────────

function ThemeBars({ themes }) {
  if (!themes?.length) {
    return <p className="text-xs text-white/40">No theme clusters yet.</p>;
  }

  // Build Recharts dataset: one row per theme, columns wg_1..wg_5
  const wgKeys = ['1', '2', '3', '4', '5'];
  const data = themes.map((t) => ({
    label: t.label,
    description: t.description,
    size: t.size,
    ...Object.fromEntries(wgKeys.map((k) => [`wg_${k}`, t.wg_counts?.[k] || 0])),
  }));

  return (
    <div style={{ width: '100%', height: 60 + data.length * 38 }}>
      <ResponsiveContainer>
        <BarChart layout="vertical" data={data} margin={{ left: 80, right: 30, top: 10, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" horizontal={false} />
          <XAxis type="number" stroke="rgba(255,255,255,0.45)" />
          <YAxis dataKey="label" type="category" stroke="rgba(255,255,255,0.65)"
                  width={260} tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{ background: '#0A1628', border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 8, fontSize: 12 }}
            formatter={(v, k) => [`${v} questions`, k.replace('wg_', 'WG ')]}
            labelFormatter={(label, payload) => payload?.[0]?.payload?.description || label}
          />
          <Legend
            verticalAlign="top" height={28} iconSize={10}
            formatter={(v) => v.replace('wg_', 'WG ')}
          />
          {wgKeys.map((k) => (
            <Bar key={k} dataKey={`wg_${k}`} stackId="wg"
                  fill={WG_COLORS[k]} name={`wg_${k}`} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}


// ─── D.4 — Pillar coverage CSS-grid heatmap ───────────────────────────

function PillarMatrix({ matrix }) {
  if (!matrix?.length) return <p className="text-xs text-white/40">No pillar data.</p>;

  const wgKeys = [1, 2, 3, 4, 5];
  const max = Math.max(...matrix.flatMap((p) => Object.values(p.wg_counts || {})), 1);

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className="px-3 py-2 text-left text-[11px] uppercase text-white/40">Pillar</th>
            {wgKeys.map((wg) => (
              <th key={wg} className="px-3 py-2 text-center text-[11px] uppercase text-white/40">
                WG {wg}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row) => (
            <tr key={row.pillar} className="border-t border-white/[0.04]">
              <td className="px-3 py-2 font-semibold"
                  style={{ color: PILLAR_COLORS[row.pillar] || '#fff' }}>
                {row.pillar}
              </td>
              {wgKeys.map((wg) => {
                const v = row.wg_counts?.[wg] || 0;
                const cv = row.cross_cutting_counts?.[wg] || 0;
                const intensity = max ? v / max : 0;
                return (
                  <td key={wg} className="p-1">
                    <div
                      className="flex h-12 flex-col items-center justify-center rounded text-sm font-semibold"
                      style={{
                        background: `rgba(${parseInt('0', 16)},${parseInt('B4', 16)},${parseInt('D8', 16)},${0.05 + intensity * 0.55})`,
                        color: intensity > 0.55 ? '#fff' : '#E5E7EB',
                      }}
                      title={`${v} questions${cv ? `, ${cv} cross-cutting` : ''}`}
                    >
                      <span>{v}</span>
                      {cv > 0 && (
                        <span className="text-[9px] font-normal text-white/55">({cv}×)</span>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


// ─── D.5 — Cross-cutting topic CSS-grid heatmap ───────────────────────

function CrossCuttingMatrix({ matrix }) {
  if (!matrix?.length) return <p className="text-xs text-white/40">No cross-cutting tags.</p>;

  const wgKeys = [1, 2, 3, 4, 5];
  const max = Math.max(...matrix.flatMap((r) => Object.values(r.wg_counts || {})), 1);

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className="px-3 py-2 text-left text-[11px] uppercase text-white/40">Topic</th>
            {wgKeys.map((wg) => (
              <th key={wg} className="px-3 py-2 text-center text-[11px] uppercase text-white/40">
                WG {wg}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row) => (
            <tr key={row.tag} className="border-t border-white/[0.04]">
              <td className="px-3 py-2 font-medium text-white/85">{row.tag}</td>
              {wgKeys.map((wg) => {
                const v = row.wg_counts?.[wg] || 0;
                const intensity = max ? v / max : 0;
                return (
                  <td key={wg} className="p-1">
                    <div
                      className="flex h-10 items-center justify-center rounded text-sm font-semibold"
                      style={{
                        background: `rgba(245,158,11,${0.05 + intensity * 0.7})`,
                        color: intensity > 0.5 ? '#fff' : '#E5E7EB',
                      }}
                      title={`${v} questions in WG ${wg} touch ${row.tag}`}
                    >
                      {v}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
