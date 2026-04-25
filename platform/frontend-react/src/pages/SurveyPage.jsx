import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { usePageTitle } from '@/hooks/usePageTitle';
import {
  CheckCircle,
  Edit3,
  XCircle,
  ChevronLeft,
  Send,
  Save,
  Lightbulb,
  AlertCircle,
  Loader2,
  MessageSquarePlus,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/toast';
import { useParticipantToken } from '@/hooks/useParticipantToken';
import { api } from '@/lib/api';

// ── Constants ───────────────────────────────────────────────────────
const DISPOSITIONS = [
  {
    value: 'include',
    label: 'Include',
    icon: CheckCircle,
    activeClass: 'bg-emerald-500/15 border-emerald-400/60 text-emerald-300 ring-emerald-400/30',
  },
  {
    value: 'include_with_modifications',
    label: 'Modify',
    icon: Edit3,
    activeClass: 'bg-amber-500/15 border-amber-400/60 text-amber-300 ring-amber-400/30',
  },
  {
    value: 'exclude',
    label: 'Exclude',
    icon: XCircle,
    activeClass: 'bg-red-500/15 border-red-400/60 text-red-300 ring-red-400/30',
  },
];

const COMMENT_MAX = 2000;

const AUTOSAVE_KEY = (wg, round) => `saem_draft_wg${wg}_${round}`;
const SUGGESTION_KEY = (wg, round) => `saem_suggest_wg${wg}_${round}`;

// ── Skeleton loaders ────────────────────────────────────────────────
function QuestionSkeleton() {
  return (
    <Card>
      <CardContent className="space-y-4 py-6">
        <div className="flex items-start gap-3">
          <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-3/4" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-20 w-full" />
      </CardContent>
    </Card>
  );
}

// ── Round 1 results bar ─────────────────────────────────────────────
function R1ResultsBar({ results }) {
  if (!results) return null;
  const total = (results.include || 0) + (results.modify || 0) + (results.exclude || 0);
  if (total === 0) return null;

  const pInclude = ((results.include || 0) / total) * 100;
  const pModify = ((results.modify || 0) / total) * 100;
  const pExclude = ((results.exclude || 0) / total) * 100;

  return (
    <div className="mt-3 space-y-1.5">
      <p className="text-xs font-medium text-white/40">Round 1 Results ({total} responses)</p>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-white/[0.06]">
        {pInclude > 0 && (
          <div
            className="bg-emerald-500 transition-all duration-500"
            style={{ width: `${pInclude}%` }}
            title={`Include: ${Math.round(pInclude)}%`}
          />
        )}
        {pModify > 0 && (
          <div
            className="bg-amber-400 transition-all duration-500"
            style={{ width: `${pModify}%` }}
            title={`Modify: ${Math.round(pModify)}%`}
          />
        )}
        {pExclude > 0 && (
          <div
            className="bg-red-400 transition-all duration-500"
            style={{ width: `${pExclude}%` }}
            title={`Exclude: ${Math.round(pExclude)}%`}
          />
        )}
      </div>
      <div className="flex gap-4 text-xs text-white/40">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
          Include {Math.round(pInclude)}%
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
          Modify {Math.round(pModify)}%
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-red-400" />
          Exclude {Math.round(pExclude)}%
        </span>
      </div>
    </div>
  );
}

// ── Importance slider ───────────────────────────────────────────────
function ImportanceSlider({ value, onChange }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-white/70">Importance Rating</label>
        <span className="rounded-md bg-purple-500/15 px-2 py-0.5 text-sm font-bold text-purple-300">
          {value}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="shrink-0 text-xs font-medium text-white/30">Low</span>
        <input
          type="range"
          min={1}
          max={9}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/[0.08] accent-[#00B4D8] [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-500 [&::-webkit-slider-thumb]:shadow-md"
        />
        <span className="shrink-0 text-xs font-medium text-white/30">Critical</span>
      </div>
      <div className="flex justify-between px-0.5">
        {Array.from({ length: 9 }, (_, i) => (
          <span key={i} className="text-[10px] text-white/20">{i + 1}</span>
        ))}
      </div>
    </div>
  );
}

// ── Question Card ───────────────────────────────────────────────────
function QuestionCard({ question, index, response, onUpdate, isRound2 }) {
  const commentLength = response.comment?.length || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.05, 0.4), duration: 0.4 }}
    >
      <Card className={response.disposition ? 'ring-1 ring-purple-500/30' : ''}>
        <CardContent className="space-y-5 py-6">
          {/* Question header */}
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-500/15 text-sm font-bold text-purple-300">
              {index + 1}
            </div>
            <div className="flex-1">
              <p className="text-base font-medium leading-relaxed text-white/90">
                {question.text || question.question_text}
              </p>
              {question.category && (
                <Badge variant="default" className="mt-2">{question.category}</Badge>
              )}
            </div>
          </div>

          {/* Round 1 results (shown in Round 2) */}
          {isRound2 && question.r1_results && (
            <R1ResultsBar results={question.r1_results} />
          )}

          {/* Disposition buttons */}
          <div className="flex flex-wrap gap-2">
            {DISPOSITIONS.map((d) => {
              const isActive = response.disposition === d.value;
              const Icon = d.icon;
              return (
                <motion.button
                  key={d.value}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onUpdate({ disposition: isActive ? null : d.value })}
                  className={`inline-flex items-center gap-2 rounded-lg border-2 px-4 py-2.5 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 ${
                    isActive
                      ? d.activeClass + ' ring-2'
                      : 'border-white/[0.08] text-white/50 hover:border-white/[0.14] hover:bg-white/[0.04] hover:text-white/80'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {d.label}
                </motion.button>
              );
            })}
          </div>

          {/* Importance slider */}
          <ImportanceSlider
            value={response.importance_rating || 5}
            onChange={(val) => onUpdate({ importance_rating: val })}
          />

          {/* Comment textarea */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-white/70">Comment (optional)</label>
            <textarea
              value={response.comment || ''}
              onChange={(e) => {
                if (e.target.value.length <= COMMENT_MAX) {
                  onUpdate({ comment: e.target.value });
                }
              }}
              placeholder="Share your reasoning or suggest modifications..."
              rows={3}
              className="w-full resize-y rounded-lg border border-white/[0.08] bg-white/[0.04] px-3.5 py-2.5 text-sm text-white/90 placeholder-white/30 transition focus:border-purple-400/50 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            />
            <p className={`text-right text-xs ${commentLength > COMMENT_MAX * 0.9 ? 'text-amber-400' : 'text-white/25'}`}>
              {commentLength}/{COMMENT_MAX}
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Main Component ──────────────────────────────────────────────────
export function SurveyPage() {
  const { wgNumber, roundName } = useParams();
  usePageTitle(`Survey - WG ${wgNumber} ${roundName.replace('_', ' ')}`);

  const { token, loading: tokenLoading } = useParticipantToken(wgNumber);
  const toast = useToast();

  const [questions, setQuestions] = useState([]);
  const [loadingQ, setLoadingQ] = useState(true);
  const [errorQ, setErrorQ] = useState(null);

  const [responses, setResponses] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);

  const [suggestionText, setSuggestionText] = useState('');
  const [suggestionContext, setSuggestionContext] = useState('');
  const [submittingSuggestion, setSubmittingSuggestion] = useState(false);

  const progressRef = useRef(null);
  const isRound2 = roundName?.toLowerCase() === 'round2';
  const roundLabel = roundName?.replace('round', 'Round ') || roundName;

  // ── Fetch questions ─────────────────────────────────────────────
  useEffect(() => {
    if (tokenLoading) return;
    setLoadingQ(true);
    setErrorQ(null);

    api('/api/surveys/questions/' + wgNumber, { params: { round_name: roundName }, token })
      .then((data) => {
        const qs = Array.isArray(data) ? data : data.questions || [];
        setQuestions(qs);
      })
      .catch((err) => setErrorQ(err.message))
      .finally(() => setLoadingQ(false));
  }, [wgNumber, roundName, token, tokenLoading]);

  // ── Restore autosaved draft ─────────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(AUTOSAVE_KEY(wgNumber, roundName));
      if (saved) {
        setResponses(JSON.parse(saved));
        setDraftSaved(true);
      }
    } catch {}

    try {
      const savedSuggestion = localStorage.getItem(SUGGESTION_KEY(wgNumber, roundName));
      if (savedSuggestion) {
        const parsed = JSON.parse(savedSuggestion);
        setSuggestionText(parsed.text || '');
        setSuggestionContext(parsed.context || '');
      }
    } catch {}
  }, [wgNumber, roundName]);

  // ── Autosave on change ──────────────────────────────────────────
  useEffect(() => {
    if (Object.keys(responses).length === 0) return;
    try {
      localStorage.setItem(AUTOSAVE_KEY(wgNumber, roundName), JSON.stringify(responses));
      setDraftSaved(true);
    } catch {}
  }, [responses, wgNumber, roundName]);

  useEffect(() => {
    if (!suggestionText && !suggestionContext) return;
    try {
      localStorage.setItem(
        SUGGESTION_KEY(wgNumber, roundName),
        JSON.stringify({ text: suggestionText, context: suggestionContext })
      );
    } catch {}
  }, [suggestionText, suggestionContext, wgNumber, roundName]);

  const updateResponse = useCallback((questionId, updates) => {
    setResponses((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], ...updates },
    }));
  }, []);

  const { answered, total, percentage } = useMemo(() => {
    const t = questions.length;
    const a = questions.filter((q) => {
      const id = q.id || q.question_id;
      return responses[id]?.disposition;
    }).length;
    return { answered: a, total: t, percentage: t > 0 ? Math.round((a / t) * 100) : 0 };
  }, [questions, responses]);

  const handleSubmit = async () => {
    if (answered === 0) {
      toast({ message: 'Please answer at least one question before submitting.', type: 'error' });
      return;
    }

    setSubmitting(true);
    const failures = [];

    try {
      const promises = questions
        .filter((q) => {
          const id = q.id || q.question_id;
          return responses[id]?.disposition;
        })
        .map(async (q) => {
          const id = q.id || q.question_id;
          const r = responses[id];
          try {
            await api(`/api/surveys/respond/${wgNumber}/${roundName}/${id}`, {
              method: 'POST',
              token,
              body: {
                disposition: r.disposition,
                importance_rating: r.importance_rating || 5,
                comment: r.comment || '',
              },
            });
          } catch (err) {
            failures.push({ id, error: err.message });
          }
        });

      await Promise.all(promises);

      if (failures.length === 0) {
        localStorage.removeItem(AUTOSAVE_KEY(wgNumber, roundName));
        setDraftSaved(false);
        setSubmitted(true);
        toast({ message: 'All responses submitted successfully!', type: 'success' });
      } else {
        const firstError = failures[0]?.error || 'unknown error';
        console.error('Survey submit failures:', failures);
        toast({
          message: `${failures.length} of ${answered} responses failed: ${firstError}`,
          type: 'error',
          duration: 8000,
        });
      }
    } catch (err) {
      toast({ message: 'Submission failed: ' + err.message, type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSuggestion = async () => {
    if (!suggestionText.trim()) {
      toast({ message: 'Please enter a question suggestion.', type: 'error' });
      return;
    }

    setSubmittingSuggestion(true);
    try {
      await api(`/api/surveys/suggest/${wgNumber}/${roundName}`, {
        method: 'POST',
        token,
        body: {
          suggestion_text: suggestionText.trim(),
          general_comment: suggestionContext.trim() || undefined,
        },
      });
      localStorage.removeItem(SUGGESTION_KEY(wgNumber, roundName));
      setSuggestionText('');
      setSuggestionContext('');
      toast({ message: 'Question suggestion submitted. Thank you!', type: 'success' });
    } catch (err) {
      toast({ message: 'Failed to submit suggestion: ' + err.message, type: 'error' });
    } finally {
      setSubmittingSuggestion(false);
    }
  };

  if (tokenLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
          <p className="text-sm text-white/50">Initializing session...</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-red-300" />
            <h2 className="mt-3 text-lg font-semibold text-white">Invite link required</h2>
            <p className="mt-2 text-sm text-white/55">
              Access to surveys is invite-only. Open your email invitation link to sign in.
            </p>
            <Link to="/join" className="mt-5 inline-block">
              <Button variant="secondary" size="sm">Go to join</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <Card>
            <CardContent className="flex flex-col items-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
                <CheckCircle className="h-9 w-9" />
              </div>
              <h2 className="mt-5 text-2xl font-bold text-white">Responses Submitted</h2>
              <p className="mt-2 max-w-md text-white/50">
                Thank you for completing the {roundLabel} survey for Working Group {wgNumber}.
                Your input is essential to building the AI in EM research agenda.
              </p>
              <div className="mt-8 flex gap-3">
                <Link to={`/wg/${wgNumber}`}>
                  <Button variant="secondary">
                    <ChevronLeft className="h-4 w-4" />
                    Back to working group
                  </Button>
                </Link>
                <Link to={`/results/${wgNumber}`}>
                  <Button>View Results</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-[#0A1628]">
      {/* ─── Hero Header ─────────────────────────────────────────── */}
      <div className="relative overflow-hidden px-4 py-12 sm:px-6">
        <div className="pointer-events-none absolute -top-32 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-b from-[#1B5E8A]/10 to-transparent blur-3xl" />
        <div className="relative mx-auto max-w-3xl">
          <Link
            to={`/wg/${wgNumber}`}
            className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-white/50 transition hover:text-white/80"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to working group
          </Link>
          <Badge variant="primary" className="mb-3">
            Working Group {wgNumber}
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Delphi Survey &mdash; {roundName === 'round_1' ? 'Round 1' : 'Round 2'}
          </h1>
          <p className="mt-2 text-white/50">
            Rate each research question and help shape the 10-year agenda
          </p>
        </div>
      </div>

      {/* ─── Sticky Progress Bar ───────────────────────────────── */}
      <div
        ref={progressRef}
        className="sticky top-16 z-40 border-b border-white/[0.08] bg-[#0E1E35] px-4 py-3.5 shadow-lg shadow-black/20 sm:px-6"
      >
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center justify-between gap-3 text-sm">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold tabular-nums text-white">{answered}</span>
              <span className="font-medium text-white/40">of {total} answered</span>
            </div>
            <div className="flex items-center gap-3">
              {draftSaved && (
                <span className="hidden items-center gap-1 text-xs text-emerald-300 sm:flex">
                  <Save className="h-3 w-3" />
                  Draft saved
                </span>
              )}
              <span className="rounded-md bg-purple-500/15 px-2 py-0.5 text-sm font-bold tabular-nums text-purple-300">
                {percentage}%
              </span>
            </div>
          </div>
          <Progress value={answered} max={total} className="mt-2" />
        </div>
      </div>

      {/* ─── Questions ─────────────────────────────────────────── */}
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        {loadingQ ? (
          <div className="space-y-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <QuestionSkeleton key={i} />
            ))}
          </div>
        ) : errorQ ? (
          <Card>
            <CardContent className="flex flex-col items-center py-14 text-center">
              <AlertCircle className="h-10 w-10 text-red-400" />
              <h3 className="mt-3 text-base font-semibold text-white/90">Failed to Load Questions</h3>
              <p className="mt-1.5 max-w-sm text-sm text-white/50">{errorQ}</p>
              <Button
                variant="secondary"
                className="mt-6"
                onClick={() => window.location.reload()}
              >
                Try Again
              </Button>
            </CardContent>
          </Card>
        ) : questions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-14 text-center">
              <AlertCircle className="h-10 w-10 text-white/20" />
              <h3 className="mt-3 text-base font-semibold text-white/70">No Questions Available</h3>
              <p className="mt-1.5 max-w-sm text-sm text-white/40">
                This survey round may not be open yet. Check back later.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="space-y-6">
              {questions.map((q, idx) => {
                const id = q.id || q.question_id;
                return (
                  <QuestionCard
                    key={id}
                    question={q}
                    index={idx}
                    response={responses[id] || {}}
                    onUpdate={(updates) => updateResponse(id, updates)}
                    isRound2={isRound2}
                  />
                );
              })}
            </div>

            {/* ─── Submit Button ──────────────────────────────── */}
            <div className="mt-10 flex flex-col items-center gap-3">
              <Button
                size="lg"
                loading={submitting}
                disabled={answered === 0}
                onClick={handleSubmit}
                className="min-w-[200px]"
              >
                <Send className="h-4 w-4" />
                Submit {answered} Response{answered !== 1 ? 's' : ''}
              </Button>
              {answered < total && (
                <p className="text-xs text-white/40">
                  {total - answered} question{total - answered !== 1 ? 's' : ''} remaining &mdash; you can submit partial responses
                </p>
              )}
            </div>

            {/* ─── Suggestion Section ─────────────────────────── */}
            <div className="mt-16 border-t border-white/[0.06] pt-10">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
                  <Lightbulb className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-semibold text-white">Suggest a New Question</h2>
              </div>
              <p className="mt-2 text-sm text-white/50">
                Think an important research question is missing? Propose it below and it may be included in the next round.
              </p>

              <div className="mt-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-white/70">Proposed Research Question</label>
                  <textarea
                    value={suggestionText}
                    onChange={(e) => setSuggestionText(e.target.value)}
                    placeholder="What research question should be added?"
                    rows={3}
                    className="w-full resize-y rounded-lg border border-white/[0.08] bg-white/[0.04] px-3.5 py-2.5 text-sm text-white/90 placeholder-white/30 transition focus:border-purple-400/50 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-white/70">Additional Context (optional)</label>
                  <textarea
                    value={suggestionContext}
                    onChange={(e) => setSuggestionContext(e.target.value)}
                    placeholder="Why is this question important? Any supporting evidence or references?"
                    rows={2}
                    className="w-full resize-y rounded-lg border border-white/[0.08] bg-white/[0.04] px-3.5 py-2.5 text-sm text-white/90 placeholder-white/30 transition focus:border-purple-400/50 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
                <Button
                  variant="secondary"
                  loading={submittingSuggestion}
                  disabled={!suggestionText.trim()}
                  onClick={handleSuggestion}
                >
                  <MessageSquarePlus className="h-4 w-4" />
                  Submit Suggestion
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
