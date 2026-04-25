import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api, setToken } from '@/lib/api';
import { usePageTitle } from '@/hooks/usePageTitle';

export function InvitePage() {
  const { token } = useParams();
  const navigate = useNavigate();
  usePageTitle('Welcome');

  const [state, setState] = useState('loading'); // loading | ok | error
  const [info, setInfo] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) {
      setState('error');
      setError('No invite token in the URL.');
      return;
    }
    api('/api/participants/claim', { params: { token } })
      .then((data) => {
        setInfo(data);
        if (data.wg_number) {
          // Bind this token as the participant's session token for their WG
          setToken(data.wg_number, data.token || token);
        }
        setState('ok');
      })
      .catch((err) => {
        setError(err.message || 'Invite could not be validated');
        setState('error');
      });
  }, [token]);

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
          <Card>
            <CardContent className="flex flex-col items-center py-14 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/15 text-red-400">
                <AlertCircle className="h-7 w-7" />
              </div>
              <h1 className="mt-4 text-xl font-bold text-white">Invite not valid</h1>
              <p className="mt-2 max-w-sm text-sm text-white/50">{error}</p>
              <p className="mt-1 text-xs text-white/40">
                If you think this is a mistake, contact the conference chair.
              </p>
              <Link to="/" className="mt-6">
                <Button variant="secondary" size="sm">Go to homepage</Button>
              </Link>
            </CardContent>
          </Card>
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
