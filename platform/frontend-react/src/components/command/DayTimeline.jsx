/**
 * Day timeline column for the chair's command center.
 *
 * Lists every agenda segment (welcome, panels, breakouts, lunch,
 * world café, cross-WG vote, etc.) as a vertical list of cards. Each
 * card maps to a stage mode so the chair can one-click switch.
 *
 * Visual states per segment:
 *   - upcoming: dim
 *   - now:      bright accent + "LIVE" pill
 *   - done:     muted with check
 */

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, Radio, ChevronRight, Coffee, Presentation, Users2, MessageSquare, Trophy, Sun } from 'lucide-react';

const KIND_ICON = {
  break: Coffee,
  welcome: Presentation,
  panel: Users2,
  reaction: MessageSquare,
  world_cafe: MessageSquare,
  vote: Trophy,
  presentation: Presentation,
  results: Trophy,
  wrap: Sun,
  end: Sun,
};

/**
 * Map a day-state agenda item to a stage display mode.
 *
 * Notes:
 * - break items return the literal 'break' mode so the audience sees
 *   a "we're on break, back at X" view instead of the idle carousel.
 * - presentation items (the 2:50 PM Priority Presentations slot) start
 *   at present:1; the chair cycles through WG1→WG5 with Next/Prev in
 *   /command. Each WG's slide is presented while the audience phone
 *   shows the same 4 questions read-only (no voting until 3:35 PM).
 * - results items map to cross_wg so the projector shows the final
 *   ranked agenda after the cross-WG vote completes.
 */
export function modeForAgendaItem(item) {
  if (!item) return 'idle';
  if (item.kind === 'welcome') return 'welcome';
  if (item.kind === 'panel' && item.wg) return `panel:${item.wg}`;
  if (item.kind === 'reaction') return 'table_reactions';
  if (item.kind === 'world_cafe') return 'world_cafe';
  if (item.kind === 'vote' && item.session_type === 'cross_wg_prioritization') return 'cross_wg';
  if (item.kind === 'presentation') return 'present:1';
  if (item.kind === 'results') return 'final_synthesis';
  if (item.kind === 'wrap') return 'summary';
  if (item.kind === 'end') return 'adjourn';
  if (item.kind === 'break') return 'break';
  return 'idle';
}

export function DayTimeline({ activeMode, onPick }) {
  const [agenda, setAgenda] = useState(null);
  useEffect(() => {
    api('/api/conference/day-state')
      .then((d) => setAgenda(d?.agenda || []))
      .catch(() => setAgenda([]));
  }, []);

  if (!agenda) return <Skeleton className="h-[60vh] w-full rounded-2xl" />;

  // Mark items relative to current time (Atlanta/ET). Simpler: just match
  // active mode to determine "now" — agenda times are approximate during
  // the day anyway, the chair drives the actual segment. For present:N
  // (per-WG presentation cycling) any present:* mode highlights the
  // single Priority Presentations row.
  const isModeMatch = (item) => {
    const m = modeForAgendaItem(item);
    if (m === activeMode) return true;
    if (item.kind === 'presentation' && /^present:\d+$/.test(activeMode || '')) return true;
    return false;
  };
  const nowIdx = agenda.findIndex(isModeMatch);

  return (
    <div className="h-full overflow-y-auto rounded-2xl border border-white/[0.06] bg-[#0E1E35] p-3">
      <div className="px-2 pb-3 pt-1">
        <h2 className="text-sm font-bold text-white">Day timeline</h2>
        <p className="text-[11px] text-white/40">Click any segment to drive the stage</p>
      </div>
      <ol className="space-y-1.5">
        {agenda.map((item, i) => {
          const mode = modeForAgendaItem(item);
          const Icon = KIND_ICON[item.kind] || Sun;
          const isLive = mode === activeMode && i === nowIdx;
          const isDone = nowIdx >= 0 && i < nowIdx;
          const clickable = mode !== 'idle' || item.kind === 'break';
          // For break segments, find the next non-break item so the
          // BreakView can show participants when to come back.
          const nextItem = item.kind === 'break'
            ? agenda.slice(i + 1).find((a) => a.kind !== 'break')
            : null;
          const isBreak = item.kind === 'break';
          const isPresentRow = item.kind === 'presentation';
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => onPick && onPick({ mode, item, nextItem })}
                disabled={!clickable}
                className={`flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition disabled:cursor-not-allowed disabled:opacity-40 ${
                  isLive
                    ? 'border-[#48CAE4]/50 bg-[#00B4D8]/[0.08] shadow-[0_0_0_1px_rgba(72,202,228,0.15)]'
                    : isDone
                    ? 'border-white/[0.04] bg-white/[0.01] opacity-60 hover:opacity-100'
                    : isBreak
                    ? 'border-amber-400/30 bg-amber-500/[0.05] hover:border-amber-300/60 hover:bg-amber-500/[0.10]'
                    : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]'
                }`}
              >
                <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                  isLive ? 'bg-[#00B4D8]/25 text-[#48CAE4]' : isDone ? 'bg-white/[0.04] text-white/30' : 'bg-white/[0.05] text-white/50'
                }`}>
                  {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : isLive ? <Radio className="h-3.5 w-3.5 animate-pulse" /> : <Icon className="h-3.5 w-3.5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-medium text-white/40">{item.time}</span>
                    {isLive && (
                      <span className="rounded-full bg-[#00B4D8]/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#48CAE4]">
                        Live
                      </span>
                    )}
                  </div>
                  <p className={`mt-0.5 text-xs font-medium leading-snug ${isLive ? 'text-white' : isDone ? 'text-white/40' : 'text-white/80'}`}>
                    {item.title}
                  </p>
                </div>
                {clickable && !isLive && <ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0 text-white/20" />}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
