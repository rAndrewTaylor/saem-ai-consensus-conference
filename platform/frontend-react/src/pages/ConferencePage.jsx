import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { usePageTitle } from '@/hooks/usePageTitle';
import * as Tabs from '@radix-ui/react-tabs';
import {
  Radio,
  ArrowUp,
  ArrowDown,
  BarChart3,
  ListOrdered,
  Sliders,
  Coins,
  Send,
  MessageSquare,
  Home,
  CheckCircle2,
  CheckCircle,
  Users,
  Wifi,
  WifiOff,
  GripVertical,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { useParticipantToken } from '@/hooks/useParticipantToken';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STORAGE_PREFIX = 'saem_conf_';

function loadLocal(sessionId, key) {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${sessionId}_${key}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveLocal(sessionId, key, value) {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${sessionId}_${key}`, JSON.stringify(value));
  } catch { /* quota exceeded — non-critical */ }
}

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------

const TAB_CONFIG = [
  { value: 'ranking', label: 'Priority Ranking', icon: ListOrdered },
  { value: 'importance', label: 'Importance Rating', icon: Sliders },
  { value: 'allocation', label: 'Point Allocation', icon: Coins },
];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ConferencePage() {
  const { sessionId } = useParams();
  usePageTitle(`Conference Voting - Session ${sessionId}`);

  const { token, loading: tokenLoading } = useParticipantToken(0); // WG 0 for conference-wide
  const toast = useToast();

  // Session + questions
  const [session, setSession] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState(null);

  // Tab
  const [activeTab, setActiveTab] = useState('ranking');

  // Live updates
  const [voterCount, setVoterCount] = useState(0);
  const [sseConnected, setSseConnected] = useState(false);
  const sseRef = useRef(null);

  // Submission states per tab
  const [submittedTabs, setSubmittedTabs] = useState({});

  // ---- Priority Ranking state ----
  const [rankOrder, setRankOrder] = useState([]);
  const [rankSubmitting, setRankSubmitting] = useState(false);

  // ---- Importance Rating state ----
  const [importanceValues, setImportanceValues] = useState({});
  const [importanceSubmitting, setImportanceSubmitting] = useState(false);

  // ---- Point Allocation state ----
  const [allocValues, setAllocValues] = useState({});
  const [allocSubmitting, setAllocSubmitting] = useState(false);

  // Comment
  const [commentType, setCommentType] = useState('general');
  const [commentText, setCommentText] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  // ---------------------------------------------------------------------------
  // Fetch session + questions
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!token) return;

    (async () => {
      setPageLoading(true);
      try {
        const data = await api(`/api/conference/sessions/${sessionId}/questions`, { token });
        setSession(data.session ?? data);
        const qs = data.questions ?? data.items ?? [];
        setQuestions(qs);

        // Restore from localStorage or initialize defaults
        const savedRank = loadLocal(sessionId, 'rank');
        if (savedRank && savedRank.length === qs.length) {
          setRankOrder(savedRank);
        } else {
          setRankOrder(qs.map(q => q.id || q.question_id));
        }

        const savedImportance = loadLocal(sessionId, 'importance');
        if (savedImportance) {
          setImportanceValues(savedImportance);
        } else {
          const defaults = {};
          qs.forEach(q => { defaults[q.id || q.question_id] = 5; });
          setImportanceValues(defaults);
        }

        const savedAlloc = loadLocal(sessionId, 'alloc');
        if (savedAlloc) {
          setAllocValues(savedAlloc);
        } else {
          const defaults = {};
          qs.forEach(q => { defaults[q.id || q.question_id] = 0; });
          setAllocValues(defaults);
        }

        setVoterCount(data.voter_count ?? 0);
      } catch (err) {
        setPageError(err.message);
      } finally {
        setPageLoading(false);
      }
    })();
  }, [token, sessionId]);

  // ---------------------------------------------------------------------------
  // Autosave to localStorage
  // ---------------------------------------------------------------------------

  useEffect(() => { if (rankOrder.length) saveLocal(sessionId, 'rank', rankOrder); }, [sessionId, rankOrder]);
  useEffect(() => { if (Object.keys(importanceValues).length) saveLocal(sessionId, 'importance', importanceValues); }, [sessionId, importanceValues]);
  useEffect(() => { if (Object.keys(allocValues).length) saveLocal(sessionId, 'alloc', allocValues); }, [sessionId, allocValues]);

  // ---------------------------------------------------------------------------
  // SSE for live updates
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!sessionId) return;

    const url = new URL(`/api/events/${sessionId}`, window.location.origin);
    const es = new EventSource(url.toString());
    sseRef.current = es;

    es.onopen = () => setSseConnected(true);
    es.onerror = () => setSseConnected(false);

    es.addEventListener('vote_update', (e) => {
      try {
        const data = JSON.parse(e.data);
        setVoterCount(data.voter_count ?? (prev => prev + 1));
      } catch {
        setVoterCount(prev => prev + 1);
      }
    });

    return () => {
      es.close();
      sseRef.current = null;
      setSseConnected(false);
    };
  }, [sessionId]);

  // ---------------------------------------------------------------------------
  // Ranking handlers
  // ---------------------------------------------------------------------------

  const moveItem = useCallback((idx, direction) => {
    setRankOrder(prev => {
      const arr = [...prev];
      const target = idx + direction;
      if (target < 0 || target >= arr.length) return prev;
      [arr[idx], arr[target]] = [arr[target], arr[idx]];
      return arr;
    });
  }, []);

  const submitRanking = async () => {
    setRankSubmitting(true);
    try {
      // Backend expects {rankings: {question_id: rank}} — convert array order to dict
      const rankings = {};
      rankOrder.forEach((qId, idx) => { rankings[qId] = idx + 1; });
      await api(`/api/conference/vote/${sessionId}/ranking`, {
        method: 'POST',
        token,
        body: { rankings },
      });
      setSubmittedTabs(prev => ({ ...prev, ranking: true }));
      toast({ message: 'Priority ranking submitted!', type: 'success' });
    } catch (err) {
      toast({ message: err.message || 'Submission failed', type: 'error' });
    } finally {
      setRankSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Importance handlers
  // ---------------------------------------------------------------------------

  const setImportance = useCallback((qId, val) => {
    setImportanceValues(prev => ({ ...prev, [qId]: val }));
  }, []);

  const submitImportance = async () => {
    setImportanceSubmitting(true);
    try {
      await api(`/api/conference/vote/${sessionId}/importance`, {
        method: 'POST',
        token,
        body: { ratings: importanceValues },
      });
      setSubmittedTabs(prev => ({ ...prev, importance: true }));
      toast({ message: 'Importance ratings submitted!', type: 'success' });
    } catch (err) {
      toast({ message: err.message || 'Submission failed', type: 'error' });
    } finally {
      setImportanceSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Allocation handlers
  // ---------------------------------------------------------------------------

  const setAllocation = useCallback((qId, val) => {
    const num = Math.max(0, Math.min(100, parseInt(val, 10) || 0));
    setAllocValues(prev => ({ ...prev, [qId]: num }));
  }, []);

  const allocTotal = useMemo(
    () => Object.values(allocValues).reduce((s, v) => s + v, 0),
    [allocValues]
  );

  const submitAllocation = async () => {
    setAllocSubmitting(true);
    try {
      await api(`/api/conference/vote/${sessionId}/allocate`, {
        method: 'POST',
        token,
        body: { allocations: allocValues },
      });
      setSubmittedTabs(prev => ({ ...prev, allocation: true }));
      toast({ message: 'Point allocation submitted!', type: 'success' });
    } catch (err) {
      toast({ message: err.message || 'Submission failed', type: 'error' });
    } finally {
      setAllocSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Comment handler
  // ---------------------------------------------------------------------------

  const submitComment = async () => {
    if (!commentText.trim()) return;
    setCommentSubmitting(true);
    try {
      await api(`/api/conference/comment/${sessionId}`, {
        method: 'POST',
        token,
        body: { comment_type: commentType, comment_text: commentText.trim() },
      });
      toast({ message: 'Comment submitted!', type: 'success' });
      setCommentText('');
    } catch (err) {
      toast({ message: err.message || 'Failed to submit comment', type: 'error' });
    } finally {
      setCommentSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Question lookup by id
  // ---------------------------------------------------------------------------

  const questionsById = useMemo(() => {
    const map = {};
    questions.forEach(q => { map[q.id || q.question_id] = q; });
    return map;
  }, [questions]);

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  if (tokenLoading || pageLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <Skeleton className="mb-4 h-10 w-72" />
        <Skeleton className="mb-6 h-6 w-48" />
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center sm:px-6">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/15">
          <WifiOff className="h-8 w-8 text-red-300" />
        </div>
        <h1 className="text-xl font-bold text-white">Invite link required</h1>
        <p className="mt-2 text-white/55">
          Conference voting is restricted to invited participants. Use your invitation link to sign in.
        </p>
        <Link to="/join">
          <Button variant="secondary" className="mt-6 gap-2">
            <Home className="h-4 w-4" />
            Go to join
          </Button>
        </Link>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Inactive / error state
  // ---------------------------------------------------------------------------

  const isActive = session?.active ?? session?.is_active ?? true;

  if (pageError || !isActive) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center sm:px-6">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.06]">
          <WifiOff className="h-8 w-8 text-white/40" />
        </div>
        <h1 className="text-xl font-bold text-white">
          {pageError ? 'Unable to Load Session' : 'Session Not Active'}
        </h1>
        <p className="mt-2 text-white/50">
          {pageError || 'This voting session is not currently active. Check back when the session is live.'}
        </p>
        <Link to="/">
          <Button variant="secondary" className="mt-6 gap-2">
            <Home className="h-4 w-4" />
            Back to Home
          </Button>
        </Link>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex flex-col bg-[#0A1628]">
      {/* Hero Header */}
      <div className="relative overflow-hidden px-4 py-12 sm:px-6">
        <div className="pointer-events-none absolute -top-32 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-b from-emerald-500/15 to-transparent blur-3xl" />
        <div className="relative mx-auto max-w-3xl text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Conference Day Voting
          </h1>
          <p className="mt-2 text-white/50">
            Live audience response &mdash; rank, rate, and allocate
          </p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:py-12">
      {/* Session info + live indicator */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15">
            <Radio className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white">
              {session?.title || session?.name || `Session ${sessionId}`}
            </h2>
            {session?.description && (
              <p className="mt-0.5 text-sm text-white/50">{session.description}</p>
            )}
          </div>

          {/* Live indicator + voter count */}
          <div className="flex items-center gap-3">
            <Badge variant="live" className="gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              LIVE
            </Badge>
            <div className="flex items-center gap-1.5 text-sm text-white/50">
              <Users className="h-4 w-4" />
              <motion.span
                key={voterCount}
                initial={{ y: -6, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="font-semibold tabular-nums text-white/80"
              >
                {voterCount}
              </motion.span>
              <span className="hidden sm:inline">voters</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
        <Tabs.List className="relative mb-6 flex gap-1 rounded-xl border border-white/[0.06] bg-[#0E1E35] p-1">
          {TAB_CONFIG.map(({ value, label, icon: Icon }) => (
            <Tabs.Trigger
              key={value}
              value={value}
              className={cn(
                'relative flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50',
                activeTab === value
                  ? 'bg-white/[0.08] text-white shadow-sm'
                  : 'text-white/50 hover:text-white/80'
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
              {submittedTabs[value] && (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              )}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {/* Tab content with animation */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {/* ------- TAB 1: Priority Ranking ------- */}
            <Tabs.Content value="ranking" forceMount={activeTab === 'ranking' ? true : undefined} className={activeTab !== 'ranking' ? 'hidden' : ''}>
              <Card>
                <CardHeader>
                  <CardTitle>Drag to reorder by priority</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 p-4">
                  {submittedTabs.ranking && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-300"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Submitted successfully! You can update and resubmit.
                    </motion.div>
                  )}

                  <AnimatePresence>
                    {rankOrder.map((qId, idx) => {
                      const q = questionsById[qId];
                      if (!q) return null;
                      return (
                        <motion.div
                          key={qId}
                          layout
                          layoutId={`rank-${qId}`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                          className="flex items-center gap-3 rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-3"
                        >
                          <GripVertical className="h-5 w-5 text-white/25 cursor-grab shrink-0" />
                          <span className={cn(
                            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                            idx === 0 ? 'bg-[#0C2340] text-white' : 'bg-white/[0.08] text-white/70'
                          )}>
                            {idx + 1}
                          </span>
                          <span className="flex-1 text-sm text-white/90">
                            {q.text || q.question_text}
                          </span>
                          <div className="flex shrink-0 gap-1">
                            <button
                              type="button"
                              onClick={() => moveItem(idx, -1)}
                              disabled={idx === 0}
                              className="rounded-md p-1.5 text-white/40 transition hover:bg-white/[0.08] hover:text-white/80 disabled:opacity-30"
                              aria-label="Move up"
                            >
                              <ArrowUp className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveItem(idx, 1)}
                              disabled={idx === rankOrder.length - 1}
                              className="rounded-md p-1.5 text-white/40 transition hover:bg-white/[0.08] hover:text-white/80 disabled:opacity-30"
                              aria-label="Move down"
                            >
                              <ArrowDown className="h-4 w-4" />
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>

                  <div className="flex justify-end pt-4">
                    <Button onClick={submitRanking} loading={rankSubmitting} className="gap-1.5">
                      <Send className="h-4 w-4" />
                      Submit Ranking
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </Tabs.Content>

            {/* ------- TAB 2: Importance Rating ------- */}
            <Tabs.Content value="importance" forceMount={activeTab === 'importance' ? true : undefined} className={activeTab !== 'importance' ? 'hidden' : ''}>
              <Card>
                <CardHeader>
                  <CardTitle>Rate each question&apos;s importance (1-9)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5 p-4">
                  {submittedTabs.importance && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mb-2 flex items-center gap-2 rounded-lg bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-300"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Submitted successfully! You can update and resubmit.
                    </motion.div>
                  )}

                  {questions.map((q) => {
                    const qId = q.id || q.question_id;
                    const val = importanceValues[qId] ?? 5;
                    return (
                      <div key={qId} className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-4">
                        <p className="mb-3 text-sm font-medium text-white/90">
                          {q.text || q.question_text}
                        </p>
                        <div className="flex items-center gap-4">
                          <span className="shrink-0 text-xs text-white/40 w-20 text-right">Not important</span>
                          <input
                            type="range"
                            min={1}
                            max={9}
                            step={1}
                            value={val}
                            onChange={(e) => setImportance(qId, Number(e.target.value))}
                            className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-white/[0.08] accent-[#00B4D8] [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-500 [&::-webkit-slider-thumb]:shadow-md"
                          />
                          <span className="shrink-0 text-xs text-white/40 w-12">Critical</span>
                          <span className={cn(
                            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                            val >= 7 ? 'bg-purple-500/15 text-purple-300' : val >= 4 ? 'bg-white/[0.08] text-white/70' : 'bg-red-500/10 text-red-400'
                          )}>
                            {val}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  <div className="flex justify-end pt-2">
                    <Button onClick={submitImportance} loading={importanceSubmitting} className="gap-1.5">
                      <Send className="h-4 w-4" />
                      Submit Ratings
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </Tabs.Content>

            {/* ------- TAB 3: Point Allocation ------- */}
            <Tabs.Content value="allocation" forceMount={activeTab === 'allocation' ? true : undefined} className={activeTab !== 'allocation' ? 'hidden' : ''}>
              <Card>
                <CardHeader className="flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle>Allocate 100 points across questions</CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white/50">Total:</span>
                    <span className={cn(
                      'rounded-lg px-3 py-1 text-lg font-bold tabular-nums transition-colors',
                      allocTotal === 100
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : allocTotal > 100
                          ? 'bg-red-500/15 text-red-300'
                          : 'bg-white/[0.08] text-white/50'
                    )}>
                      {allocTotal} / 100
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 p-4">
                  {submittedTabs.allocation && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mb-2 flex items-center gap-2 rounded-lg bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-300"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Submitted successfully! You can update and resubmit.
                    </motion.div>
                  )}

                  {questions.map((q) => {
                    const qId = q.id || q.question_id;
                    const val = allocValues[qId] ?? 0;
                    const maxVal = Math.max(...Object.values(allocValues), 1);
                    const barPct = (val / maxVal) * 100;

                    return (
                      <div key={qId} className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-4">
                        <p className="mb-3 text-sm font-medium text-white/90">
                          {q.text || q.question_text}
                        </p>
                        <div className="flex items-center gap-3">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={val}
                            onChange={(e) => setAllocation(qId, e.target.value)}
                            className="h-10 w-20 shrink-0 rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 text-center font-mono text-sm font-semibold text-white/90 transition focus:border-purple-400/50 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                          />
                          {/* Small absolute bar (out of 100) */}
                          <div className="h-2 rounded-full bg-white/[0.06] flex-1 max-w-[120px]">
                            <div
                              className="h-full rounded-full bg-purple-500 transition-all duration-300"
                              style={{ width: `${Math.min(100, (val / 100) * 100)}%` }}
                            />
                          </div>
                          {/* Relative bar chart */}
                          <div className="relative h-6 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                            <motion.div
                              className={cn(
                                'h-full rounded-full',
                                allocTotal > 100 ? 'bg-red-400' : 'bg-purple-500'
                              )}
                              initial={false}
                              animate={{ width: `${barPct}%` }}
                              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            />
                          </div>
                          <span className="w-10 shrink-0 text-right font-mono text-xs text-white/40">
                            {val}pt
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  <div className="flex items-center justify-between pt-2">
                    {allocTotal !== 100 && (
                      <p className={cn(
                        'text-sm font-medium',
                        allocTotal > 100 ? 'text-red-400' : 'text-white/40'
                      )}>
                        {allocTotal > 100
                          ? `${allocTotal - 100} points over budget`
                          : `${100 - allocTotal} points remaining`
                        }
                      </p>
                    )}
                    <div className="ml-auto">
                      <Button
                        onClick={submitAllocation}
                        loading={allocSubmitting}
                        disabled={allocTotal !== 100}
                        className="gap-1.5"
                      >
                        <Send className="h-4 w-4" />
                        Submit Allocation
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Tabs.Content>
          </motion.div>
        </AnimatePresence>
      </Tabs.Root>

      {/* Comment section */}
      <div className="mt-10">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-purple-400" />
              Comments &amp; Feedback
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="comment-type" className="mb-1 block text-sm font-medium text-white/70">
                Comment type
              </label>
              <select
                id="comment-type"
                value={commentType}
                onChange={(e) => setCommentType(e.target.value)}
                className="h-10 w-full rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 text-sm text-white/90 transition focus:border-purple-400/50 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              >
                <option value="general">General</option>
                <option value="modification">Modification</option>
                <option value="new_question">New Question</option>
              </select>
            </div>
            <div>
              <label htmlFor="comment-text" className="mb-1 block text-sm font-medium text-white/70">
                Your comment
              </label>
              <textarea
                id="comment-text"
                rows={3}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Share your thoughts, suggest modifications, or propose new questions..."
                className="w-full resize-none rounded-lg border border-white/[0.1] bg-white/[0.04] px-4 py-3 text-sm text-white/90 placeholder-white/30 transition focus:border-purple-400/50 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              />
            </div>
            <div className="flex justify-end">
              <Button
                onClick={submitComment}
                loading={commentSubmitting}
                disabled={!commentText.trim()}
                size="sm"
                className="gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                Submit Comment
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
}
