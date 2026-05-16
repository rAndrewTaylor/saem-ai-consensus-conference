/**
 * Full-bleed projector view for conference day.
 *
 * Renders the same mode-driven content as /day, but without the
 * audience widgets (chat input, vote prompts, agenda). Designed to be
 * thrown on a projector at the front of the room.
 *
 * If you want the integrated audience experience, use /day instead.
 */

import { Helmet } from 'react-helmet-async';
import { usePageTitle } from '@/hooks/usePageTitle';
import { getAdminToken } from '@/lib/api';
import { StageView, useStageDisplay } from '@/components/stage/StageView';
import { AdminControlStrip } from '@/components/stage/AdminControlStrip';

export function StagePage() {
  usePageTitle('SAEM 2026 — Stage');
  const isAdmin = Boolean(getAdminToken());
  const { mode, slideIndex, panelTab, bus, setDisplay } = useStageDisplay(isAdmin);

  // ?minimal=1 hides the admin control strip — used when this page is
  // embedded in the /command iframe (chair drives from the outer page,
  // so the inner strip is noise).
  const minimal = (() => {
    try { return new URLSearchParams(window.location.search).get('minimal') === '1'; } catch { return false; }
  })();
  const showAdminStrip = isAdmin && !minimal;

  return (
    <div className="min-h-screen bg-[#0A1628] text-white">
      <Helmet>
        <meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no" />
      </Helmet>

      {showAdminStrip && (
        <AdminControlStrip
          mode={mode}
          slideIndex={slideIndex}
          panelTab={panelTab}
          onChange={setDisplay}
        />
      )}

      <div className={showAdminStrip ? 'pt-16' : ''}>
        <StageView
          mode={mode}
          slideIndex={slideIndex}
          panelTab={panelTab}
          bus={bus}
          isAdmin={isAdmin && !minimal}
          onChange={setDisplay}
        />
      </div>

      {/* Persistent ballroom-scale footer: keeps SAEM 2026 branding on
          every projected slide. Hidden when running embedded in /command. */}
      {!minimal && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 border-t border-white/[0.04] bg-[#0A1628]/85 px-6 py-2 backdrop-blur">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-white/40">
            <span className="font-semibold text-white/55">SAEM 2026</span>
            <span>AI Consensus Conference · May 21, Atlanta</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default StagePage;
