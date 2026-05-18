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

  // ALL hooks must run unconditionally — keep them above any early return.
  const questionsById = useMemo(() => {
    const m = new Map();
    (data?.questions || []).forEach((q) => m.set(q.question_id, q));
    return m;
  }, [data]);

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
    // After sign-in, send the user back here so we don't loop.
    const here = typeof window !== 'undefined' ? window.location.pathname : '/reports/round1';
    const signInHref = `/join?redirect=${encodeURIComponent(here)}`;
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
          <p className="mt-2 text-xs text-white/45">
            Use the email you registered with for your working group.
          </p>
        )}
        <Link to={signInHref} className="mt-6 inline-block">
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
  const summaries = data?.summaries || {};

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
              edges shown in red. Hover a node for the question text;
              <strong className="text-white/80"> click a node to isolate it and its connections</strong>.
            </p>
            <KeyFindings text={summaries.d1_network} />
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
              cross-cutting (touching ≥ 3 pillars). <strong className="text-white/80">Click any cell to see the questions it contains.</strong>
            </p>
            <KeyFindings text={summaries.d4_pillars} />
            <PillarMatrix matrix={pillarMatrix} questionsById={questionsById} />
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
              topics. Cell intensity is the number of questions in that WG
              that touch the topic. <strong className="text-white/80">Click any cell to see the questions it contains.</strong>
            </p>
            <KeyFindings text={summaries.d5_cross_cutting} />
            <CrossCuttingMatrix matrix={ccMatrix} questionsById={questionsById} />
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

export function OverviewStat({ label, value, sub, accent = 'default' }) {
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


// ─── KeyFindings — Opus-written summary callout ───────────────────────

function KeyFindings({ text }) {
  if (!text) return null;
  return (
    <div className="mb-4 rounded-lg border border-cyan-400/20 bg-cyan-500/[0.04] p-3">
      <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-cyan-300/85">
        <Sparkles className="h-3 w-3" />
        Key findings
      </div>
      <p className="text-xs leading-relaxed text-white/80">{text}</p>
    </div>
  );
}


// ─── F6 — Interactive similarity network (SVG, server-positioned) ─────

export function NetworkSVG({ network }) {
  const [hover, setHover] = useState(null);
  const [selected, setSelected] = useState(null); // node id when isolated
  const [crossOnly, setCrossOnly] = useState(false);

  // Hooks MUST run unconditionally — pull nodes/edges defensively.
  const nodes = network?.nodes ?? [];
  const edges = network?.edges ?? [];
  const threshold = network?.threshold ?? 0.62;
  const n_dropped_unconnected = network?.n_dropped_unconnected ?? 0;

  const nodeById = useMemo(() => {
    const m = new Map();
    nodes.forEach((n) => m.set(n.id, n));
    return m;
  }, [nodes]);

  // When a node is "selected", isolate to that node + its direct neighbors.
  const neighborSet = useMemo(() => {
    if (selected == null) return null;
    const s = new Set([selected]);
    edges.forEach((e) => {
      if (e.a === selected) s.add(e.b);
      if (e.b === selected) s.add(e.a);
    });
    return s;
  }, [selected, edges]);

  // Edges visible respect both filters (selection beats crossOnly)
  const visibleEdges = useMemo(() => {
    let es = edges;
    if (selected != null) {
      es = es.filter((e) => e.a === selected || e.b === selected);
    } else if (crossOnly) {
      es = es.filter((e) => e.cross_wg);
    }
    return es;
  }, [edges, selected, crossOnly]);

  // Build the neighbor list for the side panel when a node is selected
  const selectedNeighbors = useMemo(() => {
    if (selected == null) return [];
    const out = [];
    edges.forEach((e) => {
      if (e.a === selected || e.b === selected) {
        const otherId = e.a === selected ? e.b : e.a;
        const other = nodeById.get(otherId);
        if (other) out.push({ ...other, sim: e.sim, cross_wg: e.cross_wg });
      }
    });
    out.sort((a, b) => b.sim - a.sim);
    return out;
  }, [selected, edges, nodeById]);

  const selectedNode = selected != null ? nodeById.get(selected) : null;

  // After all hooks have run, it's safe to short-circuit on empty data.
  if (!nodes.length) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg bg-white/[0.02] text-sm text-white/40">
        No connections above similarity threshold
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-white/55">
        <div>
          {edges.length} edges (cosine ≥ {threshold.toFixed(2)});{' '}
          {edges.filter((e) => e.cross_wg).length} cross-WG;{' '}
          {n_dropped_unconnected} unconnected hidden
          {selected != null && (
            <span className="ml-2 rounded bg-cyan-500/15 px-1.5 py-0.5 text-cyan-200">
              isolated to Q{selected} + {selectedNeighbors.length} neighbor{selectedNeighbors.length === 1 ? '' : 's'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {selected != null && (
            <button
              onClick={() => setSelected(null)}
              className="rounded border border-white/[0.15] px-2 py-0.5 text-[11px] text-white/70 hover:border-white/[0.3] hover:text-white"
            >
              Clear selection
            </button>
          )}
          <label className="inline-flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={crossOnly}
              onChange={(e) => setCrossOnly(e.target.checked)}
              disabled={selected != null}
              className="rounded"
            />
            Show only cross-WG edges
          </label>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[2fr_1fr]">
        <div className="relative rounded-lg border border-white/[0.06] bg-[#0E1E35]">
          <svg
            viewBox="-30 -30 1060 1060"
            className="w-full h-auto"
            onClick={(e) => {
              // Background click clears selection
              if (e.target.tagName === 'svg') setSelected(null);
            }}
          >
            {visibleEdges.map((e, i) => {
              const a = nodeById.get(e.a);
              const b = nodeById.get(e.b);
              if (!a || !b) return null;
              const isFocused = selected != null;
              return (
                <line
                  key={`e-${i}`}
                  x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke={e.cross_wg ? '#EF4444' : '#9CA3AF'}
                  strokeWidth={e.cross_wg ? 1.0 + (e.sim - threshold) * 5 : 0.5}
                  strokeOpacity={isFocused ? 0.85 : (e.cross_wg ? 0.55 : 0.25)}
                />
              );
            })}
            {nodes.map((n) => {
              const isHover = hover?.id === n.id;
              const isSelected = selected === n.id;
              const dimmed = neighborSet && !neighborSet.has(n.id);
              const r = 6 + Math.max(0, n.importance - 4) * 1.6;
              return (
                <circle
                  key={`n-${n.id}`}
                  cx={n.x} cy={n.y} r={r}
                  fill={WG_COLORS[n.wg] || '#9CA3AF'}
                  stroke={isSelected ? '#FFFFFF' : (isHover ? '#FFFFFF' : 'rgba(255,255,255,0.6)')}
                  strokeWidth={isSelected ? 3 : (isHover ? 2 : 0.8)}
                  fillOpacity={dimmed ? 0.12 : 1}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelected(selected === n.id ? null : n.id);
                  }}
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

        {/* Side panel: shows selected node's neighbors when a node is clicked */}
        <div className="rounded-lg border border-white/[0.06] bg-[#0E1E35] p-3">
          {selectedNode ? (
            <div>
              <div className="mb-2 flex items-center gap-2 text-[11px]">
                <span className="rounded px-1.5 py-0.5 text-[10px] font-bold text-white"
                      style={{ background: WG_COLORS[selectedNode.wg] }}>
                  WG {selectedNode.wg}
                </span>
                <span className="text-white/55">Q{selectedNode.id}</span>
              </div>
              <p className="mb-2 text-xs text-white/85">{selectedNode.short_text}</p>
              <div className="text-[10px] text-white/45 mb-3">
                degree {selectedNode.degree} · importance {selectedNode.importance.toFixed(1)}
              </div>
              <p className="mb-1.5 text-[10px] uppercase tracking-wider text-white/45">
                Connected questions ({selectedNeighbors.length})
              </p>
              <div className="max-h-[420px] overflow-y-auto space-y-2 pr-1">
                {selectedNeighbors.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => setSelected(n.id)}
                    className={`block w-full rounded border border-white/[0.06] px-2 py-1.5 text-left transition hover:border-white/[0.2] hover:bg-white/[0.04] ${n.cross_wg ? 'bg-red-500/[0.04]' : ''}`}
                  >
                    <div className="mb-0.5 flex items-center justify-between gap-2 text-[10px]">
                      <span>
                        <span className="rounded px-1 py-0.5 font-bold text-white"
                              style={{ background: WG_COLORS[n.wg] }}>
                          WG{n.wg}
                        </span>
                        <span className="ml-1 text-white/40">Q{n.id}</span>
                        {n.cross_wg && (
                          <span className="ml-1 rounded bg-red-500/20 px-1 py-0.5 text-[9px] font-medium text-red-300">cross</span>
                        )}
                      </span>
                      <span className="font-mono text-white/55">{n.sim.toFixed(2)}</span>
                    </div>
                    <p className="text-[11px] leading-snug text-white/75">{n.short_text}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-white/40 text-center py-6">
              Click any node in the graph to isolate it and see its connections.
            </p>
          )}
        </div>
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

export function OverlapPairsTable({ pairs }) {
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

export function ThemeBars({ themes }) {
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


// ─── Helper — popover panel showing the question list for a clicked cell

function CellQuestionsPopover({ open, onClose, title, subtitle, qids, questionsById, accentColor }) {
  if (!open) return null;
  const qs = (qids || [])
    .map((qid) => questionsById.get(qid))
    .filter(Boolean);

  return (
    <div className="mt-3 rounded-xl border border-white/[0.1] bg-[#0E1E35] p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2">
            {accentColor && (
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: accentColor }} />
            )}
            <h4 className="text-sm font-semibold text-white/90">{title}</h4>
            <Badge variant="default" className="text-[10px]">{qs.length}</Badge>
          </div>
          {subtitle && <p className="text-[11px] text-white/50">{subtitle}</p>}
        </div>
        <button
          onClick={onClose}
          className="rounded border border-white/[0.1] px-2 py-0.5 text-[11px] text-white/55 hover:border-white/[0.25] hover:text-white"
        >
          Close
        </button>
      </div>
      {qs.length === 0 ? (
        <p className="text-xs text-white/40">No questions in this cell.</p>
      ) : (
        <div className="max-h-[360px] overflow-y-auto pr-1">
          <table className="w-full border-collapse text-xs">
            <thead className="sticky top-0 bg-[#0E1E35]">
              <tr className="text-[10px] uppercase tracking-wider text-white/45">
                <th className="px-2 py-1 text-left font-medium">Q</th>
                <th className="px-2 py-1 text-left font-medium">Question</th>
                <th className="px-2 py-1 text-right font-medium">Imp</th>
                <th className="px-2 py-1 text-right font-medium">PW</th>
                <th className="px-2 py-1 text-left font-medium">Bucket</th>
              </tr>
            </thead>
            <tbody>
              {qs.map((q) => {
                const bucketColor = {
                  confirmed: 'bg-emerald-500/15 text-emerald-300',
                  gray: 'bg-slate-500/15 text-slate-300',
                  removed: 'bg-red-500/15 text-red-300',
                  open: 'bg-blue-500/15 text-blue-300',
                }[q.bucket] || 'bg-slate-500/15 text-slate-300';
                return (
                  <tr key={q.question_id} className="border-t border-white/[0.04]">
                    <td className="px-2 py-1.5 font-mono text-white/55 align-top">Q{q.question_id}</td>
                    <td className="px-2 py-1.5 text-white/80 max-w-[480px]">{q.text}</td>
                    <td className="px-2 py-1.5 text-right font-mono text-white/75 align-top">
                      {q.importance_mean != null ? q.importance_mean.toFixed(1) : '—'}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono text-white/75 align-top">
                      {q.pairwise_score != null ? Math.round(q.pairwise_score) : '—'}
                    </td>
                    <td className="px-2 py-1.5 align-top">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${bucketColor}`}>
                        {q.bucket}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


// ─── D.4 — Pillar coverage CSS-grid heatmap (clickable cells) ─────────

export function PillarMatrix({ matrix, questionsById }) {
  const [open, setOpen] = useState(null); // {pillar, wg}
  if (!matrix?.length) return <p className="text-xs text-white/40">No pillar data.</p>;

  const wgKeys = [1, 2, 3, 4, 5];
  const max = Math.max(...matrix.flatMap((p) => Object.values(p.wg_counts || {})), 1);

  const openRow = open && matrix.find((m) => m.pillar === open.pillar);
  const openQids = openRow?.wg_question_ids?.[open?.wg] || [];

  return (
    <div>
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
                  const isOpen = open && open.pillar === row.pillar && open.wg === wg;
                  return (
                    <td key={wg} className="p-1">
                      <button
                        type="button"
                        disabled={v === 0}
                        onClick={() => setOpen(isOpen ? null : { pillar: row.pillar, wg })}
                        className={`flex h-12 w-full flex-col items-center justify-center rounded text-sm font-semibold transition ${v === 0 ? 'cursor-default' : 'cursor-pointer hover:ring-1 hover:ring-white/30'} ${isOpen ? 'ring-2 ring-cyan-400/70' : ''}`}
                        style={{
                          background: `rgba(0,180,216,${0.05 + intensity * 0.55})`,
                          color: intensity > 0.55 ? '#fff' : '#E5E7EB',
                        }}
                        title={`${v} questions${cv ? `, ${cv} cross-cutting` : ''}`}
                      >
                        <span>{v}</span>
                        {cv > 0 && (
                          <span className="text-[9px] font-normal text-white/65">({cv}×)</span>
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <CellQuestionsPopover
        open={!!open && openQids.length > 0}
        onClose={() => setOpen(null)}
        title={open ? `${open.pillar} · WG ${open.wg}` : ''}
        subtitle="Questions tagged with this pillar as primary"
        qids={openQids}
        questionsById={questionsById}
        accentColor={open ? PILLAR_COLORS[open.pillar] : null}
      />
    </div>
  );
}


// ─── D.5 — Cross-cutting topic heatmap (clickable cells) ──────────────

export function CrossCuttingMatrix({ matrix, questionsById }) {
  const [open, setOpen] = useState(null); // {tag, wg}
  if (!matrix?.length) return <p className="text-xs text-white/40">No cross-cutting tags.</p>;

  const wgKeys = [1, 2, 3, 4, 5];
  const max = Math.max(...matrix.flatMap((r) => Object.values(r.wg_counts || {})), 1);

  const openRow = open && matrix.find((m) => m.tag === open.tag);
  const openQids = openRow?.wg_question_ids?.[open?.wg] || [];

  return (
    <div>
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
                  const isOpen = open && open.tag === row.tag && open.wg === wg;
                  return (
                    <td key={wg} className="p-1">
                      <button
                        type="button"
                        disabled={v === 0}
                        onClick={() => setOpen(isOpen ? null : { tag: row.tag, wg })}
                        className={`flex h-10 w-full items-center justify-center rounded text-sm font-semibold transition ${v === 0 ? 'cursor-default' : 'cursor-pointer hover:ring-1 hover:ring-white/30'} ${isOpen ? 'ring-2 ring-cyan-400/70' : ''}`}
                        style={{
                          background: `rgba(245,158,11,${0.05 + intensity * 0.7})`,
                          color: intensity > 0.5 ? '#fff' : '#E5E7EB',
                        }}
                        title={`${v} questions in WG ${wg} touch ${row.tag}`}
                      >
                        {v}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <CellQuestionsPopover
        open={!!open && openQids.length > 0}
        onClose={() => setOpen(null)}
        title={open ? `${open.tag} · WG ${open.wg}` : ''}
        subtitle="Questions tagged with this cross-cutting topic"
        qids={openQids}
        questionsById={questionsById}
        accentColor="#F59E0B"
      />
    </div>
  );
}
