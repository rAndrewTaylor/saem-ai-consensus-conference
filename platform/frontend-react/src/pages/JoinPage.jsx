import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, ArrowLeft, User, UserCheck, CheckCircle2, ShieldAlert,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { api, setToken } from '@/lib/api';
import { usePageTitle } from '@/hooks/usePageTitle';

const WG_OPTIONS = [
  { number: 1, short: 'Clinical Practice & Operations', pillar: 'Technology' },
  { number: 2, short: 'Infrastructure & Data', pillar: 'Technology' },
  { number: 3, short: 'Education & Training', pillar: 'Training' },
  { number: 4, short: 'Human-AI Interaction', pillar: 'Self' },
  { number: 5, short: 'Ethics & Legal', pillar: 'Society' },
];

const ROLE_OPTIONS = [
  {
    value: 'wg_member',
    label: 'Working Group Member',
    desc: 'Domain expert participating in the Delphi rounds before the conference',
    icon: UserCheck,
  },
  {
    value: 'participant',
    label: 'Conference Participant',
    desc: 'Attend conference day — vote, rank, and help finalize the research agenda',
    icon: User,
  },
];

export function JoinPage() {
  usePageTitle('Join');
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('token');
  const accessToken = searchParams.get('access');

  const [step, setStep] = useState(1); // 1=identity, 2=wg+role
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [wg, setWg] = useState(null);
  const [role, setRole] = useState('participant');
  const [submitting, setSubmitting] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [accessError, setAccessError] = useState(null);
  const isInviteMode = Boolean(inviteToken);
  const isSharedMode = !isInviteMode && Boolean(accessToken);

  useEffect(() => {
    if (!inviteToken && !accessToken) {
      setCheckingAccess(false);
      return;
    }
    if (inviteToken) {
      api('/api/participants/claim', { params: { token: inviteToken } })
        .then((data) => {
          setName(data?.name || '');
          setEmail(data?.email || '');
          setWg(data?.wg_number || null);
        })
        .catch((err) => setAccessError(err.message || 'Invalid invite link'))
        .finally(() => setCheckingAccess(false));
      return;
    }
    api('/api/participants/shared-access/validate', { params: { token: accessToken } })
      .catch((err) => setAccessError(err.message || 'Invalid shared join link'))
      .finally(() => setCheckingAccess(false));
  }, [inviteToken, accessToken]);

  const canGoNext = name.trim().length >= 2 && email.trim().includes('@');
  const canSubmit = (isInviteMode ? wg !== null : wg !== null) && role;

  const handleSubmit = async () => {
    if (!inviteToken && !accessToken) return;
    setSubmitting(true);
    try {
      const data = isInviteMode
        ? await api('/api/participants/register-invite', {
          method: 'POST',
          body: {
            token: inviteToken,
            name: name.trim(),
            email: email.trim() || null,
            role,
          },
        })
        : await api('/api/participants/register-shared', {
          method: 'POST',
          body: {
            access_token: accessToken,
            name: name.trim(),
            email: email.trim() || null,
            wg_number: wg,
            role,
          },
        });
      setToken(data.wg_number, data.token);
      toast({ message: `Welcome, ${data.name}!`, type: 'success' });
      navigate(`/wg/${data.wg_number}`);
    } catch (err) {
      toast({ message: err.message || 'Registration failed', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  if (checkingAccess) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center bg-[#0A1628] px-4 py-16 sm:px-6">
        <Card className="w-full max-w-md">
          <CardContent className="py-10 text-center text-sm text-white/60">
            Validating your access link...
          </CardContent>
        </Card>
      </div>
    );
  }

  if ((!isInviteMode && !isSharedMode) || accessError || (isInviteMode && !wg)) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center bg-[#0A1628] px-4 py-16 sm:px-6">
        <Card className="w-full max-w-md">
          <CardContent className="py-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/15 text-red-300">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <h1 className="mt-4 text-lg font-semibold text-white">Invite required</h1>
            <p className="mt-2 text-sm text-white/55">
              {accessError || 'Please use the official join link to access registration.'}
            </p>
            <Link to="/" className="mt-5 inline-block">
              <Button variant="secondary" size="sm">Back to home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const wgInfo = WG_OPTIONS.find((opt) => opt.number === wg);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center bg-[#0A1628] px-4 py-16 sm:px-6">
      <Helmet>
        <meta name="description" content="Join the SAEM 2026 AI Consensus Conference platform." />
      </Helmet>
      <div className="pointer-events-none fixed -top-32 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-b from-[#1B5E8A]/10 to-transparent blur-3xl" />

      <div className="relative w-full max-w-lg">
        {/* Step indicator */}
        <div className="mb-5 flex items-center justify-center gap-3">
          <StepDot active={step >= 1} label="1" />
          <div className={`h-px w-8 ${step >= 2 ? 'bg-purple-400' : 'bg-white/10'}`} />
          <StepDot active={step >= 2} label="2" />
        </div>

        <AnimatePresence mode="wait">
          {/* ─── Step 1: Identity ──────────────────────────────── */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.25 }}
            >
              <Card>
                <CardContent className="p-6 sm:p-8">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/15 text-purple-400">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <h1 className="text-xl font-bold text-white">Join the conference</h1>
                      <p className="text-sm text-white/50">Step 1 of 2 &mdash; Who are you?</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-white/70">Full name</label>
                      <input
                        autoFocus
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && canGoNext && setStep(2)}
                        placeholder="Dr. Jane Doe"
                        className="w-full rounded-lg border border-white/[0.1] bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition focus:border-purple-400/50 focus:ring-2 focus:ring-purple-500/20"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-white/70">Email</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && canGoNext && setStep(2)}
                        placeholder="jane.doe@institution.edu"
                        className="w-full rounded-lg border border-white/[0.1] bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition focus:border-purple-400/50 focus:ring-2 focus:ring-purple-500/20"
                      />
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <Button disabled={!canGoNext} onClick={() => setStep(2)} className="gap-1.5">
                      Next
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ─── Step 2: WG + Role ────────────────────────────── */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.25 }}
            >
              <Card>
                <CardContent className="p-6 sm:p-8">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/15 text-purple-400">
                      <UserCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <h1 className="text-xl font-bold text-white">Your working group &amp; role</h1>
                      <p className="text-sm text-white/50">Step 2 of 2 &mdash; {name}</p>
                    </div>
                  </div>

                  {isInviteMode ? (
                    <>
                      <label className="mb-2 block text-sm font-medium text-white/70">Assigned Working Group</label>
                      <div className="rounded-lg border border-purple-400/40 bg-purple-500/10 p-3">
                        <div className="flex items-start gap-2">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-500 text-xs font-bold text-white">
                            {wg}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white/90">{wgInfo?.short || `WG ${wg}`}</p>
                            <p className="text-[10px] text-white/40">{wgInfo?.pillar || 'Assigned in invite'}</p>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <label className="mb-2 block text-sm font-medium text-white/70">Working Group</label>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {WG_OPTIONS.map((opt) => (
                          <button
                            key={opt.number}
                            onClick={() => setWg(opt.number)}
                            className={`group flex items-start gap-2 rounded-lg border p-3 text-left transition-all ${
                              wg === opt.number
                                ? 'border-purple-400/50 bg-purple-500/10'
                                : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]'
                            }`}
                          >
                            <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                              wg === opt.number ? 'bg-purple-500 text-white' : 'bg-white/[0.08] text-white/60'
                            }`}>
                              {opt.number}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white/90">{opt.short}</p>
                              <p className="text-[10px] text-white/40">{opt.pillar} pillar</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Role */}
                  <label className="mb-2 mt-5 block text-sm font-medium text-white/70">Your role</label>
                  <div className="space-y-2">
                    {ROLE_OPTIONS.map((opt) => {
                      const Icon = opt.icon;
                      const isActive = role === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => setRole(opt.value)}
                          className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-all ${
                            isActive
                              ? 'border-purple-400/50 bg-purple-500/10'
                              : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]'
                          }`}
                        >
                          <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                            isActive ? 'bg-purple-500 text-white' : 'border border-white/[0.16] text-white/30'
                          }`}>
                            {isActive && <CheckCircle2 className="h-3.5 w-3.5" />}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white/90">{opt.label}</p>
                            <p className="text-xs text-white/40">{opt.desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-6 flex justify-between">
                    <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="gap-1">
                      <ArrowLeft className="h-4 w-4" />
                      Back
                    </Button>
                    <Button
                      disabled={!canSubmit}
                      loading={submitting}
                      onClick={handleSubmit}
                      className="gap-1.5"
                    >
                      Complete signup
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function StepDot({ active, label }) {
  return (
    <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition ${
      active ? 'bg-purple-500 text-white' : 'bg-white/[0.06] text-white/30'
    }`}>
      {label}
    </div>
  );
}
