/**
 * /command sidecar: the 5 per-WG priority-presentation URLs, ready
 * for the chair to hand off to co-leads during the 2:50 PM slot.
 *
 * Each row shows the WG name, a short scope hint, an Open button
 * that pops the slide in a new tab, and a Copy button so the chair
 * can paste the URL into Slack / DM to the relevant co-lead.
 */

import { useState } from 'react';
import { Copy, ExternalLink, Check, Play, ChevronLeft, ChevronRight, MonitorPlay } from 'lucide-react';
import { WG_LABELS, PILLAR_COLORS } from '@/components/stage/panelConfig';

const WG_NUMBERS = [1, 2, 3, 4, 5];

export function PriorityPresentationLinks({ activeMode, onPickPresent }) {
  const [copiedFor, setCopiedFor] = useState(null);
  // Currently-presenting WG, if any (display mode `present:N`)
  const presentMatch = /^present:(\d+)$/.exec(activeMode || '');
  const currentN = presentMatch ? parseInt(presentMatch[1], 10) : null;

  const copy = async (n) => {
    const url = `${window.location.origin}/present/wg/${n}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedFor(n);
      setTimeout(() => setCopiedFor((c) => (c === n ? null : c)), 1800);
    } catch {
      // Clipboard API blocked — let the user select manually via Open
    }
  };

  const present = (n) => onPickPresent && onPickPresent(n);

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0E1E35] p-3">
      <div className="px-1 pb-2 pt-0.5">
        <h2 className="text-sm font-bold text-white">Priority presentations</h2>
        <p className="text-[11px] text-white/45">
          2:50 PM slot — drive the projector + audience phones, WG by WG
        </p>
      </div>

      {/* Now-presenting strip + Prev/Next cycler */}
      {currentN ? (
        <div className="mb-2 flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/[0.08] p-2.5">
          <MonitorPlay className="h-4 w-4 shrink-0 text-cyan-300" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-cyan-300">
              Presenting now
            </p>
            <p className="truncate text-xs font-semibold text-white">
              WG {currentN} · {WG_LABELS[currentN] || ''}
            </p>
          </div>
          <button
            type="button"
            disabled={currentN <= 1}
            onClick={() => present(currentN - 1)}
            className="rounded-md border border-white/[0.08] bg-white/[0.04] p-1.5 text-white/65 transition hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="Previous WG"
            title="Previous WG"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            disabled={currentN >= 5}
            onClick={() => present(currentN + 1)}
            className="rounded-md border border-white/[0.08] bg-white/[0.04] p-1.5 text-white/65 transition hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="Next WG"
            title="Next WG"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <p className="mb-2 rounded-xl border border-white/[0.05] bg-white/[0.02] px-2.5 py-2 text-[11px] text-white/50">
          Click <strong className="text-white/70">Present</strong> on any
          row to drive that WG's slide to the projector + audience phones.
          No voting until the cross-WG round.
        </p>
      )}

      <ol className="space-y-1.5">
        {WG_NUMBERS.map((n) => {
          const url = `/present/wg/${n}`;
          const tone = PILLAR_COLORS[n] || '#00B4D8';
          const label = WG_LABELS[n] || `WG ${n}`;
          const copied = copiedFor === n;
          const isCurrent = currentN === n;
          return (
            <li
              key={n}
              className="flex items-center gap-2 rounded-xl border p-2.5"
              style={{
                borderColor: isCurrent ? 'rgba(72, 202, 228, 0.45)' : 'rgba(255,255,255,0.06)',
                backgroundColor: isCurrent ? 'rgba(0, 180, 216, 0.07)' : 'rgba(255,255,255,0.02)',
              }}
            >
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
                style={{ backgroundColor: `${tone}25`, color: tone }}
              >
                {n}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-white/85">{label}</p>
                {isCurrent ? (
                  <p className="text-[10px] font-medium text-cyan-300">Live on stage</p>
                ) : (
                  <p className="truncate font-mono text-[10px] text-white/35">{url}</p>
                )}
              </div>
              {/* Primary action — Present (drives projector + audience) */}
              <button
                type="button"
                onClick={() => present(n)}
                className={`inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-semibold transition ${
                  isCurrent
                    ? 'bg-cyan-400/20 text-cyan-200'
                    : 'border border-cyan-400/30 bg-cyan-500/[0.08] text-cyan-200 hover:bg-cyan-500/[0.16]'
                }`}
                aria-label={`Present WG ${n}`}
                title={isCurrent ? 'Already presenting' : 'Drive this WG to the stage'}
              >
                <Play className="h-3 w-3" />
                {isCurrent ? 'Live' : 'Present'}
              </button>
              <button
                type="button"
                onClick={() => copy(n)}
                className="rounded-md border border-white/[0.08] bg-white/[0.04] p-1.5 text-white/55 transition hover:bg-white/[0.08] hover:text-white"
                aria-label={`Copy link for WG ${n}`}
                title="Copy URL"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-white/[0.08] bg-white/[0.04] p-1.5 text-white/55 transition hover:bg-white/[0.08] hover:text-white"
                aria-label={`Open WG ${n} slide in new tab`}
                title="Open slide in new tab"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default PriorityPresentationLinks;
