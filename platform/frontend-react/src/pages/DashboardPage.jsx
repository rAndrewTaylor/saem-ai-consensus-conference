import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { usePageTitle } from '@/hooks/usePageTitle';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  FileText, CheckCircle, Users, Brain, BrainCircuit, LogOut, Plus, Play, Square,
  Download, RefreshCw, ChevronDown, ChevronUp, Sparkles, Loader2, ExternalLink,
  FlaskConical, RotateCcw,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useAdmin } from '@/hooks/useAdmin';
import { useToast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ParticipantsSection } from '@/components/admin/ParticipantsSection';

// ---------------------------------------------------------------------------
// Animated counter hook
// ---------------------------------------------------------------------------
function useAnimatedCount(target, duration = 1200) {
  const [value, setValue] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (target == null) return;
    const start = performance.now();
    const from = 0;
    const step = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setValue(Math.round(from + (target - from) * ease));
      if (t < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return value;
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------
function StatCard({ icon: Icon, label, value, color, delay = 0 }) {
  const display = useAnimatedCount(value);
  const colorMap = {
    primary: 'bg-purple-500/10 text-purple-400',
    green: 'bg-emerald-500/10 text-emerald-400',
    amber: 'bg-amber-500/10 text-amber-400',
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <Card className="relative overflow-hidden">
        <CardContent className="flex items-center gap-4 py-5">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${colorMap[color] || colorMap.primary}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-white/40">{label}</p>
            <p className="text-3xl font-bold tracking-tight text-white">{display}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// WG pillar color map
// ---------------------------------------------------------------------------
const PILLAR_COLORS = {
  'Clinical Practice & Operations': 'primary',
  'Data Infrastructure & Governance': 'success',
  'Education, Training & Competency': 'warning',
  'Human-AI Interaction': 'primary',
  'Ethics, Legal & Societal': 'danger',
};

function pillarVariant(name) {
  return PILLAR_COLORS[name] || 'default';
}

// ---------------------------------------------------------------------------
// Donut chart colors
// ---------------------------------------------------------------------------
const STATUS_COLORS = {
  confirmed: '#10b981',
  active: '#a855f7',
  removed: '#ef4444',
  draft: '#6b6680',
};

// ---------------------------------------------------------------------------
// Login form
// ---------------------------------------------------------------------------
function LoginForm({ onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onLogin(password);
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25">
            <BrainCircuit className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-white/40">Sign in to manage the consensus conference</p>
        </div>
        <Card>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-white/60">Email</label>
                <input
                  type="text"
                  value="admin"
                  readOnly
                  className="w-full rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-sm text-white/40 outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-white/60">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-sm text-white outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                  placeholder="Enter admin password"
                  autoFocus
                />
              </div>
              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-sm font-medium text-red-600"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>
              <Button type="submit" loading={loading} className="w-full">
                Sign In
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Session form (inline)
// ---------------------------------------------------------------------------
function SessionForm({ wgs, onCreated }) {
  const [open, setOpen] = useState(false);
  const [sessionType, setSessionType] = useState('vote');
  const [wgNumber, setWgNumber] = useState('1');
  const [phase, setPhase] = useState('deliberation');
  const [creating, setCreating] = useState(false);
  const toast = useToast();

  const handleCreate = async () => {
    setCreating(true);
    try {
      await api('/api/conference/sessions', {
        method: 'POST',
        body: { session_type: sessionType, wg_number: Number(wgNumber), phase },
      });
      toast({ message: 'Session created', type: 'success' });
      setOpen(false);
      onCreated();
    } catch (err) {
      toast({ message: err.message, type: 'error' });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 overflow-hidden"
          >
            <div className="flex flex-wrap items-end gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-white/50">Type</label>
                <select
                  value={sessionType}
                  onChange={(e) => setSessionType(e.target.value)}
                  className="rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-purple-500"
                >
                  <option value="vote">Vote</option>
                  <option value="discussion">Discussion</option>
                  <option value="review">Review</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-white/50">Working Group</label>
                <select
                  value={wgNumber}
                  onChange={(e) => setWgNumber(e.target.value)}
                  className="rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-purple-500"
                >
                  {(wgs || []).map((wg) => (
                    <option key={wg.wg_number} value={wg.wg_number}>
                      WG {wg.wg_number}
                    </option>
                  ))}
                  {(!wgs || wgs.length === 0) && [1,2,3,4,5].map((n) => (
                    <option key={n} value={n}>WG {n}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-white/50">Phase</label>
                <select
                  value={phase}
                  onChange={(e) => setPhase(e.target.value)}
                  className="rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-purple-500"
                >
                  <option value="deliberation">Deliberation</option>
                  <option value="final_vote">Final Vote</option>
                  <option value="review">Review</option>
                </select>
              </div>
              <div className="flex gap-2">
                <Button size="sm" loading={creating} onClick={handleCreate}>Create</Button>
                <Button size="sm" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {!open && (
        <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> New Session
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Demo mode card — seed/reset synthetic data for walkthrough testing
// ---------------------------------------------------------------------------
function DemoModeCard({ onRefresh }) {
  const toast = useToast();
  const [loading, setLoading] = useState(null); // 'seed' | 'reset' | null
  const [lastResult, setLastResult] = useState(null);

  const handleSeed = async () => {
    if (!confirm('Seed the demo data?\n\nThis adds ~50 demo questions, 40 synthetic participants, and hundreds of Delphi / pairwise responses. Any existing demo data is reset first. Real (non-demo) data is NOT touched.')) return;
    setLoading('seed');
    try {
      const r = await api('/api/admin/demo/seed', { method: 'POST' });
      setLastResult({ kind: 'seeded', ...r.created });
      toast({ message: 'Demo data loaded', type: 'success' });
      onRefresh?.();
    } catch (err) {
      toast({ message: err.message || 'Seed failed', type: 'error' });
    } finally {
      setLoading(null);
    }
  };

  const handleReset = async () => {
    if (!confirm('Remove all demo data?\n\nThis deletes every participant whose email ends in @demo.saem-ai.test and every question marked source=demo, along with their responses and pairwise votes. Real data is preserved.')) return;
    setLoading('reset');
    try {
      const r = await api('/api/admin/demo/reset', { method: 'POST' });
      setLastResult({ kind: 'reset', ...r.deleted });
      toast({ message: 'Demo data cleared', type: 'success' });
      onRefresh?.();
    } catch (err) {
      toast({ message: err.message || 'Reset failed', type: 'error' });
    } finally {
      setLoading(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.52 }}
      className="mt-8"
    >
      <Card>
        <CardHeader className="flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-amber-400" />
            Demo Mode
          </CardTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              loading={loading === 'seed'}
              disabled={loading !== null}
              onClick={handleSeed}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Load demo data
            </Button>
            <Button
              size="sm"
              variant="ghost"
              loading={loading === 'reset'}
              disabled={loading !== null}
              onClick={handleReset}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Clear demo data
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-white/60">
            Populate the platform with synthetic questions, named participants, Delphi responses, and pairwise votes so you can walk through every screen end-to-end.
          </p>
          <p className="mt-2 text-xs text-white/40">
            Demo records are tagged (participant emails end in{' '}
            <code className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-white/60">@demo.saem-ai.test</code>
            {' '}and questions carry <code className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-white/60">source=demo</code>) so they can be safely cleared before going live. Real data is never touched by these actions.
          </p>

          {lastResult && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 rounded-lg border border-white/[0.06] bg-white/[0.03] p-3"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-white/50">
                Last action &mdash; {lastResult.kind === 'seeded' ? 'Created' : 'Deleted'}
              </p>
              <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                {Object.entries(lastResult)
                  .filter(([k]) => k !== 'kind')
                  .map(([k, v]) => (
                    <span key={k} className="text-white/70">
                      <span className="font-mono font-semibold text-white">{v}</span>{' '}
                      <span className="text-white/40">{k.replace(/_/g, ' ')}</span>
                    </span>
                  ))}
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}


// ---------------------------------------------------------------------------
// Main Dashboard
// ---------------------------------------------------------------------------
export function DashboardPage() {
  usePageTitle('Admin Dashboard');

  const { isAdmin, loading: authLoading, login, logout } = useAdmin();
  const toast = useToast();

  // Dashboard data
  const [data, setData] = useState(null);
  const [loadingData, setLoadingData] = useState(true);

  // Sessions
  const [sessions, setSessions] = useState([]);
  const [togglingSession, setTogglingSession] = useState(null);

  // AI synthesis
  const [aiStats, setAiStats] = useState(null);
  const [runningAi, setRunningAi] = useState(false);

  // Question management
  const [selectedWg, setSelectedWg] = useState('1');
  const [bulkText, setBulkText] = useState('');
  const [actionLoading, setActionLoading] = useState('');

  // Confirmation dialog
  const [confirmAction, setConfirmAction] = useState(null);

  // ---------------------------------------------------------------------------
  const fetchDashboard = useCallback(async () => {
    try {
      const d = await api('/api/admin/dashboard');
      setData(d);
    } catch {
      // silently fail on auto-refresh
    } finally {
      setLoadingData(false);
    }
  }, []);

  const fetchSessions = useCallback(async () => {
    try {
      const s = await api('/api/conference/sessions');
      setSessions(Array.isArray(s) ? s : s.sessions || []);
    } catch {}
  }, []);

  const fetchAiStats = useCallback(async () => {
    try {
      const s = await api('/api/ai-synthesis/stats');
      setAiStats(s);
    } catch {}
  }, []);

  // Initial load + auto-refresh
  useEffect(() => {
    if (!isAdmin) return;
    fetchDashboard();
    fetchSessions();
    fetchAiStats();

    const interval = setInterval(() => {
      fetchDashboard();
      fetchSessions();
      fetchAiStats();
    }, 30000);
    return () => clearInterval(interval);
  }, [isAdmin, fetchDashboard, fetchSessions, fetchAiStats]);

  // ---------------------------------------------------------------------------
  // Session toggle
  // ---------------------------------------------------------------------------
  const toggleSession = async (session) => {
    const action = session.status === 'live' ? 'stop' : 'start';
    setTogglingSession(session.id);
    try {
      await api(`/api/conference/sessions/${session.id}/${action}`, { method: 'POST' });
      toast({ message: `Session ${action === 'start' ? 'started' : 'stopped'}`, type: 'success' });
      fetchSessions();
    } catch (err) {
      toast({ message: err.message, type: 'error' });
    } finally {
      setTogglingSession(null);
    }
  };

  // ---------------------------------------------------------------------------
  // Question management actions
  // ---------------------------------------------------------------------------
  const runAction = async (label, url) => {
    setActionLoading(label);
    try {
      await api(url, { method: 'POST', body: { wg_number: Number(selectedWg) } });
      toast({ message: `${label} completed`, type: 'success' });
      fetchDashboard();
    } catch (err) {
      toast({ message: err.message, type: 'error' });
    } finally {
      setActionLoading('');
    }
  };

  const addBulkQuestions = async () => {
    if (!bulkText.trim()) return;
    setActionLoading('bulk');
    try {
      const questions = bulkText.split('\n').filter((q) => q.trim());
      await api('/api/admin/questions/bulk', {
        method: 'POST',
        body: { wg_number: Number(selectedWg), questions },
      });
      toast({ message: `${questions.length} question(s) added`, type: 'success' });
      setBulkText('');
      fetchDashboard();
    } catch (err) {
      toast({ message: err.message, type: 'error' });
    } finally {
      setActionLoading('');
    }
  };

  // ---------------------------------------------------------------------------
  // AI synthesis
  // ---------------------------------------------------------------------------
  const runCrossWgAnalysis = async () => {
    setRunningAi(true);
    try {
      await api('/api/ai-synthesis/cross-wg', { method: 'POST' });
      toast({ message: 'Cross-WG analysis started', type: 'success' });
      fetchAiStats();
    } catch (err) {
      toast({ message: err.message, type: 'error' });
    } finally {
      setRunningAi(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Auth states
  // ---------------------------------------------------------------------------
  if (authLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="mt-6 h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!isAdmin) {
    return <LoginForm onLogin={login} />;
  }

  // ---------------------------------------------------------------------------
  // Derived chart data
  // ---------------------------------------------------------------------------
  const statusBreakdown = data?.status_breakdown || {};
  const pieData = Object.entries(statusBreakdown).map(([name, value]) => ({ name, value }));
  const pieTotal = pieData.reduce((s, d) => s + d.value, 0);

  const wgs = data?.working_groups || [];

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-white/40">
            Manage the SAEM AI Consensus Conference platform
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={logout}>
          <LogOut className="h-4 w-4" /> Logout
        </Button>
      </div>

      {/* Overview stats */}
      {loadingData ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={FileText} label="Total Questions" value={data?.total_questions ?? 0} color="primary" delay={0} />
          <StatCard icon={CheckCircle} label="Confirmed" value={data?.confirmed ?? 0} color="green" delay={0.1} />
          <StatCard icon={Users} label="R1 Participants" value={data?.r1_participants ?? 0} color="primary" delay={0.2} />
          <StatCard icon={Brain} label="Pending AI Review" value={data?.pending_ai_review ?? 0} color="amber" delay={0.3} />
        </div>
      )}

      {/* Chart + Working Groups */}
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* Donut chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Question Status</CardTitle>
            </CardHeader>
            <CardContent>
              {pieData.length > 0 ? (
                <div className="relative">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                      >
                        {pieData.map((entry) => (
                          <Cell
                            key={entry.name}
                            fill={STATUS_COLORS[entry.name] || '#9ca3af'}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: '0.75rem',
                          border: '1px solid rgba(255,255,255,0.1)',
                          backgroundColor: '#1C1A2E',
                          color: '#F4F2FF',
                          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.3)',
                          fontSize: '0.875rem',
                          fontFamily: 'Inter, sans-serif',
                        }}
                        formatter={(value, name) => [value, name.charAt(0).toUpperCase() + name.slice(1)]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center label */}
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-white">{pieTotal}</p>
                      <p className="text-xs font-medium text-white/40">Total</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex h-[220px] items-center justify-center text-sm text-white/30">
                  No data yet
                </div>
              )}
              {/* Legend */}
              <div className="mt-2 flex flex-wrap justify-center gap-3">
                {Object.entries(STATUS_COLORS).map(([key, color]) => (
                  <div key={key} className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-xs font-medium capitalize text-white/50">{key}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Working Groups Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="lg:col-span-2"
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Working Groups</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {/* Desktop table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-left">
                      <th className="px-6 py-3 font-semibold text-white/50">WG</th>
                      <th className="px-6 py-3 font-semibold text-white/50">Name</th>
                      <th className="px-6 py-3 text-center font-semibold text-white/50">Questions</th>
                      <th className="px-6 py-3 text-center font-semibold text-white/50">Confirmed</th>
                      <th className="px-6 py-3 text-center font-semibold text-white/50">R1</th>
                      <th className="px-6 py-3 text-center font-semibold text-white/50">R2</th>
                      <th className="px-6 py-3 text-center font-semibold text-white/50">Pairwise</th>
                      <th className="px-6 py-3 font-semibold text-white/50"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {wgs.map((wg) => (
                      <tr
                        key={wg.wg_number}
                        className="border-b border-white/[0.04] transition-colors hover:bg-white/[0.03]"
                      >
                        <td className="px-6 py-3 font-semibold text-white">{wg.wg_number}</td>
                        <td className="px-6 py-3">
                          <div className="flex flex-col gap-1">
                            <span className="font-medium text-white/80">{wg.name}</span>
                            {wg.pillar && (
                              <Badge variant={pillarVariant(wg.pillar)} className="w-fit text-[10px]">
                                {wg.pillar}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-3 text-center text-white/60">{wg.question_count ?? '-'}</td>
                        <td className="px-6 py-3 text-center font-medium text-emerald-400">{wg.confirmed ?? '-'}</td>
                        <td className="px-6 py-3 text-center text-white/60">{wg.r1_responses ?? '-'}</td>
                        <td className="px-6 py-3 text-center text-white/60">{wg.r2_responses ?? '-'}</td>
                        <td className="px-6 py-3 text-center text-white/60">{wg.pairwise_votes ?? '-'}</td>
                        <td className="px-6 py-3">
                          <Link to={`/results/${wg.wg_number}`}>
                            <Button variant="ghost" size="sm">
                              <ExternalLink className="h-3.5 w-3.5" /> Results
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                    {wgs.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-6 py-10 text-center text-sm text-white/30">
                          No working groups loaded yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="space-y-3 p-4 md:hidden">
                {wgs.map((wg) => (
                  <div
                    key={wg.wg_number}
                    className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-white">WG {wg.wg_number}: {wg.name}</p>
                        {wg.pillar && (
                          <Badge variant={pillarVariant(wg.pillar)} className="mt-1 text-[10px]">
                            {wg.pillar}
                          </Badge>
                        )}
                      </div>
                      <Link to={`/results/${wg.wg_number}`}>
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                      <div>
                        <p className="font-semibold text-white/80">{wg.question_count ?? '-'}</p>
                        <p className="text-white/40">Questions</p>
                      </div>
                      <div>
                        <p className="font-semibold text-emerald-400">{wg.confirmed ?? '-'}</p>
                        <p className="text-white/40">Confirmed</p>
                      </div>
                      <div>
                        <p className="font-semibold text-white/80">{wg.r1_responses ?? '-'}</p>
                        <p className="text-white/40">R1 Resp</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Conference Sessions + AI Synthesis */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Conference Sessions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Conference Sessions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <SessionForm wgs={wgs} onCreated={fetchSessions} />
              {sessions.length > 0 ? (
                <div className="space-y-3">
                  {sessions.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.03] p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold capitalize text-white/80">
                              {s.session_type}
                            </span>
                            {s.status === 'live' ? (
                              <Badge variant="live">LIVE</Badge>
                            ) : (
                              <Badge variant="default">Closed</Badge>
                            )}
                          </div>
                          <p className="mt-0.5 text-xs text-white/40">
                            Phase: {s.phase} &middot; {s.vote_count ?? 0} votes
                          </p>
                        </div>
                      </div>
                      <Button
                        variant={s.status === 'live' ? 'danger' : 'success'}
                        size="sm"
                        loading={togglingSession === s.id}
                        onClick={() => toggleSession(s)}
                      >
                        {s.status === 'live' ? (
                          <><Square className="h-3.5 w-3.5" /> Stop</>
                        ) : (
                          <><Play className="h-3.5 w-3.5" /> Start</>
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-4 text-center text-sm text-white/30">No sessions yet</p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* AI Synthesis */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.45 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>AI Synthesis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {aiStats && (
                <p className="text-sm text-white/50">
                  <span className="font-semibold text-white/80">{aiStats.total_runs ?? 0}</span> runs,{' '}
                  <span className="font-semibold text-white/80">{aiStats.total_items ?? 0}</span> items
                  {aiStats.reviewed != null && (
                    <> (<span className="font-semibold text-emerald-400">{aiStats.reviewed}</span> reviewed)</>
                  )}
                </p>
              )}
              <Button variant="secondary" loading={runningAi} onClick={runCrossWgAnalysis}>
                <Sparkles className="h-4 w-4" /> Run Cross-WG Analysis
              </Button>
              {aiStats?.recent_runs?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/40">Recent Runs</p>
                  {aiStats.recent_runs.map((run, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 rounded-lg border border-white/[0.06] px-3 py-2 text-sm"
                    >
                      <Badge variant={run.type === 'cross_wg' ? 'primary' : 'default'}>
                        {run.type}
                      </Badge>
                      <span className="text-white/50">{run.summary || `${run.items_count ?? 0} items`}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Question Management */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        className="mt-8"
      >
        <Card>
          <CardHeader>
            <CardTitle>Question Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* WG selector + action buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-white/50">Working Group</label>
                <select
                  value={selectedWg}
                  onChange={(e) => setSelectedWg(e.target.value)}
                  className="rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-purple-500"
                >
                  {(wgs.length > 0 ? wgs : [1, 2, 3, 4, 5].map((n) => ({ wg_number: n }))).map((wg) => (
                    <option key={wg.wg_number} value={wg.wg_number}>
                      WG {wg.wg_number}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap gap-2 pt-4">
                <Button
                  size="sm"
                  variant="secondary"
                  loading={actionLoading === 'activate'}
                  onClick={() => setConfirmAction({ action: 'activate', label: 'Activate all draft questions?', description: 'This will make all draft questions in the selected WG available for Delphi voting.', handler: () => runAction('activate', '/api/admin/questions/activate-drafts') })}
                >
                  Activate Drafts
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  loading={actionLoading === 'r1'}
                  onClick={() => setConfirmAction({ action: 'r1', label: 'Compute Round 1 results?', description: 'This will aggregate all Round 1 responses and compute consensus statistics for the selected WG.', handler: () => runAction('r1', '/api/admin/compute/r1') })}
                >
                  Compute R1
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  loading={actionLoading === 'r2'}
                  onClick={() => setConfirmAction({ action: 'r2', label: 'Compute Round 2 results?', description: 'This will aggregate all Round 2 responses and compute consensus statistics for the selected WG.', handler: () => runAction('r2', '/api/admin/compute/r2') })}
                >
                  Compute R2
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  loading={actionLoading === 'ai'}
                  onClick={() => setConfirmAction({ action: 'ai', label: 'Run AI Synthesis?', description: 'This will run AI-assisted synthesis and analysis on the selected WG questions and responses.', handler: () => runAction('ai', '/api/ai-synthesis/run') })}
                >
                  <Sparkles className="h-3.5 w-3.5" /> Run AI Synthesis
                </Button>
              </div>
            </div>

            {/* Bulk question add */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-white/60">
                Bulk Add Questions <span className="text-white/30">(one per line)</span>
              </label>
              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-sm text-white outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                placeholder="Enter questions, one per line..."
              />
              <div className="mt-2">
                <Button
                  size="sm"
                  loading={actionLoading === 'bulk'}
                  onClick={addBulkQuestions}
                  disabled={!bulkText.trim()}
                >
                  <Plus className="h-3.5 w-3.5" /> Add Questions
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Participants & Invites */}
      <ParticipantsSection wgs={wgs} />

      {/* Demo Mode */}
      <DemoModeCard onRefresh={() => { fetchDashboard(); fetchSessions(); }} />

      {/* Data Exports */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.55 }}
        className="mt-8"
      >
        <Card>
          <CardHeader>
            <CardTitle>Data Exports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {[
                { label: 'Delphi R1 CSV', href: '/api/export/delphi-r1' },
                { label: 'Delphi R2 CSV', href: '/api/export/delphi-r2' },
                { label: 'Pairwise CSV', href: '/api/export/pairwise' },
                { label: 'AI Audit Log', href: '/api/export/ai-audit' },
                { label: 'Full Results JSON', href: '/api/export/full-results' },
              ].map((exp) => (
                <a key={exp.label} href={exp.href} download>
                  <Button variant="secondary" size="sm">
                    <Download className="h-3.5 w-3.5" /> {exp.label}
                  </Button>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Confirmation dialog */}
      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title={confirmAction?.label}
        description={confirmAction?.description}
        confirmText="Proceed"
        variant="primary"
        onConfirm={async () => {
          await confirmAction?.handler();
          setConfirmAction(null);
        }}
      />
    </div>
  );
}
