/**
 * Three live-updating data figures for the cross-WG closing-round
 * projector view. Designed to render at ballroom scale (each figure
 * ~280-380px), refresh as votes land, and tell three complementary
 * stories about the room's prioritization:
 *
 *   ThemeBubbles      — what concepts dominated the top 10 question texts
 *                       (packed circles, force-style layout, color-blended
 *                       across the WGs that surfaced each theme)
 *   WgMixDonut        — how the top 10 slots distribute across the 5 WGs
 *                       (d3-shape pie + arc, inner ring shows aggregate)
 *   RankGapLollipops  — top 7 questions as horizontal lollipops with the
 *                       advancement cutoff line called out between #4/#5
 *
 * All three take the same `rankedRows` array (already sorted by avg_rank
 * ascending) and re-derive their own slice/aggregate. Stateless other
 * than internal SVG render — drives off the parent's bus.
 */

import { useMemo } from 'react';
import { pie as d3pie, arc as d3arc } from 'd3-shape';
import { PILLAR_COLORS, WG_LABELS } from '@/components/stage/panelConfig';

// -- Theme bubbles ----------------------------------------------------------

const STOP = new Set([
  'about', 'across', 'after', 'against', 'also', 'among', 'an', 'and', 'any',
  'are', 'as', 'at', 'be', 'because', 'been', 'being', 'between', 'both',
  'but', 'by', 'can', 'do', 'does', 'doing', 'during', 'each', 'else',
  'every', 'for', 'from', 'further', 'had', 'has', 'have', 'having', 'her',
  'here', 'his', 'how', 'if', 'in', 'into', 'is', 'it', 'its', 'just',
  'like', 'may', 'might', 'more', 'most', 'much', 'must', 'no', 'nor', 'not',
  'now', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our', 'out',
  'over', 'should', 'so', 'some', 'such', 'than', 'that', 'the', 'their',
  'them', 'then', 'there', 'these', 'they', 'this', 'those', 'to', 'too',
  'under', 'until', 'up', 'use', 'used', 'using', 'very', 'was', 'we',
  'were', 'what', 'when', 'where', 'which', 'while', 'who', 'why', 'will',
  'with', 'within', 'without', 'would', 'you', 'your', 'while',
  // domain-noise: these dilute the cloud without adding signal
  'tool', 'tools', 'system', 'systems', 'work', 'works', 'make', 'makes',
  'made', 'one', 'two', 'three', 'four', 'five', 'set', 'sets', 'need',
  'needs', 'see', 'look', 'looks', 'feel', 'feels', 'kind', 'kinds',
  'thing', 'things', 'way', 'ways', 'shape', 'shapes', 'across',
]);

// Light stemming so "validate / validation / validating" collapse together.
function stem(w) {
  if (w.length <= 4) return w;
  const tails = ['ations', 'ation', 'ings', 'ing', 'ies', 'ied', 'ers', 'er', 'es', 's'];
  for (const t of tails) {
    if (w.endsWith(t) && w.length - t.length >= 4) return w.slice(0, -t.length);
  }
  return w;
}

function extractThemes(rows, max = 12) {
  // Token -> { count, wgIds: Set, display }
  const map = new Map();
  for (const r of rows) {
    const text = (r.text || r.question_text || '').toLowerCase();
    const tokens = text.replace(/[^a-z0-9' \-]+/g, ' ').split(/\s+/);
    const seenInRow = new Set();
    for (const raw of tokens) {
      const t = raw.replace(/^[-']+|[-']+$/g, '');
      if (!t || t.length < 4) continue;
      if (STOP.has(t)) continue;
      const key = stem(t);
      if (seenInRow.has(key)) continue;
      seenInRow.add(key);
      const entry = map.get(key) || { count: 0, wgIds: new Set(), display: t };
      entry.count += 1;
      // Prefer the longest surface form as the display label
      if (t.length > entry.display.length) entry.display = t;
      if (r.wg_number) entry.wgIds.add(r.wg_number);
      map.set(key, entry);
    }
  }
  return Array.from(map.values())
    .filter((e) => e.count >= 2)        // need at least 2 hits to be a "theme"
    .sort((a, b) => b.count - a.count)
    .slice(0, max);
}

// Greedy spiral packer: place biggest in the center, then spiral
// outward placing each next circle at the closest non-overlapping
// position along an expanding arc. Deterministic, no animation jitter.
function packCircles(items, width, height, padding = 4) {
  if (!items.length) return [];
  const W = width, H = height;
  const maxCount = items[0].count;
  const minCount = items[items.length - 1].count;
  const minR = 18;
  const maxR = Math.min(W, H) * 0.22;
  const radiusFor = (count) => {
    if (maxCount === minCount) return (minR + maxR) / 2;
    const t = (count - minCount) / (maxCount - minCount); // 0..1
    return minR + Math.pow(t, 0.7) * (maxR - minR);
  };

  const placed = [];
  const cx = W / 2, cy = H / 2;

  for (const item of items) {
    const r = radiusFor(item.count);
    let best = null;
    if (placed.length === 0) {
      best = { x: cx, y: cy };
    } else {
      // Spiral outward, ~600 candidate points; pick the first that fits.
      const STEP_ANGLE = 0.35;
      const STEP_R = 4;
      for (let i = 0; i < 1800; i++) {
        const a = i * STEP_ANGLE;
        const radius = STEP_R + i * 0.55;
        const x = cx + radius * Math.cos(a);
        const y = cy + radius * Math.sin(a);
        // Keep entirely within bounds
        if (x - r < 2 || x + r > W - 2 || y - r < 2 || y + r > H - 2) continue;
        let ok = true;
        for (const p of placed) {
          const dx = p.x - x, dy = p.y - y;
          if (dx * dx + dy * dy < (p.r + r + padding) * (p.r + r + padding)) { ok = false; break; }
        }
        if (ok) { best = { x, y }; break; }
      }
    }
    if (!best) continue; // ran out of room — drop the smallest
    placed.push({ ...item, x: best.x, y: best.y, r });
  }
  return placed;
}

// Average a list of hex colors (assumes #RRGGBB). Returns a hex.
function blendHex(hexes) {
  if (!hexes.length) return '#48CAE4';
  let r = 0, g = 0, b = 0;
  for (const h of hexes) {
    const v = parseInt(h.slice(1), 16);
    r += (v >> 16) & 0xff;
    g += (v >> 8) & 0xff;
    b += v & 0xff;
  }
  const n = hexes.length;
  const to2 = (x) => Math.round(x / n).toString(16).padStart(2, '0');
  return `#${to2(r)}${to2(g)}${to2(b)}`;
}

export function ThemeBubbles({ rankedRows, width = 360, height = 320 }) {
  const themes = useMemo(() => extractThemes(rankedRows, 14), [rankedRows]);
  const placed = useMemo(() => packCircles(themes, width, height), [themes, width, height]);

  if (!themes.length) {
    return (
      <FigureFrame title="Themes in the top 10" subtitle="appear as votes converge">
        <div className="flex h-full items-center justify-center px-4 text-center">
          <p className="text-xs text-white/40">
            Themes pull out of the top question texts once a few rankings come in.
          </p>
        </div>
      </FigureFrame>
    );
  }

  return (
    <FigureFrame title="Themes in the top 10" subtitle={`${themes.length} concepts blended across WGs`}>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
        <defs>
          {placed.map((p) => {
            const fill = blendHex(
              Array.from(p.wgIds).map((n) => PILLAR_COLORS[n] || '#48CAE4'),
            );
            const id = `bubble-grad-${p.display}`;
            return (
              <radialGradient key={id} id={id} cx="35%" cy="32%">
                <stop offset="0%" stopColor={fill} stopOpacity="0.95" />
                <stop offset="100%" stopColor={fill} stopOpacity="0.45" />
              </radialGradient>
            );
          })}
        </defs>
        {placed.map((p) => {
          const fontSize = Math.max(10, Math.min(p.r * 0.42, 22));
          const fill = blendHex(
            Array.from(p.wgIds).map((n) => PILLAR_COLORS[n] || '#48CAE4'),
          );
          return (
            <g key={p.display}>
              <circle
                cx={p.x}
                cy={p.y}
                r={p.r}
                fill={`url(#bubble-grad-${p.display})`}
                stroke={fill}
                strokeOpacity={0.55}
                strokeWidth={1.2}
              />
              <text
                x={p.x}
                y={p.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={fontSize}
                fontWeight={700}
                fill="#0A1628"
                style={{ pointerEvents: 'none', letterSpacing: '-0.01em' }}
              >
                {p.display}
              </text>
              <text
                x={p.x}
                y={p.y + fontSize * 0.85}
                textAnchor="middle"
                fontSize={Math.max(8, fontSize * 0.55)}
                fill="#0A1628"
                fillOpacity={0.55}
                style={{ pointerEvents: 'none' }}
              >
                {p.count}×
              </text>
            </g>
          );
        })}
      </svg>
    </FigureFrame>
  );
}

// -- WG mix donut -----------------------------------------------------------

export function WgMixDonut({ rankedRows, width = 360, height = 320 }) {
  const top = rankedRows.slice(0, 10);
  // Group counts by WG number
  const counts = useMemo(() => {
    const m = new Map();
    for (const r of top) {
      const wg = r.wg_number || 0;
      m.set(wg, (m.get(wg) || 0) + 1);
    }
    return Array.from(m.entries())
      .filter(([wg]) => wg)
      .sort((a, b) => b[1] - a[1])
      .map(([wg, count]) => ({ wg, count }));
  }, [top]);

  if (!counts.length) {
    return (
      <FigureFrame title="Working-group mix" subtitle="of the top 10">
        <div className="flex h-full items-center justify-center px-4 text-center">
          <p className="text-xs text-white/40">Waiting for rankings…</p>
        </div>
      </FigureFrame>
    );
  }

  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) / 2 - 14;
  const innerR = radius * 0.55;
  const total = counts.reduce((s, c) => s + c.count, 0);

  // Outer ring: one wedge per question slot (so 10 slices) colored by WG.
  // Reading: each ring is a "ranked seat" in the top 10. Helps the room
  // see the rank-1 wedge sit prominently at 12 o'clock.
  const slots = top.map((r, idx) => ({ idx, wg: r.wg_number || 0 }));
  const pieOuter = d3pie().value(1).sortValues(null).startAngle(-Math.PI).endAngle(Math.PI);
  const pieInner = d3pie().value((d) => d.count).sort(null).startAngle(-Math.PI).endAngle(Math.PI);

  const outerArc = d3arc().innerRadius(innerR + 8).outerRadius(radius).padAngle(0.014).cornerRadius(3);
  const innerArc = d3arc().innerRadius(innerR * 0.45).outerRadius(innerR - 2).padAngle(0.01).cornerRadius(2);

  return (
    <FigureFrame title="Working-group mix" subtitle={`top ${total} ranked seats, ring = rank order`}>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
        <g transform={`translate(${cx},${cy})`}>
          {/* Outer ring: one wedge per ranked slot */}
          {pieOuter(slots).map((p, i) => {
            const color = PILLAR_COLORS[p.data.wg] || '#444';
            return (
              <path
                key={`outer-${i}`}
                d={outerArc(p)}
                fill={color}
                fillOpacity={0.92}
                stroke="#0A1628"
                strokeWidth={1}
              />
            );
          })}

          {/* Outer ring: rank labels positioned at each wedge midpoint */}
          {pieOuter(slots).map((p, i) => {
            const a = (p.startAngle + p.endAngle) / 2;
            const tr = (innerR + radius) / 2;
            const tx = Math.sin(a) * tr;
            const ty = -Math.cos(a) * tr;
            return (
              <text
                key={`outer-label-${i}`}
                x={tx}
                y={ty}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={10}
                fontWeight={700}
                fill="#0A1628"
                style={{ pointerEvents: 'none' }}
              >
                {p.data.idx + 1}
              </text>
            );
          })}

          {/* Inner ring: aggregate share by WG */}
          {pieInner(counts).map((p, i) => {
            const color = PILLAR_COLORS[p.data.wg] || '#444';
            return (
              <path
                key={`inner-${i}`}
                d={innerArc(p)}
                fill={color}
                fillOpacity={0.55}
                stroke="#0A1628"
                strokeWidth={1}
              />
            );
          })}

          {/* Center label */}
          <text textAnchor="middle" y={-2} fontSize={20} fontWeight={800} fill="#fff">
            {total}
          </text>
          <text textAnchor="middle" y={14} fontSize={9} fill="#fff" fillOpacity={0.55}
                style={{ letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            seats
          </text>
        </g>
      </svg>

      {/* Legend strip */}
      <div className="mt-1 grid grid-cols-5 gap-1 px-1 pb-1">
        {[1, 2, 3, 4, 5].map((n) => {
          const c = counts.find((x) => x.wg === n);
          const color = PILLAR_COLORS[n] || '#444';
          return (
            <div key={n} className="flex items-center gap-1 rounded px-1 py-0.5"
                 style={{ backgroundColor: `${color}10` }}>
              <span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: color }} />
              <span className="font-mono text-[10px] font-bold" style={{ color }}>
                WG{n}
              </span>
              <span className="ml-auto font-mono text-[10px] text-white/65">
                {c?.count ?? 0}
              </span>
            </div>
          );
        })}
      </div>
    </FigureFrame>
  );
}

// -- Rank-gap lollipops ----------------------------------------------------

// Horizontal lollipops for the top 7 questions, with a dashed cutoff
// line drawn between rank-4 and rank-5 to show "who's advancing." The
// gap between #4 and #5 is the room's actual consensus boundary.
export function RankGapLollipops({ rankedRows, width = 360, height = 280, cutoff = 4 }) {
  const top = rankedRows
    .filter((r) => r.avg_rank != null)
    .slice(0, 7);

  if (!top.length) {
    return (
      <FigureFrame title="Consensus cutoff" subtitle={`top ${cutoff} advance`}>
        <div className="flex h-full items-center justify-center px-4 text-center">
          <p className="text-xs text-white/40">No rank data yet.</p>
        </div>
      </FigureFrame>
    );
  }

  const padTop = 12;
  const padBot = 22;
  const padLeft = 30;
  const padRight = 14;
  const innerH = height - padTop - padBot;
  const innerW = width - padLeft - padRight;
  const rowH = innerH / Math.max(1, top.length);

  const minRank = Math.min(...top.map((r) => r.avg_rank));
  const maxRank = Math.max(...top.map((r) => r.avg_rank));
  const span = Math.max(0.5, maxRank - minRank);
  // Scale: lower rank (better) sits LEFT, higher rank RIGHT
  const xFor = (rank) => padLeft + ((rank - minRank) / span) * innerW;

  // Gap between #cutoff and #(cutoff+1)
  let cutoffX = null;
  if (top.length > cutoff) {
    const left = top[cutoff - 1].avg_rank;
    const right = top[cutoff].avg_rank;
    cutoffX = (xFor(left) + xFor(right)) / 2;
  }

  const gap = top.length > cutoff
    ? Math.abs(top[cutoff].avg_rank - top[cutoff - 1].avg_rank)
    : null;

  return (
    <FigureFrame
      title="Consensus cutoff"
      subtitle={
        gap != null
          ? `top ${cutoff} advance · gap to #${cutoff + 1}: ${gap.toFixed(1)}`
          : `top ${cutoff} advance`
      }
    >
      <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
        {/* Axis baseline + ticks */}
        <line
          x1={padLeft}
          y1={height - padBot + 0.5}
          x2={width - padRight}
          y2={height - padBot + 0.5}
          stroke="#fff"
          strokeOpacity={0.12}
        />
        {[minRank, (minRank + maxRank) / 2, maxRank].map((tick, i) => (
          <g key={i}>
            <line
              x1={xFor(tick)}
              y1={padTop}
              x2={xFor(tick)}
              y2={height - padBot}
              stroke="#fff"
              strokeOpacity={0.04}
            />
            <text
              x={xFor(tick)}
              y={height - padBot + 14}
              textAnchor="middle"
              fontSize={9}
              fill="#fff"
              fillOpacity={0.45}
              fontFamily="ui-monospace, monospace"
            >
              {tick.toFixed(1)}
            </text>
          </g>
        ))}

        {/* Cutoff line — the visual heart of this chart */}
        {cutoffX != null && (
          <g>
            <line
              x1={cutoffX}
              x2={cutoffX}
              y1={padTop - 4}
              y2={height - padBot + 4}
              stroke="#10b981"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              opacity={0.85}
            />
            <text
              x={cutoffX}
              y={padTop - 2}
              textAnchor="middle"
              fontSize={9}
              fontWeight={700}
              fill="#34d399"
              fontFamily="ui-monospace, monospace"
            >
              CUTOFF
            </text>
          </g>
        )}

        {/* Rows */}
        {top.map((r, idx) => {
          const yMid = padTop + rowH * (idx + 0.5);
          const x = xFor(r.avg_rank);
          const advancing = idx < cutoff;
          const color = PILLAR_COLORS[r.wg_number] || '#48CAE4';
          return (
            <g key={r.id || r.question_id}>
              {/* Stem from axis */}
              <line
                x1={padLeft}
                x2={x}
                y1={yMid}
                y2={yMid}
                stroke={color}
                strokeOpacity={advancing ? 0.65 : 0.3}
                strokeWidth={advancing ? 2.5 : 1.5}
              />
              {/* Rank label */}
              <text
                x={padLeft - 6}
                y={yMid}
                textAnchor="end"
                dominantBaseline="central"
                fontSize={11}
                fontWeight={700}
                fill={advancing ? '#34d399' : '#fff'}
                fillOpacity={advancing ? 1 : 0.55}
                fontFamily="ui-monospace, monospace"
              >
                {idx + 1}
              </text>
              {/* Lollipop head */}
              <circle
                cx={x}
                cy={yMid}
                r={advancing ? 7 : 5}
                fill={color}
                fillOpacity={advancing ? 0.95 : 0.55}
                stroke={advancing ? '#0A1628' : 'transparent'}
                strokeWidth={1.5}
              />
              {/* WG label inside head when advancing */}
              {advancing && r.wg_number && (
                <text
                  x={x}
                  y={yMid}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={8}
                  fontWeight={800}
                  fill="#0A1628"
                  style={{ pointerEvents: 'none' }}
                >
                  {r.wg_number}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </FigureFrame>
  );
}

// -- Shared frame ----------------------------------------------------------

function FigureFrame({ title, subtitle, children }) {
  return (
    <div className="flex h-full min-h-0 flex-col rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3">
      <div className="mb-1 flex shrink-0 items-baseline justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/65">{title}</p>
        {subtitle && (
          <p className="text-[10px] text-white/40 truncate">{subtitle}</p>
        )}
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        {children}
      </div>
    </div>
  );
}

// Re-exported for callers that want labels for legends elsewhere
export { WG_LABELS };
