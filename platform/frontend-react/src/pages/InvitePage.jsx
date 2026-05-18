import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, ArrowRight, Loader2, LogIn, Mail } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { api, setToken } from '@/lib/api';
import { usePageTitle } from '@/hooks/usePageTitle';

export function InvitePage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  usePageTitle('Welcome');

  const [state, setState] = useState('loading'); // loading | ok | error
  const [info, setInfo] = useState(null);
  const [error, setError] = useState(null);
  const [signinEmail, setSigninEmail] = useState('');
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    if (!token) {
      setState('error');
      setError('No invite token in the URL.');
      return;
    }
    // Strip whitespace/line-breaks that some email clients introduce when
    // wrapping long invite URLs — the most common cause of "invalid invite".
    const cleanToken = token.replace(/\s+/g, '');
    api('/api/participants/claim', { params: { token: cleanToken } })
      .then((data) => {
        setInfo(data);
        if (data.wg_number) {
          setToken(data.wg_number, data.token || cleanToken);
        }
        setState('ok');
      })
      .catch((err) => {
        setError(err.message || 'Invite could not be validated');
        setState('error');
      });
  }, [token]);

  const handleSignIn = async () => {
    if (!signinEmail.trim().includes('@')) {
      toast({ message: 'Enter a valid email address', type: 'error' });
      return;
    }
    setSigningIn(true);
    try {
      const data = await api('/api/participants/login', {
        method: 'POST',
        body: { email: signinEmail.trim() },
      });
      setToken(data.wg_number, data.token);
      toast({ message: `Welcome back, ${data.name}!`, type: 'success' });
      navigate('/welcome');
    } catch (err) {
      toast({
        message: err.message || 'No account found with that email',
        type: 'error',
      });
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center bg-[#0A1628] px-4 py-16 sm:px-6">
      <div className="pointer-events-none fixed -top-32 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-b from-[#1B5E8A]/12 to-transparent blur-3xl" />

      <div className="relative w-full max-w-md">
        {state === 'loading' && (
          <Card>
            <CardContent className="flex flex-col items-center py-16 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
              <p className="mt-4 text-sm text-white/50">Validating your invite...</p>
            </CardContent>
          </Card>
        )}

        {state === 'error' && (
          <div className="space-y-4">
            <Card>
              <CardContent className="flex flex-col items-center py-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/15 text-red-400">
                  <AlertCircle className="h-7 w-7" />
                </div>
                <h1 className="mt-4 text-xl font-bold text-white">Invite link didn&apos;t work</h1>
                <p className="mt-2 max-w-sm text-sm text-white/55">{error}</p>
                <p className="mt-3 max-w-sm text-xs text-white/40">
                  Common causes: the link wrapped onto a second line in
                  your email, the invite was deactivated, or you&apos;re using
                  a link from before your account was updated. If you&apos;ve
                  already registered, sign in below with your email instead.
                </p>
                <Link to="/" className="mt-5">
                  <Button variant="ghost" size="sm">Go to homepage</Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#00B4D8]/15 text-[#00B4D8]">
                    <LogIn className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-white">
                      Already registered?
                    </h2>
                    <p className="text-xs text-white/50">
                      Log in with the email you used at registration.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={signinEmail}
                    onChange={(e) => setSigninEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSignIn()}
                    placeholder="your.email@institution.edu"
                    className="flex-1 rounded-lg border border-white/[0.1] bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition focus:border-[#00B4D8]/50 focus:ring-2 focus:ring-[#00B4D8]/20"
                  />
                  <Button onClick={handleSignIn} loading={signingIn} className="shrink-0">
                    <Mail className="h-4 w-4" />
                    Log in
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {state === 'ok' && info && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <Card>
              <CardContent className="flex flex-col items-center py-14 text-center">
                <motion.div
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
                  className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400"
                >
                  <CheckCircle2 className="h-7 w-7" />
                </motion.div>

                <h1 className="mt-5 text-2xl font-bold tracking-tight text-white">
                  Welcome{info.name ? `, ${info.name.split(' ')[0]}` : ''}!
                </h1>

                {info.wg_number && (
                  <p className="mt-2 max-w-sm text-sm text-white/60">
                    You&apos;re all set as a participant for
                    <Badge variant="primary" className="mx-1.5">
                      WG {info.wg_number}
                    </Badge>
                    {info.wg_short_name || info.wg_name}
                  </p>
                )}

                <p className="mt-3 max-w-sm text-xs text-white/40">
                  Bookmark this page or keep the email handy &mdash; clicking your
                  invite link on another device will sign you in there too.
                </p>

                {info.wg_number && (
                  <Button
                    className="mt-7 gap-1.5"
                    onClick={() => navigate(`/join?token=${encodeURIComponent(token)}`)}
                  >
                    Continue to signup
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
