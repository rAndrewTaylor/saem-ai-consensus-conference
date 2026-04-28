import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Crown, Users, UserCheck, ClipboardList, GitCompare, MessageSquare,
  TrendingUp, AlertCircle, Lightbulb, CheckCircle2, ArrowRight, LogOut,
  FileText, BarChart3, Cpu, GraduationCap, Brain, Scale, Sparkles,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { api, getLeadToken, clearLeadToken } from '@/lib/api';
import { usePageTitle } from '@/hooks/usePageTitle';

const PILLAR_ICONS = {
  Technology: Cpu,
  Training: GraduationCap,
  Self: Brain,
  Society: Scale,
};

function StatCard({ icon: Icon, label, value, hint, tone = 'default' }) {
  const toneClasses = {
    default: 'bg-white/[0.06] text-white/60',
    primary: 'bg-purple-500/15 text-purple-400',
    success: 'bg-emerald-500/15 text-emerald-400',
    warning: 'bg-amber-500/15 text-amber-400',
  }[tone] || 'bg-white/[0.06] text-white/60';
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-4">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${toneClasses}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-medium text-white/40">{label}</p>
          <p className="text-2xl font-bold tabular-nums text-white">{value}</p>
          {hint && <p className="text-[11px] text-white/30">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export function LeadDashboardPage() {
  const navigate = useNavigate();
  usePageTitle('Co-Lead Dashboard');

  const [token] = useState(getLeadToken());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) {
      setError('not-signed-in');
      setLoading(false);
      return;
    }
    api('/api/co-leads/wg-summary', { params: { token } })
      .then(setData)
      .catch((err) => setError(err.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, [token]);

  const signOut = () => {
    clearLeadToken();
    navigate('/');
  };

  if (!token || error === 'not-signed-in') {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400">
          <Crown className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold text-white">Co-Lead Dashboard</h1>
        <p className="mt-2 text-sm text-white/50">
          You need a co-lead invite link to access this dashboard. Check your Slack or email for a link from the chair, or contact the chair to request one.
        </p>
        <Link to="/" className="mt-6 inline-block">
          <Button variant="secondary">Back to home</Button>
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <Skeleton className="h-10 w-64 mb-6" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
        <AlertCircle className="mx-auto mb-4 h-10 w-10 text-red-400" />
        <h1 className="text-xl font-bold text-white">Could not load dashboard</h1>
        <p className="mt-2 text-sm text-white/50">{error}</p>
        <Button className="mt-6" variant="secondary" onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  const { co_lead, wg, co_leads, questions, participants, activity, suggestions } = data;
  const PillarIcon = PILLAR_ICONS[wg.pillar] || Sparkles;

  return (
    <div className="flex flex-col bg-[#0A1628]">
      {/* ─── Hero ──────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-4 pt-10 pb-8 sm:px-6">
        <div className="pointer-events-none absolute -top-32 left-1/2 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-b from-amber-500/10 to-transparent blur-3xl" />
        <div className="relative mx-auto max-w-7xl">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="warning" className="gap-1">
                  <Crown className="h-3 w-3" />
                  Co-Lead
                </Badge>
                <Badge variant="primary">WG {wg.number}</Badge>
                {wg.pillar && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-white/50">
                    <PillarIcon className="h-3.5 w-3.5" />
                    {wg.pillar}
                  </span>
                )}
              </div>
              <h1 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {wg.name}
              </h1>
              <p className="mt-1 text-sm text-white/50">Signed in as {co_lead.name}</p>
            </div>
            <div className="flex gap-2">
              <Link to={`/wg/${wg.number}`}>
                <Button variant="secondary" size="sm">
                  Public WG page
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={signOut}>
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6">
        {/* ─── Stats ──────────────────────────────────────── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={ClipboardList}
            label="Questions"
            value={questions.total}
            hint={`${questions.by_status.confirmed || 0} confirmed · ${questions.by_status.active || 0} active`}
            tone="primary"
          />
          <StatCard
            icon={Users}
            label="Participants"
            value={participants.named}
            hint={`${participants.claimed} claimed · ${participants.total} total`}
            tone="success"
          />
          <StatCard
            icon={TrendingUp}
            label="Round 1 responses"
            value={activity.r1_responses}
            hint={`from ${activity.r1_unique_participants} experts`}
          />
          <StatCard
            icon={GitCompare}
            label="Pairwise votes"
            value={activity.pairwise_votes}
            hint={`from ${activity.pairwise_participants} experts`}
            tone="warning"
          />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {/* ─── Top questions ─────────────────────────────── */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-purple-400" />
                  Your questions
                  <Badge variant="default" className="ml-2">{questions.total}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {questions.top.length === 0 ? (
                  <p className="px-6 py-10 text-center text-sm text-white/40">No questions yet.</p>
                ) : (
                  <div className="max-h-[480px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-[#0E1E35] z-10">
                        <tr className="border-b border-white/[0.06] text-xs uppercase tracking-wider text-white/40">
                          <th className="px-6 py-3 font-medium">Question</th>
                          <th className="px-3 py-3 text-center font-medium">Status</th>
                          <th className="px-3 py-3 text-right font-medium">Include %</th>
                          <th className="px-3 py-3 text-right font-medium">Importance</th>
                          <th className="px-3 py-3 text-right font-medium">Pairwise</th>
                        </tr>
                      </thead>
                      <tbody>
                        {questions.top.map((q) => (
                          <tr key={q.id} className="border-b border-white/[0.04] transition-colors hover:bg-white/[0.03]">
                            <td className="px-6 py-3 text-white/80">
                              <p className="line-clamp-2">{q.text}</p>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <Badge
                                variant={q.status === 'confirmed' ? 'success' : q.status === 'removed' ? 'danger' : 'default'}
                                className="text-[10px]"
                              >
                                {q.status}
                              </Badge>
                            </td>
                            <td className="px-3 py-3 text-right font-mono text-xs">
                              {q.r1_include_pct != null ? (
                                <span className={q.r1_include_pct >= 80 ? 'text-emerald-400' : q.r1_include_pct <= 20 ? 'text-red-400' : 'text-white/70'}>
                                  {Number(q.r1_include_pct).toFixed(0)}%
                                </span>
                              ) : <span className="text-white/20">—</span>}
                            </td>
                            <td className="px-3 py-3 text-right font-mono text-xs text-white/70">
                              {q.r1_importance_mean != null ? Number(q.r1_importance_mean).toFixed(1) : '—'}
                            </td>
                            <td className="px-3 py-3 text-right font-mono text-xs">
                              {q.pairwise_score != null ? (
                                <span className="text-purple-400">{Number(q.pairwise_score).toFixed(0)}</span>
                              ) : <span className="text-white/20">—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ─── Co-leads sidebar ─────────────────────────── */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <UserCheck className="h-4 w-4 text-emerald-400" />
                  Your co-leads
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 py-4">
                {co_leads.map((c, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-white">{c.name}</p>
                      {c.institution && <p className="text-xs text-white/40">{c.institution}</p>}
                    </div>
                    {c.claimed ? (
                      <Badge variant="success" className="gap-1 text-[10px]">
                        <CheckCircle2 className="h-2.5 w-2.5" />
                        Signed in
                      </Badge>
                    ) : (
                      <Badge variant="default" className="text-[10px]">Pending</Badge>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="h-4 w-4 text-white/60" />
                    Scope
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-4">
                  <p className="text-sm leading-relaxed text-white/60">{wg.scope || 'No scope set'}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* ─── Participant roster ─────────────────────────── */}
        {participants.roster && participants.roster.length > 0 && (
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-[#00B4D8]" />
                  Member progress
                  <Badge variant="default" className="ml-2">{participants.roster.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.06] text-xs uppercase tracking-wider text-white/40">
                        <th className="px-5 py-3 text-left font-medium">Name</th>
                        <th className="px-3 py-3 text-left font-medium">Email</th>
                        <th className="px-3 py-3 text-center font-medium">Round 1</th>
                        <th className="px-3 py-3 text-center font-medium">Pairwise</th>
                        <th className="px-3 py-3 text-center font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {participants.roster.map((p) => (
                        <tr key={p.id} className="border-b border-white/[0.04] transition-colors hover:bg-white/[0.02]">
                          <td className="px-5 py-3 font-medium text-white/90">{p.name || 'Anonymous'}</td>
                          <td className="px-3 py-3 text-xs text-white/50">{p.email || '—'}</td>
                          <td className="px-3 py-3 text-center">
                            <span className={`font-mono text-xs font-semibold ${p.r1_complete ? 'text-emerald-400' : 'text-white/60'}`}>
                              {p.r1_answered}/{p.r1_total}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className={`font-mono text-xs font-semibold ${p.pairwise_complete ? 'text-emerald-400' : 'text-white/60'}`}>
                              {p.pairwise_count}/50
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            {p.r1_complete && p.pairwise_complete ? (
                              <Badge variant="success" className="gap-1 text-[10px]">
                                <CheckCircle2 className="h-2.5 w-2.5" />
                                Done
                              </Badge>
                            ) : p.r1_complete ? (
                              <Badge variant="warning" className="text-[10px]">Needs pairwise</Badge>
                            ) : p.r1_answered > 0 ? (
                              <Badge variant="default" className="text-[10px]">In progress</Badge>
                            ) : (
                              <Badge variant="danger" className="text-[10px]">Not started</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ─── Suggestions queue ─────────────────────────── */}
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-amber-400" />
                Delphi suggestions
                <Badge variant="default" className="ml-2">{suggestions.delphi.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-4">
              {suggestions.delphi.length === 0 ? (
                <p className="py-8 text-center text-sm text-white/40">No new question suggestions yet.</p>
              ) : (
                suggestions.delphi.map((s) => (
                  <div key={s.id} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                    <p className="text-sm text-white/85">{s.text}</p>
                    {s.general_comment && (
                      <p className="mt-1 text-xs text-white/40 italic">{s.general_comment}</p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px]">
                      {s.round && <Badge variant="primary" className="text-[10px]">{s.round.replace('_', ' ')}</Badge>}
                      {s.ai_category && <Badge variant="default" className="text-[10px]">AI: {s.ai_category}</Badge>}
                      {s.human_decision && s.human_decision !== 'pending' && (
                        <Badge variant={s.human_decision === 'accepted' ? 'success' : 'danger'} className="text-[10px]">
                          {s.human_decision}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-purple-400" />
                Pairwise suggestions
                <Badge variant="default" className="ml-2">{suggestions.pairwise.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-4">
              {suggestions.pairwise.length === 0 ? (
                <p className="py-8 text-center text-sm text-white/40">No pairwise suggestions yet.</p>
              ) : (
                suggestions.pairwise.map((s) => (
                  <div key={s.id} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                    <p className="text-sm text-white/85">{s.text}</p>
                    {s.approved && (
                      <Badge variant="success" className="mt-2 text-[10px]">Approved</Badge>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
