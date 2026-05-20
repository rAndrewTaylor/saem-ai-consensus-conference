import { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion, useInView } from 'framer-motion';
import { usePageTitle } from '@/hooks/usePageTitle';
import {
  ClipboardList,
  GitCompare,
  Users,
  Cpu,
  GraduationCap,
  Brain,
  Scale,
  Radio,
  ChevronRight,
  ArrowRight,
  ArrowDown,
  Sparkles,
  FileText,
  UserCheck,
  BarChart3,
  CheckCircle2,
  MessageSquare,
  Vote,
  ListChecks,
  Target,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import {
  HeroIllustration,
  DelphiProcessIllustration,
  PillarIllustration,
  EmptyStateIllustration,
  BackgroundPattern,
} from '@/components/illustrations';

// ── Pillar definitions ──────────────────────────────────────────────
const PILLARS = [
  {
    name: 'Technology',
    key: 'technology',
    icon: Cpu,
    color: 'pillar-technology',
    border: 'border-t-cyan-400',
    leftBorder: 'border-l-cyan-400',
    bg: 'bg-cyan-500/10',
    tint: 'from-cyan-500/10 to-transparent',
    iconColor: 'text-cyan-400',
    description:
      'How AI tools are built, deployed, validated, and integrated into clinical systems and workflows.',
  },
  {
    name: 'Training',
    key: 'training',
    icon: GraduationCap,
    color: 'pillar-training',
    border: 'border-t-indigo-400',
    leftBorder: 'border-l-indigo-400',
    bg: 'bg-indigo-500/10',
    tint: 'from-[#1B5E8A]/10 to-transparent',
    iconColor: 'text-indigo-400',
    description:
      'How medical education and residency curricula must evolve to prepare clinicians for AI-augmented practice.',
  },
  {
    name: 'Self',
    key: 'self',
    icon: Brain,
    color: 'pillar-self',
    border: 'border-t-emerald-400',
    leftBorder: 'border-l-emerald-400',
    bg: 'bg-emerald-500/10',
    tint: 'from-emerald-500/10 to-transparent',
    iconColor: 'text-emerald-400',
    description:
      'How AI changes clinician cognition, decision-making, wellbeing, and professional identity.',
  },
  {
    name: 'Society',
    key: 'society',
    icon: Scale,
    color: 'pillar-society',
    border: 'border-t-amber-400',
    leftBorder: 'border-l-amber-400',
    bg: 'bg-amber-500/10',
    tint: 'from-amber-500/10 to-transparent',
    iconColor: 'text-amber-400',
    description:
      'How AI in emergency medicine intersects with ethics, equity, law, policy, and public trust.',
  },
];

// ── Process steps (detailed) ────────────────────────────────────────
const PROCESS_STEPS = [
  {
    icon: ClipboardList,
    label: 'Delphi Survey Rounds',
    color: 'cyan',
    borderColor: 'border-t-cyan-500',
    iconBg: 'bg-cyan-500/10',
    iconColor: 'text-cyan-400',
    bullets: [
      'Domain experts independently rate research questions on importance and feasibility',
      'After Round 1, AI-generated synthesis and group statistics inform Round 2 revisions',
      'Two iterative rounds narrow and refine each working group\'s question set',
    ],
  },
  {
    icon: GitCompare,
    label: 'Pairwise Ranking',
    color: 'purple',
    borderColor: 'border-t-indigo-500',
    iconBg: 'bg-purple-500/10',
    iconColor: 'text-indigo-400',
    bullets: [
      'Head-to-head comparisons between top-rated questions from Delphi rounds',
      'Bradley-Terry statistical model produces a rigorous priority ranking',
      'Adaptive algorithm minimizes the number of comparisons each expert must make',
    ],
  },
  {
    icon: Users,
    label: 'Conference Day Voting',
    color: 'emerald',
    borderColor: 'border-t-emerald-500',
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-400',
    bullets: [
      'All participants convene for live deliberation and final voting',
      'Real-time audience response with instant result visualization',
      'Cross-working-group synthesis produces the unified 10-year research agenda',
    ],
  },
];

// ── Pillar color map for WG cards ───────────────────────────────────
const PILLAR_COLORS = {
  Technology: 'border-t-cyan-400',
  Training: 'border-t-indigo-400',
  Self: 'border-t-emerald-400',
  Society: 'border-t-amber-400',
};

const PILLAR_BADGE_VARIANT = {
  Technology: 'cyan',
  Training: 'primary',
  Self: 'success',
  Society: 'warning',
};

// ── Framer motion variants ──────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.5, ease: 'easeOut' },
  }),
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.6, ease: 'easeOut' } },
};

const slideRight = {
  hidden: { opacity: 0, x: -40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

const slideLeft = {
  hidden: { opacity: 0, x: 40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
};

const scaleUp = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: 'easeOut' } },
};

// ── Countdown Timer ────────────────────────────────────────────────
function CountdownTimer({ targetDate }) {
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    const target = new Date(targetDate).getTime();
    const update = () => {
      const now = Date.now();
      const diff = target - now;
      if (diff <= 0) { setTimeLeft(null); return; }
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      setTimeLeft({ days, hours, minutes });
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (!timeLeft) return <span className="text-sm font-medium text-white/60">Conference Day is here!</span>;

  return (
    <div className="flex items-center gap-4 text-white">
      <div className="text-center">
        <div className="text-2xl font-bold">{timeLeft.days}</div>
        <div className="text-[10px] uppercase tracking-wider text-white/40">days</div>
      </div>
      <span className="text-white/20">:</span>
      <div className="text-center">
        <div className="text-2xl font-bold">{timeLeft.hours}</div>
        <div className="text-[10px] uppercase tracking-wider text-white/40">hours</div>
      </div>
      <span className="text-white/20">:</span>
      <div className="text-center">
        <div className="text-2xl font-bold">{timeLeft.minutes}</div>
        <div className="text-[10px] uppercase tracking-wider text-white/40">min</div>
      </div>
    </div>
  );
}

// ── WG Skeleton loader ──────────────────────────────────────────────
function WGSkeletons() {
  return (
    <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <div className="h-1.5 bg-white/[0.04]" />
          <CardContent className="space-y-4 p-6">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <div className="flex gap-3 pt-3">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-24" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Typing Effect ──────────────────────────────────────────────────
const TYPING_PHRASES = [
  'Technology \u00b7 Training \u00b7 Self \u00b7 Society',
  'Defining the Next Decade of AI Research',
  'Modified Delphi \u00b7 Pairwise Ranking \u00b7 Live Voting',
];

function TypingEffect() {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const phrase = TYPING_PHRASES[phraseIndex];
    let timeout;

    if (!deleting && charIndex < phrase.length) {
      timeout = setTimeout(() => setCharIndex((c) => c + 1), 45);
    } else if (!deleting && charIndex === phrase.length) {
      timeout = setTimeout(() => setDeleting(true), 2000);
    } else if (deleting && charIndex > 0) {
      timeout = setTimeout(() => setCharIndex((c) => c - 1), 25);
    } else if (deleting && charIndex === 0) {
      setDeleting(false);
      setPhraseIndex((p) => (p + 1) % TYPING_PHRASES.length);
    }

    return () => clearTimeout(timeout);
  }, [charIndex, deleting, phraseIndex]);

  return (
    <span>
      {TYPING_PHRASES[phraseIndex].slice(0, charIndex)}
      <span className="animate-pulse text-purple-400">|</span>
    </span>
  );
}

// ── Animated Number Counter ────────────────────────────────────────
function AnimatedNumber({ value, duration = 600 }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView || !value) return;
    const start = performance.now();
    function step(now) {
      const progress = Math.min((now - start) / duration, 1);
      setDisplay(Math.round(progress * value));
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }, [inView, value, duration]);

  return <span ref={ref}>{display}</span>;
}

// ── Main Component ──────────────────────────────────────────────────
export function HomePage() {
  usePageTitle(null);

  const [workingGroups, setWorkingGroups] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loadingWG, setLoadingWG] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [errorWG, setErrorWG] = useState(null);
  const [errorSessions, setErrorSessions] = useState(null);

  useEffect(() => {
    api('/api/surveys/working-groups')
      .then((data) => setWorkingGroups(Array.isArray(data) ? data : []))
      .catch((err) => setErrorWG(err.message))
      .finally(() => setLoadingWG(false));

    api('/api/conference/sessions')
      .then((data) => setSessions(Array.isArray(data) ? data.filter((s) => s.is_active) : []))
      .catch((err) => setErrorSessions(err.message))
      .finally(() => setLoadingSessions(false));
  }, []);

  const scrollToWorkingGroups = () => {
    document.getElementById('working-groups')?.scrollIntoView({ behavior: 'smooth' });
  };

  // Conference-day banner: visible only on the conference date in ET.
  // The previous T-24h window meant the banner read "Conference is live
  // today" starting 9am ET the day before, which was confusing. Anchor
  // to the literal calendar date in America/New_York so the copy is
  // always accurate.
  const showDayOfBanner = useMemo(() => {
    const conferenceDateET = '2026-05-21';
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/New_York',
      year: 'numeric', month: '2-digit', day: '2-digit',
    });
    return fmt.format(new Date()) === conferenceDateET;
  }, []);

  return (
    <div className="flex flex-col">
      <Helmet>
        <meta name="description" content="Join the SAEM 2026 AI Consensus Conference. Five working groups use a modified Delphi method to develop a 10-year research agenda for AI in emergency medicine." />
        <meta property="og:title" content="SAEM 2026 AI Consensus Conference" />
        <meta property="og:description" content="AI-Enhanced Consensus Building for Emergency Medicine Research" />
      </Helmet>

      {showDayOfBanner && (
        <div className="sticky top-0 z-40 border-b border-amber-400/30 bg-gradient-to-r from-amber-500/20 via-amber-500/15 to-cyan-500/20 backdrop-blur">
          <Link
            to="/welcome"
            className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6"
          >
            <div className="flex items-center gap-2 text-sm">
              <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-amber-300" />
              <span className="font-semibold text-white">
                Conference is live today — sign in to participate.
              </span>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.12] px-3 py-1 text-xs font-semibold text-white">
              Sign in <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>
        </div>
      )}

      {/* ─── Hero Section ──────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#0A1628] px-4 py-20 text-white sm:px-6 sm:py-28 lg:py-36">
        {/* Railway-style gradient overlays */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `
              linear-gradient(327.21deg, rgba(75, 0, 130, 0.24) 3.65%, rgba(136, 0, 204, 0) 40.32%),
              linear-gradient(245.93deg, rgba(209, 21, 111, 0.16) 0%, rgba(209, 25, 80, 0) 36.63%),
              linear-gradient(147.6deg, rgba(58, 19, 255, 0) 29.79%, rgba(98, 19, 255, 0.08) 85.72%)
            `,
          }}
        />

        {/* Subtle grid pattern */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.03]">
          <BackgroundPattern className="h-full w-full" style={{ width: '100%', height: '100%' }} />
        </div>

        {/* Animated floating orbs — navy/teal tones */}
        <motion.div
          className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-purple-500 opacity-[0.06] blur-[120px]"
          animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-[#00B4D8] opacity-[0.06] blur-[120px]"
          animate={{ x: [0, -25, 0], y: [0, 15, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="pointer-events-none absolute left-1/4 top-1/3 h-64 w-64 rounded-full bg-cyan-500 opacity-[0.04] blur-[100px]"
          animate={{ x: [0, 20, 0], y: [0, -15, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />

        <div className="relative mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-5 lg:gap-16">
          {/* Left side — text (60%) */}
          <div className="lg:col-span-3">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl xl:text-7xl">
                SAEM 2026{' '}
                <span className="block bg-gradient-to-r from-[#0C2340] via-[#1B5E8A] to-[#00B4D8] bg-clip-text text-transparent">
                  AI Consensus Conference
                </span>
              </h1>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-6 max-w-xl text-lg font-medium text-white/60 sm:text-xl"
            >
              AI &amp; Emergency Medicine: <TypingEffect />
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.06] px-4 py-1.5 text-sm font-semibold text-white/80 backdrop-blur-sm">
                <Calendar className="h-4 w-4 text-purple-400" />
                May 21, 2026 &middot; Atlanta
              </span>
              <a
                href="https://www.saem.org/annual-meeting"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.06] px-4 py-1.5 text-sm font-semibold text-white/80 backdrop-blur-sm transition hover:bg-white/[0.1]"
              >
                <Sparkles className="h-4 w-4 text-[#00B4D8]" />
                SAEM Annual Meeting
              </a>
              <button
                onClick={() => document.getElementById('process')?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.06] px-4 py-1.5 text-sm font-semibold text-white/80 backdrop-blur-sm transition hover:bg-white/[0.1]"
              >
                <FileText className="h-4 w-4 text-cyan-400" />
                Modified Delphi Method
              </button>
            </motion.div>

            {/* Countdown */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-6 inline-flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.04] px-6 py-3 backdrop-blur-sm"
            >
              <CountdownTimer targetDate="2026-05-21T09:00:00-04:00" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.55 }}
              className="mt-10"
            >
              <Button
                size="lg"
                onClick={scrollToWorkingGroups}
                className="group"
              >
                Explore Working Groups
                <ArrowDown className="ml-2 h-4 w-4 transition-transform group-hover:translate-y-0.5" />
              </Button>
            </motion.div>
          </div>

          {/* Right side — illustration (40%) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, x: 40 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
            className="hidden lg:col-span-2 lg:block"
          >
            <div className="relative">
              {/* Glow behind illustration */}
              <div className="absolute inset-0 scale-110 rounded-full bg-purple-500/10 blur-3xl" />
              <HeroIllustration className="relative w-full drop-shadow-2xl" />
            </div>
          </motion.div>

          {/* Mobile illustration (below text, smaller) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mx-auto max-w-xs lg:hidden"
          >
            <HeroIllustration className="w-full opacity-60" />
          </motion.div>
        </div>

        {/* Curved divider at bottom */}
        <div className="absolute -bottom-1 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="h-12 w-full sm:h-16 lg:h-20">
            <path
              d="M0,40 C360,80 1080,0 1440,40 L1440,80 L0,80Z"
              fill="#0E1E35"
            />
          </svg>
        </div>
      </section>

      {/* ─── About Section ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#0E1E35] px-4 py-20 sm:px-6 lg:py-28">
        {/* Subtle background pattern */}
        <div className="pointer-events-none absolute inset-0 text-white opacity-[0.02]">
          <BackgroundPattern className="h-full w-full" style={{ width: '100%', height: '100%' }} />
        </div>

        <div className="relative mx-auto max-w-6xl">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
            {/* Text on left */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              variants={slideRight}
            >
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                About This Conference
              </h2>
              <div className="mt-6 space-y-4 text-base leading-relaxed text-white/50">
                <p>
                  The Society for Academic Emergency Medicine has convened this consensus
                  conference to develop a{' '}
                  <strong className="text-white/80">10-year research agenda for artificial
                  intelligence in emergency medicine</strong>.
                </p>
                <p>
                  Five working groups of domain experts use a{' '}
                  <strong className="text-white/80">modified Delphi method</strong> — combining
                  iterative surveys, pairwise comparison ranking, and AI-assisted synthesis — to
                  identify and prioritize the most critical research questions.
                </p>
                <p>
                  As AI systems rapidly advance from decision-support tools to autonomous agents,
                  the emergency medicine community needs a shared roadmap to guide investigation,
                  education, and policy.
                </p>
              </div>
            </motion.div>

            {/* Illustration on right */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              variants={slideLeft}
              className="flex justify-center"
            >
              <DelphiProcessIllustration className="w-full max-w-md" />
            </motion.div>
          </div>

          {/* Key numbers row */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={staggerContainer}
            className="mt-16 grid gap-6 sm:grid-cols-3"
          >
            {[
              { number: 5, label: 'Working Groups', suffix: '', icon: Users },
              { number: 3, label: 'Consensus Methods', suffix: '', icon: ListChecks },
              { number: 10, label: 'Year Agenda', suffix: '-Year', icon: Target },
            ].map((stat) => (
              <motion.div key={stat.label} variants={staggerItem}>
                <Card className="group border-white/[0.06] bg-white/[0.03] backdrop-blur-sm">
                  <CardContent className="flex items-center gap-5 p-6">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-400 transition-colors group-hover:bg-purple-500/15">
                      <stat.icon className="h-7 w-7" />
                    </div>
                    <div>
                      <p className="text-3xl font-extrabold text-white">
                        <AnimatedNumber value={stat.number} />
                        {stat.suffix && <span className="text-lg font-bold text-white/40">{stat.suffix}</span>}
                      </p>
                      <p className="text-sm font-medium text-white/40">{stat.label}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── Process Section ───────────────────────────────────────── */}
      <section id="process" className="scroll-mt-20 bg-[#0A1628] px-4 py-20 sm:px-6 lg:py-28">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={fadeUp}
            className="text-center"
          >
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Our Consensus Process
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-white/40">
              A rigorous, multi-stage methodology that combines expert judgment with
              statistical rigor to build true consensus
            </p>
          </motion.div>

          {/* Full-width Delphi illustration */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={scaleUp}
            className="mx-auto mt-12 max-w-3xl"
          >
            <DelphiProcessIllustration className="w-full" />
          </motion.div>

          {/* Detailed stage cards */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            variants={staggerContainer}
            className="mt-14 grid gap-8 md:grid-cols-3"
          >
            {PROCESS_STEPS.map((step, idx) => (
              <motion.div key={step.label} variants={staggerItem}>
                <Card className={`h-full border-t-4 ${step.borderColor}`}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${step.iconBg}`}>
                        <step.icon className={`h-5 w-5 ${step.iconColor}`} />
                      </div>
                      <div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-white/30">
                          Stage {idx + 1}
                        </span>
                        <h3 className="text-lg font-bold text-white">{step.label}</h3>
                      </div>
                    </div>
                    <ul className="mt-5 space-y-3">
                      {step.bullets.map((bullet, bi) => (
                        <li key={bi} className="flex items-start gap-2.5 text-sm leading-relaxed text-white/50">
                          <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${step.iconColor} opacity-60`} />
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── Four Pillars ──────────────────────────────────────────── */}
      <section className="bg-[#0E1E35] px-4 py-20 sm:px-6 lg:py-28">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={fadeUp}
            className="text-center"
          >
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Four Pillars of AI in Emergency Medicine
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-white/40">
              Our research agenda spans four interconnected domains that together define
              the future of AI-augmented emergency care
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={staggerContainer}
            className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
          >
            {PILLARS.map((pillar) => (
              <motion.div
                key={pillar.name}
                variants={staggerItem}
                whileHover={{ y: -6, scale: 1.02, transition: { duration: 0.2 } }}
                className="will-change-transform"
              >
                <Card className={`group relative h-full overflow-hidden border-l-4 ${pillar.leftBorder}`}>
                  {/* Subtle gradient tint */}
                  <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${pillar.tint} opacity-40`} />
                  <CardContent className="relative p-6">
                    {/* PillarIllustration */}
                    <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center">
                      <PillarIllustration pillar={pillar.key} className="h-20 w-20" />
                    </div>
                    <h3 className="text-center text-lg font-bold text-white">{pillar.name}</h3>
                    <p className="mt-2 text-center text-sm leading-relaxed text-white/40">
                      {pillar.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── Working Groups ────────────────────────────────────────── */}
      <section id="working-groups" className="scroll-mt-16 bg-[#0A1628] px-4 py-20 sm:px-6 lg:py-28">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={fadeUp}
            className="text-center"
          >
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Working Groups
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-white/40">
              Five expert groups driving the consensus process across complementary domains
            </p>
          </motion.div>

          <div className="mt-14">
            {loadingWG ? (
              <WGSkeletons />
            ) : errorWG ? (
              <Card>
                <CardContent className="py-12 text-center text-white/40">
                  <EmptyStateIllustration type="error" className="mx-auto mb-4 w-32" />
                  <p className="text-sm">Unable to load working groups. Please try again later.</p>
                </CardContent>
              </Card>
            ) : (
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-40px' }}
                variants={staggerContainer}
                className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3"
              >
                {workingGroups.map((wg) => {
                  const pillarColor = PILLAR_COLORS[wg.pillar] || 'border-t-indigo-500';
                  const badgeVariant = PILLAR_BADGE_VARIANT[wg.pillar] || 'default';
                  return (
                    <motion.div
                      key={wg.wg_number}
                      variants={staggerItem}
                    >
                      <Card className={`relative h-full overflow-hidden border-t-4 ${pillarColor}`}>
                        {/* Large watermark WG number */}
                        <span className="pointer-events-none absolute -bottom-4 -right-2 select-none text-[8rem] font-black leading-none text-white opacity-[0.03]">
                          {wg.wg_number}
                        </span>

                        <CardContent className="relative flex h-full flex-col p-6">
                          <div className="flex items-start justify-between">
                            <Badge variant={badgeVariant} className="text-xs font-bold">
                              WG {wg.wg_number}
                            </Badge>
                            {wg.pillar && (
                              <span className="text-xs font-medium text-white/30">{wg.pillar}</span>
                            )}
                          </div>

                          <h3 className="mt-4 text-base font-semibold leading-snug text-white">
                            {wg.name}
                          </h3>

                          {wg.scope && (
                            <p className="mt-2 text-sm leading-relaxed text-white/40 line-clamp-2">
                              {wg.scope}
                            </p>
                          )}

                          {wg.co_leads && wg.co_leads.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {wg.co_leads.map((cl, i) => (
                                <span key={i} className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-2.5 py-1 text-xs font-medium text-white/50">
                                  <Users className="h-3 w-3" />
                                  {cl.name}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Stats row */}
                          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/40">
                            {wg.total_questions != null && (
                              <span className="flex items-center gap-1.5">
                                <ClipboardList className="h-4 w-4 text-white/20" />
                                <span className="font-semibold text-white/70">
                                  <AnimatedNumber value={wg.total_questions} />
                                </span>{' '}
                                questions
                              </span>
                            )}
                            {wg.confirmed != null && (
                              <span className="flex items-center gap-1.5">
                                <UserCheck className="h-4 w-4 text-white/20" />
                                <span className="font-semibold text-white/70">
                                  <AnimatedNumber value={wg.confirmed} />
                                </span>{' '}
                                confirmed
                              </span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* ─── Public "Live Now" panel — only renders when something is live ─ */}
      <LiveNowPanel />


      {/* ─── Sponsors / Credibility ────────────────────────────────── */}
      <section className="bg-[#0A1628] px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            variants={fadeUp}
            className="text-center"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-white/30">
              Organized by
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-base font-medium text-white/40">
              <span>SAEM</span>
              <span className="text-white/20" aria-hidden="true">&middot;</span>
              <span>CORD</span>
              <span className="text-white/20" aria-hidden="true">&middot;</span>
              <span>University of Virginia School of Medicine</span>
            </div>
            <p className="mt-4 text-sm text-white/30">
              Conference Chair: <strong className="font-semibold text-white/50">R. Andrew Taylor, MD, MHS</strong>
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Public "Live Now" panel
//
// Polls /api/conference/day-state + /api/conference/display-mode and
// subscribes to /api/events/day SSE. Renders nothing when the conference
// isn't live (no active session and display mode is idle/welcome) so it
// stays out of the way pre-conference. On conference day it appears
// loud and bold with vote/comment tallies that tick in real time, and
// routes anyone who wants to participate through /welcome.
// ─────────────────────────────────────────────────────────────────────

const PANEL_WG_NAMES = {
  1: 'Clinical Practice & Operations',
  2: 'Infrastructure & Data',
  3: 'Education & Training',
  4: 'Human-AI Interaction',
  5: 'Ethics & Legal',
};

function LiveNowPanel() {
  const [dayState, setDayState] = useState(null);
  const [displayMode, setDisplayMode] = useState(null);
  const [chat, setChat] = useState(null);
  const [results, setResults] = useState(null);

  // Fetch day state + display mode (always)
  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const d = await api('/api/conference/day-state');
        if (!cancelled) setDayState(d);
      } catch { /* leave stale */ }
      try {
        const dm = await api('/api/conference/display-mode');
        if (!cancelled) setDisplayMode(dm);
      } catch { /* leave stale */ }
    };
    refresh();
    const t = setInterval(refresh, 10000);

    let es = null;
    if (typeof EventSource !== 'undefined') {
      es = new EventSource('/api/events/day');
      es.onmessage = () => refresh();
      es.onerror = () => { /* auto-reconnects */ };
    }
    return () => {
      cancelled = true;
      clearInterval(t);
      if (es) { try { es.close(); } catch {} }
    };
  }, []);

  const activeSession = useMemo(() => {
    if (!dayState?.sessions) return null;
    return dayState.sessions.find((s) => s.id === dayState.active_session_id) || null;
  }, [dayState]);

  // When there's an active session, fetch chat + results and keep them fresh.
  useEffect(() => {
    if (!activeSession) {
      setChat(null);
      setResults(null);
      return undefined;
    }
    let cancelled = false;
    const refresh = async () => {
      try {
        const c = await api(`/api/conference/chat/${activeSession.id}?sort=top`);
        if (!cancelled) setChat(c?.messages || []);
      } catch { /* leave stale */ }
      try {
        const r = await api(`/api/conference/results/${activeSession.id}`);
        if (!cancelled) setResults(r || null);
      } catch { /* leave stale */ }
    };
    refresh();
    const t = setInterval(refresh, 8000);

    let es = null;
    if (typeof EventSource !== 'undefined') {
      es = new EventSource('/api/events/day');
      es.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data);
          if (['chat_message_new', 'chat_upvote_changed', 'chat_message_hidden',
               'chat_message_unhidden', 'vote_cast', 'phase_changed',
               'session_started', 'session_stopped'].includes(data?.event)) {
            refresh();
          }
        } catch { /* malformed */ }
      };
    }
    return () => {
      cancelled = true;
      clearInterval(t);
      if (es) { try { es.close(); } catch {} }
    };
  }, [activeSession?.id]);

  const mode = displayMode?.mode || 'idle';
  const panelWgMatch = /^panel:(\d+)$/.exec(mode);
  const inLiveSegment = mode && mode !== 'idle' && mode !== 'welcome';

  // Don't render anything pre-conference / between segments.
  if (!activeSession && !inLiveSegment) return null;

  // Headline copy derived from what's actually live.
  let headline = 'Live now';
  let subline = '';
  if (activeSession) {
    const wg = activeSession.wg_number;
    headline = wg ? `Panel ${wg} — ${PANEL_WG_NAMES[wg] || activeSession.wg_short_name}`
                  : (activeSession.session_type === 'cross_wg_prioritization'
                      ? 'Cross-WG consensus vote'
                      : 'Live vote');
    subline = activeSession.phase === 'post_discussion'
      ? 'Voting now — the room is ranking the questions you see below.'
      : 'Panel discussion underway — voting opens next.';
  } else if (panelWgMatch) {
    const wg = parseInt(panelWgMatch[1], 10);
    headline = `Panel ${wg} — ${PANEL_WG_NAMES[wg] || ''}`;
    subline = 'Panel in progress.';
  } else if (mode === 'table_reactions') {
    headline = 'Table reactions';
    subline = 'Breakout tables responding to the panel.';
  } else if (mode === 'world_cafe') {
    headline = 'World Café';
    subline = 'Three 20-minute rotations across the WG stations.';
  } else if (mode === 'cross_wg') {
    headline = 'Cross-WG consensus';
    subline = 'Closing ranked vote across all five working groups.';
  }

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#0E1E35] via-[#0A1628] to-[#0E1E35] px-4 py-16 sm:px-6 lg:py-20">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-[400px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-b from-emerald-500/[0.12] to-transparent blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 right-1/4 h-[300px] w-[600px] rounded-full bg-gradient-to-b from-cyan-500/[0.08] to-transparent blur-3xl" />

      <div className="relative mx-auto max-w-6xl">
        {/* LIVE badge + date */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-3"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/[0.12] px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-200">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-80" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
            </span>
            Live now
          </span>
          <span className="text-xs font-medium uppercase tracking-wider text-white/40">
            May 21, 2026 · Atlanta
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h2
          key={headline}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-5 text-center text-3xl font-bold tracking-tight text-white sm:text-5xl"
        >
          {headline}
        </motion.h2>
        {subline && (
          <p className="mt-3 text-center text-base text-white/55 sm:text-lg">
            {subline}
          </p>
        )}

        {/* Counters strip */}
        {activeSession && (
          <div className="mx-auto mt-8 grid max-w-3xl grid-cols-3 gap-3">
            <LiveStat label="Votes cast"   value={activeSession.vote_count ?? 0} />
            <LiveStat label="Participants" value={activeSession.unique_voters ?? 0} />
            <LiveStat label="Comments"     value={activeSession.comment_count ?? 0} />
          </div>
        )}

        {/* Two-column public view: chat + vote leaderboard */}
        {activeSession && (
          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            <LiveChatColumn messages={chat} />
            <LiveResultsColumn results={results} />
          </div>
        )}
      </div>
    </section>
  );
}

function LiveStat({ label, value }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-4 text-center backdrop-blur-sm sm:px-6 sm:py-5">
      <div className="font-mono text-2xl font-bold tabular-nums text-white sm:text-4xl">
        <AnimatedNumber value={value} />
      </div>
      <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-white/40 sm:text-xs">
        {label}
      </div>
    </div>
  );
}

function LiveChatColumn({ messages }) {
  const top = (messages || []).slice(0, 6);
  return (
    <Card className="border-white/[0.08] bg-white/[0.03]">
      <CardContent className="p-5">
        <header className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-cyan-300" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-white/80">
              Top discussion
            </h3>
          </div>
          <span className="text-[10px] font-medium uppercase tracking-wider text-white/30">
            Most upvoted
          </span>
        </header>
        {top.length === 0 ? (
          <p className="py-8 text-center text-sm text-white/35">
            Comments will appear here as the room reacts.
          </p>
        ) : (
          <ul className="space-y-3">
            {top.map((m) => (
              <li
                key={m.id}
                className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"
              >
                <p className="text-sm leading-relaxed text-white/85">
                  {m.body}
                </p>
                <div className="mt-1.5 flex items-center justify-end text-[11px] text-white/45">
                  <span className="inline-flex items-center gap-1 font-mono">
                    ▲ {m.upvote_count ?? 0}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function LiveResultsColumn({ results }) {
  // Choose the most informative result family. The /results endpoint can
  // return multiple vote types (e.g. importance + ranking); rank by mean
  // for ranking, by sum for allocation. We display the top 6 questions.
  const items = useMemo(() => {
    if (!results?.results) return [];
    const list = [...results.results];
    // Prefer ranking (lower mean = better) when present
    const hasRanking = list.some((r) => /ranking/i.test(r.vote_type || ''));
    if (hasRanking) {
      return list
        .filter((r) => /ranking/i.test(r.vote_type || ''))
        .sort((a, b) => (a.mean ?? 999) - (b.mean ?? 999))
        .slice(0, 6);
    }
    return list
      .slice()
      .sort((a, b) => (b.sum ?? 0) - (a.sum ?? 0))
      .slice(0, 6);
  }, [results]);

  return (
    <Card className="border-white/[0.08] bg-white/[0.03]">
      <CardContent className="p-5">
        <header className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-amber-300" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-white/80">
              Leading questions
            </h3>
          </div>
          {results?.total_votes != null && (
            <span className="text-[10px] font-medium uppercase tracking-wider text-white/30">
              {results.total_votes} votes
            </span>
          )}
        </header>
        {items.length === 0 ? (
          <p className="py-8 text-center text-sm text-white/35">
            Vote results will appear here as the room ranks.
          </p>
        ) : (
          <ol className="space-y-2">
            {items.map((q, i) => (
              <li
                key={q.question_id}
                className="flex items-start gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-xs font-bold text-amber-200">
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm leading-relaxed text-white/85">
                    {q.question_text || `Question ${q.question_id}`}
                  </p>
                  <div className="mt-1 flex items-center gap-3 text-[11px] text-white/40">
                    {q.wg_number != null && (
                      <span>WG {q.wg_number}</span>
                    )}
                    <span className="font-mono">
                      {/ranking/i.test(q.vote_type || '')
                        ? `mean rank ${q.mean?.toFixed(2)}`
                        : `score ${q.sum?.toFixed(0)}`}
                    </span>
                    <span>{q.n_votes} votes</span>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
