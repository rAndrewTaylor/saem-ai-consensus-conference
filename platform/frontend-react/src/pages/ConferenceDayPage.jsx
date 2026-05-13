import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Radio, Coffee, Mic, Users, Globe, Award, Trophy, Sparkles,
  ChevronRight, MessageSquare, Send, CheckCircle2, Loader2,
  Wifi, WifiOff, Clock, MapPin, ArrowRight, Lock, ChevronUp, ChevronDown,
  ArrowUp, ArrowDown, X, Cloud, CloudOff,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { api, getAnyParticipantToken, getActiveWg } from '@/lib/api';
import { usePageTitle } from '@/hooks/usePageTitle';
import { queueSubmit, subscribe as subscribeQueue } from '@/lib/offlineQueue';
import { AudienceChatPanel } from '@/components/stage/AudienceChatPanel';
import { BreakoutNotesPanel } from '@/components/stage/BreakoutNotesPanel';
import { StageView, useStageDisplay } from '@/components/stage/StageView';
import { AdminControlStrip } from '@/components/stage/AdminControlStrip';
import { getAdminToken } from '@/lib/api';
import QRCode from 'qrcode';

// Poll the day-state endpoint every 12s so the page reacts when admin
// starts/stops a session or toggles a phase. Cheap (sub-2KB JSON).
const POLL_MS = 12000;

const KIND_CONFIG = {
  break:        { icon: Coffee,    color: 'slate' },
  welcome:      { icon: Mic,       color: 'cyan'  },
  panel:        { icon: Mic,       color: 'cyan'  },
  reaction:     { icon: Users,     color: 'purple' },
  world_cafe:   { icon: Globe,     color: 'emerald' },
  presentation: { icon: Award,     color: 'amber' },
  vote:         { icon: Trophy,    color: 'amber' },
  results:      { icon: Sparkles,  color: 'cyan'  },
  wrap:         { icon: CheckCircle2, color: 'slate' },
  end:          { icon: CheckCircle2, color: 'slate' },
};

const COLOR_MAP = {
  slate:   { bg: 'bg-slate-500/10',   text: 'text-slate-300',  border: 'border-slate-400/30' },
  cyan:    { bg: 'bg-cyan-500/10',    text: 'text-cyan-300',   border: 'border-cyan-400/30' },
  purple:  { bg: 'bg-purple-500/10',  text: 'text-purple-300', border: 'border-purple-400/30' },
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-300', border: 'border-emerald-400/30' },
  amber:   { bg: 'bg-amber-500/10',   text: 'text-amber-300',  border: 'border-amber-400/30' },
};

// Parse a "8:20 AM" time string against the conference date in
// America/New_York (Atlanta), regardless of the device's local time
// zone. Returns a JS Date in UTC equivalents that compare correctly
// with `new Date()` from any caller.
function parseAgendaTimeET(timeStr, ymd) {
  // ymd: "2026-05-21". Build an ISO string in ET, then construct.
  const m = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (m[3].toUpperCase() === 'PM' && h !== 12) h += 12;
  if (m[3].toUpperCase() === 'AM' && h === 12) h = 0;
  // EDT in May = UTC-4. Hard-coded — the conference is May 21 (EDT).
  const utcH = h + 4;
  return new Date(`${ymd}T${String(utcH).padStart(2, '0')}:${String(min).padStart(2, '0')}:00Z`);
}

export function ConferenceDayPage() {
  usePageTitle('Conference Day · May 21');
  const toast = useToast();
  const navigate = useNavigate();

  // Stage integration must be at the top of the component (hooks rules):
  // calling these after conditional returns below would mismatch hook
  // count across renders and break React.
  const isAdmin = Boolean(getAdminToken());
  const stage = useStageDisplay(isAdmin);
  const inLiveSegment = stage.mode && stage.mode !== 'idle';

  const [data, setData] = useState(null);
  const [contrib, setContrib] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [online, setOnline] = useState(navigator.onLine);
  const [pending, setPending] = useState(0);
  const [now, setNow] = useState(new Date());
  const [commentOpen, setCommentOpen] = useState(false);

  const participantToken = getAnyParticipantToken();
  const wgNumber = getActiveWg();

  const refresh = useCallback(async () => {
    try {
      const d = await api('/api/conference/day-state', { silent: true });
      setData(d);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
    if (participantToken) {
      try {
        const c = await api('/api/conference/me/contributions', {
          token: participantToken, silent: true,
        });
        setContrib(c);
      } catch { /* not fatal — page still works */ }
    }
  }, [participantToken]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, POLL_MS);
    return () => clearInterval(t);
  }, [refresh]);

  // Subscribe to the offline queue so we can show a "syncing" indicator
  useEffect(() => subscribeQueue(setPending), []);

  // SSE — when admin starts/stops a session or toggles phase, refresh
  // immediately instead of waiting for the next 12s poll. Falls back to
  // polling if EventSource isn't supported or the connection drops.
  useEffect(() => {
    if (typeof EventSource === 'undefined') return;
    const es = new EventSource('/api/events/day');
    es.onmessage = () => {
      refresh();
      // Subtle haptic when a session opens up — only if the device supports it
      try {
        if (navigator.vibrate) navigator.vibrate([40, 30, 40]);
      } catch {}
    };
    es.onerror = () => { /* auto-reconnects */ };
    return () => es.close();
  }, [refresh]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const onUp = () => setOnline(true);
    const onDown = () => setOnline(false);
    window.addEventListener('online', onUp);
    window.addEventListener('offline', onDown);
    return () => {
      window.removeEventListener('online', onUp);
      window.removeEventListener('offline', onDown);
    };
  }, []);

  // Parse agenda times anchored to America/New_York on the conference
  // date so a participant in any time zone sees the correct "now" step.
  const agendaWithTimes = useMemo(() => {
    if (!data?.agenda) return [];
    const ymd = data.conference_date || '2026-05-21';
    return data.agenda.map((a) => ({ ...a, _date: parseAgendaTimeET(a.time, ymd) }));
  }, [data]);

  const activeSession = useMemo(() => {
    if (!data?.sessions) return null;
    return data.sessions.find((s) => s.id === data.active_session_id) || null;
  }, [data]);

  const currentStepIndex = useMemo(() => {
    if (!agendaWithTimes.length) return -1;
    // If admin has activated a session, anchor "now" to the agenda step
    // that corresponds to it — that's reality, regardless of clock drift.
    if (activeSession) {
      for (let i = 0; i < agendaWithTimes.length; i++) {
        const step = agendaWithTimes[i];
        if (step.kind === 'panel' && step.wg === activeSession.wg_number) return i;
        if (step.kind === 'vote' && step.session_type === activeSession.session_type) return i;
      }
    }
    // Otherwise fall back to clock-anchored "latest step whose time has passed"
    const conferenceDate = new Date(`${data?.conference_date || '2026-05-21'}T00:00:00Z`);
    if (now < conferenceDate) return -1; // pre-conference → no step is "now"
    let idx = -1;
    for (let i = 0; i < agendaWithTimes.length; i++) {
      if (agendaWithTimes[i]._date <= now) idx = i;
      else break;
    }
    return idx;
  }, [agendaWithTimes, now, activeSession, data]);

  // Currently-highlighted agenda step
  const currentAgenda = currentStepIndex >= 0 ? agendaWithTimes[currentStepIndex] : null;

  // Print view — strip interactive elements when ?print=1 is set
  const isPrint = typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('print') === '1';

  if (loading && !data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-white/[0.06]" />
          <div className="h-32 rounded bg-white/[0.04]" />
          <div className="h-64 rounded bg-white/[0.04]" />
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <p className="text-sm text-white/55">Couldn't load conference day data: {error}</p>
        <Button variant="secondary" size="sm" onClick={refresh} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  if (isPrint) {
    return <PrintView data={data} agendaWithTimes={agendaWithTimes} />;
  }

  return (
    <div className="flex flex-col bg-[#0A1628] min-h-screen pb-24">
      <Helmet>
        <title>SAEM 2026 — Conference Day</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </Helmet>

      {isAdmin && (
        <AdminControlStrip
          mode={stage.mode}
          slideIndex={stage.slideIndex}
          panelTab={stage.panelTab}
          onChange={stage.setDisplay}
        />
      )}

      <div className={isAdmin ? 'pt-12' : ''}>
        <NowBar
          active={activeSession}
          currentAgenda={currentAgenda}
          online={online}
          onTapVote={() => activeSession && navigate(`/vote/${activeSession.id}`)}
        />
      </div>

      {/* === Live stage content — everyone sees this === */}
      <section className="mx-auto w-full max-w-6xl px-4 pt-4 sm:px-6">
        <StageView
          mode={stage.mode}
          slideIndex={stage.slideIndex}
          panelTab={stage.panelTab}
          bus={stage.bus}
          isAdmin={isAdmin}
          onChange={stage.setDisplay}
          compact
        />
      </section>

      {/* Inter-session details (agenda, contributions, QR). Auto-collapses
          during a live segment so the stage stays the focus. */}
      <details className="mx-auto w-full max-w-2xl px-4 sm:px-6" open={!inLiveSegment}>
        <summary className="mt-6 cursor-pointer list-none rounded-lg border border-white/[0.08] bg-white/[0.02] px-4 py-2 text-sm font-medium text-white/60 hover:bg-white/[0.04]">
          Agenda · Your contributions · Join links
        </summary>

        <div className="pt-6">

        {/* Conference brand */}
        <div className="mb-6">
          <p className="text-[11px] uppercase tracking-wider text-cyan-300/85">SAEM 2026 AI Consensus</p>
          <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
            Conference Day
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-white/45">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" /> Thursday, May 21, 2026
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" /> Atlanta Marriott Marquis
            </span>
          </div>
        </div>

        {/* Sign-in nudge if not signed in */}
        {!participantToken && (
          <Card className="mb-6 border-amber-400/30 bg-amber-500/[0.04]">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Lock className="h-5 w-5 shrink-0 text-amber-300" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white/90">Sign in to vote</p>
                  <p className="mt-0.5 text-xs text-white/55">
                    Voting and comments need your invite. You can browse the agenda without signing in.
                  </p>
                </div>
                <Link to="/join">
                  <Button size="sm">Log in</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* What's open right now — inline voting; no context switch */}
        {activeSession && (
          <InlineVoteCard
            session={activeSession}
            token={participantToken}
            onSubmitted={refresh}
          />
        )}

        {/* My contributions summary (when signed in and has any activity) */}
        {contrib?.signed_in && contrib.total_votes + contrib.total_comments > 0 && (
          <MyContributions contrib={contrib} sessions={data.sessions || []} />
        )}

        {/* Working-group panel sessions overview */}
        <Card id="panels" className="mb-6 scroll-mt-20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Mic className="h-4 w-4 text-cyan-400" />
              Panel sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(data.sessions || [])
                .filter((s) => s.session_type === 'wg_presentation')
                .sort((a, b) => (a.wg_number || 0) - (b.wg_number || 0))
                .map((s) => (
                  <div key={s.id} id={`panel-${s.wg_number}`} className="scroll-mt-20">
                    <SessionRow session={s} />
                  </div>
                ))}
              {(data.sessions || []).filter((s) => s.session_type === 'wg_presentation').length === 0 && (
                <p className="text-xs text-white/40 py-2">
                  Panel sessions haven't been created yet — admin will set them up before the day begins.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Cross-WG consensus vote */}
        <Card id="cross-wg" className="mb-6 scroll-mt-20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-4 w-4 text-amber-400" />
              Cross-WG consensus vote
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const cross = (data.sessions || []).find((s) => s.session_type === 'cross_wg_prioritization');
              if (!cross) {
                return (
                  <p className="text-xs text-white/40">
                    The 100-point allocation across all WG priorities will open in the late afternoon.
                  </p>
                );
              }
              return <SessionRow session={cross} />;
            })()}
          </CardContent>
        </Card>

        {/* World Café — surfaces during the 1:30-2:30 PM block */}
        <WorldCafeCard
          sessions={data.sessions || []}
          token={participantToken}
          currentAgenda={currentAgenda}
        />

        {/* Agenda timeline */}
        <Card id="agenda" className="mb-6 scroll-mt-20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-cyan-400" />
              Day timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="relative space-y-3 pl-1">
              {agendaWithTimes.map((step, i) => (
                <AgendaItem
                  key={i}
                  step={step}
                  isCurrent={i === currentStepIndex}
                  isPast={i < currentStepIndex}
                  sessions={data.sessions || []}
                />
              ))}
            </ol>
          </CardContent>
        </Card>

        {/* Resources */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ChevronRight className="h-4 w-4 text-white/55" />
              Resources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              <Link to="/reports/round1"
                    className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 transition hover:border-white/[0.15]">
                <div>
                  <p className="text-sm font-medium text-white/85">Round 1 report</p>
                  <p className="text-[11px] text-white/40">Cross-WG figures, themes, and overlap pairs</p>
                </div>
                <ArrowRight className="h-4 w-4 text-white/30" />
              </Link>
              {wgNumber && (
                <Link to={`/wg/${wgNumber}`}
                      className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 transition hover:border-white/[0.15]">
                  <div>
                    <p className="text-sm font-medium text-white/85">My working group (WG {wgNumber})</p>
                    <p className="text-[11px] text-white/40">Surveys, pairwise, results</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-white/30" />
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      </details>

      {/* Pending-sync indicator */}
      {pending > 0 && (
        <div className="fixed bottom-20 right-4 z-40 rounded-full bg-amber-500/15 px-3 py-1.5 text-[11px] font-medium text-amber-300 backdrop-blur">
          <CloudOff className="inline h-3 w-3 mr-1" />
          {pending} pending sync
        </div>
      )}

      {/* Sticky comment / suggestion bar — always available when signed in */}
      {participantToken && (
        <CommentBar
          open={commentOpen}
          onOpenChange={setCommentOpen}
          activeSession={activeSession}
          token={participantToken}
        />
      )}

      {/* Demographics prompt — shown once per token if role/career_stage missing */}
      {participantToken && (
        <DemographicsPrompt token={participantToken} />
      )}

      {/* Audience chat panel — only renders while the stage is in panel:N mode */}
      <AudienceChatPanel />

      {/* Breakout note submission — only renders while the stage is in table_reactions mode */}
      <BreakoutNotesPanel />
    </div>
  );
}


// ─── Components ──────────────────────────────────────────────────────────

function NowBar({ active, currentAgenda, online, onTapVote }) {
  // Sticky banner at the top — different content depending on state.
  return (
    <div className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#0A1628]/95 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-2.5 sm:px-6">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
          {active ? (
            <Radio className="h-3.5 w-3.5 text-emerald-300 animate-pulse" />
          ) : (
            <Clock className="h-3.5 w-3.5 text-white/55" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-wider text-white/40">
            {active ? 'Voting open' : (currentAgenda ? 'Now' : 'Next up')}
          </p>
          <p className="truncate text-sm font-semibold text-white/90">
            {active
              ? sessionLabel(active)
              : (currentAgenda?.title || 'Conference begins May 21')}
          </p>
        </div>
        {active && onTapVote && (
          <Button size="sm" onClick={onTapVote}>
            Vote
          </Button>
        )}
        <span className={`hidden sm:inline-flex h-2.5 w-2.5 rounded-full ${online ? 'bg-emerald-400' : 'bg-amber-400'}`}
               title={online ? 'Online' : 'Offline'} />
      </div>
    </div>
  );
}


// Inline voting card — actually does the vote on /day rather than
// navigating to /vote/{id}. Submission goes through the offline queue.
function InlineVoteCard({ session, token, onSubmitted }) {
  const toast = useToast();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Type-specific local state
  const [rankOrder, setRankOrder] = useState([]);
  const [allocValues, setAllocValues] = useState({});

  const isCross = session.session_type === 'cross_wg_prioritization';
  const phaseLabel = session.phase === 'pre_discussion'
    ? 'Pre-discussion vote'
    : session.phase === 'post_discussion' ? 'Post-discussion vote'
    : session.phase?.replace(/_/g, ' ') || '';

  useEffect(() => {
    if (!token) { setQuestions([]); return; }
    let cancelled = false;
    api(`/api/conference/sessions/${session.id}/questions`, { token, silent: true })
      .then((data) => {
        if (cancelled) return;
        const qs = data.questions || [];
        setQuestions(qs);
        setRankOrder(qs.map((q) => q.id));
        setAllocValues(Object.fromEntries(qs.map((q) => [q.id, isCross ? Math.floor(100 / Math.max(1, qs.length)) : 0])));
      })
      .catch((e) => setError(e.message));
    return () => { cancelled = true; };
  }, [session.id, token, isCross]);

  const handleSubmitRanking = async () => {
    setSubmitting(true);
    try {
      const rankings = Object.fromEntries(rankOrder.slice(0, 5).map((qid, i) => [qid, i + 1]));
      const res = await queueSubmit({
        url: `/api/conference/vote/${session.id}/ranking`,
        body: { rankings },
        token,
        kind: 'ranking',
      });
      setSubmitted(true);
      toast({
        message: res?.queued ? 'Ranking queued (will sync when online)' : 'Ranking submitted ✓',
        type: 'success',
      });
      onSubmitted && onSubmitted();
    } catch (e) {
      toast({ message: e.message || 'Submit failed', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitAllocation = async () => {
    const total = Object.values(allocValues).reduce((s, n) => s + (parseFloat(n) || 0), 0);
    if (Math.abs(total - 100) > 0.5) {
      toast({ message: `Must total 100 (currently ${total.toFixed(0)})`, type: 'error' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await queueSubmit({
        url: `/api/conference/vote/${session.id}/allocate`,
        body: { allocations: allocValues, budget: 100 },
        token,
        kind: 'allocation',
      });
      setSubmitted(true);
      toast({
        message: res?.queued ? 'Allocation queued (will sync when online)' : 'Allocation submitted ✓',
        type: 'success',
      });
      onSubmitted && onSubmitted();
    } catch (e) {
      toast({ message: e.message || 'Submit failed', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const move = (idx, delta) => {
    setRankOrder((cur) => {
      const next = [...cur];
      const newIdx = idx + delta;
      if (newIdx < 0 || newIdx >= next.length) return cur;
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return next;
    });
  };

  const allocTotal = useMemo(
    () => Object.values(allocValues).reduce((s, n) => s + (parseFloat(n) || 0), 0),
    [allocValues],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 overflow-hidden rounded-2xl border border-emerald-400/30 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5"
    >
      <div className="p-5">
        <div className="mb-2 flex items-center gap-2">
          <Radio className="h-4 w-4 text-emerald-300 animate-pulse" />
          <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-300">
            Live now — {phaseLabel}
          </span>
        </div>
        <h2 className="text-lg font-bold text-white">{sessionLabel(session)}</h2>
        <p className="mt-1 text-sm text-white/65">
          {session.unique_voters} {session.unique_voters === 1 ? 'person' : 'people'} have voted so far.
        </p>

        {!token && (
          <>
            <Button size="lg" className="mt-4 w-full" disabled>
              Sign in to vote
            </Button>
            <p className="mt-2 text-center text-[11px] text-white/45">
              Voting needs your invite link.
            </p>
          </>
        )}

        {token && questions === null && (
          <div className="mt-4 flex items-center gap-2 text-xs text-white/55">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading questions…
          </div>
        )}

        {token && questions?.length === 0 && (
          <p className="mt-3 text-xs text-white/55">
            No questions configured for this session yet.
          </p>
        )}

        {token && questions && questions.length > 0 && submitted && (
          <div className="mt-4 rounded-lg bg-emerald-500/15 p-3 text-sm text-emerald-200">
            <CheckCircle2 className="mr-1 inline h-4 w-4" />
            Submitted. You can update your vote at any time while the session is open.
            <Button
              variant="ghost" size="sm"
              className="ml-3 text-emerald-200"
              onClick={() => setSubmitted(false)}
            >
              Edit vote
            </Button>
          </div>
        )}

        {token && questions && questions.length > 0 && !submitted && !isCross && (
          <div className="mt-4 space-y-2">
            <p className="text-[11px] text-white/55">
              Rank your top 5 — tap arrows to reorder. Top of list = highest priority.
            </p>
            {rankOrder.slice(0, 8).map((qid, idx) => {
              const q = questions.find((x) => x.id === qid);
              if (!q) return null;
              return (
                <div key={qid} className={`flex items-start gap-2 rounded-lg border p-2 ${
                  idx < 5 ? 'border-emerald-400/30 bg-emerald-500/[0.04]' : 'border-white/[0.06]'
                }`}>
                  <div className="flex shrink-0 flex-col gap-0.5">
                    <button onClick={() => move(idx, -1)}
                            disabled={idx === 0}
                            className="rounded bg-white/[0.06] p-1 text-white/55 hover:bg-white/[0.12] hover:text-white disabled:opacity-30">
                      <ArrowUp className="h-3 w-3" />
                    </button>
                    <button onClick={() => move(idx, 1)}
                            disabled={idx === rankOrder.length - 1}
                            className="rounded bg-white/[0.06] p-1 text-white/55 hover:bg-white/[0.12] hover:text-white disabled:opacity-30">
                      <ArrowDown className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="mr-1 text-[10px] font-mono font-bold text-emerald-300">
                      {idx < 5 ? `#${idx + 1}` : '·'}
                    </span>
                    <span className="text-xs text-white/85">{q.text}</span>
                  </div>
                </div>
              );
            })}
            <Button size="lg" className="w-full" loading={submitting} onClick={handleSubmitRanking}>
              Submit ranking
            </Button>
          </div>
        )}

        {token && questions && questions.length > 0 && !submitted && isCross && (
          <div className="mt-4 space-y-2">
            <p className="text-[11px] text-white/55">
              Allocate <strong className="text-white/85">100 points</strong> across these
              priorities — more points = higher priority.
            </p>
            <div className="flex items-center justify-between rounded-lg border px-3 py-2 text-xs"
                 style={{
                   borderColor: Math.abs(allocTotal - 100) < 0.5 ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.3)',
                   background: Math.abs(allocTotal - 100) < 0.5 ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.04)',
                 }}>
              <span className="text-white/55">Total allocated</span>
              <span className={`font-mono font-bold ${
                Math.abs(allocTotal - 100) < 0.5 ? 'text-emerald-300' : 'text-red-300'
              }`}>
                {allocTotal.toFixed(0)} / 100
              </span>
            </div>
            <div className="space-y-1.5 max-h-[420px] overflow-y-auto">
              {questions.map((q) => (
                <div key={q.id} className="rounded-lg border border-white/[0.06] p-2">
                  <p className="mb-1 text-xs text-white/85">
                    {q.wg_id && <span className="mr-1 rounded bg-white/[0.06] px-1 py-0.5 text-[9px] font-bold text-white/55">WG{q.wg_id}</span>}
                    {q.text}
                  </p>
                  <input
                    type="number" min="0" max="100" step="1"
                    value={allocValues[q.id] ?? 0}
                    onChange={(e) => setAllocValues((v) => ({ ...v, [q.id]: parseFloat(e.target.value) || 0 }))}
                    className="w-20 rounded border border-white/[0.1] bg-white/[0.04] px-2 py-1 text-sm font-mono text-white"
                  />
                </div>
              ))}
            </div>
            <Button size="lg" className="w-full" loading={submitting} onClick={handleSubmitAllocation}>
              Submit allocation
            </Button>
          </div>
        )}

        <button
          onClick={() => navigate(`/vote/${session.id}`)}
          className="mt-3 block w-full text-center text-[11px] text-white/40 hover:text-white/70"
        >
          Open full voting page →
        </button>
      </div>
    </motion.div>
  );
}


// Sticky comment / suggestion bar — always available, supports comment
// types matching the backend's CommentSubmit schema.
function CommentBar({ open, onOpenChange, activeSession, token }) {
  const toast = useToast();
  const [type, setType] = useState('general');
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const targetSession = activeSession;  // attach to whatever is active; null → can't submit

  const submit = async () => {
    if (!text.trim()) {
      toast({ message: 'Write something first', type: 'error' });
      return;
    }
    if (!targetSession) {
      toast({ message: 'No active session — wait for a panel to open', type: 'error' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await queueSubmit({
        url: `/api/conference/comment/${targetSession.id}`,
        body: { comment_text: text.trim(), comment_type: type },
        token,
        kind: 'comment',
      });
      setText('');
      onOpenChange(false);
      toast({
        message: res?.queued ? 'Comment queued (will sync when online)' : 'Comment submitted ✓',
        type: 'success',
      });
    } catch (e) {
      toast({ message: e.message || 'Submit failed', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating action button */}
      {!open && (
        <button
          onClick={() => onOpenChange(true)}
          className="fixed bottom-5 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500 text-white shadow-xl transition hover:bg-cyan-400"
          aria-label="Open comment box"
        >
          <MessageSquare className="h-5 w-5" />
        </button>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'tween', duration: 0.22 }}
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t border-white/[0.1] bg-[#0E1E35] p-4 shadow-2xl"
          >
            <div className="mx-auto max-w-2xl">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white/90">
                    {targetSession ? 'Comment on the live session' : 'Comments open during a panel'}
                  </p>
                  <p className="text-[11px] text-white/45">
                    {targetSession ? `Attaching to: ${sessionLabel(targetSession)}` : 'Wait for the next panel to start'}
                  </p>
                </div>
                <button onClick={() => onOpenChange(false)}
                         className="rounded p-1 text-white/55 hover:bg-white/[0.06] hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {[
                  { v: 'general', l: 'General' },
                  { v: 'modification', l: 'Suggested wording change' },
                  { v: 'new_question', l: 'New question idea' },
                ].map((t) => (
                  <button key={t.v}
                          onClick={() => setType(t.v)}
                          className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                            type === t.v
                              ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/30'
                              : 'border border-white/[0.08] bg-white/[0.02] text-white/55 hover:bg-white/[0.06]'
                          }`}>
                    {t.l}
                  </button>
                ))}
              </div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={!targetSession}
                rows={3}
                placeholder="What's missing? What should change?"
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-cyan-400/50 disabled:opacity-50"
              />
              <div className="mt-2 flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button size="sm" loading={submitting} onClick={submit} disabled={!targetSession}>
                  <Send className="h-3.5 w-3.5" />
                  Submit
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}


// Compact "you've voted in N sessions" rollup — closes the loop for the
// participant and surfaces sessions they've missed.
function MyContributions({ contrib, sessions }) {
  const sessById = useMemo(() => {
    const m = new Map();
    sessions.forEach((s) => m.set(s.id, s));
    return m;
  }, [sessions]);
  const wgPanels = sessions.filter((s) => s.session_type === 'wg_presentation');
  const completed = wgPanels.filter((s) =>
    contrib.sessions.some((c) => c.session_id === s.id && c.vote_count > 0)
  );

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          Your contributions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-white/55">
          You've voted in <strong className="text-white">{completed.length}</strong> of{' '}
          <strong className="text-white">{wgPanels.length || '—'}</strong> panels and submitted{' '}
          <strong className="text-white">{contrib.total_comments}</strong>{' '}
          comment{contrib.total_comments === 1 ? '' : 's'}.
        </p>
        {contrib.sessions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {contrib.sessions.map((c) => {
              const s = sessById.get(c.session_id);
              const wgN = s?.wg_number;
              return (
                <span key={c.session_id}
                       className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-200">
                  <CheckCircle2 className="h-3 w-3" />
                  {s?.session_type === 'cross_wg_prioritization' ? 'Cross-WG' : `WG${wgN}`}
                  {c.vote_count > 0 && <span className="text-emerald-300/70">· {c.vote_count}v</span>}
                  {c.comment_count > 0 && <span className="text-emerald-300/70">· {c.comment_count}c</span>}
                </span>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}


function SessionRow({ session }) {
  const navigate = useNavigate();
  const [qrOpen, setQrOpen] = useState(false);
  const isCross = session.session_type === 'cross_wg_prioritization';
  const status = session.is_active
    ? 'live'
    : session.ended_at
    ? 'closed'
    : 'pending';

  const statusBadge = {
    live: { label: 'LIVE', cls: 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 animate-pulse' },
    closed: { label: 'closed', cls: 'bg-slate-500/15 text-slate-400 border border-slate-400/20' },
    pending: { label: 'not started', cls: 'bg-white/[0.05] text-white/45 border border-white/[0.08]' },
  }[status];

  const sessionUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/vote/${session.id}`
    : `/vote/${session.id}`;

  return (
    <div className={`group rounded-lg border p-3 transition ${
      session.is_active
        ? 'border-emerald-400/30 bg-emerald-500/[0.04]'
        : 'border-white/[0.06] bg-white/[0.02]'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <button
          onClick={() => session.is_active ? navigate(`/vote/${session.id}`) : null}
          disabled={!session.is_active}
          className={`min-w-0 flex-1 text-left ${session.is_active ? 'cursor-pointer' : 'cursor-default'}`}
        >
          <div className="mb-0.5 flex items-center gap-2">
            {!isCross && session.wg_number && (
              <Badge variant="primary" className="text-[10px]">WG {session.wg_number}</Badge>
            )}
            <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${statusBadge.cls}`}>
              {statusBadge.label}
            </span>
          </div>
          <p className="text-sm font-medium text-white/85 truncate">
            {sessionLabel(session)}
          </p>
          <p className="mt-0.5 text-[11px] text-white/45">
            {session.unique_voters} voter{session.unique_voters === 1 ? '' : 's'} · {session.vote_count} votes
            {session.phase && session.phase !== 'pre_discussion' && (
              <span className="ml-1">· {session.phase.replace(/_/g, ' ')}</span>
            )}
          </p>
        </button>
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={() => setQrOpen((o) => !o)}
            className="rounded p-1 text-white/35 transition hover:bg-white/[0.06] hover:text-white/70"
            aria-label="Show QR code"
            title="QR code for projector"
          >
            <QrIcon />
          </button>
          {session.is_active && (
            <ArrowRight className="h-4 w-4 text-emerald-300 transition group-hover:translate-x-0.5" />
          )}
        </div>
      </div>
      <AnimatePresence>
        {qrOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <QRDisplay url={sessionUrl} label={sessionLabel(session)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Tiny QR icon (no extra import needed)
function QrIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="6" height="6" rx="1" />
      <rect x="15" y="3" width="6" height="6" rx="1" />
      <rect x="3" y="15" width="6" height="6" rx="1" />
      <path d="M15 13v3M15 19v2M19 13v2M21 17v4M13 13h2M13 19h2" />
    </svg>
  );
}

function QRDisplay({ url, label }) {
  const [dataUrl, setDataUrl] = useState(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(url, {
      margin: 2,
      width: 320,
      color: { dark: '#000', light: '#FFF' },
    })
      .then((d) => { if (!cancelled) setDataUrl(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [url]);

  return (
    <div className="mt-3 flex flex-col items-center rounded-lg bg-white p-4">
      {dataUrl ? (
        <img src={dataUrl} alt={`QR for ${label}`} className="h-44 w-44" />
      ) : (
        <div className="h-44 w-44 animate-pulse rounded bg-slate-200" />
      )}
      <p className="mt-2 break-all text-center text-[10px] font-mono text-slate-700">{url}</p>
      <p className="mt-1 text-[10px] text-slate-500">Scan to open this session on a phone</p>
    </div>
  );
}


// World Café — five station picker. Surfaces during the 1:30 PM agenda
// step. Each station collects free-text input that goes into the
// breakout_notes table for that station's WG session.
function WorldCafeCard({ sessions, token, currentAgenda }) {
  const toast = useToast();
  const [station, setStation] = useState(null);
  const [tableNum, setTableNum] = useState('');
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const wgSessions = useMemo(
    () => sessions
      .filter((s) => s.session_type === 'wg_presentation')
      .sort((a, b) => (a.wg_number || 0) - (b.wg_number || 0)),
    [sessions],
  );

  const isWorldCafeNow = currentAgenda?.kind === 'world_cafe';
  if (wgSessions.length === 0) return null;

  const handleSubmit = async () => {
    if (!station) {
      toast({ message: 'Pick a station first', type: 'error' });
      return;
    }
    if (!text.trim()) {
      toast({ message: 'Add some text', type: 'error' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await queueSubmit({
        url: `/api/conference/breakout/${station.id}`,
        body: {
          table_number: parseInt(tableNum, 10) || 0,
          facilitator_name: '(world café)',
          themes: text.trim(),
        },
        token,
        kind: 'breakout',
      });
      setText('');
      toast({
        message: res?.queued ? 'Note queued (will sync when online)' : 'Note submitted ✓',
        type: 'success',
      });
    } catch (e) {
      toast({ message: e.message || 'Submit failed', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card id="world-cafe" className={`mb-6 scroll-mt-20 ${
      isWorldCafeNow ? 'border-emerald-400/30 bg-emerald-500/[0.03]' : ''
    }`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Globe className="h-4 w-4 text-emerald-400" />
          World Café
          {isWorldCafeNow && (
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 animate-pulse">
              live now
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-xs text-white/55">
          Three 20-min rotations. Each WG hosts a station — visit at least two
          outside your own. Tap the station you're currently at; submit notes
          before you rotate.
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {wgSessions.map((s) => {
            const active = station?.id === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setStation(active ? null : s)}
                className={`rounded-lg border p-2 text-center text-xs transition ${
                  active
                    ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-200'
                    : 'border-white/[0.06] bg-white/[0.02] text-white/65 hover:border-white/[0.15]'
                }`}
              >
                <div className="text-base font-bold">WG {s.wg_number}</div>
                <div className="mt-0.5 text-[10px] leading-tight">{s.wg_short_name}</div>
              </button>
            );
          })}
        </div>

        <AnimatePresence>
          {station && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              <div className="mt-3 rounded-lg border border-emerald-400/20 bg-emerald-500/[0.04] p-3">
                <p className="mb-2 text-xs font-semibold text-emerald-200">
                  Notes from station: WG{station.wg_number} — {station.wg_short_name}
                </p>
                <input
                  type="number"
                  placeholder="Table # (optional)"
                  value={tableNum}
                  onChange={(e) => setTableNum(e.target.value)}
                  className="mb-2 w-32 rounded border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-sm text-white outline-none focus:border-cyan-400/50"
                />
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={3}
                  placeholder="What surfaced at this station? Themes, surprises, points of agreement or tension."
                  disabled={!token}
                  className="w-full rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-emerald-400/50 disabled:opacity-50"
                />
                <div className="mt-2 flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setStation(null)}>Cancel</Button>
                  <Button size="sm" loading={submitting} onClick={handleSubmit} disabled={!token}>
                    <Send className="h-3.5 w-3.5" />
                    Submit
                  </Button>
                </div>
                {!token && (
                  <p className="mt-2 text-[10px] text-white/40">Sign in to capture notes.</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}


function AgendaItem({ step, isCurrent, isPast, sessions }) {
  const cfg = KIND_CONFIG[step.kind] || KIND_CONFIG.break;
  const colors = COLOR_MAP[cfg.color];
  const Icon = cfg.icon;

  // Match panel agenda items to a session for "Vote" link
  const matchedSession = useMemo(() => {
    if (step.kind === 'panel' && step.wg) {
      return sessions.find((s) => s.session_type === 'wg_presentation' && s.wg_number === step.wg);
    }
    if (step.kind === 'vote' && step.session_type) {
      return sessions.find((s) => s.session_type === step.session_type);
    }
    return null;
  }, [step, sessions]);

  return (
    <li className={`relative flex items-start gap-3 rounded-xl border p-3 ${
      isCurrent ? 'border-emerald-400/40 bg-emerald-500/[0.04]'
                : isPast ? 'border-white/[0.04] opacity-50'
                : 'border-white/[0.06]'
    }`}>
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${colors.bg}`}>
        <Icon className={`h-3.5 w-3.5 ${colors.text}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <p className="font-mono text-[11px] font-medium text-white/55">{step.time}</p>
          {isCurrent && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              now
            </span>
          )}
        </div>
        <p className="mt-0.5 text-sm font-medium text-white/85">{step.title}</p>
        {matchedSession?.is_active && (
          <Link to={`/vote/${matchedSession.id}`}
                className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-300 hover:text-emerald-200">
            Vote now
            <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>
    </li>
  );
}


// One-time demographics prompt. Fires only when the participant's
// `role` or `career_stage` is missing on /api/participants/me, and when
// they haven't dismissed it during this session.
const ROLE_OPTIONS = [
  { value: 'em_attending', label: 'EM attending physician' },
  { value: 'em_resident', label: 'EM resident' },
  { value: 'em_fellow', label: 'EM fellow' },
  { value: 'researcher', label: 'Researcher / academic' },
  { value: 'data_scientist', label: 'Data scientist / informaticist' },
  { value: 'industry', label: 'Industry / vendor' },
  { value: 'patient_advocate', label: 'Patient advocate' },
  { value: 'other', label: 'Other' },
];

const CAREER_STAGE_OPTIONS = [
  { value: 'trainee', label: 'Trainee (resident/fellow/student)' },
  { value: 'early', label: 'Early career (≤7 yrs from training)' },
  { value: 'mid', label: 'Mid career (7–15 yrs)' },
  { value: 'senior', label: 'Senior (>15 yrs)' },
];

function DemographicsPrompt({ token }) {
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem('saem_demo_dismissed') === '1'
  );
  const [me, setMe] = useState(null);
  const [role, setRole] = useState('');
  const [stage, setStage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (dismissed) return;
    const params = new URLSearchParams({ token });
    fetch(`/api/participants/me?${params.toString()}`)
      .then((r) => r.ok ? r.json() : null)
      .then(setMe)
      .catch(() => {});
  }, [token, dismissed]);

  const needsCapture = me && (!me.role || !me.career_stage);
  if (!needsCapture || dismissed) return null;

  const submit = async () => {
    if (!role && !stage) {
      setDismissed(true);
      sessionStorage.setItem('saem_demo_dismissed', '1');
      return;
    }
    setSubmitting(true);
    try {
      const params = new URLSearchParams({ token });
      await fetch(`/api/participants/me/demographics?${params.toString()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: role || me.role,
          career_stage: stage || me.career_stage,
        }),
      });
      sessionStorage.setItem('saem_demo_dismissed', '1');
      setDismissed(true);
    } catch {
      // not fatal — they'll see it again next visit
    } finally {
      setSubmitting(false);
    }
  };

  const skip = () => {
    sessionStorage.setItem('saem_demo_dismissed', '1');
    setDismissed(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.22 }}
        className="w-full max-w-md rounded-2xl border border-white/[0.1] bg-[#0E1E35] p-5 shadow-2xl"
      >
        <div className="mb-3">
          <p className="text-[10px] uppercase tracking-wider text-cyan-300/85">One quick thing</p>
          <h2 className="mt-1 text-lg font-bold text-white">A bit about you</h2>
          <p className="mt-1 text-xs text-white/55">
            We use this to analyze how priorities differ across roles and career stages
            (anonymous in the manuscript). 30 seconds.
          </p>
        </div>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-white/65">Primary role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/50"
            >
              <option value="">Choose…</option>
              {ROLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-white/65">Career stage</label>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              className="w-full rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/50"
            >
              <option value="">Choose…</option>
              {CAREER_STAGE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 flex justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={skip}>Skip</Button>
          <Button size="sm" loading={submitting} onClick={submit}>Save</Button>
        </div>
      </motion.div>
    </div>
  );
}


// ─── Print view (?print=1) — projector-friendly agenda + sessions ────────

function PrintView({ data, agendaWithTimes }) {
  return (
    <div className="bg-white text-slate-900 min-h-screen p-8 print:p-4">
      <Helmet>
        <style>{`
          @media print {
            @page { size: letter; margin: 0.5in; }
            body { background: white !important; }
          }
        `}</style>
      </Helmet>
      <div className="max-w-3xl mx-auto">
        <p className="text-xs uppercase tracking-wider text-slate-500">SAEM 2026 AI Consensus Conference</p>
        <h1 className="text-3xl font-bold mt-1">Conference Day Agenda</h1>
        <p className="mt-1 text-sm text-slate-600">
          Thursday, May 21, 2026 · Atlanta Marriott Marquis
        </p>

        <table className="w-full mt-6 text-sm">
          <thead>
            <tr className="border-b-2 border-slate-300">
              <th className="text-left py-2 pr-4 font-semibold w-24">Time</th>
              <th className="text-left py-2 font-semibold">Session</th>
            </tr>
          </thead>
          <tbody>
            {(agendaWithTimes || []).map((step, i) => (
              <tr key={i} className="border-b border-slate-200">
                <td className="py-2 pr-4 font-mono text-slate-700">{step.time}</td>
                <td className="py-2">{step.title}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="mt-6 text-xs text-slate-500">
          Live URL: saem-ai-consensus-conference-production.up.railway.app/day
        </p>
      </div>
    </div>
  );
}


function sessionLabel(s) {
  if (s.session_type === 'cross_wg_prioritization') {
    return 'Cross-WG consensus vote (100-point allocation)';
  }
  if (s.wg_number) {
    return `WG${s.wg_number} — ${s.wg_short_name || 'Working group'}`;
  }
  return s.session_type.replace(/_/g, ' ');
}
