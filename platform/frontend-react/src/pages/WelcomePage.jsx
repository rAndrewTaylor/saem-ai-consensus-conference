/**
 * Pre-conference landing for invited participants.
 *
 * Sent out as the main URL before May 21. Shows:
 *   - hero with countdown to the conference start
 *   - SignedInChip so the user knows they're authenticated
 *   - tile grid linking to background, R1 report, WG summaries,
 *     and the conference day view
 *
 * Auto-redirects to /day once we're inside 20 minutes of conference
 * start, so participants who keep the page open are automatically
 * walked into the live experience. They can also tap the
 * "Conference Day View" tile to jump in any time.
 */

import { createElement, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  BookOpen, FileBarChart, Users, Radio, MapPin, ArrowRight, Sparkles, Clock,
  Mail, KeyRound, Link2, LogOut, AlertCircle, ChevronLeft,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SignedInChip } from '@/components/conference/SignedInChip';
import {
  api,
  getAnyParticipantToken,
  setToken,
  clearAllParticipantTokens,
} from '@/lib/api';
import { usePageTitle } from '@/hooks/usePageTitle';

const CONFERENCE_ACCESS_CODE = 'ai26';

// Hard-coded for the SAEM 2026 conference. ISO with -04:00 (EDT).
const CONFERENCE_START_ISO = '2026-05-21T09:00:00-04:00';
const AUTO_SHIFT_LEAD_MS = 20 * 60 * 1000; // 20 minutes
const CONFERENCE_START = new Date(CONFERENCE_START_ISO);

function fmtUntil(ms) {
  if (ms <= 0) return { days: 0, hours: 0, mins: 0, secs: 0, label: 'starting now' };
  const total = Math.floor(ms / 1000);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return { days, hours, mins, secs, label: '' };
}

export function WelcomePage() {
  usePageTitle('SAEM 2026 — Welcome');
  const navigate = useNavigate();
  const [now, setNow] = useState(() => Date.now());

  const hasToken = useMemo(() => !!getAnyParticipantToken(), []);

  // QR-scan landing: /welcome?access=ai26 means the user just walked in
  // with the day-of code. If they aren't already signed in, route them
  // straight to the streamlined join form — no need to click through
  // three buttons to find the "Conference code" path. Signed-in
  // attendees stay on /welcome so they can see the agenda + countdown.
  useEffect(() => {
    if (hasToken) return;
    let access = null;
    try {
      access = new URLSearchParams(window.location.search).get('access');
    } catch { /* SSR / blocked window — skip */ }
    if (access) {
      navigate(`/join?access=${encodeURIComponent(access)}`, { replace: true });
    }
  }, [navigate, hasToken]);

  // Tick every second for the countdown; check the auto-shift threshold.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Auto-shift to /day at T-20m — but only if the user is already signed in.
  // Unauthenticated visitors should stay on /welcome so they can see the
  // sign-in options; pushing them into /day with no token lands them in a
  // dead screen.
  useEffect(() => {
    if (!hasToken) return;
    const msUntilStart = CONFERENCE_START.getTime() - now;
    if (msUntilStart <= AUTO_SHIFT_LEAD_MS) {
      navigate('/day', { replace: true });
    }
  }, [now, navigate, hasToken]);

  const ms = CONFERENCE_START.getTime() - now;
  const t = fmtUntil(ms);

  // Render the conference start in the viewer's local time zone so
  // non-Eastern participants don't have to convert in their head.
  const localTime = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      }).format(CONFERENCE_START);
    } catch {
      return CONFERENCE_START.toLocaleString();
    }
  }, []);

  // Day-of tile plus pre-conference reference material.
  const tiles = [
    {
      icon: Radio,
      title: 'Conference Day View',
      desc: ms > AUTO_SHIFT_LEAD_MS
        ? 'Preview the live agenda interface — opens for real on May 21.'
        : 'Live now. Tap to enter the conference experience.',
      to: '/day',
      tone: 'amber',
      highlight: ms <= AUTO_SHIFT_LEAD_MS,
      layoutClass: 'sm:col-span-2 lg:col-span-3',
    },
    {
      icon: BookOpen,
      title: 'Background',
      desc: 'How the consensus was built — Delphi rounds, pairwise math, AI synthesis, conference-day output.',
      to: '/background',
      tone: 'cyan',
    },
    {
      icon: FileBarChart,
      title: 'Round Reports',
      desc: 'Round 1 results and Round 2 deliberation shifts — what fed the conference-day slate.',
      to: '/reports',
      tone: 'purple',
    },
    {
      icon: Users,
      title: 'Working Group Summaries',
      desc: 'Browse the five WGs, their pillars, members, and current question sets.',
      to: '/working-groups',
      tone: 'emerald',
    },
  ];

  return (
    <div className="min-h-screen bg-[#0A1628] text-white">
      <Helmet>
        <title>SAEM 2026 AI Consensus — Welcome</title>
      </Helmet>

      {/* Header strip — back-to-home on the left, sign-in chip on the right */}
      <div className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#0A1628]/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-xs font-medium text-white/70 transition hover:bg-white/[0.08] hover:text-white"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Home
            </Link>
            <div className="hidden items-center gap-2 sm:flex">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#0C2340] to-[#00B4D8]">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-bold text-white">SAEM 2026 AI Consensus</span>
            </div>
          </div>
          <SignedInChip compact />
        </div>
      </div>

      {/* Hero + countdown */}
      <section className="relative overflow-hidden px-4 pb-8 pt-10 sm:px-6 sm:pt-14">
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-b from-cyan-500/15 to-transparent blur-3xl" />
        <div className="relative mx-auto max-w-5xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-300/90">
            Welcome
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-5xl">
            AI Consensus Conference
          </h1>
          <p className="mt-3 text-base text-white/65 sm:text-lg">
            Thursday, May 21, 2026 · Atlanta Marriott Marquis · 9:00 AM ET
          </p>
          {hasToken
            ? (
              <div className="mt-2">
                <p className="text-sm text-white/45">
                  You're signed in — your votes from earlier rounds are saved. Browse below or jump straight to the day-of view.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    clearAllParticipantTokens();
                    navigate(0); // hard refresh so SignedInChip + tiles reflect new state
                  }}
                  className="mt-2 inline-flex items-center gap-1 text-xs text-white/35 hover:text-white/70"
                >
                  <LogOut className="h-3 w-3" />
                  Switch user / sign out
                </button>
              </div>
            )
            : (
              <DayOfSignInBlock />
            )
          }

          {/* Countdown */}
          <div className="mt-8 inline-flex items-center gap-4 rounded-2xl border border-cyan-400/20 bg-cyan-500/[0.04] px-6 py-4 sm:gap-6 sm:px-10">
            <CountdownNumber value={t.days} label="days" />
            <span className="text-2xl font-bold text-white/20">:</span>
            <CountdownNumber value={t.hours} label="hrs" />
            <span className="text-2xl font-bold text-white/20">:</span>
            <CountdownNumber value={t.mins} label="min" />
            <span className="hidden text-2xl font-bold text-white/20 sm:inline">:</span>
            <CountdownNumber value={t.secs} label="sec" className="hidden sm:flex" />
          </div>
          <p className="mt-3 text-xs text-white/45">
            Your local time: <span className="font-medium text-white/70">{localTime}</span>
          </p>
          <p className="mt-1 text-xs text-white/35">
            <Clock className="mr-1 inline h-3 w-3" />
            Live conference day view opens automatically 20 minutes before start
          </p>
        </div>
      </section>

      {/* Tile grid */}
      <section className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tiles.map((tile, i) => (
            <TileCard key={i} {...tile} />
          ))}
        </div>
      </section>

      <footer className="border-t border-white/[0.04] py-6">
        <div className="mx-auto max-w-5xl px-4 text-center text-xs text-white/35 sm:px-6">
          <p>
            <MapPin className="mr-1 inline h-3 w-3" />
            Atlanta Marriott Marquis · May 21, 2026
          </p>
          <p className="mt-1">
            Questions? Email Andrew Taylor — kqc5mk@uvahealth.org
          </p>
        </div>
      </footer>
    </div>
  );
}

function CountdownNumber({ value, label, className = '' }) {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <span className="font-mono text-3xl font-bold tabular-nums text-white sm:text-4xl">
        {String(value).padStart(2, '0')}
      </span>
      <span className="mt-1 text-[10px] uppercase tracking-wider text-white/40">{label}</span>
    </div>
  );
}

const TONE_STYLES = {
  cyan:    { bg: 'rgba(0, 180, 216, 0.08)',  border: 'rgba(72, 202, 228, 0.25)',  iconColor: '#48CAE4' },
  purple:  { bg: 'rgba(139, 92, 246, 0.08)', border: 'rgba(167, 139, 250, 0.25)', iconColor: '#A78BFA' },
  emerald: { bg: 'rgba(16, 185, 129, 0.08)', border: 'rgba(52, 211, 153, 0.25)',  iconColor: '#34D399' },
  amber:   { bg: 'rgba(245, 158, 11, 0.08)', border: 'rgba(252, 211, 77, 0.30)',  iconColor: '#FCD34D' },
  pink:    { bg: 'rgba(236, 72, 153, 0.08)', border: 'rgba(244, 114, 182, 0.25)', iconColor: '#F472B6' },
};

function TileCard({ icon, title, desc, to, tone = 'cyan', highlight = false, layoutClass = '' }) {
  const s = TONE_STYLES[tone] || TONE_STYLES.cyan;
  return (
    <Link to={to} className={`group block ${layoutClass}`}>
      <Card
        className={`relative h-full transition-all hover:scale-[1.02] hover:shadow-lg ${
          highlight ? 'ring-2 ring-amber-400/40' : ''
        }`}
        style={{ borderColor: s.border, background: s.bg }}
      >
        <CardContent className="flex h-full flex-col p-5">
          <div className="flex items-start justify-between">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${s.iconColor}1F`, color: s.iconColor }}
            >
              {createElement(icon, { className: 'h-5 w-5' })}
            </div>
            {highlight && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-200">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                Live
              </span>
            )}
          </div>
          <h3 className="mt-4 text-base font-bold text-white sm:text-lg">{title}</h3>
          <p className="mt-1.5 flex-1 text-sm text-white/55">{desc}</p>
          <div className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-white/45 transition group-hover:text-white/80">
            Open <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

/**
 * Inline sign-in block for /welcome. Three options — email, paste link,
 * conference code — so that a participant in a hotel ballroom on the
 * morning of May 21 has at least one path that works for them:
 *   - email login (returning Delphi participants)
 *   - paste invite link (someone with the email on a different device)
 *   - conference code (audience members / day-of arrivals with no invite)
 * If the email login matches multiple active rows, a chooser is rendered
 * so the user picks the right account (rather than us silently picking
 * the most recent).
 */
function DayOfSignInBlock() {
  const navigate = useNavigate();
  const [mode, setMode] = useState(null); // null | 'email' | 'link'
  const [emailValue, setEmailValue] = useState('');
  const [linkValue, setLinkValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [matches, setMatches] = useState(null);
  const [error, setError] = useState(null);

  const handleEmailSignIn = async () => {
    const v = emailValue.trim();
    if (!v.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const data = await api('/api/participants/login', {
        method: 'POST',
        body: { email: v },
      });
      if (data?.multiple && Array.isArray(data.matches)) {
        setMatches(data.matches);
        return;
      }
      if (data?.token && data?.wg_number) {
        clearAllParticipantTokens();
        setToken(data.wg_number, data.token);
        navigate('/day');
      } else {
        setError('Sign-in failed unexpectedly. Try the conference code or ask the help desk.');
      }
    } catch (err) {
      setError(err.message || 'Could not find that email.');
    } finally {
      setBusy(false);
    }
  };

  const handlePickMatch = (p) => {
    clearAllParticipantTokens();
    if (p?.wg_number && p?.token) {
      setToken(p.wg_number, p.token);
      navigate('/day');
    } else {
      navigate('/welcome');
    }
  };

  const handlePasteLink = () => {
    const raw = (linkValue || '').trim();
    if (!raw) {
      setError('Paste your invite link or token.');
      return;
    }
    let token = raw;
    try {
      const u = new URL(raw);
      const pathMatch = u.pathname.match(/\/(?:invite|join)\/([A-Za-z0-9_-]+)/);
      if (pathMatch) {
        token = pathMatch[1];
      } else {
        const q = u.searchParams.get('token');
        if (q) token = q;
      }
    } catch {
      // not a URL — treat the whole value as a token
    }
    token = token.replace(/\s+/g, '');
    if (!token) {
      setError("Couldn't read a token out of that link.");
      return;
    }
    navigate(`/invite/${encodeURIComponent(token)}`);
  };

  // Multi-match chooser
  if (matches) {
    return (
      <div className="mx-auto mt-5 max-w-md text-left">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm font-medium text-white">
              Multiple accounts found for that email
            </p>
            <p className="mt-1 text-xs text-white/55">
              Pick the one to sign in with.
            </p>
            <div className="mt-3 space-y-2">
              {matches.map((m) => (
                <button
                  key={m.token}
                  type="button"
                  onClick={() => handlePickMatch(m)}
                  className="flex w-full items-center justify-between rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-left transition hover:border-cyan-400/40 hover:bg-cyan-500/[0.05]"
                >
                  <span>
                    <span className="block text-sm font-medium text-white/90">{m.name || '(unnamed)'}</span>
                    <span className="block text-[11px] text-white/45">
                      WG {m.wg_number ?? '?'} · {m.wg_short_name || m.wg_name || ''} · {m.role || 'participant'}
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 text-white/30" />
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setMatches(null)}
              className="mt-3 inline-flex items-center gap-1 text-xs text-white/40 hover:text-white/70"
            >
              <ChevronLeft className="h-3 w-3" />
              Back
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Default — three big buttons
  if (mode === null) {
    return (
      <div className="mt-5">
        <p className="mb-3 text-sm text-white/55">Sign in to participate.</p>
        <div className="mx-auto flex max-w-md flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => { setError(null); setMode('email'); }}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-500/[0.08] px-4 py-3 text-sm font-medium text-cyan-200 transition hover:bg-cyan-500/[0.14]"
          >
            <Mail className="h-4 w-4" />
            Email
          </button>
          <button
            type="button"
            onClick={() => { setError(null); setMode('link'); }}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/[0.1] bg-white/[0.04] px-4 py-3 text-sm font-medium text-white/80 transition hover:bg-white/[0.08]"
          >
            <Link2 className="h-4 w-4" />
            Paste link
          </button>
          <Link
            to={`/join?access=${CONFERENCE_ACCESS_CODE}`}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-amber-400/30 bg-amber-500/[0.08] px-4 py-3 text-sm font-medium text-amber-200 transition hover:bg-amber-500/[0.14]"
          >
            <KeyRound className="h-4 w-4" />
            Conference code
          </Link>
        </div>
        <p className="mt-3 text-[11px] text-white/35">
          No invite? Use code <span className="font-mono text-amber-200/80">{CONFERENCE_ACCESS_CODE}</span> on the day.
        </p>
      </div>
    );
  }

  // Email mode
  if (mode === 'email') {
    return (
      <div className="mx-auto mt-5 max-w-md text-left">
        <Card>
          <CardContent className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <Mail className="h-4 w-4 text-cyan-300" />
              <p className="text-sm font-medium text-white">Sign in with your email</p>
            </div>
            <input
              type="email"
              value={emailValue}
              onChange={(e) => setEmailValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !busy && handleEmailSignIn()}
              placeholder="you@institution.edu"
              autoFocus
              className="w-full rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-500/20"
            />
            {error && (
              <p className="mt-2 flex items-start gap-1 text-xs text-rose-300">
                <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                <span>{error}</span>
              </p>
            )}
            <div className="mt-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => { setMode(null); setError(null); }}
                className="inline-flex items-center gap-1 text-xs text-white/40 hover:text-white/70"
              >
                <ChevronLeft className="h-3 w-3" />
                Back
              </button>
              <Button onClick={handleEmailSignIn} loading={busy} size="sm">
                Sign in
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Paste-link mode
  return (
    <div className="mx-auto mt-5 max-w-md text-left">
      <Card>
        <CardContent className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <Link2 className="h-4 w-4 text-cyan-300" />
            <p className="text-sm font-medium text-white">Paste your invite link</p>
          </div>
          <p className="mb-2 text-xs text-white/45">
            From the email we sent — the full URL or just the token works.
          </p>
          <textarea
            rows={3}
            value={linkValue}
            onChange={(e) => setLinkValue(e.target.value)}
            placeholder="https://saem-ai-consensus-conference-production.up.railway.app/invite/..."
            autoFocus
            className="w-full resize-none rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-2.5 font-mono text-xs text-white placeholder-white/25 outline-none transition focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-500/20"
          />
          {error && (
            <p className="mt-2 flex items-start gap-1 text-xs text-rose-300">
              <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
              <span>{error}</span>
            </p>
          )}
          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => { setMode(null); setError(null); }}
              className="inline-flex items-center gap-1 text-xs text-white/40 hover:text-white/70"
            >
              <ChevronLeft className="h-3 w-3" />
              Back
            </button>
            <Button onClick={handlePasteLink} size="sm">
              Continue
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default WelcomePage;
