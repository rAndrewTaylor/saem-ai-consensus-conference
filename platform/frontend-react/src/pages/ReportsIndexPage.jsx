/**
 * /reports — picker between the Round 1 and Round 2 report pages.
 * Linked from the Welcome tile grid, replacing the two previously-
 * separate Round 1 / Round 2 tiles.
 */

import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FileBarChart, ArrowRight, ChevronLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { usePageTitle } from '@/hooks/usePageTitle';

const REPORTS = [
  {
    to: '/reports/round1',
    eyebrow: 'Round 1',
    title: 'Round 1 Report',
    desc:
      'Survey results, themes, and overlap pairs across all five working groups — the raw signal coming out of the first Delphi pass.',
    tone: 'purple',
  },
  {
    to: '/reports/round2',
    eyebrow: 'Round 2',
    title: 'Round 2 Report',
    desc:
      'Deliberation shifts, pairwise leaderboard, and what survived the revise pass. The basis for the conference-day question slate.',
    tone: 'cyan',
  },
];

const TONE_STYLES = {
  purple: { bg: 'rgba(139, 92, 246, 0.08)', border: 'rgba(167, 139, 250, 0.25)', iconColor: '#A78BFA' },
  cyan:   { bg: 'rgba(0, 180, 216, 0.08)',  border: 'rgba(72, 202, 228, 0.25)',  iconColor: '#48CAE4' },
};

export function ReportsIndexPage() {
  usePageTitle('Reports');
  return (
    <div className="min-h-[80vh] bg-[#0A1628] px-4 py-12 text-white sm:px-6">
      <Helmet>
        <title>SAEM 2026 — Round Reports</title>
      </Helmet>
      <div className="mx-auto max-w-4xl">
        <Link
          to="/welcome"
          className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-500/[0.08] px-3 py-2 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/[0.16] hover:text-cyan-100"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Welcome
        </Link>

        <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Round reports
        </h1>
        <p className="mt-2 max-w-2xl text-base text-white/55">
          Results from the two Delphi rounds that produced the conference-day question slate.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {REPORTS.map((r) => (
            <ReportCard key={r.to} {...r} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ReportCard({ to, eyebrow, title, desc, tone }) {
  const s = TONE_STYLES[tone] || TONE_STYLES.cyan;
  return (
    <Link to={to} className="group block">
      <Card
        className="relative h-full transition-all hover:scale-[1.02] hover:shadow-lg"
        style={{ borderColor: s.border, background: s.bg }}
      >
        <CardContent className="flex h-full flex-col p-6">
          <div className="flex items-start justify-between">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${s.iconColor}1F`, color: s.iconColor }}
            >
              <FileBarChart className="h-5 w-5" />
            </div>
            <span
              className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
              style={{ backgroundColor: `${s.iconColor}1F`, color: s.iconColor }}
            >
              {eyebrow}
            </span>
          </div>
          <h2 className="mt-5 text-xl font-bold text-white">{title}</h2>
          <p className="mt-2 flex-1 text-sm text-white/55">{desc}</p>
          <div className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-white/55 transition group-hover:text-white/85">
            Open report <ArrowRight className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default ReportsIndexPage;
