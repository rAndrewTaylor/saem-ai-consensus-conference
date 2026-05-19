/**
 * /command sidecar: the 5 per-WG priority-presentation URLs, ready
 * for the chair to hand off to co-leads during the 2:50 PM slot.
 *
 * Each row shows the WG name, a short scope hint, an Open button
 * that pops the slide in a new tab, and a Copy button so the chair
 * can paste the URL into Slack / DM to the relevant co-lead.
 */

import { useState } from 'react';
import { Copy, ExternalLink, Check } from 'lucide-react';
import { WG_LABELS, PILLAR_COLORS } from '@/components/stage/panelConfig';

const WG_NUMBERS = [1, 2, 3, 4, 5];

export function PriorityPresentationLinks() {
  const [copiedFor, setCopiedFor] = useState(null);

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

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0E1E35] p-3">
      <div className="px-1 pb-2 pt-0.5">
        <h2 className="text-sm font-bold text-white">Priority presentation links</h2>
        <p className="text-[11px] text-white/45">
          2:50 PM slot — hand each co-lead their slide URL
        </p>
      </div>
      <ol className="space-y-1.5">
        {WG_NUMBERS.map((n) => {
          const url = `/present/wg/${n}`;
          const tone = PILLAR_COLORS[n] || '#00B4D8';
          const label = WG_LABELS[n] || `WG ${n}`;
          const copied = copiedFor === n;
          return (
            <li
              key={n}
              className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5"
            >
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
                style={{ backgroundColor: `${tone}25`, color: tone }}
              >
                {n}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-white/85">{label}</p>
                <p className="truncate text-[10px] font-mono text-white/35">{url}</p>
              </div>
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
                aria-label={`Open WG ${n} slide`}
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
