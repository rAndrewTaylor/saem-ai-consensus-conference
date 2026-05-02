import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import {
  ArrowRight, Network, Sparkles, Layers, Tag, BarChart3,
  AlertCircle, Loader2, Lock, Download,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { api, downloadFile, getAdminToken, getAnyParticipantToken } from '@/lib/api';
import { usePageTitle } from '@/hooks/usePageTitle';

const FIGURE_BASE = '/api/admin/reports/round1/figure';

// Wrap a figure as a self-contained image card with auth + caching.
function FigureCard({ name, label, description, query = '' }) {
  const [src, setSrc] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let blobUrl = null;
    setLoading(true); setError(null); setSrc(null);
    (async () => {
      const token = getAdminToken() || getAnyParticipantToken();
      if (!token) { setError('Sign in required'); setLoading(false); return; }
      try {
        const res = await fetch(`${FIGURE_BASE}/${name}.png${query}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!res.ok) {
          const text = await res.text();
          let msg = `Error ${res.status}`;
          try { msg = JSON.parse(text).detail || msg; } catch {}
          throw new Error(msg);
        }
        const blob = await res.blob();
        blobUrl = URL.createObjectURL(blob);
        setSrc(blobUrl);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
    return () => { if (blobUrl) URL.revokeObjectURL(blobUrl); };
  }, [name, query]);

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0E1E35] p-4">
      <div className="mb-2">
        <h3 className="text-sm font-semibold text-white/85">{label}</h3>
        {description && (
          <p className="mt-0.5 text-xs text-white/50">{description}</p>
        )}
      </div>
      <div className="relative min-h-[200px] flex items-center justify-center rounded-lg bg-white">
        {loading && (
          <div className="flex flex-col items-center text-slate-500">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="mt-2 text-xs">Rendering…</p>
          </div>
        )}
        {error && (
          <div className="flex flex-col items-center p-6 text-center">
            <AlertCircle className="h-6 w-6 text-red-500" />
            <p className="mt-2 text-xs text-red-700">{error}</p>
          </div>
        )}
        {src && (
          <img src={src} alt={label} className="w-full h-auto" />
        )}
      </div>
    </div>
  );
}

export function Round1ReportPage() {
  usePageTitle('Round 1 Report');
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadingDocx, setDownloadingDocx] = useState(false);

  const isAdmin = !!getAdminToken();

  useEffect(() => {
    setLoading(true);
    api('/api/admin/reports/round1/data')
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleDownloadDocx = async () => {
    setDownloadingDocx(true);
    try {
      await downloadFile('/api/admin/reports/round1', 'Round_1_Report.docx');
      toast({ message: 'Report downloaded', type: 'success' });
    } catch (err) {
      toast({ message: err.message || 'Download failed', type: 'error' });
    } finally {
      setDownloadingDocx(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <Skeleton className="h-8 w-72" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (error) {
    const isAuth = error.includes('401') || error.toLowerCase().includes('authoriz');
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400">
          <Lock className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-bold text-white">
          {isAuth ? 'Sign in required' : 'Could not load report'}
        </h1>
        <p className="mt-3 text-sm text-white/60">{error}</p>
        <Link to="/join" className="mt-6 inline-block">
          <Button variant="secondary" size="sm">Sign in</Button>
        </Link>
      </div>
    );
  }

  const overall = data?.overall || {};
  const wgs = data?.working_groups || [];

  return (
    <div className="flex flex-col bg-[#0A1628]">
      <Helmet>
        <meta name="description" content="SAEM 2026 AI Consensus — Round 1 Report" />
      </Helmet>

      {/* Hero */}
      <div className="relative overflow-hidden px-4 py-12 sm:px-6">
        <div className="pointer-events-none absolute -top-32 left-1/2 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-b from-[#1B5E8A]/10 to-transparent blur-3xl" />
        <div className="relative mx-auto max-w-5xl">
          <Badge variant="primary" className="mb-3">Round 1 Inter-Round Report</Badge>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            What Round 1 surfaced
          </h1>
          <p className="mt-2 max-w-3xl text-white/55">
            Modified Delphi · pairwise comparison · AI synthesis. Snapshot at{' '}
            {overall.snapshot_at?.replace('T', ' ').slice(0, 19)} UTC.
          </p>
          <p className="mt-3 inline-block rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-[11px] font-medium text-amber-300">
            Pre-publication — SAEM 2026 working draft, do not distribute
          </p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-5xl px-4 pb-16 sm:px-6">

        {/* Overview cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <OverviewStat label="Active questions" value={overall.n_questions_total} />
          <OverviewStat label="Confirmed" value={overall.n_confirmed_total} accent="emerald" />
          <OverviewStat label="Gray-zone" value={overall.n_gray_total} accent="slate" />
          <OverviewStat label="Removed" value={overall.n_removed_total} accent="red" />
          <OverviewStat label="Members responded" value={overall.n_r1_responders_total} sub={`/ ${overall.n_invited_total}`} />
          <OverviewStat label="R1 ratings" value={overall.n_r1_responses_total} />
          <OverviewStat label="Pairwise votes" value={overall.n_pairwise_votes_total} />
          <OverviewStat
            label="Delphi × pairwise ρ"
            value={overall.spearman_rho_delphi_pairwise_overall?.toFixed(2) ?? '—'}
            accent="cyan"
          />
        </div>

        {/* Per-WG quick links */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-cyan-400" />
              Working group results (per-WG figures)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {wgs.map((w) => (
                <Link key={w.wg_id} to={`/results/${w.wg_number}`}
                      className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 transition hover:border-white/[0.15] hover:bg-white/[0.05]">
                  <div className="flex items-center justify-between">
                    <Badge variant="primary" className="text-[10px]">WG {w.wg_number}</Badge>
                    <ArrowRight className="h-3.5 w-3.5 text-white/30 transition group-hover:translate-x-0.5 group-hover:text-white/70" />
                  </div>
                  <p className="mt-2 text-sm font-medium text-white/85">{w.short_name}</p>
                  <div className="mt-2 grid grid-cols-3 gap-1 text-[10px] text-white/45">
                    <span><strong className="text-emerald-300">{w.n_confirmed}</strong> conf.</span>
                    <span><strong className="text-amber-300">{w.n_gray}</strong> gray</span>
                    <span><strong className="text-red-300">{w.n_removed}</strong> rem.</span>
                  </div>
                  <div className="mt-1 text-[10px] text-white/40">
                    {w.n_r1_responses} R1 ratings · {w.n_pairwise_votes} pairwise
                    {w.pairwise_low_confidence && (
                      <span className="ml-1 text-amber-300"> · low PW conf</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Cross-WG analysis */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network className="h-4 w-4 text-purple-400" />
              Cross-WG analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              <FigureCard
                name="F6"
                label="D.1 Question similarity network"
                description="Force-directed graph. Cross-WG edges in red are the candidate overlap pairs."
              />
              <FigureCard
                name="F7"
                label="D.3 Thematic clusters across the agenda"
                description="Hierarchical clustering, stacked by working-group composition. Labels generated by Claude Opus."
              />
              <div className="grid gap-5 lg:grid-cols-2">
                <FigureCard
                  name="F8"
                  label="D.4 Pillar coverage"
                  description="Question count per pillar × WG. (n×) = cross-cutting questions."
                />
                <FigureCard
                  name="F9"
                  label="D.5 Cross-cutting topics"
                  description="Distribution of cross-cutting topic tags across WGs."
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Admin DOCX action */}
        {isAdmin && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-4 w-4 text-cyan-400" />
                Full DOCX (admin only)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-white/55 mb-3">
                The Word version contains the same figures plus the Section A/B
                tables, Opus-written interpretive openers per WG, the cross-WG
                overlap pairs table, and the per-respondent disposition heatmap
                (admin/co-lead view).
              </p>
              <Button size="sm" loading={downloadingDocx} onClick={handleDownloadDocx}>
                <Download className="h-3.5 w-3.5" />
                Download Round 1 DOCX
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}


function OverviewStat({ label, value, sub, accent = 'default' }) {
  const colorMap = {
    emerald: 'text-emerald-300',
    red: 'text-red-300',
    slate: 'text-slate-300',
    cyan: 'text-cyan-300',
    default: 'text-white',
  };
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
      <p className="text-[10px] uppercase tracking-wider text-white/40">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${colorMap[accent]}`}>
        {value ?? '—'}
        {sub && <span className="ml-1 text-sm text-white/40 font-normal">{sub}</span>}
      </p>
    </div>
  );
}
