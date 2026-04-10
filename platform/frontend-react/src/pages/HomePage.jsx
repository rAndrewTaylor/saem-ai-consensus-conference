import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
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
  Sparkles,
  FileText,
  UserCheck,
  BarChart3,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';

// ── Pillar definitions ──────────────────────────────────────────────
const PILLARS = [
  {
    name: 'Technology',
    icon: Cpu,
    color: 'pillar-technology',
    border: 'border-t-[var(--color-pillar-technology)]',
    bg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    description:
      'How AI tools are built, deployed, validated, and integrated into clinical systems and workflows.',
  },
  {
    name: 'Training',
    icon: GraduationCap,
    color: 'pillar-training',
    border: 'border-t-[var(--color-pillar-training)]',
    bg: 'bg-violet-50',
    iconColor: 'text-violet-600',
    description:
      'How medical education and residency curricula must evolve to prepare clinicians for AI-augmented practice.',
  },
  {
    name: 'Self',
    icon: Brain,
    color: 'pillar-self',
    border: 'border-t-[var(--color-pillar-self)]',
    bg: 'bg-teal-50',
    iconColor: 'text-teal-600',
    description:
      'How AI changes clinician cognition, decision-making, wellbeing, and professional identity.',
  },
  {
    name: 'Society',
    icon: Scale,
    color: 'pillar-society',
    border: 'border-t-[var(--color-pillar-society)]',
    bg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    description:
      'How AI in emergency medicine intersects with ethics, equity, law, policy, and public trust.',
  },
];

// ── Process steps ───────────────────────────────────────────────────
const STEPS = [
  {
    icon: ClipboardList,
    label: 'Delphi Survey Rounds',
    description:
      'Domain experts rate and refine research questions across two iterative survey rounds.',
  },
  {
    icon: GitCompare,
    label: 'Pairwise Ranking',
    description:
      'Head-to-head comparisons produce a rigorous priority ranking within each working group.',
  },
  {
    icon: Users,
    label: 'Conference Day Voting',
    description:
      'All participants convene to finalize the 10-year research agenda through live deliberation.',
  },
];

// ── Pillar color map for WG cards ───────────────────────────────────
const PILLAR_COLORS = {
  Technology: 'border-l-[var(--color-pillar-technology)]',
  Training: 'border-l-[var(--color-pillar-training)]',
  Self: 'border-l-[var(--color-pillar-self)]',
  Society: 'border-l-[var(--color-pillar-society)]',
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

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
};

const staggerLeft = {
  hidden: { opacity: 0, x: -32 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.45, ease: 'easeOut' } },
};

// ── WG Skeleton loader ──────────────────────────────────────────────
function WGSkeletons() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <CardContent className="space-y-3">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <div className="flex gap-2 pt-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
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
    api('/api/admin/dashboard')
      .then((data) => setWorkingGroups(data.working_groups || []))
      .catch((err) => setErrorWG(err.message))
      .finally(() => setLoadingWG(false));

    api('/api/conference/sessions')
      .then((data) => setSessions(Array.isArray(data) ? data.filter((s) => s.is_active) : []))
      .catch((err) => setErrorSessions(err.message))
      .finally(() => setLoadingSessions(false));
  }, []);

  return (
    <div className="flex flex-col">
      <Helmet>
        <meta name="description" content="Join the SAEM 2026 AI Consensus Conference. Five working groups use a modified Delphi method to develop a 10-year research agenda for AI in emergency medicine." />
        <meta property="og:title" content="SAEM 2026 AI Consensus Conference" />
        <meta property="og:description" content="AI-Enhanced Consensus Building for Emergency Medicine Research" />
      </Helmet>

      {/* ─── Hero Section ──────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-800 via-primary-600 to-primary-500 px-4 py-24 text-white sm:px-6 sm:py-32">
        {/* Decorative blurred circles */}
        <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-white/5 blur-3xl" />

        <div className="relative mx-auto max-w-4xl text-center">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl"
          >
            SAEM 2026 AI Consensus Conference
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mx-auto mt-6 max-w-2xl text-lg font-medium text-primary-100 sm:text-xl"
          >
            Artificial Intelligence and Emergency Medicine: Technology, Training, Self, and Society
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.45 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-3"
          >
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-1.5 text-sm font-semibold text-white backdrop-blur-sm">
              <Sparkles className="h-4 w-4" />
              May 21, 2026 &middot; SAEM Annual Meeting
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-1.5 text-sm font-semibold text-white backdrop-blur-sm">
              <FileText className="h-4 w-4" />
              Modified Delphi Method
            </span>
          </motion.div>
        </div>
      </section>

      {/* ─── About Section ─────────────────────────────────────── */}
      <section className="bg-white px-4 py-20 sm:px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={fadeUp}
          className="mx-auto max-w-3xl"
        >
          <h2 className="text-3xl font-bold text-gray-900">About This Conference</h2>
          <div className="mt-6 space-y-5 text-base leading-relaxed text-gray-600">
            <p>
              The Society for Academic Emergency Medicine (SAEM) has convened this
              consensus conference to develop a <strong className="text-gray-800">10-year
              research agenda for artificial intelligence in emergency medicine</strong>.
              As AI systems rapidly advance from decision-support tools to autonomous
              agents, the emergency medicine community needs a shared roadmap to guide
              investigation, education, and policy.
            </p>
            <p>
              Five working groups of domain experts are using a{' '}
              <strong className="text-gray-800">modified Delphi method</strong> &mdash;
              combining iterative surveys, pairwise comparison ranking, and AI-assisted
              synthesis &mdash; to identify and prioritize the most important research
              questions spanning technology, training, clinician cognition, and societal
              impact.
            </p>
            <p>
              The conference is co-chaired by{' '}
              <strong className="text-gray-800">R. Andrew Taylor, MD, MHS</strong> (Yale
              University) and{' '}
              <strong className="text-gray-800">Jeremiah S. Hinson, MD, PhD</strong>{' '}
              (Johns Hopkins University), with support from SAEM, CORD, and the
              University of Virginia.
            </p>
          </div>
        </motion.div>
      </section>

      {/* ─── Process Steps ─────────────────────────────────────── */}
      <section className="bg-gray-50 px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={fadeUp}
            className="text-center text-3xl font-bold text-gray-900"
          >
            Our Process
          </motion.h2>
          <motion.p
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={fadeUp}
            custom={1}
            className="mx-auto mt-3 max-w-xl text-center text-gray-500"
          >
            A rigorous, multi-stage consensus-building methodology
          </motion.p>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={staggerContainer}
            className="mt-14 grid gap-8 md:grid-cols-3"
          >
            {STEPS.map((step, idx) => (
              <motion.div key={step.label} variants={staggerLeft} className="relative flex flex-col items-center text-center">
                {/* Connector line (hidden on mobile, shown on md+) */}
                {idx < STEPS.length - 1 && (
                  <div className="pointer-events-none absolute left-[calc(50%+2.5rem)] top-8 hidden h-0.5 w-[calc(100%-5rem)] bg-gradient-to-r from-primary-300 to-primary-200 md:block">
                    <ArrowRight className="absolute -right-2.5 -top-2 h-5 w-5 text-primary-400" />
                  </div>
                )}

                {/* Step number + icon circle */}
                <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/25">
                  <step.icon className="h-7 w-7" />
                  <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-bold text-primary-600 shadow">
                    {idx + 1}
                  </span>
                </div>

                <h3 className="mt-5 text-lg font-semibold text-gray-900">{step.label}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">{step.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── Four Pillars ──────────────────────────────────────── */}
      <section className="bg-white px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={fadeUp}
            className="text-center text-3xl font-bold text-gray-900"
          >
            Four Pillars of AI in Emergency Medicine
          </motion.h2>
          <motion.p
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={fadeUp}
            custom={1}
            className="mx-auto mt-3 max-w-xl text-center text-gray-500"
          >
            Our research agenda spans four interconnected domains
          </motion.p>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={staggerContainer}
            className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
          >
            {PILLARS.map((pillar) => (
              <motion.div key={pillar.name} variants={staggerItem}>
                <Card className={`h-full border-t-4 ${pillar.border}`}>
                  <CardContent className="pt-6">
                    <div className={`inline-flex rounded-xl p-3 ${pillar.bg}`}>
                      <pillar.icon className={`h-6 w-6 ${pillar.iconColor}`} />
                    </div>
                    <h3 className="mt-4 text-lg font-bold text-gray-900">{pillar.name}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-gray-500">
                      {pillar.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── Working Groups ────────────────────────────────────── */}
      <section className="bg-gray-50 px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={fadeUp}
            className="text-center text-3xl font-bold text-gray-900"
          >
            Working Groups
          </motion.h2>
          <motion.p
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={fadeUp}
            custom={1}
            className="mx-auto mt-3 max-w-xl text-center text-gray-500"
          >
            Five expert groups driving the consensus process
          </motion.p>

          <div className="mt-12">
            {loadingWG ? (
              <WGSkeletons />
            ) : errorWG ? (
              <Card className="border-danger-light">
                <CardContent className="py-10 text-center text-gray-500">
                  <p className="text-sm">Unable to load working groups. Please try again later.</p>
                </CardContent>
              </Card>
            ) : (
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-40px' }}
                variants={staggerContainer}
                className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
              >
                {workingGroups.map((wg) => {
                  const pillarColor = PILLAR_COLORS[wg.pillar] || 'border-l-primary-500';
                  const badgeVariant = PILLAR_BADGE_VARIANT[wg.pillar] || 'default';
                  return (
                    <motion.div key={wg.wg_number} variants={staggerItem}>
                      <Card className={`h-full border-l-4 ${pillarColor}`}>
                        <CardContent className="flex h-full flex-col">
                          <div className="flex items-start justify-between">
                            <Badge variant={badgeVariant}>WG {wg.wg_number}</Badge>
                            {wg.pillar && (
                              <span className="text-xs font-medium text-gray-400">{wg.pillar}</span>
                            )}
                          </div>
                          <h3 className="mt-3 text-base font-semibold text-gray-900 leading-snug">
                            {wg.name}
                          </h3>
                          {wg.description && (
                            <p className="mt-2 text-sm leading-relaxed text-gray-500 line-clamp-2">
                              {wg.description}
                            </p>
                          )}

                          {/* Stats row */}
                          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                            {wg.question_count != null && (
                              <span className="flex items-center gap-1">
                                <ClipboardList className="h-3.5 w-3.5" />
                                {wg.question_count} questions
                              </span>
                            )}
                            {wg.confirmed_count != null && (
                              <span className="flex items-center gap-1">
                                <UserCheck className="h-3.5 w-3.5" />
                                {wg.confirmed_count} confirmed
                              </span>
                            )}
                            {wg.r1_participants != null && (
                              <span className="flex items-center gap-1">
                                <BarChart3 className="h-3.5 w-3.5" />
                                {wg.r1_participants} R1
                              </span>
                            )}
                          </div>

                          {/* Action buttons */}
                          <div className="mt-auto flex flex-wrap gap-2 pt-4">
                            <Link to={`/survey/${wg.wg_number}/round1`}>
                              <Button variant="secondary" size="sm">
                                Round 1
                                <ChevronRight className="h-3.5 w-3.5" />
                              </Button>
                            </Link>
                            <Link to={`/survey/${wg.wg_number}/round2`}>
                              <Button variant="secondary" size="sm">
                                Round 2
                                <ChevronRight className="h-3.5 w-3.5" />
                              </Button>
                            </Link>
                            <Link to={`/rank/${wg.wg_number}`}>
                              <Button variant="secondary" size="sm">
                                Pairwise
                                <ChevronRight className="h-3.5 w-3.5" />
                              </Button>
                            </Link>
                            <Link to={`/results/${wg.wg_number}`}>
                              <Button variant="ghost" size="sm">
                                Results
                                <ChevronRight className="h-3.5 w-3.5" />
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

      {/* ─── Active Sessions / Conference Day ──────────────────── */}
      <section className="bg-white px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={fadeUp}
            className="text-center text-3xl font-bold text-gray-900"
          >
            Conference Day Voting
          </motion.h2>

          <div className="mt-10">
            {loadingSessions ? (
              <div className="flex flex-col items-center gap-3">
                <Skeleton className="h-24 w-full max-w-md" />
              </div>
            ) : errorSessions ? (
              <Card>
                <CardContent className="py-10 text-center text-gray-500">
                  <p className="text-sm">Unable to load sessions.</p>
                </CardContent>
              </Card>
            ) : sessions.length > 0 ? (
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={staggerContainer}
                className="grid gap-4 sm:grid-cols-2"
              >
                {sessions.map((session) => (
                  <motion.div key={session.id} variants={staggerItem}>
                    <Link to={`/vote/${session.id}`}>
                      <Card className="group cursor-pointer border-emerald-200 transition-all hover:border-emerald-300 hover:shadow-lg">
                        <CardContent className="flex items-center gap-4">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                            <Radio className="h-6 w-6" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="truncate text-base font-semibold text-gray-900">
                                {session.title || `Session ${session.id}`}
                              </h3>
                              <Badge variant="live">
                                <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                LIVE
                              </Badge>
                            </div>
                            {session.description && (
                              <p className="mt-0.5 truncate text-sm text-gray-500">
                                {session.description}
                              </p>
                            )}
                          </div>
                          <ChevronRight className="h-5 w-5 shrink-0 text-gray-300 transition group-hover:text-gray-500" />
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
                variants={fadeUp}
              >
                <Card>
                  <CardContent className="flex flex-col items-center py-14 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
                      <Radio className="h-7 w-7" />
                    </div>
                    <h3 className="mt-4 text-base font-semibold text-gray-700">
                      No active voting sessions
                    </h3>
                    <p className="mt-1.5 max-w-xs text-sm text-gray-400">
                      Live voting sessions will appear here on conference day, May 21, 2026.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
