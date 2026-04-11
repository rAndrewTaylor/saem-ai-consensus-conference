import { useState, useEffect, useRef } from 'react';
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
  HelpCircle,
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
    border: 'border-t-[var(--color-pillar-technology)]',
    leftBorder: 'border-l-[var(--color-pillar-technology)]',
    bg: 'bg-blue-50',
    tint: 'from-blue-50/80 to-transparent',
    iconColor: 'text-blue-600',
    description:
      'How AI tools are built, deployed, validated, and integrated into clinical systems and workflows.',
  },
  {
    name: 'Training',
    key: 'training',
    icon: GraduationCap,
    color: 'pillar-training',
    border: 'border-t-[var(--color-pillar-training)]',
    leftBorder: 'border-l-[var(--color-pillar-training)]',
    bg: 'bg-violet-50',
    tint: 'from-violet-50/80 to-transparent',
    iconColor: 'text-violet-600',
    description:
      'How medical education and residency curricula must evolve to prepare clinicians for AI-augmented practice.',
  },
  {
    name: 'Self',
    key: 'self',
    icon: Brain,
    color: 'pillar-self',
    border: 'border-t-[var(--color-pillar-self)]',
    leftBorder: 'border-l-[var(--color-pillar-self)]',
    bg: 'bg-teal-50',
    tint: 'from-teal-50/80 to-transparent',
    iconColor: 'text-teal-600',
    description:
      'How AI changes clinician cognition, decision-making, wellbeing, and professional identity.',
  },
  {
    name: 'Society',
    key: 'society',
    icon: Scale,
    color: 'pillar-society',
    border: 'border-t-[var(--color-pillar-society)]',
    leftBorder: 'border-l-[var(--color-pillar-society)]',
    bg: 'bg-amber-50',
    tint: 'from-amber-50/80 to-transparent',
    iconColor: 'text-amber-600',
    description:
      'How AI in emergency medicine intersects with ethics, equity, law, policy, and public trust.',
  },
];

// ── Process steps (detailed) ────────────────────────────────────────
const PROCESS_STEPS = [
  {
    icon: ClipboardList,
    label: 'Delphi Survey Rounds',
    color: 'blue',
    borderColor: 'border-t-blue-500',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    bullets: [
      'Domain experts independently rate research questions on importance and feasibility',
      'After Round 1, AI-generated synthesis and group statistics inform Round 2 revisions',
      'Two iterative rounds narrow and refine each working group\'s question set',
    ],
  },
  {
    icon: GitCompare,
    label: 'Pairwise Ranking',
    color: 'violet',
    borderColor: 'border-t-violet-500',
    iconBg: 'bg-violet-50',
    iconColor: 'text-violet-600',
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
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    bullets: [
      'All participants convene for live deliberation and final voting',
      'Real-time audience response with instant result visualization',
      'Cross-working-group synthesis produces the unified 10-year research agenda',
    ],
  },
];

// ── Pillar color map for WG cards ───────────────────────────────────
const PILLAR_COLORS = {
  Technology: 'border-t-[var(--color-pillar-technology)]',
  Training: 'border-t-[var(--color-pillar-training)]',
  Self: 'border-t-[var(--color-pillar-self)]',
  Society: 'border-t-[var(--color-pillar-society)]',
};

const PILLAR_BADGE_VARIANT = {
  Technology: 'primary',
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

  if (!timeLeft) return <span className="text-sm font-medium text-white/80">Conference Day is here!</span>;

  return (
    <div className="flex items-center gap-4 text-white">
      <div className="text-center">
        <div className="text-2xl font-bold">{timeLeft.days}</div>
        <div className="text-[10px] uppercase tracking-wider text-white/60">days</div>
      </div>
      <span className="text-white/30">:</span>
      <div className="text-center">
        <div className="text-2xl font-bold">{timeLeft.hours}</div>
        <div className="text-[10px] uppercase tracking-wider text-white/60">hours</div>
      </div>
      <span className="text-white/30">:</span>
      <div className="text-center">
        <div className="text-2xl font-bold">{timeLeft.minutes}</div>
        <div className="text-[10px] uppercase tracking-wider text-white/60">min</div>
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
          <div className="h-1.5 bg-gray-200" />
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
      <span className="animate-pulse">|</span>
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

  return (
    <div className="flex flex-col">
      <Helmet>
        <meta name="description" content="Join the SAEM 2026 AI Consensus Conference. Five working groups use a modified Delphi method to develop a 10-year research agenda for AI in emergency medicine." />
        <meta property="og:title" content="SAEM 2026 AI Consensus Conference" />
        <meta property="og:description" content="AI-Enhanced Consensus Building for Emergency Medicine Research" />
      </Helmet>

      {/* ─── Hero Section ──────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-900 via-primary-700 to-primary-600 px-4 py-20 text-white sm:px-6 sm:py-28 lg:py-32">
        {/* BackgroundPattern overlay */}
        <div className="pointer-events-none absolute inset-0 text-white opacity-[0.04]">
          <BackgroundPattern className="h-full w-full" style={{ width: '100%', height: '100%' }} />
        </div>

        {/* Animated floating orbs */}
        <motion.div
          className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-white opacity-[0.07] blur-3xl"
          animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-white opacity-[0.07] blur-3xl"
          animate={{ x: [0, -25, 0], y: [0, 15, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="pointer-events-none absolute left-1/4 top-1/3 h-64 w-64 rounded-full bg-primary-400 opacity-[0.06] blur-3xl"
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
                <span className="block bg-gradient-to-r from-white to-primary-200 bg-clip-text text-transparent">
                  AI Consensus Conference
                </span>
              </h1>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-6 max-w-xl text-lg font-medium text-primary-100 sm:text-xl"
            >
              AI &amp; Emergency Medicine: <TypingEffect />
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-1.5 text-sm font-semibold text-white backdrop-blur-sm">
                <Calendar className="h-4 w-4" />
                May 21, 2026 &middot; Atlanta
              </span>
              <a
                href="https://www.saem.org/annual-meeting"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-1.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/25"
              >
                <Sparkles className="h-4 w-4" />
                SAEM Annual Meeting
              </a>
              <button
                onClick={() => document.getElementById('process')?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-1.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/25"
              >
                <FileText className="h-4 w-4" />
                Modified Delphi Method
              </button>
            </motion.div>

            {/* Countdown */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-6 inline-flex items-center gap-3 rounded-2xl bg-white/10 px-6 py-3 backdrop-blur-sm"
            >
              <CountdownTimer targetDate="2026-05-21T08:00:00" />
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
                className="group bg-white text-primary-700 shadow-xl shadow-primary-900/30 hover:bg-primary-50 hover:text-primary-800"
              >
                Explore Working Groups
                <ArrowDown className="ml-2 h-4 w-4 transition-transform group-hover:translate-y-0.5" />
              </Button>
              <Link to="/guide" className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-white/70 transition hover:text-white">
                <HelpCircle className="h-4 w-4" />
                New participant? Read the guide
              </Link>
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
              <div className="absolute inset-0 scale-110 rounded-full bg-white/10 blur-3xl" />
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
            <HeroIllustration className="w-full opacity-80" />
          </motion.div>
        </div>

        {/* Curved divider at bottom */}
        <div className="absolute -bottom-1 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="h-12 w-full sm:h-16 lg:h-20">
            <path
              d="M0,40 C360,80 1080,0 1440,40 L1440,80 L0,80Z"
              fill="#f9fafb"
            />
          </svg>
        </div>
      </section>

      {/* ─── About Section ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gray-50 px-4 py-20 sm:px-6 lg:py-28">
        {/* Subtle background pattern */}
        <div className="pointer-events-none absolute inset-0 text-gray-300 opacity-30">
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
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                About This Conference
              </h2>
              <div className="mt-6 space-y-4 text-base leading-relaxed text-gray-600">
                <p>
                  The Society for Academic Emergency Medicine has convened this consensus
                  conference to develop a{' '}
                  <strong className="text-gray-800">10-year research agenda for artificial
                  intelligence in emergency medicine</strong>.
                </p>
                <p>
                  Five working groups of domain experts use a{' '}
                  <strong className="text-gray-800">modified Delphi method</strong> — combining
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
                <Card className="group border-0 bg-white/80 shadow-sm backdrop-blur-sm transition-shadow hover:shadow-md">
                  <CardContent className="flex items-center gap-5 p-6">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 transition-colors group-hover:bg-primary-100">
                      <stat.icon className="h-7 w-7" />
                    </div>
                    <div>
                      <p className="text-3xl font-extrabold text-gray-900">
                        <AnimatedNumber value={stat.number} />
                        {stat.suffix && <span className="text-lg font-bold text-gray-500">{stat.suffix}</span>}
                      </p>
                      <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── Process Section ───────────────────────────────────────── */}
      <section id="process" className="bg-white px-4 py-20 sm:px-6 lg:py-28">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={fadeUp}
            className="text-center"
          >
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Our Consensus Process
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-gray-500">
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
                <Card className={`h-full border-t-4 ${step.borderColor} transition-shadow duration-200 hover:shadow-lg`}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${step.iconBg}`}>
                        <step.icon className={`h-5 w-5 ${step.iconColor}`} />
                      </div>
                      <div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                          Stage {idx + 1}
                        </span>
                        <h3 className="text-lg font-bold text-gray-900">{step.label}</h3>
                      </div>
                    </div>
                    <ul className="mt-5 space-y-3">
                      {step.bullets.map((bullet, bi) => (
                        <li key={bi} className="flex items-start gap-2.5 text-sm leading-relaxed text-gray-600">
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
      <section className="bg-gray-50 px-4 py-20 sm:px-6 lg:py-28">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={fadeUp}
            className="text-center"
          >
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Four Pillars of AI in Emergency Medicine
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-gray-500">
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
                <Card className={`group relative h-full overflow-hidden border-l-4 ${pillar.leftBorder} transition-shadow duration-300 hover:shadow-xl`}>
                  {/* Subtle gradient tint */}
                  <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${pillar.tint} opacity-50`} />
                  <CardContent className="relative p-6">
                    {/* PillarIllustration */}
                    <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center">
                      <PillarIllustration pillar={pillar.key} className="h-20 w-20" />
                    </div>
                    <h3 className="text-center text-lg font-bold text-gray-900">{pillar.name}</h3>
                    <p className="mt-2 text-center text-sm leading-relaxed text-gray-500">
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
      <section id="working-groups" className="scroll-mt-16 bg-white px-4 py-20 sm:px-6 lg:py-28">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={fadeUp}
            className="text-center"
          >
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Working Groups
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-gray-500">
              Five expert groups driving the consensus process across complementary domains
            </p>
          </motion.div>

          <div className="mt-14">
            {loadingWG ? (
              <WGSkeletons />
            ) : errorWG ? (
              <Card className="border-danger-light">
                <CardContent className="py-12 text-center text-gray-500">
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
                  const pillarColor = PILLAR_COLORS[wg.pillar] || 'border-t-primary-500';
                  const badgeVariant = PILLAR_BADGE_VARIANT[wg.pillar] || 'default';
                  return (
                    <motion.div
                      key={wg.wg_number}
                      variants={staggerItem}
                      whileHover={{ y: -6, transition: { duration: 0.2 } }}
                      className="will-change-transform"
                    >
                      <Card className={`group relative h-full overflow-hidden border-t-4 ${pillarColor} transition-shadow duration-300 hover:shadow-xl`}>
                        {/* Large watermark WG number */}
                        <span className="pointer-events-none absolute -bottom-4 -right-2 select-none text-[8rem] font-black leading-none text-gray-900 opacity-[0.03]">
                          {wg.wg_number}
                        </span>

                        <CardContent className="relative flex h-full flex-col p-6">
                          <div className="flex items-start justify-between">
                            <Badge variant={badgeVariant} className="text-xs font-bold">
                              WG {wg.wg_number}
                            </Badge>
                            {wg.pillar && (
                              <span className="text-xs font-medium text-gray-400">{wg.pillar}</span>
                            )}
                          </div>

                          <h3 className="mt-4 text-base font-semibold leading-snug text-gray-900">
                            {wg.name}
                          </h3>

                          {wg.scope && (
                            <p className="mt-2 text-sm leading-relaxed text-gray-500 line-clamp-2">
                              {wg.scope}
                            </p>
                          )}

                          {wg.co_leads && wg.co_leads.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {wg.co_leads.map((cl, i) => (
                                <span key={i} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                                  <Users className="h-3 w-3" />
                                  {cl.name}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Stats row */}
                          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-500">
                            {wg.total_questions != null && (
                              <span className="flex items-center gap-1.5">
                                <ClipboardList className="h-4 w-4 text-gray-400" />
                                <span className="font-semibold text-gray-700">
                                  <AnimatedNumber value={wg.total_questions} />
                                </span>{' '}
                                questions
                              </span>
                            )}
                            {wg.confirmed != null && (
                              <span className="flex items-center gap-1.5">
                                <UserCheck className="h-4 w-4 text-gray-400" />
                                <span className="font-semibold text-gray-700">
                                  <AnimatedNumber value={wg.confirmed} />
                                </span>{' '}
                                confirmed
                              </span>
                            )}
                          </div>

                          {/* Action buttons */}
                          <div className="mt-auto flex flex-wrap gap-2.5 pt-6">
                            <Link to={`/survey/${wg.wg_number}/round_1`}>
                              <Button variant="secondary" size="sm" className="gap-1 shadow-sm">
                                Round 1
                                <ChevronRight className="h-3.5 w-3.5" />
                              </Button>
                            </Link>
                            <Link to={`/survey/${wg.wg_number}/round_2`}>
                              <Button variant="secondary" size="sm" className="gap-1 shadow-sm">
                                Round 2
                                <ChevronRight className="h-3.5 w-3.5" />
                              </Button>
                            </Link>
                            <Link to={`/rank/${wg.wg_number}`}>
                              <Button variant="secondary" size="sm" className="gap-1 shadow-sm">
                                Pairwise
                                <ChevronRight className="h-3.5 w-3.5" />
                              </Button>
                            </Link>
                            <Link to={`/results/${wg.wg_number}`}>
                              <Button variant="ghost" size="sm" className="gap-1">
                                Results
                                <ArrowRight className="h-3.5 w-3.5" />
                              </Button>
                            </Link>
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

      {/* ─── Active Sessions / Conference Day ──────────────────────── */}
      <section className="bg-gray-50 px-4 py-20 sm:px-6 lg:py-28">
        <div className="mx-auto max-w-4xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={fadeUp}
            className="text-center"
          >
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Conference Day Voting
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-gray-500">
              Live voting sessions will open on conference day for real-time audience response
            </p>
          </motion.div>

          <div className="mt-12">
            {loadingSessions ? (
              <div className="flex flex-col items-center gap-3">
                <Skeleton className="h-28 w-full max-w-md rounded-xl" />
              </div>
            ) : errorSessions ? (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  <EmptyStateIllustration type="error" className="mx-auto mb-4 w-28" />
                  <p className="text-sm">Unable to load sessions.</p>
                </CardContent>
              </Card>
            ) : sessions.length > 0 ? (
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={staggerContainer}
                className="grid gap-5 sm:grid-cols-2"
              >
                {sessions.map((session) => (
                  <motion.div key={session.id} variants={staggerItem}>
                    <Link to={`/vote/${session.id}`}>
                      <Card className="group cursor-pointer border-emerald-200 transition-all duration-200 hover:border-emerald-300 hover:shadow-xl">
                        <CardContent className="flex items-center gap-4 p-5">
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 transition-colors group-hover:bg-emerald-100">
                            <Radio className="h-7 w-7" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="truncate text-base font-semibold text-gray-900">
                                {session.title || `Session ${session.id}`}
                              </h3>
                              <Badge variant="live">
                                <span className="relative mr-1.5 flex h-3 w-3">
                                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                                  <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
                                </span>
                                LIVE
                              </Badge>
                            </div>
                            {session.description && (
                              <p className="mt-1 truncate text-sm text-gray-500">
                                {session.description}
                              </p>
                            )}
                          </div>
                          <ChevronRight className="h-5 w-5 shrink-0 text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-gray-500" />
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={scaleUp}
              >
                <Card className="overflow-hidden">
                  <CardContent className="flex flex-col items-center py-16 text-center">
                    <EmptyStateIllustration type="no-sessions" className="mb-6 w-40" />
                    <h3 className="text-lg font-semibold text-gray-700">
                      No active voting sessions
                    </h3>
                    <p className="mt-2 max-w-sm text-sm leading-relaxed text-gray-400">
                      Live voting sessions will appear here on conference day,{' '}
                      <strong className="text-gray-500">May 21, 2026</strong>. Check back during the
                      SAEM Annual Meeting.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* ─── Sponsors / Credibility ────────────────────────────────── */}
      <section className="bg-gray-100 px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            variants={fadeUp}
            className="text-center"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
              Organized by
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-base font-medium text-gray-500">
              <span>SAEM</span>
              <span className="text-gray-300" aria-hidden="true">&middot;</span>
              <span>CORD</span>
              <span className="text-gray-300" aria-hidden="true">&middot;</span>
              <span>University of Virginia School of Medicine</span>
            </div>
            <p className="mt-4 text-sm text-gray-400">
              Conference Chair: <strong className="font-semibold text-gray-500">R. Andrew Taylor, MD, MHS</strong>
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
