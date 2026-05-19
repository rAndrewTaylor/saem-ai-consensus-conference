/**
 * /present/wg/:n — full-screen, projector-ready presentation slide for
 * a single WG's 5-7 minute "Priority Presentations" slot at 2:50 PM.
 *
 * Thin shell over PresentWGStage so the standalone URL (used for the
 * Open / Copy buttons in /command) renders the same content as the
 * embedded projector view. No chrome (configured in Layout's
 * NO_CHROME_PATTERNS for /present/*).
 */

import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { PresentWGStage } from '@/components/stage/PresentWGStage';
import { usePageTitle } from '@/hooks/usePageTitle';

export function PresentWGPage() {
  const { n } = useParams();
  const wgNumber = parseInt(n, 10);
  usePageTitle(`Priority — WG ${wgNumber}`);

  if (Number.isNaN(wgNumber) || wgNumber < 1 || wgNumber > 5) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A1628] text-white">
        <p className="text-sm text-rose-300">Invalid WG number in URL.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A1628]">
      <Helmet>
        <title>WG {wgNumber} · Priority — SAEM 2026</title>
      </Helmet>
      <div className="h-screen">
        <PresentWGStage wgNumber={wgNumber} />
      </div>
    </div>
  );
}

export default PresentWGPage;
