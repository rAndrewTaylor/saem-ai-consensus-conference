import { createElement, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { usePageTitle } from '@/hooks/usePageTitle';
import * as Tabs from '@radix-ui/react-tabs';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Radio,
  BarChart3,
  ListOrdered,
  Sliders,
  Send,
  Home, LayoutGrid,
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
import { queueSubmit } from '@/lib/offlineQueue';
import { cn } from '@/lib/utils';
import { BreakoutNotesPanel } from '@/components/stage/BreakoutNotesPanel';
import { SignedInChip } from '@/components/conference/SignedInChip';

const MotionDiv = motion.div;
const MotionSpan = motion.span;

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

// Day-of voting uses two methods only: priority ranking (drag-to-reorder)
// and importance rating. The 100-point allocation method was removed after
// the May 15 dry run — too complex on phones, didn't parallel the Delphi
// process, and the ranking + importance combo carries the same signal.
const TAB_CONFIG = [
  { value: 'ranking', label: 'Priority Ranking', icon: ListOrdered },
  { value: 'importance', label: 'Importance Rating', icon: Sliders },
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
  const [sessionStopped, setSessionStopped] = useState(false);
  const sseRef = useRef(null);

  // Submission states per tab
  const [submittedTabs, setSubmittedTabs] = useState({});

  // ---- Priority Ranking state ----
  const [rankOrder, setRankOrder] = useState([]);
  const [rankSubmitting, setRankSubmitting] = useState(false);

  // ---- Importance Rating state ----
  const [importanceValues, setImportanceValues] = useState({});
  const [importanceSubmitting, setImportanceSubmitting] = useState(false);

  // Comments removed from the live voting page — the action while
  // a session is open is the vote itself. Keep useless state out of
  // memory.

  // ---------------------------------------------------------------------------
  // Fetch session + questions
  // ---------------------------------------------------------------------------

  const fetchQuestions = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api(`/api/conference/sessions/${sessionId}/questions`, { token });
      setSession(data.session ?? data);
      const qs = data.questions ?? data.items ?? [];
      setQuestions(qs);
      const savedRank = loadLocal(sessionId, 'rank');
      if (savedRank && savedRank.length === qs.length) {
        setRankOrder(savedRank);
      } else {
        setRankOrder(qs.map((q) => q.id || q.question_id));
      }
      const savedImportance = loadLocal(sessionId, 'importance');
      if (savedImportance) {
        setImportanceValues(savedImportance);
      } else {
        const defaults = {};
        qs.forEach((q) => { defaults[q.id || q.question_id] = 5; });
        setImportanceValues(defaults);
      }
      setVoterCount(data.voter_count ?? 0);
    } catch (err) {
      setPageError(err.message);
    }
  }, [token, sessionId]);

  useEffect(() => {
    if (!token) return;
    setPageLoading(true);
    fetchQuestions().finally(() => setPageLoading(false));
  }, [token, sessionId, fetchQuestions]);

  // ---------------------------------------------------------------------------
  // Autosave to localStorage
  // ---------------------------------------------------------------------------

  useEffect(() => { if (rankOrder.length) saveLocal(sessionId, 'rank', rankOrder); }, [sessionId, rankOrder]);
  useEffect(() => { if (Object.keys(importanceValues).length) saveLocal(sessionId, 'importance', importanceValues); }, [sessionId, importanceValues]);

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

    // Backend now emits all events as default "message" with `data.event`
    // in the payload. Filter for vote_update / session_stopped / phase_changed.
    es.onmessage = (e) => {
      let data;
      try { data = JSON.parse(e.data); } catch { return; }
      if (data?.event === 'vote_update') {
        setVoterCount(data.voter_count ?? ((prev) => prev + 1));
      } else if (data?.event === 'session_stopped') {
        setSessionStopped(true);
      } else if (data?.event === 'phase_changed') {
        // Reload questions list on phase flip so post-discussion vote
        // can re-rank against current question set.
        fetchQuestions();
      }
    };

    return () => {
      es.close();
      sseRef.current = null;
      setSseConnected(false);
    };
  }, [sessionId]);

  // ---------------------------------------------------------------------------
  // Ranking handler
  // ---------------------------------------------------------------------------

  const submitRanking = async () => {
    if (sessionStopped) {
      toast({ message: 'Voting has closed for this session.', type: 'info' });
      return;
    }
    setRankSubmitting(true);
    try {
      // Backend expects {rankings: {question_id: rank}} — convert array order to dict
      const rankings = {};
      rankOrder.forEach((qId, idx) => { rankings[qId] = idx + 1; });
      const res = await queueSubmit({
        url: `/api/conference/vote/${sessionId}/ranking`,
        body: { rankings },
        token,
        kind: 'ranking',
      });
      setSubmittedTabs(prev => ({ ...prev, ranking: true }));
      toast({ message: res?.queued ? 'Ranking queued (will sync when online)' : 'Priority ranking submitted!', type: 'success' });
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
    if (sessionStopped) {
      toast({ message: 'Voting has closed for this session.', type: 'info' });
      return;
    }
    setImportanceSubmitting(true);
    try {
      const res = await queueSubmit({
        url: `/api/conference/vote/${sessionId}/importance`,
        body: { ratings: importanceValues },
        token,
        kind: 'importance',
      });
      setSubmittedTabs(prev => ({ ...prev, importance: true }));
      toast({ message: res?.queued ? 'Ratings queued (will sync when online)' : 'Importance ratings submitted!', type: 'success' });
    } catch (err) {
      toast({ message: err.message || 'Submission failed', type: 'error' });
    } finally {
      setImportanceSubmitting(false);
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
        <Link to="/day">
          <Button variant="secondary" className="mt-6 gap-2">
            <Home className="h-4 w-4" />
            Back to conference
          </Button>
        </Link>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex flex-col bg-[#0A1628] min-h-screen pb-24">
      {/* Persistent top nav — always available so participants can hop back
          to the conference-day agenda without using the browser back button. */}
      <div className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#0A1628]/95 px-4 py-2 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Link
              to="/welcome"
              className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/40 bg-cyan-500/[0.12] px-3 py-1.5 text-sm font-semibold text-cyan-100 transition hover:border-cyan-300/60 hover:bg-cyan-500/20"
            >
              <LayoutGrid className="h-4 w-4" />
              Landing
            </Link>
            <Link
              to="/day"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-1.5 text-sm font-medium text-white/80 transition hover:bg-white/[0.08] hover:text-white"
            >
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Agenda</span>
            </Link>
          </div>
          <SignedInChip compact />
        </div>
      </div>

      {/* Compact header — keep the rank list above the fold on phones */}
      <div className="relative px-4 pb-2 pt-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
            Conference Day Voting
          </h1>
        </div>
      </div>

      <div className="mx-auto w-full max-w-4xl px-4 pb-12 sm:px-6">
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
            <span
              className={`h-2 w-2 rounded-full ${sseConnected ? 'bg-cyan-300' : 'bg-amber-300'}`}
              title={sseConnected ? 'Live updates connected' : 'Live updates reconnecting'}
            />
            <div className="flex items-center gap-1.5 text-sm text-white/50">
              <Users className="h-4 w-4" />
              <MotionSpan
                key={voterCount}
                initial={{ y: -6, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="font-semibold tabular-nums text-white/80"
              >
                {voterCount}
              </MotionSpan>
              <span className="hidden sm:inline">voters</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
        <Tabs.List className="relative mb-6 flex gap-1 rounded-xl border border-white/[0.06] bg-[#0E1E35] p-1">
          {TAB_CONFIG.map(({ value, label, icon }) => (
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
              {createElement(icon, { className: 'h-4 w-4' })}
              <span className="hidden sm:inline">{label}</span>
              {submittedTabs[value] && (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              )}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {/* Tab content with animation */}
        <AnimatePresence mode="wait">
          <MotionDiv
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {/* ------- TAB 1: Priority Ranking (drag-to-reorder) ------- */}
            <Tabs.Content value="ranking" forceMount={activeTab === 'ranking' ? true : undefined} className={activeTab !== 'ranking' ? 'hidden' : ''}>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Drag to reorder by priority</CardTitle>
                    <span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 font-mono text-xs text-white/60">
                      {rankOrder.length} question{rankOrder.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-white/50">
                    Press-and-hold the grip handle on a row, then drag up or down. #1 is your highest priority.
                  </p>
                </CardHeader>
                <CardContent className="space-y-2 p-4">
                  {submittedTabs.ranking && (
                    <MotionDiv
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-300"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Submitted successfully! You can update and resubmit.
                    </MotionDiv>
                  )}

                  <DragRanking
                    ids={rankOrder}
                    questionsById={questionsById}
                    onReorder={setRankOrder}
                  />

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
                    <MotionDiv
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mb-2 flex items-center gap-2 rounded-lg bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-300"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Submitted successfully! You can update and resubmit.
                    </MotionDiv>
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

          </MotionDiv>
        </AnimatePresence>
      </Tabs.Root>

      {/* Comments removed from the live voting page — when a vote is
          open, the only action is the vote itself. General feedback
          channels (audience chat during panel discussion, post-conference
          manuscript pipeline) cover everything this textarea used to. */}
      </div>

      {/* Audience chat is intentionally NOT rendered on the voting page
          — ranking is a focused task and the chat drawer competed with
          the rank list for the bottom of the viewport. Chat stays
          available on /day, just not here. */}

      {/* Breakout note submission — only renders during table_reactions. */}
      <BreakoutNotesPanel />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Drag-to-reorder ranking (dnd-kit)
// ---------------------------------------------------------------------------

function DragRanking({ ids, questionsById, onReorder }) {
  const sensors = useSensors(
    // Pointer = mouse on desktop. Activation distance prevents accidental drags
    // when the user is just tapping/clicking.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    // Touch = phones/tablets. delay so a brief tap doesn't start a drag (lets
    // the row scroll naturally), and tolerance so a small wiggle still cancels.
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(active.id);
    const newIndex = ids.indexOf(over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(ids, oldIndex, newIndex));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ul className="space-y-2">
          {ids.map((qId, idx) => {
            const q = questionsById[qId];
            if (!q) return null;
            return (
              <SortableRankRow
                key={qId}
                id={qId}
                index={idx}
                text={q.text || q.question_text}
              />
            );
          })}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableRankRow({ id, index, text }) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  // Only the grip handle owns the drag listeners. The rest of the row
  // stays scrollable so the user can swipe the page up/down without
  // accidentally activating a drag.
  return (
    <li
      ref={setNodeRef}
      style={{ ...style, WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}
      className={cn(
        'flex select-none items-center gap-2 rounded-lg border bg-white/[0.03] px-2.5 py-2 sm:px-3',
        isDragging
          ? 'border-[#48CAE4]/60 bg-white/[0.07] shadow-lg shadow-[#00B4D8]/15'
          : 'border-white/[0.08]'
      )}
      {...attributes}
    >
      <button
        type="button"
        aria-label="Drag to reorder"
        style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}
        className="-m-1 flex h-11 w-11 shrink-0 cursor-grab touch-none items-center justify-center rounded text-white/55 hover:bg-white/[0.06] hover:text-white/80 active:cursor-grabbing"
        {...listeners}
      >
        <GripVertical className="h-5 w-5" />
      </button>
      <span className={cn(
        'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold',
        index === 0 ? 'bg-[#0C2340] text-white' : index < 3 ? 'bg-[#1B5E8A] text-white' : 'bg-white/[0.08] text-white/70'
      )}>
        {index + 1}
      </span>
      <span className="min-w-0 flex-1 text-xs leading-snug text-white/90 sm:text-sm">{text}</span>
    </li>
  );
}
