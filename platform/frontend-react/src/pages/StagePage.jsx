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
    </div>
  );
}

export default StagePage;
