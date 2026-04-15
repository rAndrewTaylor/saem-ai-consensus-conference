import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { usePageTitle } from '@/hooks/usePageTitle';
import {
  BarChart3, TrendingUp, GitCompare, ArrowLeft, ChevronDown, ChevronRight,
  AlertCircle, Lock, MessageSquare, Download
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, CartesianGrid, ReferenceLine,
  Cell, Legend
} from 'recharts';
import { useAdmin } from '@/hooks/useAdmin';
import { api, getAdminToken } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const TABS = [
  { key: 'r1', label: 'Round 1', icon: BarChart3 },
  { key: 'r2', label: 'Round 2', icon: TrendingUp },
  { key: 'pairwise', label: 'Pairwise Rankings', icon: GitCompare },
  { key: 'concordance', label: 'Concordance', icon: GitCompare },
];

const STATUS_CONFIG = {
  confirmed: { label: 'Confirmed', color: '#10b981', bgClass: 'bg-emerald-500/10', textClass: 'text-emerald-300', variant: 'success' },
  active: { label: 'Active / Gray Zone', color: '#8b5cf6', bgClass: 'bg-purple-500/10', textClass: 'text-purple-300', variant: 'primary' },
  removed: { label: 'Removed', color: '#ef4444', bgClass: 'bg-red-500/10', textClass: 'text-red-300', variant: 'danger' },
};

const VOTE_COLORS = {
  include: '#10b981',
  modify: '#f59e0b',
  exclude: '#ef4444',
};

// Chart axis/grid colors tuned for dark surface
const AXIS_TICK_COLOR = 'rgba(255,255,255,0.4)';
const AXIS_LABEL_COLOR = 'rgba(255,255,255,0.5)';
const GRID_STROKE = 'rgba(255,255,255,0.06)';

// ---------------------------------------------------------------------------
// Custom chart tooltip
// ---------------------------------------------------------------------------
const chartTooltipStyle = {
  borderRadius: '0.75rem',
  border: '1px solid rgba(255,255,255,0.1)',
  background: '#252340',
  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
  fontSize: '0.8125rem',
  fontFamily: 'Inter, sans-serif',
  padding: '8px 12px',
  color: 'white',
};

// ---------------------------------------------------------------------------
// Inline percent bar
// ---------------------------------------------------------------------------
function InlineBar({ include = 0, modify = 0, exclude = 0 }) {
  const total = include + modify + exclude || 1;
  const pInclude = ((include / total) * 100).toFixed(0);
  const pModify = ((modify / total) * 100).toFixed(0);
  const pExclude = ((exclude / total) * 100).toFixed(0);
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
        <div className="transition-all duration-500" style={{ width: `${pInclude}%`, backgroundColor: VOTE_COLORS.include }} />
        <div className="transition-all duration-500" style={{ width: `${pModify}%`, backgroundColor: VOTE_COLORS.modify }} />
        <div className="transition-all duration-500" style={{ width: `${pExclude}%`, backgroundColor: VOTE_COLORS.exclude }} />
      </div>
      <div className="flex shrink-0 gap-2 text-[11px] font-medium">
        <span className="text-emerald-400">{pInclude}%</span>
        <span className="text-amber-400">{pModify}%</span>
        <span className="text-red-400">{pExclude}%</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Comment viewer for individual questions
// ---------------------------------------------------------------------------
function CommentViewer({ wgNumber, roundName, questionId }) {
  const [comments, setComments] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (comments) { setOpen(!open); return; }
    setLoading(true);
    try {
      const data = await api(`/api/surveys/comments/${wgNumber}/${roundName}`, {
        params: { question_id: questionId }
      });
      setComments(data[0]?.comments || []);
      setOpen(true);
    } catch { setComments([]); setOpen(true); }
    finally { setLoading(false); }
  };

  return (
    <div className="mt-3">
      <button onClick={load} className="text-sm text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1">
        <MessageSquare className="h-3.5 w-3.5" />
        {loading ? 'Loading...' : open ? 'Hide Comments' : 'View Comments'}
      </button>
      <AnimatePresence>
        {open && comments && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="mt-2 space-y-2 border-l-2 border-white/[0.08] pl-4">
              {comments.length === 0 && <p className="text-sm text-white/40 italic">No comments for this question.</p>}
              {comments.map((c, i) => (
                <div key={i} className="text-sm">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium mr-2 ${
                    c.disposition === 'include' ? 'bg-emerald-500/15 text-emerald-300' :
                    c.disposition === 'include_with_modifications' ? 'bg-amber-500/15 text-amber-300' :
                    'bg-red-500/15 text-red-300'
                  }`}>{c.disposition.replace(/_/g, ' ')}</span>
                  <span className="text-white/60">{c.comment}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stacked bar chart for a question group
// ---------------------------------------------------------------------------
function GroupChart({ questions }) {
  const chartData = questions.map((q, i) => ({
    name: `Q${i + 1}`,
    fullText: q.text || q.question_text,
    include: q.include_pct ?? q.include ?? 0,
    modify: q.modify_pct ?? q.modify ?? 0,
    exclude: q.exclude_pct ?? q.exclude ?? 0,
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    return (
      <div style={chartTooltipStyle} className="max-w-xs">
        <p className="mb-1 text-xs font-semibold text-white">{d.fullText}</p>
        <div className="flex gap-3 text-xs">
          <span style={{ color: VOTE_COLORS.include }}>Include: {d.include}%</span>
          <span style={{ color: VOTE_COLORS.modify }}>Modify: {d.modify}%</span>
          <span style={{ color: VOTE_COLORS.exclude }}>Exclude: {d.exclude}%</span>
        </div>
      </div>
    );
  };

  return (
    <div role="img" aria-label="Vote distribution chart showing include, modify, and exclude percentages for each question">
      <ResponsiveContainer width="100%" height={Math.max(180, questions.length * 36 + 40)}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: AXIS_TICK_COLOR, fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: AXIS_LABEL_COLOR, fontFamily: 'Inter' }} axisLine={false} tickLine={false} width={36} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <Bar dataKey="include" stackId="a" fill={VOTE_COLORS.include} radius={[0, 0, 0, 0]} />
          <Bar dataKey="modify" stackId="a" fill={VOTE_COLORS.modify} />
          <Bar dataKey="exclude" stackId="a" fill={VOTE_COLORS.exclude} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Question card
// ---------------------------------------------------------------------------
function QuestionCard({ question, index, wgNumber, roundName }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.03 }}
      className="rounded-xl border border-white/[0.06] bg-[#1C1A2E] p-4 transition-colors hover:border-white/[0.12]"
    >
      <p className="text-sm font-medium leading-relaxed text-white/90">
        {question.text || question.question_text}
      </p>
      <div className="mt-3">
        <InlineBar
          include={question.include_pct ?? question.include ?? 0}
          modify={question.modify_pct ?? question.modify ?? 0}
          exclude={question.exclude_pct ?? question.exclude ?? 0}
        />
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-white/50">
        {question.importance_mean != null && (
          <span>Importance: <span className="font-semibold text-white/80">{Number(question.importance_mean).toFixed(2)}</span></span>
        )}
        {question.pairwise_score != null && (
          <span>Pairwise: <span className="font-semibold text-purple-400">{Number(question.pairwise_score).toFixed(2)}</span></span>
        )}
        {question.n_responses != null && (
          <span>N = {question.n_responses}</span>
        )}
      </div>
      {wgNumber && roundName && question.id && (
        <CommentViewer wgNumber={wgNumber} roundName={roundName} questionId={question.id} />
      )}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Delphi Round Tab
// ---------------------------------------------------------------------------
function DelphiTab({ wgNumber, round }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api(`/api/surveys/results/${wgNumber}/${round}`)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [wgNumber, round]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-52 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-white/40">
        <AlertCircle className="mb-2 h-8 w-8" />
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  const questions = data?.questions || data?.results || [];
  const grouped = {
    confirmed: questions.filter((q) => q.status === 'confirmed'),
    active: questions.filter((q) => q.status === 'active' || q.status === 'gray_zone'),
    removed: questions.filter((q) => q.status === 'removed'),
  };

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-white/40">
        <BarChart3 className="mb-2 h-8 w-8" />
        <p className="text-sm">No Round {round} results available yet</p>
      </div>
    );
  }

  const currentRound = `round_${round}`;

  return (
    <div className="space-y-8">
      {/* Vote color legend + export */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-4 text-xs font-medium">
          {Object.entries(VOTE_COLORS).map(([key, color]) => (
            <div key={key} className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
              <span className="capitalize text-white/60">{key}</span>
            </div>
          ))}
        </div>
        {getAdminToken() && (
          <a
            href={`/api/admin/export/delphi/${wgNumber}/${round}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/70 transition hover:bg-white/[0.08] hover:text-white"
          >
            <Download className="h-3.5 w-3.5" />
            Download Results
          </a>
        )}
      </div>

      {Object.entries(grouped).map(([status, qs]) => {
        if (qs.length === 0) return null;
        const cfg = STATUS_CONFIG[status];
        return (
          <motion.section
            key={status}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <div className="mb-3 flex items-center gap-2">
              <h3 className={cn('text-base font-semibold', cfg.textClass)}>{cfg.label}</h3>
              <Badge variant={cfg.variant}>{qs.length}</Badge>
            </div>

            {/* Stacked bar chart */}
            <Card className="mb-4">
              <CardContent className="py-3">
                <GroupChart questions={qs} />
              </CardContent>
            </Card>

            {/* Individual question cards */}
            <div className="space-y-3">
              {qs.map((q, i) => (
                <QuestionCard key={q.id || i} question={q} index={i} wgNumber={wgNumber} roundName={currentRound} />
              ))}
            </div>
          </motion.section>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pairwise Rankings Tab
// ---------------------------------------------------------------------------
function PairwiseTab({ wgNumber }) {
  const [rankings, setRankings] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      api(`/api/pairwise/rankings/${wgNumber}`),
      api(`/api/pairwise/stats/${wgNumber}`),
    ])
      .then(([r, s]) => { setRankings(r); setStats(s); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [wgNumber]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-white/40">
        <AlertCircle className="mb-2 h-8 w-8" />
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  const items = rankings?.rankings || rankings || [];

  // Build chart data, sorted by score descending
  const chartData = [...items]
    .sort((a, b) => (b.score ?? b.pairwise_score ?? 0) - (a.score ?? a.pairwise_score ?? 0))
    .map((q) => ({
      name: truncate(q.text || q.question_text || `Q${q.id}`, 50),
      fullText: q.text || q.question_text,
      score: q.score ?? q.pairwise_score ?? 0,
      status: q.delphi_status || q.status || 'active',
    }));

  const statusToColor = (status) => {
    if (status === 'confirmed') return '#10b981';
    if (status === 'removed') return '#ef4444';
    return '#8b5cf6';
  };

  const PairwiseTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    return (
      <div style={chartTooltipStyle} className="max-w-xs">
        <p className="mb-1 text-xs font-semibold text-white">{d.fullText}</p>
        <p className="text-xs text-purple-300">Score: {Number(d.score).toFixed(3)}</p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Export button */}
      {getAdminToken() && (
        <div className="flex justify-end">
          <a
            href={`/api/admin/export/pairwise/${wgNumber}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/70 transition hover:bg-white/[0.08] hover:text-white"
          >
            <Download className="h-3.5 w-3.5" />
            Download Results
          </a>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardContent className="py-4">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  { label: 'Total Votes', value: stats.total_votes ?? '-' },
                  { label: 'Participants', value: stats.unique_participants ?? stats.participants ?? '-' },
                  { label: 'Skips', value: stats.total_skips ?? stats.skips ?? '-' },
                  { label: 'Avg Response', value: stats.avg_response_time ? `${Number(stats.avg_response_time).toFixed(1)}s` : '-' },
                ].map((s, i) => (
                  <div key={i} className="text-center">
                    <p className="text-2xl font-bold text-white">{s.value}</p>
                    <p className="text-xs font-medium text-white/50">{s.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Horizontal bar chart */}
      {chartData.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Pairwise Scores</CardTitle>
            </CardHeader>
            <CardContent>
              <div role="img" aria-label="Pairwise ranking chart showing scores for all questions">
                <ResponsiveContainer width="100%" height={Math.max(250, chartData.length * 36 + 40)}>
                  <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: AXIS_TICK_COLOR, fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 11, fill: AXIS_LABEL_COLOR, fontFamily: 'Inter' }}
                      width={200}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<PairwiseTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                    <Bar dataKey="score" radius={[0, 6, 6, 0]} maxBarSize={24}>
                      {chartData.map((entry, i) => (
                        <Cell key={i} fill={statusToColor(entry.status)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-white/40">
          <GitCompare className="mb-2 h-8 w-8" />
          <p className="text-sm">No pairwise ranking data yet</p>
        </div>
      )}

      {/* Detail table */}
      {chartData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Ranking Details</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-left">
                      <th className="px-6 py-3 font-semibold text-white/60">Rank</th>
                      <th className="px-6 py-3 font-semibold text-white/60">Question</th>
                      <th className="px-6 py-3 text-center font-semibold text-white/60">Score</th>
                      <th className="px-6 py-3 text-center font-semibold text-white/60">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chartData.map((q, i) => (
                      <tr key={i} className="border-b border-white/[0.04] transition-colors hover:bg-white/[0.03]">
                        <td className="px-6 py-3 font-semibold text-white">{i + 1}</td>
                        <td className="max-w-sm px-6 py-3 text-white/80">{q.fullText}</td>
                        <td className="px-6 py-3 text-center font-mono font-semibold text-purple-400">
                          {Number(q.score).toFixed(3)}
                        </td>
                        <td className="px-6 py-3 text-center">
                          <Badge variant={STATUS_CONFIG[q.status]?.variant || 'default'}>
                            {q.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Concordance Tab (admin only)
// ---------------------------------------------------------------------------
function ConcordanceTab({ wgNumber }) {
  const { isAdmin, loading: authLoading } = useAdmin();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isAdmin) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    api(`/api/analysis/concordance/${wgNumber}`)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [wgNumber, isAdmin]);

  if (authLoading) {
    return <Skeleton className="h-64 w-full rounded-xl" />;
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-white/40">
        <Lock className="mb-3 h-10 w-10" />
        <p className="text-base font-medium text-white/60">Admin access required</p>
        <p className="mt-1 text-sm">Log in from the <Link to="/dashboard" className="text-purple-400 hover:underline">Dashboard</Link> to view concordance analysis.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="mx-auto h-40 w-40 rounded-full" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-white/40">
        <AlertCircle className="mb-2 h-8 w-8" />
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  const rho = data?.spearman_rho ?? data?.rho ?? null;
  const absRho = rho != null ? Math.abs(rho) : null;
  const strength = absRho >= 0.7 ? 'strong' : absRho >= 0.4 ? 'moderate' : 'weak';
  const strengthColor = strength === 'strong' ? 'text-emerald-300' : strength === 'moderate' ? 'text-amber-300' : 'text-red-300';
  const strengthBg = strength === 'strong' ? 'bg-emerald-500/10 border-emerald-400/30' : strength === 'moderate' ? 'bg-amber-500/10 border-amber-400/30' : 'bg-red-500/10 border-red-400/30';
  const strengthLabel = strength === 'strong' ? 'Strong agreement' : strength === 'moderate' ? 'Moderate agreement' : 'Weak agreement';

  // Scatter data
  const comparisons = data?.comparisons || data?.rankings || [];
  const scatterData = comparisons.map((c) => ({
    delphi_rank: c.delphi_rank,
    pairwise_rank: c.pairwise_rank,
    text: c.text || c.question_text,
    diff: Math.abs((c.delphi_rank || 0) - (c.pairwise_rank || 0)),
  }));
  const maxRank = Math.max(...scatterData.map((d) => Math.max(d.delphi_rank || 0, d.pairwise_rank || 0)), 10);

  // Color dots by rank difference
  const diffToColor = (diff) => {
    if (diff <= 1) return '#10b981';
    if (diff <= 3) return '#8b5cf6';
    if (diff <= 5) return '#f59e0b';
    return '#ef4444';
  };

  const ScatterTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    return (
      <div style={{ ...chartTooltipStyle, maxWidth: '20rem' }}>
        <p className="mb-1 text-xs font-semibold leading-snug text-white">{d.text}</p>
        <div className="flex gap-3 text-xs text-white/70">
          <span>Delphi: #{d.delphi_rank}</span>
          <span>Pairwise: #{d.pairwise_rank}</span>
          <span className={cn(
            'font-semibold',
            d.diff <= 1 ? 'text-emerald-300' : d.diff <= 3 ? 'text-purple-300' : d.diff <= 5 ? 'text-amber-300' : 'text-red-300'
          )}>Diff: {d.diff}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Hero rho */}
      {rho != null && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="flex justify-center"
        >
          <div className={cn('rounded-2xl border px-10 py-8 text-center', strengthBg)}>
            <p className="text-sm font-semibold uppercase tracking-wider text-white/50">Spearman&apos;s rho</p>
            <p className={cn('mt-2 text-5xl font-extrabold tracking-tight', strengthColor)}>
              {Number(rho).toFixed(3)}
            </p>
            <p className={cn('mt-2 text-sm font-semibold', strengthColor)}>{strengthLabel}</p>
            {data?.interpretation && (
              <p className="mt-3 max-w-sm text-xs leading-relaxed text-white/60">{data.interpretation}</p>
            )}
          </div>
        </motion.div>
      )}

      {/* Scatter chart */}
      {scatterData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Delphi vs. Pairwise Rank</CardTitle>
            </CardHeader>
            <CardContent>
              <div role="img" aria-label="Concordance scatter plot comparing Delphi rank to pairwise rank">
                <ResponsiveContainer width="100%" height={380}>
                  <ScatterChart margin={{ top: 16, right: 24, bottom: 16, left: 16 }}>
                    <defs>
                      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                    <XAxis
                      type="number"
                      dataKey="delphi_rank"
                      name="Delphi Rank"
                      domain={[1, maxRank]}
                      tick={{ fontSize: 11, fill: AXIS_TICK_COLOR, fontFamily: 'Inter' }}
                      axisLine={false}
                      tickLine={false}
                      label={{ value: 'Delphi Rank', position: 'insideBottom', offset: -6, fontSize: 12, fill: AXIS_LABEL_COLOR, fontFamily: 'Inter' }}
                    />
                    <YAxis
                      type="number"
                      dataKey="pairwise_rank"
                      name="Pairwise Rank"
                      domain={[1, maxRank]}
                      tick={{ fontSize: 11, fill: AXIS_TICK_COLOR, fontFamily: 'Inter' }}
                      axisLine={false}
                      tickLine={false}
                      label={{ value: 'Pairwise Rank', angle: -90, position: 'insideLeft', offset: 4, fontSize: 12, fill: AXIS_LABEL_COLOR, fontFamily: 'Inter' }}
                    />
                    <Tooltip content={<ScatterTooltip />} cursor={{ strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.15)' }} />
                    {/* Reference line: perfect concordance */}
                    <ReferenceLine
                      segment={[{ x: 1, y: 1 }, { x: maxRank, y: maxRank }]}
                      stroke="rgba(255,255,255,0.2)"
                      strokeDasharray="6 3"
                      strokeWidth={1.5}
                    />
                    <Scatter
                      data={scatterData}
                      fill="#2563eb"
                      shape={(props) => {
                        const { cx, cy, payload } = props;
                        const color = diffToColor(payload.diff);
                        return (
                          <g>
                            <circle
                              cx={cx}
                              cy={cy}
                              r={8}
                              fill={color}
                              fillOpacity={0.85}
                              stroke={color}
                              strokeWidth={2}
                              strokeOpacity={0.3}
                              style={{ cursor: 'pointer', transition: 'filter 0.2s, r 0.2s' }}
                              onMouseEnter={(e) => { e.target.setAttribute('filter', 'url(#glow)'); e.target.setAttribute('r', '10'); }}
                              onMouseLeave={(e) => { e.target.removeAttribute('filter'); e.target.setAttribute('r', '8'); }}
                            />
                          </g>
                        );
                      }}
                    >
                      {scatterData.map((entry, i) => (
                        <Cell key={i} fill={diffToColor(entry.diff)} />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
              {/* Legend */}
              <div className="mt-3 flex flex-wrap justify-center gap-4 text-xs font-medium">
                {[
                  { label: 'Diff <= 1', color: '#10b981' },
                  { label: 'Diff 2-3', color: '#8b5cf6' },
                  { label: 'Diff 4-5', color: '#f59e0b' },
                  { label: 'Diff > 5', color: '#ef4444' },
                ].map((l) => (
                  <div key={l.label} className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: l.color }} />
                    <span className="text-white/60">{l.label}</span>
                  </div>
                ))}
                <div className="flex items-center gap-1.5">
                  <div className="h-px w-5 border-t-2 border-dashed border-white/25" />
                  <span className="text-white/50">Perfect concordance</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Rank comparison table */}
      {scatterData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Rank Comparison</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-left">
                      <th className="px-6 py-3 font-semibold text-white/60">Question</th>
                      <th className="px-6 py-3 text-center font-semibold text-white/60">Delphi Rank</th>
                      <th className="px-6 py-3 text-center font-semibold text-white/60">Pairwise Rank</th>
                      <th className="px-6 py-3 text-center font-semibold text-white/60">Difference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...scatterData].sort((a, b) => a.delphi_rank - b.delphi_rank).map((d, i) => (
                      <tr key={i} className="border-b border-white/[0.04] transition-colors hover:bg-white/[0.03]">
                        <td className="max-w-sm px-6 py-3 text-white/80">{d.text}</td>
                        <td className="px-6 py-3 text-center font-mono font-semibold text-white/90">{d.delphi_rank}</td>
                        <td className="px-6 py-3 text-center font-mono font-semibold text-purple-400">{d.pairwise_rank}</td>
                        <td className="px-6 py-3 text-center">
                          <span
                            className={cn(
                              'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
                              d.diff <= 1 ? 'bg-emerald-500/15 text-emerald-300' :
                              d.diff <= 3 ? 'bg-purple-500/15 text-purple-300' :
                              d.diff <= 5 ? 'bg-amber-500/15 text-amber-300' :
                              'bg-red-500/15 text-red-300'
                            )}
                          >
                            {d.diff}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------
function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '...' : str;
}

// ---------------------------------------------------------------------------
// Main Results Page
// ---------------------------------------------------------------------------
export function ResultsPage() {
  const { wgNumber } = useParams();
  usePageTitle(`Results - WG ${wgNumber}`);

  const [activeTab, setActiveTab] = useState('r1');
  const tabRefs = useRef({});

  // Underline position
  const [underline, setUnderline] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const el = tabRefs.current[activeTab];
    if (el) {
      setUnderline({ left: el.offsetLeft, width: el.offsetWidth });
    }
  }, [activeTab]);

  // Update underline on resize
  useEffect(() => {
    const handleResize = () => {
      const el = tabRefs.current[activeTab];
      if (el) setUnderline({ left: el.offsetLeft, width: el.offsetWidth });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeTab]);

  return (
    <div className="flex flex-col bg-[#13111C]">
      {/* Hero Header */}
      <div className="relative overflow-hidden px-4 py-12 sm:px-6">
        <div className="pointer-events-none absolute -top-32 left-1/2 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-b from-purple-500/12 to-transparent blur-3xl" />
        <div className="relative mx-auto max-w-5xl">
          <Link
            to={`/wg/${wgNumber}`}
            className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-white/50 transition hover:text-white/80"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to working group
          </Link>
          <Badge variant="primary" className="mb-3">
            Working Group {wgNumber}
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Results &amp; Analysis
          </h1>
          <p className="mt-2 text-white/50">
            Consensus outcomes, rankings, and method concordance
          </p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">

      {/* Tabs */}
      <div className="relative mb-8 border-b border-white/[0.08]">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              ref={(el) => { tabRefs.current[key] = el; }}
              onClick={() => setActiveTab(key)}
              className={cn(
                'relative flex items-center gap-1.5 whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors',
                activeTab === key
                  ? 'text-purple-300'
                  : 'text-white/50 hover:text-white/80'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
        {/* Animated underline */}
        <motion.div
          className="absolute bottom-0 h-0.5 rounded-full bg-purple-400"
          animate={{ left: underline.left, width: underline.width }}
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        />
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'r1' && <DelphiTab wgNumber={wgNumber} round={1} />}
          {activeTab === 'r2' && <DelphiTab wgNumber={wgNumber} round={2} />}
          {activeTab === 'pairwise' && <PairwiseTab wgNumber={wgNumber} />}
          {activeTab === 'concordance' && <ConcordanceTab wgNumber={wgNumber} />}
        </motion.div>
      </AnimatePresence>
      </div>
    </div>
  );
}
