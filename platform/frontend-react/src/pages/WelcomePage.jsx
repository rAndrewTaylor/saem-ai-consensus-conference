/**
 * Pre-conference landing for invited participants.
 *
 * Sent out as the main URL before May 21. Shows:
 *   - hero with countdown to the conference start
 *   - SignedInChip so the user knows they're authenticated
 *   - tile grid linking to background, R1 report, WG summaries,
 *     agenda, their working group, and the conference day view
 *
 * Auto-redirects to /day once we're inside 20 minutes of conference
 * start, so participants who keep the page open are automatically
 * walked into the live experience. They can also tap the
 * "Conference Day View" tile to jump in any time.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  BookOpen, FileBarChart, Users, Radio, MapPin, ArrowRight, Sparkles, Clock,
  CalendarDays, Compass,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { SignedInChip } from '@/components/conference/SignedInChip';
import { getAnyParticipantToken, getActiveWg } from '@/lib/api';
import { usePageTitle } from '@/hooks/usePageTitle';

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

  const wgNumber = useMemo(() => getActiveWg(), []);
  const hasToken = useMemo(() => !!getAnyParticipantToken(), []);

  // Tick every second for the countdown; check the auto-shift threshold.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Auto-shift to /day at T-20m
  useEffect(() => {
    const msUntilStart = CONFERENCE_START.getTime() - now;
    if (msUntilStart <= AUTO_SHIFT_LEAD_MS) {
      navigate('/day', { replace: true });
    }
  }, [now, navigate]);

  const ms = CONFERENCE_START.getTime() - now;
  const t = fmtUntil(ms);

  const tiles = [
    {
      icon: BookOpen,
      title: 'Background',
      desc: 'How a modified-Delphi consensus works and why we built this for EM AI.',
      to: '/#about',
      tone: 'cyan',
    },
    {
      icon: FileBarChart,
      title: 'Round 1 Report',
      desc: 'Survey results, themes, and overlap pairs across all five working groups.',
      to: '/reports/round1',
      tone: 'purple',
    },
    {
      icon: Users,
      title: 'Working Group Summaries',
      desc: 'Browse the five WGs, their pillars, members, and current question sets.',
      to: '/#working-groups',
      tone: 'emerald',
    },
    {
      icon: CalendarDays,
      title: 'Day-of Agenda',
      desc: 'How May 21 flows — panels, breakouts, and the closing cross-WG vote.',
      to: '/day#agenda',
      tone: 'amber',
    },
    wgNumber
      ? {
          icon: Compass,
          title: `Your Group · WG ${wgNumber}`,
          desc: 'Jump straight to your working group page — surveys, pairwise, results.',
          to: `/wg/${wgNumber}`,
          tone: 'pink',
        }
      : {
          icon: Compass,
          title: 'Find your Working Group',
          desc: 'Sign in with your personal invite link to access your WG page.',
          to: '/join',
          tone: 'pink',
        },
    {
      icon: Radio,
      title: 'Conference Day View',
      desc: ms > AUTO_SHIFT_LEAD_MS
        ? 'Preview the live agenda interface — opens for real on May 21.'
        : 'Live now. Tap to enter the conference experience.',
      to: '/day',
      tone: 'amber',
      highlight: ms <= AUTO_SHIFT_LEAD_MS,
    },
  ];

  return (
    <div className="min-h-screen bg-[#0A1628] text-white">
      <Helmet>
        <title>SAEM 2026 AI Consensus — Welcome</title>
      </Helmet>

      {/* Header strip — sign-in chip top right */}
      <div className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#0A1628]/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#0C2340] to-[#00B4D8]">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-bold text-white">SAEM 2026 AI Consensus</span>
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
              <p className="mt-2 text-sm text-white/45">
                You're signed in — your votes from earlier rounds are saved. Browse below or jump straight to the day-of view.
              </p>
            )
            : (
              <p className="mt-2 text-sm text-white/45">
                Use your personal invite link to sign in so your votes count toward consensus.
              </p>
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
          <p className="mt-3 text-xs text-white/35">
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

function TileCard({ icon: Icon, title, desc, to, tone = 'cyan', highlight = false }) {
  const s = TONE_STYLES[tone] || TONE_STYLES.cyan;
  return (
    <Link to={to} className="group block">
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
              <Icon className="h-5 w-5" />
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

export default WelcomePage;
