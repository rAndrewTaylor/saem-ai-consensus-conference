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

  return (
    <div className="min-h-screen bg-[#08111F] text-white">
      <Helmet>
        <meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no" />
      </Helmet>

      {isAdmin && (
        <AdminControlStrip
          mode={mode}
          slideIndex={slideIndex}
          panelTab={panelTab}
          onChange={setDisplay}
        />
      )}

      <div className={isAdmin ? 'pt-16' : ''}>
        <StageView
          mode={mode}
          slideIndex={slideIndex}
          panelTab={panelTab}
          bus={bus}
          isAdmin={isAdmin}
          onChange={setDisplay}
        />
      </div>
    </div>
  );
}

export default StagePage;
