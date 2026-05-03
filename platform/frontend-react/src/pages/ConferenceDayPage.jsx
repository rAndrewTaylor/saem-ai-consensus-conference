import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Radio, Coffee, Mic, Users, Globe, Award, Trophy, Sparkles,
  ChevronRight, MessageSquare, Send, CheckCircle2, Loader2,
  Wifi, WifiOff, Clock, MapPin, ArrowRight, Lock,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { api, getAnyParticipantToken, getActiveWg } from '@/lib/api';
import { usePageTitle } from '@/hooks/usePageTitle';

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

// Parse a "8:20 AM" time string with a base date (Atlanta = ET)
function parseAgendaTime(timeStr, baseDate) {
  const m = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (m[3].toUpperCase() === 'PM' && h !== 12) h += 12;
  if (m[3].toUpperCase() === 'AM' && h === 12) h = 0;
  const d = new Date(baseDate);
  d.setHours(h, min, 0, 0);
  return d;
}

export function ConferenceDayPage() {
  usePageTitle('Conference Day · May 21');
  const toast = useToast();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [online, setOnline] = useState(navigator.onLine);
  const [now, setNow] = useState(new Date());

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
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, POLL_MS);
    return () => clearInterval(t);
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

  // Determine the "current" agenda step. Base date: today during dry runs,
  // 2026-05-21 on the actual day. We anchor to the conference date if
  // today is BEFORE 5/21, otherwise use today (so the timeline highlights
  // the right slot during the day).
  const agendaWithTimes = useMemo(() => {
    if (!data?.agenda) return [];
    const today = new Date();
    const conferenceDate = new Date('2026-05-21T00:00:00');
    const base = today < conferenceDate ? conferenceDate : today;
    return data.agenda.map((a) => ({ ...a, _date: parseAgendaTime(a.time, base) }));
  }, [data]);

  const currentStepIndex = useMemo(() => {
    if (!agendaWithTimes.length) return -1;
    const today = new Date();
    const conferenceDate = new Date('2026-05-21T00:00:00');
    // Before the conference, mark the first item as "next up"
    if (today < conferenceDate) return 0;
    // Find latest agenda step whose time has passed
    let idx = -1;
    for (let i = 0; i < agendaWithTimes.length; i++) {
      if (agendaWithTimes[i]._date <= now) idx = i;
      else break;
    }
    return idx;
  }, [agendaWithTimes, now]);

  const activeSession = useMemo(() => {
    if (!data?.sessions) return null;
    return data.sessions.find((s) => s.id === data.active_session_id) || null;
  }, [data]);

  // Currently-highlighted agenda step (active or next)
  const currentAgenda = currentStepIndex >= 0 ? agendaWithTimes[currentStepIndex] : null;

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

  return (
    <div className="flex flex-col bg-[#0A1628] min-h-screen pb-24">
      <Helmet>
        <title>SAEM 2026 — Conference Day</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </Helmet>

      {/* Sticky "What's happening now" header */}
      <NowBar
        active={activeSession}
        currentAgenda={currentAgenda}
        online={online}
        onTapVote={() => activeSession && navigate(`/vote/${activeSession.id}`)}
      />

      <div className="mx-auto w-full max-w-2xl px-4 pt-6 sm:px-6">

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

        {/* What's open right now (collapses if nothing active) */}
        {activeSession && (
          <ActiveSessionCard session={activeSession} hasToken={!!participantToken} />
        )}

        {/* Working-group panel sessions overview */}
        <Card className="mb-6">
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
                  <SessionRow key={s.id} session={s} />
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
        <Card className="mb-6">
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

        {/* Agenda timeline */}
        <Card className="mb-6">
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


function ActiveSessionCard({ session, hasToken }) {
  const navigate = useNavigate();
  const phaseLabel = session.phase === 'pre_discussion'
    ? 'Pre-discussion vote'
    : session.phase === 'post_discussion' ? 'Post-discussion vote'
    : session.phase;

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
        <h2 className="text-lg font-bold text-white">
          {sessionLabel(session)}
        </h2>
        <p className="mt-1 text-sm text-white/65">
          {session.unique_voters} {session.unique_voters === 1 ? 'person' : 'people'} have voted so far.
        </p>
        <Button
          size="lg"
          className="mt-4 w-full"
          disabled={!hasToken}
          onClick={() => navigate(`/vote/${session.id}`)}
        >
          {hasToken ? 'Open voting' : 'Sign in to vote'}
          <ArrowRight className="h-4 w-4" />
        </Button>
        {!hasToken && (
          <p className="mt-2 text-center text-[11px] text-white/45">
            Voting needs your invite link.
          </p>
        )}
      </div>
    </motion.div>
  );
}


function SessionRow({ session }) {
  const navigate = useNavigate();
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

  return (
    <button
      onClick={() => session.is_active ? navigate(`/vote/${session.id}`) : null}
      disabled={!session.is_active}
      className={`group flex w-full items-center justify-between rounded-lg border p-3 text-left transition ${
        session.is_active
          ? 'border-emerald-400/30 bg-emerald-500/[0.04] cursor-pointer hover:border-emerald-400/60 hover:bg-emerald-500/[0.08]'
          : 'border-white/[0.06] bg-white/[0.02] cursor-default'
      }`}
    >
      <div className="min-w-0 flex-1">
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
      </div>
      {session.is_active && (
        <ArrowRight className="ml-2 h-4 w-4 shrink-0 text-emerald-300 transition group-hover:translate-x-0.5" />
      )}
    </button>
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


function sessionLabel(s) {
  if (s.session_type === 'cross_wg_prioritization') {
    return 'Cross-WG consensus vote (100-point allocation)';
  }
  if (s.wg_number) {
    return `WG${s.wg_number} — ${s.wg_short_name || 'Working group'}`;
  }
  return s.session_type.replace(/_/g, ' ');
}
