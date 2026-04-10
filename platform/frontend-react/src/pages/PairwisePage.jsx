import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
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
      if (err.status === 404 || err.message?.includes('No more pairs')) {
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
          winner_id: winnerId,
          loser_id: winnerId === pair.option_a?.id ? pair.option_b?.id : pair.option_a?.id,
          response_time_ms: responseTime,
        },
      });

      setCompleted(prev => prev + 1);
      votesSinceRefresh.current += 1;

      // Brief delay to show selection animation, then load next pair
      setTimeout(async () => {
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
          winner_id: null,
          loser_id: null,
          skipped: true,
          option_a_id: pair?.option_a?.id,
          option_b_id: pair?.option_b?.id,
        },
      });
    } catch {
      // Skip failures are non-critical
    }
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
        submitVote(pair.option_a?.id);
      } else if (e.key === 'b' || e.key === 'B' || e.key === 'ArrowRight') {
        e.preventDefault();
        submitVote(pair.option_b?.id);
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
        body: { text: suggestion.trim() },
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

  const progressPct = totalPairs > 0 ? (displayedCompleted / totalPairs) * 100 : 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100">
            <ArrowLeftRight className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Pairwise Ranking
            </h1>
            <p className="text-sm text-gray-500">
              WG {wgNum}: {WG_NAMES[wgNum] || `Working Group ${wgNum}`}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-5 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700">
              <motion.span
                key={displayedCompleted}
                initial={{ y: -8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="inline-block tabular-nums"
              >
                {displayedCompleted}
              </motion.span>
              {totalPairs > 0 && (
                <span className="text-gray-400"> / {totalPairs} comparisons</span>
              )}
            </span>
            {lastResponseTime != null && (
              <Badge variant="default" className="gap-1">
                <Timer className="h-3 w-3" />
                {(lastResponseTime / 1000).toFixed(1)}s
              </Badge>
            )}
          </div>
          <Progress value={progressPct} />
        </div>

        {/* Keyboard hint */}
        <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
          <Keyboard className="h-3.5 w-3.5" />
          <span>Press <kbd className="rounded border border-gray-300 bg-gray-50 px-1.5 py-0.5 font-mono text-xs font-medium text-gray-600">A</kbd> or <kbd className="rounded border border-gray-300 bg-gray-50 px-1.5 py-0.5 font-mono text-xs font-medium text-gray-600">B</kbd> to vote, <kbd className="rounded border border-gray-300 bg-gray-50 px-1.5 py-0.5 font-mono text-xs font-medium text-gray-600">S</kbd> to skip</span>
        </div>
      </div>

      {/* Pair comparison area */}
      {pairLoading && !pair ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Skeleton className="h-52 rounded-xl" />
          <Skeleton className="h-52 rounded-xl" />
        </div>
      ) : pairError === 'all_done' ? (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="py-12 text-center">
            <Trophy className="mx-auto mb-4 h-12 w-12 text-emerald-500" />
            <h2 className="text-xl font-bold text-emerald-800">All comparisons complete!</h2>
            <p className="mt-2 text-sm text-emerald-600">
              Thank you for ranking all {displayedCompleted} pairs. Your input helps build consensus.
            </p>
          </CardContent>
        </Card>
      ) : pairError ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-8 text-center">
            <p className="text-red-700">{pairError}</p>
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
              <div className="z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 border-gray-200 bg-white text-sm font-bold text-gray-400 shadow-sm">
                VS
              </div>
            </div>

            <AnimatePresence mode="wait">
              {/* Option A */}
              <motion.div
                key={`a-${pairKey}`}
                initial={{ x: -60, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -60, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              >
                <button
                  type="button"
                  onClick={() => submitVote(pair.option_a?.id)}
                  disabled={isSubmitting}
                  className={cn(
                    'group w-full cursor-pointer rounded-xl border-2 bg-white p-6 text-left shadow-sm transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
                    selectedSide === pair.option_a?.id
                      ? 'border-emerald-400 shadow-emerald-100 shadow-lg ring-2 ring-emerald-300'
                      : 'border-gray-200 hover:border-primary-300 hover:shadow-md',
                    isSubmitting && selectedSide !== pair.option_a?.id && 'opacity-50'
                  )}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <Badge variant="primary" className="text-xs font-bold">Option A</Badge>
                    <kbd className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 font-mono text-xs text-gray-400 transition group-hover:border-primary-300 group-hover:text-primary-600">
                      A
                    </kbd>
                  </div>
                  <p className="text-base leading-relaxed text-gray-800">
                    {pair.option_a?.text || pair.option_a?.question_text}
                  </p>
                </button>
              </motion.div>

              {/* VS divider (mobile) */}
              <motion.div
                key={`vs-${pairKey}`}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center justify-center py-1 md:hidden"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-gray-200 bg-white text-xs font-bold text-gray-400 shadow-sm">
                  VS
                </div>
              </motion.div>

              {/* Option B */}
              <motion.div
                key={`b-${pairKey}`}
                initial={{ x: 60, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 60, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              >
                <button
                  type="button"
                  onClick={() => submitVote(pair.option_b?.id)}
                  disabled={isSubmitting}
                  className={cn(
                    'group w-full cursor-pointer rounded-xl border-2 bg-white p-6 text-left shadow-sm transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
                    selectedSide === pair.option_b?.id
                      ? 'border-emerald-400 shadow-emerald-100 shadow-lg ring-2 ring-emerald-300'
                      : 'border-gray-200 hover:border-primary-300 hover:shadow-md',
                    isSubmitting && selectedSide !== pair.option_b?.id && 'opacity-50'
                  )}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <Badge variant="primary" className="text-xs font-bold">Option B</Badge>
                    <kbd className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 font-mono text-xs text-gray-400 transition group-hover:border-primary-300 group-hover:text-primary-600">
                      B
                    </kbd>
                  </div>
                  <p className="text-base leading-relaxed text-gray-800">
                    {pair.option_b?.text || pair.option_b?.question_text}
                  </p>
                </button>
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
              className="gap-1.5 text-gray-400 hover:text-gray-600"
            >
              <SkipForward className="h-4 w-4" />
              Can&apos;t decide &mdash; skip
            </Button>
          </div>
        </>
      ) : null}

      {/* Rankings table */}
      <div className="mt-12">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
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
              <div className="px-6 py-10 text-center text-sm text-gray-400">
                Rankings will appear after votes are submitted.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs uppercase tracking-wider text-gray-400">
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
                          'bg-amber-500 text-white',
                          'bg-gray-400 text-white',
                          'bg-amber-700 text-white',
                        ];
                        const rankColor = rank <= 3 ? rankColors[rank - 1] : 'bg-gray-100 text-gray-600';

                        return (
                          <motion.tr
                            key={item.id || item.question_id || idx}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.04 }}
                            className="border-b border-gray-50 transition-colors hover:bg-gray-50"
                          >
                            <td className="px-6 py-3">
                              <span className={cn(
                                'inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold',
                                rankColor
                              )}>
                                {rank}
                              </span>
                            </td>
                            <td className="max-w-xs truncate px-6 py-3 text-gray-700" title={item.text || item.question_text}>
                              {item.text || item.question_text}
                            </td>
                            <td className="px-6 py-3 text-right font-mono text-sm font-semibold text-gray-800">
                              {item.score != null ? item.score.toFixed(1) : '--'}
                            </td>
                            <td className="px-6 py-3 text-right font-mono text-sm">
                              <span className="text-emerald-600">{item.wins ?? 0}</span>
                              <span className="text-gray-300"> / </span>
                              <span className="text-red-500">{item.losses ?? 0}</span>
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
              <Lightbulb className="h-5 w-5 text-amber-500" />
              Suggest a Question
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-gray-500">
              Think something is missing? Suggest a new question for this working group.
            </p>
            <textarea
              value={suggestion}
              onChange={(e) => setSuggestion(e.target.value)}
              placeholder="Type your suggested question here..."
              rows={3}
              className="w-full resize-none rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 placeholder-gray-400 transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
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
  );
}
