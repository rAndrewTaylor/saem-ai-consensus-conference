/**
 * Conference Day Command Center — chair's single page to run the day.
 *
 * Three-column layout (desktop):
 *   - Left:   Day timeline (every segment, click to drive the stage)
 *   - Middle: Live projector preview + mode-specific quick actions
 *   - Right:  Audience signal (chat / votes / breakout notes)
 *
 * Top bar: clock + status + "open projector" button + logout
 *
 * Admin-only. Audience gets redirected to /day.
 */

import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useStageDisplay } from '@/components/stage/StageView';
import { DayTimeline, modeForAgendaItem } from '@/components/command/DayTimeline';
import { CenterStage } from '@/components/command/CenterStage';
import { LiveSignal } from '@/components/command/LiveSignal';
import { PriorityPresentationLinks } from '@/components/command/PriorityPresentationLinks';
import { ExternalLink, LogOut, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';

export function CommandPage() {
  usePageTitle('Command Center · May 21');
  const { isAdmin, loading: adminLoading, logout } = useAdmin();
  const navigate = useNavigate();
  const stage = useStageDisplay(true /* assume admin for this page */);
  const [clock, setClock] = useState(new Date());
  const toast = useToast();

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  if (adminLoading) {
    return (
      <div className="min-h-screen bg-[#0A1628] p-8">
        <Skeleton className="h-10 w-64" />
        <div className="mt-6 grid grid-cols-12 gap-4">
          <Skeleton className="col-span-3 h-[70vh] rounded-2xl" />
          <Skeleton className="col-span-6 h-[70vh] rounded-2xl" />
          <Skeleton className="col-span-3 h-[70vh] rounded-2xl" />
        </div>
      </div>
    );
  }
  if (!isAdmin) {
    return <Navigate to="/day" replace />;
  }

  const status = (() => {
    if (!stage.mode || stage.mode === 'idle') return { label: 'Idle', color: 'bg-white/[0.08] text-white/60' };
    if (stage.mode === 'welcome') return { label: 'Welcome', color: 'bg-[#48CAE4]/20 text-[#48CAE4]' };
    if (/^panel:\d+$/.test(stage.mode)) return { label: 'Panel live', color: 'bg-emerald-500/20 text-emerald-300' };
    if (stage.mode === 'table_reactions') return { label: 'Breakout', color: 'bg-amber-500/20 text-amber-300' };
    if (stage.mode === 'cross_wg') return { label: 'Cross-WG vote', color: 'bg-purple-500/20 text-purple-300' };
    if (stage.mode === 'break') return { label: 'On break', color: 'bg-slate-500/20 text-slate-200' };
    return { label: stage.mode, color: 'bg-white/[0.08] text-white/60' };
  })();

  const pickSegment = async ({ mode, item, nextItem }) => {
    // Build payload then dispatch through setDisplay. Done as an async
    // wrapper so we can confirm via toast and surface backend errors.
    let payload;
    if (mode === 'welcome') {
      payload = { mode: 'welcome', slide_index: 0 };
    } else if (/^panel:\d+$/.test(mode)) {
      payload = { mode, panel_tab: 'results' };
    } else if (mode === 'break') {
      // Encode the next segment's time + title in panel_tab so the
      // BreakView on the projector and audience phones can show
      // "Back at 10:15 AM · Panel 3 — Education & Training" without
      // a schema migration.
      const next = nextItem
        ? `${nextItem.time}${nextItem.title ? ' · ' + nextItem.title : ''}`
        : '';
      payload = { mode: 'break', panel_tab: next || null };
    } else {
      payload = { mode };
    }
    try {
      await stage.setDisplay(payload);
      // Confirmation toast — gives the chair feedback that the click
      // landed even when the resulting view is on a different surface.
      const label = mode === 'break'
        ? (payload.panel_tab ? `On break — back at ${payload.panel_tab}` : 'On break')
        : (item?.title || mode);
      toast({ message: `Stage → ${label}`, type: 'success' });
    } catch (err) {
      toast({ message: `Couldn't switch stage: ${err.message || err}`, type: 'error' });
    }
  };

  return (
    <div className="min-h-screen bg-[#0A1628] text-white">
      <Helmet>
        <meta name="viewport" content="width=1280, initial-scale=1" />
      </Helmet>

      {/* Top bar */}
      <div className="border-b border-white/[0.06] bg-[#0E1E35] px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-bold text-white">Conference Day Command Center</h1>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${status.color}`}>
              {status.label}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-white/50">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {clock.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <a
              href="/stage"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/[0.08]"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open projector in new window
            </a>
            <a
              href="/day"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/[0.08]"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Audience view
            </a>
            <button onClick={() => { logout(); navigate('/'); }} className="inline-flex items-center gap-1.5 rounded-lg p-1.5 text-white/40 hover:bg-white/[0.06] hover:text-white">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Three-column grid */}
      <div className="grid grid-cols-12 gap-4 p-4 lg:gap-5 lg:p-5" style={{ height: 'calc(100vh - 56px)' }}>
        <aside className="col-span-3 min-h-0">
          <DayTimeline activeMode={stage.mode} onPick={pickSegment} />
        </aside>
        <main className="col-span-6 min-h-0 overflow-y-auto">
          <CenterStage
            mode={stage.mode}
            slideIndex={stage.slideIndex}
            panelTab={stage.panelTab}
            onChange={stage.setDisplay}
          />
        </main>
        <aside className="col-span-3 flex min-h-0 flex-col gap-4 overflow-y-auto">
          <LiveSignal mode={stage.mode} bus={stage.bus} />
          <PriorityPresentationLinks />
        </aside>
      </div>
    </div>
  );
}

export default CommandPage;
