import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { usePageTitle } from '@/hooks/usePageTitle';
import {
  ArrowLeftRight,
  SkipForward,
  Trophy,
  Timer,
  Keyboard,
  Lightbulb,
  Send,
  ChevronUp,
  ChevronDown,
  CheckCircle,
  Sparkles,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/toast';
import { useParticipantToken } from '@/hooks/useParticipantToken';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const WG_NAMES = {
  1: 'Clinical Practice & Operations',
  2: 'Data Infrastructure, Governance & Privacy',
  3: 'Education, Training & Competency',
  4: 'Human-AI Interaction',
  5: 'Ethics, Legal & Societal Implications',
};

export function PairwisePage() {
  const { wgNumber } = useParams();
  usePageTitle(`Pairwise Ranking - WG ${wgNumber}`);

  const wgNum = Number(wgNumber);
  const { token, loading: tokenLoading } = useParticipantToken(wgNum);
  const toast = useToast();

  // Pair state
  const [pair, setPair] = useState(null);
  const [pairLoading, setPairLoading] = useState(true);
  const [pairError, setPairError] = useState(null);
  const [pairKey, setPairKey] = useState(0);
  const pairStartTime = useRef(Date.now());

  // Vote state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedSide, setSelectedSide] = useState(null);
  const [lastResponseTime, setLastResponseTime] = useState(null);
  const [showCheck, setShowCheck] = useState(null); // 'a' or 'b'

  // Streak counter
  const [streak, setStreak] = useState(0);

  // Response time tracking for completion stats
  const responseTimes = useRef([]);

  // Progress
  const [completed, setCompleted] = useState(0);
  const [totalPairs, setTotalPairs] = useState(0);
  const [displayedCompleted, setDisplayedCompleted] = useState(0);

  // Rankings
  const [rankings, setRankings] = useState([]);
  const [rankingsLoading, setRankingsLoading] = useState(true);
  const votesSinceRefresh = useRef(0);

  // Suggestion
  const [suggestion, setSuggestion] = useState('');
  const [suggestLoading, setSuggestLoading] = useState(false);

  // Animate the completed counter
  useEffect(() => {
    if (displayedCompleted < completed) {
      const timer = setTimeout(() => setDisplayedCompleted(prev => prev + 1), 60);
      return () => clearTimeout(timer);
    }
  }, [displayedCompleted, completed]);

  // Fetch a pair
  const fetchPair = useCallback(async () => {
    if (!token) return;
    setPairLoading(true);
    setPairError(null);
    try {
      const data = await api(`/api/pairwise/pair/${wgNum}`, { token });
      setPair(data.pair || data);
      setTotalPairs(data.total_pairs ?? totalPairs);
      setCompleted(data.completed ?? completed);
      setDisplayedCompleted(data.completed ?? completed);
      pairStartTime.current = Date.now();
    } catch (err) {
      if (err.status === 404 || err.status === 400 || err.message?.includes('No more pairs') || err.message?.includes('Need at least 2')) {
        setPair(null);
        setPairError('all_done');
      } else {
        setPairError(err.message);
        toast({ message: 'Failed to load pair', type: 'error' });
      }
    } finally {
      setPairLoading(false);
    }
  }, [token, wgNum, toast, totalPairs, completed]);

  // Fetch rankings
  const fetchRankings = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api(`/api/pairwise/rankings/${wgNum}`, { token });
      setRankings(Array.isArray(data) ? data : data.rankings || []);
    } catch {
      // Non-critical, silently ignore
    } finally {
      setRankingsLoading(false);
    }
  }, [token, wgNum]);

  // Initial load
  useEffect(() => {
    if (token) {
      fetchPair();
      fetchRankings();
    }
  }, [token, fetchPair, fetchRankings]);

  // Vote handler
  const submitVote = useCallback(async (winnerId) => {
    if (!pair || isSubmitting) return;
    setIsSubmitting(true);
    setSelectedSide(winnerId);

    const responseTime = Date.now() - pairStartTime.current;
    setLastResponseTime(responseTime);

    try {
      await api(`/api/pairwise/vote/${wgNum}`, {
        method: 'POST',
        token,
        body: {
          question_a_id: pair.question_a?.id,
          question_b_id: pair.question_b?.id,
          winner_id: winnerId,
          response_time_ms: responseTime,
        },
      });

      setCompleted(prev => prev + 1);
      setStreak(prev => prev + 1);
      responseTimes.current.push(responseTime);
      votesSinceRefresh.current += 1;

      // Show checkmark on the winning side
      const winningSide = winnerId === pair.question_a?.id ? 'a' : 'b';
      setShowCheck(winningSide);

      // Brief delay to show check animation, then load next pair
      setTimeout(async () => {
        setShowCheck(null);
        setSelectedSide(null);
        setPairKey(prev => prev + 1);
        await fetchPair();
        setIsSubmitting(false);

        // Refresh rankings every 5 votes
        if (votesSinceRefresh.current >= 5) {
          votesSinceRefresh.current = 0;
          fetchRankings();
        }
      }, 600);
    } catch (err) {
      toast({ message: err.message || 'Failed to submit vote', type: 'error' });
      setIsSubmitting(false);
      setSelectedSide(null);
    }
  }, [pair, isSubmitting, wgNum, token, fetchPair, fetchRankings, toast]);

  // Skip handler
  const skipPair = useCallback(async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await api(`/api/pairwise/vote/${wgNum}`, {
        method: 'POST',
        token,
        body: {
          question_a_id: pair?.question_a?.id,
          question_b_id: pair?.question_b?.id,
          winner_id: null,
        },
      });
    } catch {
      // Skip failures are non-critical
    }
    setStreak(0);
    setPairKey(prev => prev + 1);
    await fetchPair();
    setIsSubmitting(false);
  }, [isSubmitting, wgNum, token, pair, fetchPair]);

  // Keyboard support
  useEffect(() => {
    const handler = (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (isSubmitting || !pair) return;

      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
        e.preventDefault();
        submitVote(pair.question_a?.id);
      } else if (e.key === 'b' || e.key === 'B' || e.key === 'ArrowRight') {
        e.preventDefault();
        submitVote(pair.question_b?.id);
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        skipPair();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [pair, isSubmitting, submitVote, skipPair]);

  // Submit suggestion
  const submitSuggestion = async () => {
    if (!suggestion.trim()) return;
    setSuggestLoading(true);
    try {
      await api(`/api/pairwise/suggest/${wgNum}`, {
        method: 'POST',
        token,
        body: { suggestion_text: suggestion.trim() },
      });
      toast({ message: 'Suggestion submitted. Thank you!', type: 'success' });
      setSuggestion('');
    } catch (err) {
      toast({ message: err.message || 'Failed to submit', type: 'error' });
    } finally {
      setSuggestLoading(false);
    }
  };

  // Loading state
  if (tokenLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <Skeleton className="mb-4 h-10 w-64" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <Card className="border-red-400/30 bg-red-500/5">
          <CardContent className="py-10 text-center">
            <p className="text-sm font-medium text-red-200">Invite link required</p>
            <p className="mt-2 text-sm text-white/55">
              Pairwise ranking is invite-only. Use your email invitation link to gain access.
            </p>
            <Link to="/join" className="mt-5 inline-block">
              <Button variant="secondary" size="sm">Go to join</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const MINIMUM_COMPARISONS = 50;
  const meetsMinimum = displayedCompleted >= MINIMUM_COMPARISONS;
  const progressPct = Math.min(100, (displayedCompleted / MINIMUM_COMPARISONS) * 100);

  return (
    <div className="flex flex-col bg-[#0A1628]">
      {/* Hero Header */}
      <div className="relative overflow-hidden px-4 py-12 sm:px-6">
        <div className="pointer-events-none absolute -top-32 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-b from-[#00B4D8]/10 to-transparent blur-3xl" />
        <div className="relative mx-auto max-w-3xl">
          <Link to={`/wg/${wgNumber}`} className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-white/50 transition hover:text-white/80">
            Back to working group
          </Link>
          <Badge variant="primary" className="mb-3">
            Working Group {wgNumber} {WG_NAMES[wgNumber] ? '\u00B7 ' + WG_NAMES[wgNumber] : ''}
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Pairwise Ranking
          </h1>
          <p className="mt-2 text-white/50">
            Which research question is more important? Complete at least {MINIMUM_COMPARISONS} comparisons.
          </p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:py-12">
      {/* Progress toward minimum */}
      <div className="mb-8">

        {/* Minimum-target progress bar */}
        <div className="mt-5 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-baseline gap-1.5">
              <motion.span
                key={displayedCompleted}
                initial={{ y: -8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="inline-block text-xl font-bold tabular-nums text-white"
              >
                {displayedCompleted}
              </motion.span>
              <span className="font-medium text-white/40">of {MINIMUM_COMPARISONS} minimum</span>
            </div>
            <div className="flex items-center gap-2">
              {meetsMinimum ? (
                <Badge variant="success" className="gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Minimum reached
                </Badge>
              ) : (
                <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-bold tabular-nums text-amber-300">
                  {MINIMUM_COMPARISONS - displayedCompleted} to go
                </span>
              )}
              {streak >= 2 && (
                <motion.div
                  key={streak}
                  initial={{ scale: 1.4 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                >
                  <Badge variant="warning" className="gap-1">
                    <span aria-hidden>&#128293;</span> {streak} streak
                  </Badge>
                </motion.div>
              )}
              {lastResponseTime != null && (
                <Badge variant="default" className="gap-1">
                  <Timer className="h-3 w-3" />
                  {(lastResponseTime / 1000).toFixed(1)}s
                </Badge>
              )}
            </div>
          </div>
          <Progress value={progressPct} />
          {meetsMinimum && displayedCompleted > MINIMUM_COMPARISONS && (
            <p className="text-xs text-emerald-300/60">Keep going — more comparisons = better rankings</p>
          )}
        </div>

        {/* Keyboard hint — desktop only */}
        <div className="mt-3 hidden items-center gap-2 text-xs text-white/40 sm:flex">
          <Keyboard className="h-3.5 w-3.5" />
          <span>Press <kbd className="rounded border border-white/[0.12] bg-white/[0.04] px-1.5 py-0.5 font-mono text-xs font-medium text-white/70">A</kbd> or <kbd className="rounded border border-white/[0.12] bg-white/[0.04] px-1.5 py-0.5 font-mono text-xs font-medium text-white/70">B</kbd> to vote, <kbd className="rounded border border-white/[0.12] bg-white/[0.04] px-1.5 py-0.5 font-mono text-xs font-medium text-white/70">S</kbd> to skip</span>
        </div>
        <p className="mt-3 text-center text-xs text-white/30 sm:hidden">Tap the question you think is more important</p>
      </div>

      {/* Pair comparison area */}
      {pairLoading && !pair ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Skeleton className="h-52 rounded-xl" />
          <Skeleton className="h-52 rounded-xl" />
        </div>
      ) : pairError === 'all_done' ? (
        <Card className="border-amber-400/30">
          <CardContent className="py-14 text-center">
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            >
              <Sparkles className="mx-auto mb-4 h-16 w-16 text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.4)]" />
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-2xl font-bold text-white"
            >
              Amazing! You&apos;ve compared all available pairs.
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="mt-2 text-base text-white/60"
            >
              Your input is shaping the research agenda.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-6 flex items-center justify-center gap-6"
            >
              <div className="text-center">
                <p className="text-2xl font-bold tabular-nums text-white">{displayedCompleted}</p>
                <p className="text-xs text-white/50">Comparisons</p>
              </div>
              {responseTimes.current.length > 0 && (
                <div className="text-center">
                  <p className="text-2xl font-bold tabular-nums text-white">
                    {(responseTimes.current.reduce((a, b) => a + b, 0) / responseTimes.current.length / 1000).toFixed(1)}s
                  </p>
                  <p className="text-xs text-white/50">Avg Response</p>
                </div>
              )}
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="mt-6"
            >
              <Button
                variant="secondary"
                className="gap-2"
                onClick={() => {
                  document.getElementById('rankings-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <Trophy className="h-4 w-4 text-amber-400" />
                View Rankings
              </Button>
            </motion.div>
          </CardContent>
        </Card>
      ) : pairError ? (
        <Card className="border-red-400/30 bg-red-500/5">
          <CardContent className="py-8 text-center">
            <p className="text-red-300">{pairError}</p>
            <Button variant="secondary" className="mt-4" onClick={fetchPair}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : pair ? (
        <>
          <div className="relative grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
            {/* VS divider (desktop) */}
            <div className="pointer-events-none absolute inset-0 hidden items-center justify-center md:flex">
              <div className="z-10 flex h-12 w-12 items-center justify-center rounded-full border border-white/[0.12] bg-[#142C4A] text-sm font-bold text-white/60 shadow-lg shadow-black/30">
                VS
              </div>
            </div>

            <AnimatePresence mode="wait">
              {/* Option A */}
              <motion.div
                key={`a-${pairKey}`}
                initial={{ opacity: 0, x: 100, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -100, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="relative"
              >
                <button
                  type="button"
                  onClick={() => submitVote(pair.question_a?.id)}
                  disabled={isSubmitting}
                  className={cn(
                    'group w-full cursor-pointer rounded-xl border bg-[#0E1E35] p-6 text-left shadow-lg shadow-black/20 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A1628]',
                    selectedSide === pair.question_a?.id
                      ? 'border-emerald-400/70 shadow-emerald-500/20 shadow-xl ring-2 ring-emerald-400/40'
                      : 'border-white/[0.08] hover:border-purple-400/40 hover:bg-[#142C4A]',
                    isSubmitting && selectedSide !== pair.question_a?.id && 'opacity-50'
                  )}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <Badge variant="primary" className="text-xs font-bold">Option A</Badge>
                    <kbd className="rounded border border-white/[0.12] bg-white/[0.04] px-2 py-0.5 font-mono text-xs text-white/50 transition group-hover:border-purple-400/50 group-hover:text-purple-300">
                      A
                    </kbd>
                  </div>
                  <p className="text-base leading-relaxed text-white/90">
                    {pair.question_a?.text || pair.question_a?.short_text}
                  </p>
                </button>
                {/* Check overlay */}
                <AnimatePresence>
                  {showCheck === 'a' && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                      className="pointer-events-none absolute inset-0 flex items-center justify-center"
                    >
                      <CheckCircle className="h-16 w-16 text-emerald-500 drop-shadow-lg" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* VS divider (mobile) */}
              <motion.div
                key={`vs-${pairKey}`}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center justify-center py-1 md:hidden"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.12] bg-[#142C4A] text-xs font-bold text-white/60 shadow-lg shadow-black/30">
                  VS
                </div>
              </motion.div>

              {/* Option B */}
              <motion.div
                key={`b-${pairKey}`}
                initial={{ opacity: 0, x: 100, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -100, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="relative"
              >
                <button
                  type="button"
                  onClick={() => submitVote(pair.question_b?.id)}
                  disabled={isSubmitting}
                  className={cn(
                    'group w-full cursor-pointer rounded-xl border bg-[#0E1E35] p-6 text-left shadow-lg shadow-black/20 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A1628]',
                    selectedSide === pair.question_b?.id
                      ? 'border-emerald-400/70 shadow-emerald-500/20 shadow-xl ring-2 ring-emerald-400/40'
                      : 'border-white/[0.08] hover:border-purple-400/40 hover:bg-[#142C4A]',
                    isSubmitting && selectedSide !== pair.question_b?.id && 'opacity-50'
                  )}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <Badge variant="primary" className="text-xs font-bold">Option B</Badge>
                    <kbd className="rounded border border-white/[0.12] bg-white/[0.04] px-2 py-0.5 font-mono text-xs text-white/50 transition group-hover:border-purple-400/50 group-hover:text-purple-300">
                      B
                    </kbd>
                  </div>
                  <p className="text-base leading-relaxed text-white/90">
                    {pair.question_b?.text || pair.question_b?.short_text}
                  </p>
                </button>
                {/* Check overlay */}
                <AnimatePresence>
                  {showCheck === 'b' && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                      className="pointer-events-none absolute inset-0 flex items-center justify-center"
                    >
                      <CheckCircle className="h-16 w-16 text-emerald-500 drop-shadow-lg" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Skip button */}
          <div className="mt-5 flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={skipPair}
              disabled={isSubmitting}
              className="gap-1.5"
            >
              <SkipForward className="h-4 w-4" />
              Can&apos;t decide &mdash; skip
            </Button>
          </div>
        </>
      ) : null}

      {/* Rankings table */}
      <div id="rankings-section" className="mt-12">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-400" />
              Current Rankings
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {rankingsLoading ? (
              <div className="space-y-3 p-6">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : rankings.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-white/40">
                Rankings will appear after votes are submitted.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-xs uppercase tracking-wider text-white/40">
                      <th className="px-6 py-3 font-medium">Rank</th>
                      <th className="px-6 py-3 font-medium">Question</th>
                      <th className="px-6 py-3 font-medium text-right">Score</th>
                      <th className="px-6 py-3 font-medium text-right">W / L</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {rankings.map((item, idx) => {
                        const rank = idx + 1;
                        const rankColors = [
                          'bg-amber-400 text-black',
                          'bg-white/60 text-black',
                          'bg-amber-700 text-white',
                        ];
                        const rankColor = rank <= 3 ? rankColors[rank - 1] : 'bg-white/[0.08] text-white/70';

                        return (
                          <motion.tr
                            key={item.id || item.question_id || idx}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.04 }}
                            className="border-b border-white/[0.04] transition-colors hover:bg-white/[0.03]"
                          >
                            <td className="px-6 py-3">
                              <span className={cn(
                                'inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold',
                                rankColor
                              )}>
                                {rank}
                              </span>
                            </td>
                            <td className="max-w-xs truncate px-6 py-3 text-white/80" title={item.text || item.question_text}>
                              {item.text || item.question_text}
                            </td>
                            <td className="px-6 py-3 text-right font-mono text-sm font-semibold text-white/90">
                              {item.score != null ? item.score.toFixed(1) : '--'}
                            </td>
                            <td className="px-6 py-3 text-right font-mono text-sm">
                              <span className="text-emerald-400">{item.wins ?? 0}</span>
                              <span className="text-white/25"> / </span>
                              <span className="text-red-400">{item.losses ?? 0}</span>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Suggest a question */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="h-5 w-5 text-amber-400" />
              Suggest a Question
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-white/50">
              Think something is missing? Suggest a new question for this working group.
            </p>
            <textarea
              value={suggestion}
              onChange={(e) => setSuggestion(e.target.value)}
              placeholder="Type your suggested question here..."
              rows={3}
              className="w-full resize-none rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white/90 placeholder-white/30 transition focus:border-purple-400/50 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            />
            <div className="mt-3 flex justify-end">
              <Button
                size="sm"
                onClick={submitSuggestion}
                loading={suggestLoading}
                disabled={!suggestion.trim()}
                className="gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                Submit Suggestion
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
}
