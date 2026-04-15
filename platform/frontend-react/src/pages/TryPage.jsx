import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import {
  Sparkles, User, UserPlus, ArrowRight, Users, Beaker, CheckCircle2, Loader2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { api, setToken } from '@/lib/api';
import { usePageTitle } from '@/hooks/usePageTitle';

export function TryPage() {
  usePageTitle('Try the platform');
  const navigate = useNavigate();
  const toast = useToast();

  const [personas, setPersonas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Tester form
  const [testerName, setTesterName] = useState('');
  const [testerWg, setTesterWg] = useState('1');
  const [creatingTester, setCreatingTester] = useState(false);

  const [pickedToken, setPickedToken] = useState(null);

  useEffect(() => {
    let cancelled = false;

    api('/api/participants/demo/personas')
      .then((data) => {
        if (cancelled) return;
        setPersonas(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err.message || 'Could not load demo data');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  const personasByWg = useMemo(() => {
    const groups = {};
    for (const p of personas) {
      if (!p.wg_number) continue;
      (groups[p.wg_number] ||= []).push(p);
    }
    return groups;
  }, [personas]);

  const pickPersona = (persona) => {
    setPickedToken(persona.token);
    setToken(persona.wg_number, persona.token);
    toast({ message: `Signed in as ${persona.name}`, type: 'success' });
    setTimeout(() => navigate(`/wg/${persona.wg_number}`), 400);
  };

  const createTester = async () => {
    if (!testerName.trim()) {
      toast({ message: 'Enter your name to continue', type: 'error' });
      return;
    }
    setCreatingTester(true);
    try {
      const data = await api('/api/participants/demo/tester', {
        method: 'POST',
        body: { name: testerName.trim(), wg_number: Number(testerWg) },
      });
      setToken(data.wg_number, data.token);
      toast({ message: `Signed in as ${data.name}`, type: 'success' });
      navigate(`/wg/${data.wg_number}`);
    } catch (err) {
      toast({ message: err.message || 'Failed to create tester', type: 'error' });
    } finally {
      setCreatingTester(false);
    }
  };

  const hasPersonas = personas.length > 0;

  return (
    <div className="flex flex-col bg-[#13111C]">
      <Helmet>
        <meta name="description" content="Try the SAEM AI Consensus platform — pick a demo persona or create a test account to walk through the experience." />
      </Helmet>

      {/* ─── Hero ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-4 py-16 sm:px-6 lg:py-20">
        <div className="pointer-events-none absolute -top-32 left-1/2 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-b from-amber-500/10 to-transparent blur-3xl" />
        <div className="relative mx-auto max-w-4xl text-center">
          <Badge variant="warning" className="mb-4 gap-1.5">
            <Beaker className="h-3.5 w-3.5" />
            Testing mode
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Try the platform
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-white/60 sm:text-lg">
            This is a preview environment with synthetic questions and participants.
            Pick an existing persona or create a quick test account to walk through every screen.
          </p>
          <p className="mt-3 text-xs text-white/40">
            Data you create here is tagged as test data and will be cleared before real participants are invited.
          </p>
        </div>
      </section>

      <div className="mx-auto w-full max-w-5xl px-4 pb-20 sm:px-6">
        {/* ─── Option 1: Create your own tester account ─────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card>
            <CardContent className="p-6 sm:p-8">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/15 text-purple-400">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-white">Create a tester account</h2>
                  <p className="mt-1 text-sm text-white/50">
                    Enter your name and pick a working group. Your survey responses and votes will appear alongside the demo data.
                  </p>

                  <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
                    <input
                      type="text"
                      value={testerName}
                      onChange={(e) => setTesterName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && createTester()}
                      placeholder="Your name (e.g. Dr. Jane Doe)"
                      className="rounded-lg border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-purple-400/50 focus:ring-2 focus:ring-purple-500/20"
                    />
                    <select
                      value={testerWg}
                      onChange={(e) => setTesterWg(e.target.value)}
                      className="rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-2.5 text-sm text-white/80 outline-none focus:border-purple-400/50 focus:ring-2 focus:ring-purple-500/20"
                    >
                      <option value="1">WG 1 · Clinical Practice</option>
                      <option value="2">WG 2 · Infrastructure &amp; Data</option>
                      <option value="3">WG 3 · Education &amp; Training</option>
                      <option value="4">WG 4 · Human-AI Interaction</option>
                      <option value="5">WG 5 · Ethics &amp; Legal</option>
                    </select>
                    <Button onClick={createTester} loading={creatingTester} className="gap-1.5">
                      Start testing
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ─── Divider ─────────────────────────────────────────── */}
        <div className="my-10 flex items-center gap-4">
          <div className="h-px flex-1 bg-white/[0.06]" />
          <span className="text-xs font-semibold uppercase tracking-widest text-white/30">or</span>
          <div className="h-px flex-1 bg-white/[0.06]" />
        </div>

        {/* ─── Option 2: Step into a pre-loaded persona ─────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <div className="flex items-start gap-3 mb-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Step into a demo persona</h2>
              <p className="mt-1 text-sm text-white/50">
                40 synthetic experts are pre-loaded with realistic response histories. Click any persona to see the platform from their view.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : loadError ? (
            <Card className="border-red-400/30 bg-red-500/5">
              <CardContent className="py-8 text-center">
                <p className="text-sm text-red-300">Could not load demo data: {loadError}</p>
                <p className="mt-2 text-xs text-white/40">Try refreshing the page.</p>
              </CardContent>
            </Card>
          ) : !hasPersonas ? (
            <Card>
              <CardContent className="py-10 text-center">
                <Sparkles className="mx-auto mb-3 h-8 w-8 text-white/20" />
                <p className="text-sm text-white/50">No demo personas available yet.</p>
                <p className="mt-1 text-xs text-white/30">
                  An admin can load demo data from the Dashboard.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {[1, 2, 3, 4, 5].map((wgNum) => {
                const wgPersonas = personasByWg[wgNum] || [];
                if (wgPersonas.length === 0) return null;
                const wgName = wgPersonas[0]?.wg_short_name || `WG ${wgNum}`;
                return (
                  <div key={wgNum}>
                    <div className="mb-2 flex items-center gap-2">
                      <Badge variant="primary" className="text-xs">WG {wgNum}</Badge>
                      <span className="text-sm font-semibold text-white/70">{wgName}</span>
                      <span className="text-xs text-white/30">
                        &middot; {wgPersonas.length} persona{wgPersonas.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      {wgPersonas.map((p) => {
                        const isSelected = pickedToken === p.token;
                        return (
                          <button
                            key={p.token}
                            onClick={() => pickPersona(p)}
                            className={`group flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-all ${
                              isSelected
                                ? 'border-emerald-400/50 bg-emerald-500/10'
                                : 'border-white/[0.06] bg-[#1C1A2E] hover:border-purple-400/40 hover:bg-[#252340]'
                            }`}
                          >
                            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                              isSelected ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/[0.06] text-white/50 group-hover:bg-purple-500/15 group-hover:text-purple-300'
                            }`}>
                              {isSelected ? <CheckCircle2 className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-white/90">{p.name}</p>
                              {p.claimed && (
                                <p className="text-[10px] text-white/30">has responses</p>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* ─── Footer note ─────────────────────────────────────── */}
        <div className="mt-14 text-center text-xs text-white/40">
          <Link to="/" className="hover:text-white/70 transition">Back to home</Link>
          {' · '}
          <span>Admins can clear all test data from the Dashboard before real rollout.</span>
        </div>
      </div>
    </div>
  );
}
