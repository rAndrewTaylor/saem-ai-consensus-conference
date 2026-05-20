/**
 * Adjourn — final 5:00 PM slot. Big "Thank you" hero with a feedback QR,
 * a roll of credits (working groups + planning committee), and a soft
 * particle-flavored background that doesn't compete for attention. The
 * room is filing out at this point; the projector just needs to be a
 * dignified close.
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, MapPin, ArrowRight } from 'lucide-react';
import QRCode from 'qrcode';

export function AdjournStage() {
  const feedbackUrl = `${window.location.origin}/day#agenda`;
  const [qr, setQr] = useState(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(feedbackUrl, {
      width: 480,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#0A1628', light: '#FFFFFF' },
    })
      .then((d) => { if (!cancelled) setQr(d); })
      .catch(() => { /* skip QR — banner still reads */ });
    return () => { cancelled = true; };
  }, [feedbackUrl]);

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-[#0A1628] text-white">
      {/* Background flourishes — mirror the opening welcome hero */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[800px] w-[1400px] -translate-x-1/2 rounded-full bg-gradient-to-b from-amber-500/[0.12] to-transparent blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 right-0 h-[600px] w-[900px] rounded-full bg-gradient-to-t from-cyan-500/[0.10] to-transparent blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative flex h-full flex-1 items-center justify-center px-12 py-10"
      >
        <div className="grid w-full max-w-7xl items-center gap-12 lg:grid-cols-[1.2fr_1fr]">
          {/* Left — Thank-you headline + credits */}
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0C2340] to-amber-500">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-300/90">
                SAEM 2026 · AI Consensus Conference
              </p>
            </div>

            <h1 className="mt-6 text-6xl font-extrabold leading-[1.02] tracking-tight sm:text-7xl xl:text-8xl">
              Thank you for{' '}
              <span className="block bg-gradient-to-r from-amber-200 via-amber-300 to-[#48CAE4] bg-clip-text text-transparent">
                building this with us.
              </span>
            </h1>

            <div className="mt-8 space-y-3 text-xl text-white/65 sm:text-2xl">
              <p>
                The day's priorities — and the conversations behind them — are now
                a public-record contribution to emergency medicine + AI.
              </p>
              <p className="text-base text-white/55">
                Watch your inbox for the full synthesis, dataset, and follow-ups.
              </p>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <Credit
                title="74 working-group members"
                detail="across 5 WGs · 2 Delphi rounds · 1,310 R2 responses · 5,962 pairwise"
              />
              <Credit
                title="Conference planning committee"
                detail="R. Andrew Taylor · Andrew Muck · Thomas Hartka · Matt Trowbridge · Moira Smith"
              />
              <Credit
                title="Working-group co-leads"
                detail="Sangal · Patterson · Riley · Abbott · Preiksaitis · Rose · Yiadom · Rehman · Hall · Declan"
              />
              <Credit
                title="Conference-day support"
                detail="Hope Duncan · Jonathan Swap · Farah Turkistani · Rupesh Silwal · SAEM MSA helpers"
              />
            </div>

            <p className="mt-8 inline-flex items-center gap-2 text-sm text-white/45">
              <MapPin className="h-4 w-4 text-amber-300" />
              Atlanta Marriott Marquis · Thursday, May 21, 2026
            </p>
          </div>

          {/* Right — Feedback QR */}
          <div className="flex flex-col items-center justify-center">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-amber-300/90">
              Take 60 seconds
            </p>
            <p className="mb-5 text-center text-lg text-white/80">
              Scan to leave feedback
              <br />
              <span className="text-sm text-white/45">on today's conference</span>
            </p>
            <div className="rounded-3xl bg-white p-5 shadow-2xl shadow-amber-500/10">
              {qr ? (
                <img
                  src={qr}
                  alt="Scan to give feedback on SAEM 2026 AI Consensus Conference"
                  className="h-[320px] w-[320px] sm:h-[380px] sm:w-[380px]"
                />
              ) : (
                <div className="flex h-[320px] w-[320px] items-center justify-center text-slate-400 sm:h-[380px] sm:w-[380px]">
                  Generating QR…
                </div>
              )}
            </div>
            <p className="mt-5 text-sm text-white/55">
              <ArrowRight className="mr-1 inline h-3 w-3" />
              Safe travels home.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function Credit({ title, detail }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-300">{title}</p>
      <p className="mt-1 text-sm text-white/75 leading-snug">{detail}</p>
    </div>
  );
}

export default AdjournStage;
