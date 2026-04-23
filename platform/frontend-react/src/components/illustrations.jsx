/**
 * Inline SVG illustration components for the SAEM AI Consensus Conference platform.
 *
 * Design language: geometric, abstract, navy/teal/cyan palette (SAEM-aligned).
 * All illustrations share cohesive style tokens and animation definitions.
 */

// ---------------------------------------------------------------------------
// Shared CSS animation styles injected into SVGs that use motion
// ---------------------------------------------------------------------------
const svgAnimationStyles = `
  @keyframes pulse-node { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
  @keyframes dash-flow { to { stroke-dashoffset: -20; } }
  @keyframes float-up { 0% { transform: translateY(0); opacity: 0.8; } 100% { transform: translateY(-10px); opacity: 0; } }
  .node-pulse { animation: pulse-node 3s ease-in-out infinite; }
  .line-flow { stroke-dasharray: 8 4; animation: dash-flow 2s linear infinite; }
  .particle-float { animation: float-up 3s ease-out infinite; }
`;

// ---------------------------------------------------------------------------
// 1. HeroIllustration
// ---------------------------------------------------------------------------
/**
 * Large network / constellation visualisation representing the convergence
 * of AI and medicine. Central hub with radiating nodes and connection lines.
 */
export function HeroIllustration(props) {
  const cx = 300;
  const cy = 250;

  // Outer nodes – positions, sizes, colours, optional icon type
  const nodes = [
    { x: 130, y: 80,  r: 18, color: '#00B4D8', icon: 'cross',     delay: 0   },
    { x: 480, y: 70,  r: 16, color: '#10b981', icon: 'pulse',     delay: 0.5 },
    { x: 540, y: 220, r: 20, color: '#06b6d4', icon: 'circuit',   delay: 1   },
    { x: 500, y: 400, r: 15, color: '#D32F2F', icon: 'data',      delay: 1.5 },
    { x: 300, y: 460, r: 17, color: '#f59e0b', icon: 'chart',     delay: 2   },
    { x: 100, y: 410, r: 14, color: '#06b6d4', icon: 'clipboard', delay: 0.3 },
    { x: 60,  y: 240, r: 19, color: '#00B4D8', icon: 'data',      delay: 0.8 },
    { x: 180, y: 170, r: 12, color: '#D32F2F', icon: null,        delay: 1.2 },
    { x: 420, y: 150, r: 13, color: '#10b981', icon: null,        delay: 1.8 },
    { x: 400, y: 340, r: 11, color: '#06b6d4', icon: null,        delay: 2.2 },
  ];

  // Secondary inter-node connections (indices into nodes[])
  const interLinks = [
    [0, 7], [7, 6], [1, 8], [8, 2], [2, 9], [9, 4], [4, 5], [5, 6], [0, 1], [3, 9],
  ];

  function renderIcon(icon, x, y, color) {
    const s = 7; // half-size
    switch (icon) {
      case 'cross':
        return (
          <g>
            <line x1={x - s} y1={y} x2={x + s} y2={y} stroke="#fff" strokeWidth="2" strokeLinecap="round" />
            <line x1={x} y1={y - s} x2={x} y2={y + s} stroke="#fff" strokeWidth="2" strokeLinecap="round" />
          </g>
        );
      case 'pulse':
        return (
          <polyline
            points={`${x - s},${y} ${x - 3},${y} ${x - 1},${y - s} ${x + 1},${y + s} ${x + 3},${y} ${x + s},${y}`}
            fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
          />
        );
      case 'clipboard':
        return (
          <g>
            <rect x={x - 4} y={y - 5} width="8" height="10" rx="1" fill="none" stroke="#fff" strokeWidth="1.3" />
            <rect x={x - 2} y={y - 7} width="4" height="3" rx="0.5" fill="none" stroke="#fff" strokeWidth="1.3" />
          </g>
        );
      case 'circuit':
        return (
          <g>
            <rect x={x - 4} y={y - 4} width="8" height="8" rx="1.5" fill="none" stroke="#fff" strokeWidth="1.3" />
            <line x1={x} y1={y - 6} x2={x} y2={y - 4} stroke="#fff" strokeWidth="1.3" />
            <line x1={x} y1={y + 4} x2={x} y2={y + 6} stroke="#fff" strokeWidth="1.3" />
            <line x1={x - 6} y1={y} x2={x - 4} y2={y} stroke="#fff" strokeWidth="1.3" />
            <line x1={x + 4} y1={y} x2={x + 6} y2={y} stroke="#fff" strokeWidth="1.3" />
          </g>
        );
      case 'data':
        return (
          <g>
            <circle cx={x - 3} cy={y - 3} r="1.5" fill="#fff" />
            <circle cx={x + 3} cy={y - 3} r="1.5" fill="#fff" />
            <circle cx={x - 3} cy={y + 3} r="1.5" fill="#fff" />
            <circle cx={x + 3} cy={y + 3} r="1.5" fill="#fff" />
          </g>
        );
      case 'chart':
        return (
          <g>
            <rect x={x - 5} y={y + 1} width="3" height="5" rx="0.5" fill="#fff" />
            <rect x={x - 1} y={y - 3} width="3" height="9" rx="0.5" fill="#fff" />
            <rect x={x + 3} y={y - 1} width="3" height="7" rx="0.5" fill="#fff" />
          </g>
        );
      default:
        return null;
    }
  }

  return (
    <svg viewBox="0 0 600 500" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <style>{svgAnimationStyles}</style>
      <defs>
        {/* Radial glow behind centre */}
        <radialGradient id="hero-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#00B4D8" stopOpacity="0.18" />
          <stop offset="60%" stopColor="#00B4D8" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#00B4D8" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Background glow */}
      <circle cx={cx} cy={cy} r="220" fill="url(#hero-glow)" />

      {/* Radial lines from centre to each node */}
      {nodes.map((n, i) => (
        <line
          key={`rad-${i}`}
          x1={cx} y1={cy} x2={n.x} y2={n.y}
          stroke="#00B4D8" strokeWidth="1" opacity="0.15"
        />
      ))}

      {/* Animated flow lines from centre to primary nodes */}
      {nodes.filter(n => n.icon).map((n, i) => (
        <line
          key={`flow-${i}`}
          x1={cx} y1={cy} x2={n.x} y2={n.y}
          stroke={n.color} strokeWidth="1.2" opacity="0.45"
          className="line-flow"
          style={{ animationDelay: `${n.delay}s` }}
        />
      ))}

      {/* Inter-node connections */}
      {interLinks.map(([a, b], i) => (
        <line
          key={`link-${i}`}
          x1={nodes[a].x} y1={nodes[a].y} x2={nodes[b].x} y2={nodes[b].y}
          stroke="#00B4D8" strokeWidth="0.8" opacity="0.12"
        />
      ))}

      {/* Small dots at midpoints of inter-node links */}
      {interLinks.map(([a, b], i) => (
        <circle
          key={`mid-${i}`}
          cx={(nodes[a].x + nodes[b].x) / 2}
          cy={(nodes[a].y + nodes[b].y) / 2}
          r="2" fill="#00B4D8" opacity="0.25"
        />
      ))}

      {/* Centre hub ring */}
      <circle cx={cx} cy={cy} r="48" fill="#1B5E8A" opacity="0.08" />
      <circle cx={cx} cy={cy} r="38" fill="#1B5E8A" opacity="0.15" />
      <circle cx={cx} cy={cy} r="28" stroke="#1B5E8A" strokeWidth="2" fill="#1B5E8A" opacity="0.9" />

      {/* Centre brain / neural icon */}
      <g transform={`translate(${cx}, ${cy})`}>
        {/* Simplified brain outline */}
        <path
          d="M-8,-12 C-14,-10 -16,-2 -14,4 C-16,8 -12,14 -6,14 C-4,16 4,16 6,14 C12,14 16,8 14,4 C16,-2 14,-10 8,-12 C6,-16 -6,-16 -8,-12Z"
          fill="none" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round"
        />
        {/* Centre line */}
        <line x1="0" y1="-14" x2="0" y2="14" stroke="#fff" strokeWidth="1" opacity="0.5" />
        {/* Small synaptic dots */}
        <circle cx="-5" cy="-4" r="1.2" fill="#fff" opacity="0.9" />
        <circle cx="5" cy="-4" r="1.2" fill="#fff" opacity="0.9" />
        <circle cx="-4" cy="5" r="1.2" fill="#fff" opacity="0.9" />
        <circle cx="4" cy="5" r="1.2" fill="#fff" opacity="0.9" />
      </g>

      {/* Outer nodes */}
      {nodes.map((n, i) => (
        <g key={`node-${i}`}>
          {/* Soft halo */}
          <circle cx={n.x} cy={n.y} r={n.r + 6} fill={n.color} opacity="0.08" />
          {/* Node circle */}
          <circle
            cx={n.x} cy={n.y} r={n.r} fill={n.color} opacity="0.85"
            className="node-pulse"
            style={{ animationDelay: `${n.delay}s` }}
          />
          {/* Icon inside */}
          {renderIcon(n.icon, n.x, n.y, n.color)}
        </g>
      ))}

      {/* Extra ambient particles */}
      {[
        { x: 220, y: 130, d: 0 },
        { x: 380, y: 370, d: 1 },
        { x: 150, y: 330, d: 2 },
        { x: 450, y: 130, d: 0.6 },
        { x: 350, y: 110, d: 1.4 },
      ].map((p, i) => (
        <circle
          key={`pt-${i}`}
          cx={p.x} cy={p.y} r="2.5" fill="#00B4D8" opacity="0.35"
          className="node-pulse"
          style={{ animationDelay: `${p.d}s` }}
        />
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// 2. DelphiProcessIllustration
// ---------------------------------------------------------------------------
/**
 * Horizontal 3-stage flow diagram: Survey -> Rank -> Vote
 */
export function DelphiProcessIllustration(props) {
  const stages = [
    { label: 'Survey',  cx: 130, color: '#06b6d4', bg: '#22d3ee' },
    { label: 'Rank',    cx: 350, color: '#00B4D8', bg: '#48CAE4' },
    { label: 'Vote',    cx: 570, color: '#10b981', bg: '#34d399' },
  ];

  return (
    <svg viewBox="0 0 700 200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <style>{svgAnimationStyles}</style>

      {/* Curved connecting arrows */}
      {/* Arrow 1 -> 2 */}
      <path
        d="M 195 85 C 240 85, 240 85, 285 85"
        stroke="rgba(255,255,255,0.15)" strokeWidth="2" fill="none" markerEnd="url(#arrow-head)"
      />
      <path
        d="M 195 85 C 240 60, 260 60, 285 85"
        stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" fill="none" opacity="0.4"
        className="line-flow"
      />
      {/* Arrow 2 -> 3 */}
      <path
        d="M 415 85 C 460 85, 480 85, 505 85"
        stroke="rgba(255,255,255,0.15)" strokeWidth="2" fill="none" markerEnd="url(#arrow-head)"
      />
      <path
        d="M 415 85 C 460 60, 480 60, 505 85"
        stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" fill="none" opacity="0.4"
        className="line-flow"
        style={{ animationDelay: '0.8s' }}
      />

      {/* Animated data dots on the path */}
      {[
        { cx1: 195, cx2: 285, cy: 85, delay: 0 },
        { cx1: 220, cx2: 260, cy: 72, delay: 0.7 },
        { cx1: 415, cx2: 505, cy: 85, delay: 0.4 },
        { cx1: 440, cx2: 480, cy: 72, delay: 1.1 },
      ].map((d, i) => (
        <circle
          key={`dot-${i}`}
          cx={(d.cx1 + d.cx2) / 2} cy={d.cy} r="3"
          fill="#00B4D8" opacity="0.5"
          className="node-pulse"
          style={{ animationDelay: `${d.delay}s` }}
        />
      ))}

      <defs>
        <marker id="arrow-head" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
          <path d="M0,0 L8,3 L0,6" fill="rgba(255,255,255,0.3)" />
        </marker>
      </defs>

      {/* Stage boxes */}
      {stages.map((s, i) => (
        <g key={i}>
          {/* Shadow */}
          <rect x={s.cx - 62} y="48" width="124" height="78" rx="16" fill={s.color} opacity="0.08" />
          {/* Box */}
          <rect x={s.cx - 60} y="46" width="120" height="78" rx="14" fill={s.bg} opacity="0.12" stroke={s.color} strokeWidth="1.5" />

          {/* Icons */}
          {i === 0 && (
            /* Envelope / clipboard */
            <g transform={`translate(${s.cx}, 72)`}>
              <rect x="-12" y="-10" width="24" height="18" rx="3" fill="none" stroke={s.color} strokeWidth="1.8" />
              <polyline points="-12,-10 0,2 12,-10" fill="none" stroke={s.color} strokeWidth="1.8" strokeLinejoin="round" />
            </g>
          )}
          {i === 1 && (
            /* Rank / compare arrows */
            <g transform={`translate(${s.cx}, 72)`}>
              <path d="M-10,-6 L0,-12 L10,-6" fill="none" stroke={s.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M-10,6 L0,12 L10,6" fill="none" stroke={s.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="-6" y1="0" x2="6" y2="0" stroke={s.color} strokeWidth="1.8" strokeLinecap="round" />
            </g>
          )}
          {i === 2 && (
            /* People / hand vote */
            <g transform={`translate(${s.cx}, 70)`}>
              {/* Three person silhouettes */}
              <circle cx="-10" cy="-6" r="4" fill="none" stroke={s.color} strokeWidth="1.5" />
              <path d="M-16,4 C-16,0 -4,0 -4,4" fill="none" stroke={s.color} strokeWidth="1.5" />
              <circle cx="10" cy="-6" r="4" fill="none" stroke={s.color} strokeWidth="1.5" />
              <path d="M4,4 C4,0 16,0 16,4" fill="none" stroke={s.color} strokeWidth="1.5" />
              <circle cx="0" cy="-9" r="4" fill="none" stroke={s.color} strokeWidth="1.5" />
              <path d="M-6,1 C-6,-3 6,-3 6,1" fill="none" stroke={s.color} strokeWidth="1.5" />
            </g>
          )}

          {/* Stage number badge */}
          <circle cx={s.cx - 42} cy="56" r="10" fill={s.color} opacity="0.9" />
          <text x={s.cx - 42} y="60" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="700" fontFamily="system-ui, sans-serif">{i + 1}</text>

          {/* Label */}
          <text x={s.cx} y="148" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="14" fontWeight="600" fontFamily="system-ui, sans-serif">{s.label}</text>
        </g>
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// 3. PillarIllustration
// ---------------------------------------------------------------------------
const pillarRenderers = {
  /** Circuit board / microchip – cyan palette */
  technology() {
    return (
      <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        {/* Background circle */}
        <circle cx="60" cy="60" r="56" fill="#06b6d4" opacity="0.08" />

        {/* Central chip */}
        <rect x="40" y="40" width="40" height="40" rx="6" fill="#06b6d4" opacity="0.15" stroke="#06b6d4" strokeWidth="1.5" />
        <rect x="47" y="47" width="26" height="26" rx="3" fill="#06b6d4" opacity="0.2" stroke="#22d3ee" strokeWidth="1" />

        {/* Inner die detail */}
        <rect x="52" y="52" width="16" height="16" rx="2" fill="#06b6d4" opacity="0.35" />
        <circle cx="60" cy="60" r="3" fill="#22d3ee" opacity="0.9" />

        {/* Traces – top */}
        <line x1="50" y1="40" x2="50" y2="24" stroke="#06b6d4" strokeWidth="1.2" opacity="0.5" />
        <line x1="60" y1="40" x2="60" y2="20" stroke="#22d3ee" strokeWidth="1.2" opacity="0.5" />
        <line x1="70" y1="40" x2="70" y2="24" stroke="#06b6d4" strokeWidth="1.2" opacity="0.5" />
        {/* Traces – bottom */}
        <line x1="50" y1="80" x2="50" y2="96" stroke="#06b6d4" strokeWidth="1.2" opacity="0.5" />
        <line x1="60" y1="80" x2="60" y2="100" stroke="#22d3ee" strokeWidth="1.2" opacity="0.5" />
        <line x1="70" y1="80" x2="70" y2="96" stroke="#06b6d4" strokeWidth="1.2" opacity="0.5" />
        {/* Traces – left */}
        <line x1="40" y1="50" x2="24" y2="50" stroke="#06b6d4" strokeWidth="1.2" opacity="0.5" />
        <line x1="40" y1="60" x2="20" y2="60" stroke="#22d3ee" strokeWidth="1.2" opacity="0.5" />
        <line x1="40" y1="70" x2="24" y2="70" stroke="#06b6d4" strokeWidth="1.2" opacity="0.5" />
        {/* Traces – right */}
        <line x1="80" y1="50" x2="96" y2="50" stroke="#06b6d4" strokeWidth="1.2" opacity="0.5" />
        <line x1="80" y1="60" x2="100" y2="60" stroke="#22d3ee" strokeWidth="1.2" opacity="0.5" />
        <line x1="80" y1="70" x2="96" y2="70" stroke="#06b6d4" strokeWidth="1.2" opacity="0.5" />

        {/* Trace-end nodes */}
        {[
          [50, 24], [60, 20], [70, 24],
          [50, 96], [60, 100], [70, 96],
          [24, 50], [20, 60], [24, 70],
          [96, 50], [100, 60], [96, 70],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="2.5" fill="#22d3ee" opacity="0.6" />
        ))}

        {/* Corner trace accents */}
        <path d="M24,24 L32,24 L32,32" fill="none" stroke="#06b6d4" strokeWidth="1" opacity="0.3" />
        <path d="M96,24 L88,24 L88,32" fill="none" stroke="#06b6d4" strokeWidth="1" opacity="0.3" />
        <path d="M24,96 L32,96 L32,88" fill="none" stroke="#06b6d4" strokeWidth="1" opacity="0.3" />
        <path d="M96,96 L88,96 L88,88" fill="none" stroke="#06b6d4" strokeWidth="1" opacity="0.3" />
      </svg>
    );
  },

  /** Open book with knowledge particles – purple palette */
  training() {
    return (
      <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <style>{svgAnimationStyles}</style>
        {/* Background circle */}
        <circle cx="60" cy="60" r="56" fill="#1B5E8A" opacity="0.06" />

        {/* Open book */}
        <path
          d="M60,85 L60,42 C60,42 58,35 38,35 C24,35 20,40 20,40 L20,82 C20,82 24,78 38,78 C52,78 58,82 60,85Z"
          fill="#1B5E8A" opacity="0.1" stroke="#1B5E8A" strokeWidth="1.5" strokeLinejoin="round"
        />
        <path
          d="M60,85 L60,42 C60,42 62,35 82,35 C96,35 100,40 100,40 L100,82 C100,82 96,78 82,78 C68,78 62,82 60,85Z"
          fill="#1B5E8A" opacity="0.1" stroke="#1B5E8A" strokeWidth="1.5" strokeLinejoin="round"
        />
        {/* Page lines – left */}
        <line x1="30" y1="48" x2="52" y2="48" stroke="#1B5E8A" strokeWidth="0.8" opacity="0.3" />
        <line x1="30" y1="55" x2="52" y2="55" stroke="#1B5E8A" strokeWidth="0.8" opacity="0.3" />
        <line x1="30" y1="62" x2="50" y2="62" stroke="#1B5E8A" strokeWidth="0.8" opacity="0.3" />
        <line x1="30" y1="69" x2="48" y2="69" stroke="#1B5E8A" strokeWidth="0.8" opacity="0.25" />
        {/* Page lines – right */}
        <line x1="68" y1="48" x2="90" y2="48" stroke="#1B5E8A" strokeWidth="0.8" opacity="0.3" />
        <line x1="68" y1="55" x2="90" y2="55" stroke="#1B5E8A" strokeWidth="0.8" opacity="0.3" />
        <line x1="70" y1="62" x2="90" y2="62" stroke="#1B5E8A" strokeWidth="0.8" opacity="0.3" />
        <line x1="72" y1="69" x2="90" y2="69" stroke="#1B5E8A" strokeWidth="0.8" opacity="0.25" />

        {/* Spine */}
        <line x1="60" y1="38" x2="60" y2="85" stroke="#1B5E8A" strokeWidth="1.2" opacity="0.4" />

        {/* Graduation cap suggestion – negative space above book */}
        <path
          d="M42,28 L60,20 L78,28 L60,34Z"
          fill="#1B5E8A" opacity="0.18" stroke="#1B5E8A" strokeWidth="1" strokeLinejoin="round"
        />
        <line x1="73" y1="28" x2="73" y2="36" stroke="#1B5E8A" strokeWidth="1" opacity="0.3" />

        {/* Rising knowledge particles */}
        {[
          { x: 40, y: 30, r: 2.5, delay: 0 },
          { x: 52, y: 24, r: 2,   delay: 0.5 },
          { x: 68, y: 26, r: 2.2, delay: 1.0 },
          { x: 80, y: 30, r: 1.8, delay: 1.5 },
          { x: 46, y: 18, r: 1.5, delay: 2.0 },
          { x: 74, y: 20, r: 1.8, delay: 0.8 },
          { x: 60, y: 15, r: 2,   delay: 1.3 },
        ].map((p, i) => (
          <circle
            key={i} cx={p.x} cy={p.y} r={p.r}
            fill="#1B5E8A" opacity="0.5"
            className="particle-float"
            style={{ animationDelay: `${p.delay}s` }}
          />
        ))}
      </svg>
    );
  },

  /** Head silhouette with neural network – teal palette */
  self() {
    return (
      <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <style>{svgAnimationStyles}</style>
        {/* Background circle */}
        <circle cx="60" cy="60" r="56" fill="#10b981" opacity="0.06" />

        {/* Head silhouette (facing right) */}
        <path
          d="M72,95 L48,95 L48,80 C32,78 24,66 24,52 C24,32 38,18 56,18 C74,18 88,32 88,50 C88,60 84,68 78,74 L78,80 C78,82 76,84 72,84 L68,84 L68,88 C68,92 72,95 72,95Z"
          fill="#10b981" opacity="0.1" stroke="#10b981" strokeWidth="1.5" strokeLinejoin="round"
        />

        {/* Neural connections inside head */}
        {/* Nodes */}
        {[
          { x: 50, y: 40, r: 3.5 },
          { x: 65, y: 36, r: 3 },
          { x: 72, y: 50, r: 3.5 },
          { x: 58, y: 55, r: 4 },
          { x: 42, y: 52, r: 3 },
          { x: 48, y: 65, r: 3 },
          { x: 62, y: 68, r: 3 },
          { x: 55, y: 45, r: 2.5 },
        ].map((n, i) => (
          <g key={i}>
            <circle cx={n.x} cy={n.y} r={n.r} fill="#10b981" opacity="0.35"
              className="node-pulse" style={{ animationDelay: `${i * 0.4}s` }}
            />
            <circle cx={n.x} cy={n.y} r={n.r * 0.5} fill="#10b981" opacity="0.7" />
          </g>
        ))}

        {/* Neural links */}
        {[
          [50, 40, 65, 36], [65, 36, 72, 50], [72, 50, 58, 55],
          [58, 55, 42, 52], [42, 52, 50, 40], [58, 55, 48, 65],
          [58, 55, 62, 68], [50, 40, 55, 45], [55, 45, 65, 36],
          [55, 45, 58, 55], [42, 52, 48, 65], [72, 50, 62, 68],
        ].map(([x1, y1, x2, y2], i) => (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="#10b981" strokeWidth="0.8" opacity="0.3"
          />
        ))}

        {/* Thought / emission arcs outside head */}
        <path d="M80,38 C88,34 92,40 88,46" fill="none" stroke="#10b981" strokeWidth="1" opacity="0.2" />
        <path d="M84,30 C94,26 100,34 94,42" fill="none" stroke="#10b981" strokeWidth="0.8" opacity="0.15" />
      </svg>
    );
  },

  /** Connected people network / community – amber palette */
  society() {
    return (
      <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <style>{svgAnimationStyles}</style>
        {/* Background circle */}
        <circle cx="60" cy="60" r="56" fill="#d97706" opacity="0.06" />

        {/* People nodes in a balanced network */}
        {[
          { x: 60, y: 30, delay: 0 },     // top
          { x: 92, y: 48, delay: 0.5 },    // top-right
          { x: 92, y: 78, delay: 1.0 },    // bottom-right
          { x: 60, y: 96, delay: 1.5 },    // bottom
          { x: 28, y: 78, delay: 2.0 },    // bottom-left
          { x: 28, y: 48, delay: 0.3 },    // top-left
        ].map((p, i, arr) => {
          // Connect to next and skip-one for network feel
          const next = arr[(i + 1) % arr.length];
          const skip = arr[(i + 2) % arr.length];
          return (
            <g key={i}>
              {/* Connection to adjacent */}
              <line x1={p.x} y1={p.y} x2={next.x} y2={next.y} stroke="#d97706" strokeWidth="1" opacity="0.2" />
              {/* Connection to skip */}
              <line x1={p.x} y1={p.y} x2={skip.x} y2={skip.y} stroke="#d97706" strokeWidth="0.7" opacity="0.12" />
            </g>
          );
        })}

        {/* Cross connections for balance / scale suggestion */}
        <line x1="60" y1="30" x2="60" y2="96" stroke="#d97706" strokeWidth="0.8" opacity="0.1" />
        <line x1="28" y1="48" x2="92" y2="78" stroke="#d97706" strokeWidth="0.8" opacity="0.1" />
        <line x1="28" y1="78" x2="92" y2="48" stroke="#d97706" strokeWidth="0.8" opacity="0.1" />

        {/* Central balance point */}
        <circle cx="60" cy="63" r="5" fill="#d97706" opacity="0.15" />
        <circle cx="60" cy="63" r="2" fill="#d97706" opacity="0.4" />

        {/* Scale of justice suggestion – subtle horizontal balance beam through center */}
        <line x1="38" y1="63" x2="82" y2="63" stroke="#d97706" strokeWidth="1" opacity="0.15" />
        <line x1="60" y1="56" x2="60" y2="63" stroke="#d97706" strokeWidth="1" opacity="0.15" />

        {/* Person icons at each node */}
        {[
          { x: 60, y: 30 },
          { x: 92, y: 48 },
          { x: 92, y: 78 },
          { x: 60, y: 96 },
          { x: 28, y: 78 },
          { x: 28, y: 48 },
        ].map((p, i) => (
          <g key={`person-${i}`}>
            {/* Head */}
            <circle cx={p.x} cy={p.y - 5} r="5" fill="#d97706" opacity="0.25" stroke="#d97706" strokeWidth="1.2" />
            {/* Body arc */}
            <path
              d={`M${p.x - 7},${p.y + 6} C${p.x - 7},${p.y + 1} ${p.x + 7},${p.y + 1} ${p.x + 7},${p.y + 6}`}
              fill="#d97706" opacity="0.2" stroke="#d97706" strokeWidth="1"
            />
            {/* Pulse */}
            <circle cx={p.x} cy={p.y - 5} r="5" fill="none" stroke="#d97706" strokeWidth="0.8" opacity="0.4"
              className="node-pulse" style={{ animationDelay: `${i * 0.5}s` }}
            />
          </g>
        ))}
      </svg>
    );
  },
};

/**
 * Renders one of four pillar illustrations.
 * @param {{ pillar: 'technology' | 'training' | 'self' | 'society' }} props
 */
export function PillarIllustration({ pillar, ...rest }) {
  const renderer = pillarRenderers[pillar];
  if (!renderer) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`PillarIllustration: unknown pillar "${pillar}"`);
    }
    return null;
  }
  // Clone the SVG element and spread extra props (className, style, etc.)
  const svg = renderer();
  return <div {...rest}>{svg}</div>;
}

// ---------------------------------------------------------------------------
// 4. EmptyStateIllustration
// ---------------------------------------------------------------------------
const emptyStateRenderers = {
  /** Clipboard with magnifying glass */
  'no-data'() {
    return (
      <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        {/* Clipboard body */}
        <rect x="52" y="44" width="80" height="110" rx="10" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
        {/* Clipboard clip */}
        <rect x="74" y="34" width="36" height="18" rx="6" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
        <rect x="82" y="30" width="20" height="10" rx="4" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" />

        {/* Content lines (faded) */}
        <line x1="70" y1="74" x2="114" y2="74" stroke="rgba(255,255,255,0.08)" strokeWidth="3" strokeLinecap="round" />
        <line x1="70" y1="88" x2="108" y2="88" stroke="rgba(255,255,255,0.08)" strokeWidth="3" strokeLinecap="round" />
        <line x1="70" y1="102" x2="100" y2="102" stroke="rgba(255,255,255,0.08)" strokeWidth="3" strokeLinecap="round" />
        <line x1="70" y1="116" x2="96" y2="116" stroke="rgba(255,255,255,0.08)" strokeWidth="3" strokeLinecap="round" />

        {/* Magnifying glass */}
        <circle cx="132" cy="128" r="22" fill="rgba(168,85,247,0.06)" stroke="#00B4D8" strokeWidth="2.5" opacity="0.9" />
        <circle cx="132" cy="128" r="14" fill="none" stroke="#00B4D8" strokeWidth="1.5" opacity="0.3" />
        <line x1="148" y1="144" x2="162" y2="162" stroke="#00B4D8" strokeWidth="3.5" strokeLinecap="round" opacity="0.8" />

        {/* ? in magnifying glass */}
        <text x="132" y="134" textAnchor="middle" fill="#00B4D8" fontSize="18" fontWeight="600" fontFamily="system-ui, sans-serif" opacity="0.6">?</text>
      </svg>
    );
  },

  /** Calendar with clock */
  'no-sessions'() {
    return (
      <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        {/* Calendar body */}
        <rect x="36" y="48" width="100" height="100" rx="10" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
        {/* Calendar header */}
        <rect x="36" y="48" width="100" height="28" rx="10" fill="rgba(255,255,255,0.06)" />
        <rect x="36" y="66" width="100" height="10" fill="rgba(255,255,255,0.06)" />

        {/* Calendar binding rings */}
        <rect x="58" y="40" width="8" height="16" rx="3" fill="rgba(255,255,255,0.1)" />
        <rect x="106" y="40" width="8" height="16" rx="3" fill="rgba(255,255,255,0.1)" />

        {/* Day grid (faded) */}
        {[0, 1, 2, 3].map(row =>
          [0, 1, 2, 3, 4].map(col => (
            <rect
              key={`${row}-${col}`}
              x={48 + col * 17} y={86 + row * 14}
              width="10" height="8" rx="2"
              fill="rgba(255,255,255,0.06)" opacity="0.6"
            />
          ))
        )}

        {/* Clock overlay */}
        <circle cx="140" cy="132" r="30" fill="rgba(16,185,129,0.06)" stroke="#10b981" strokeWidth="2.5" />
        <circle cx="140" cy="132" r="24" fill="none" stroke="#10b981" strokeWidth="1" opacity="0.2" />

        {/* Clock tick marks */}
        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(deg => {
          const rad = (deg * Math.PI) / 180;
          const x1 = 140 + 20 * Math.cos(rad);
          const y1 = 132 + 20 * Math.sin(rad);
          const x2 = 140 + 23 * Math.cos(rad);
          const y2 = 132 + 23 * Math.sin(rad);
          return (
            <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="#10b981" strokeWidth="1.5" opacity="0.35" strokeLinecap="round"
            />
          );
        })}

        {/* Clock hands */}
        <line x1="140" y1="132" x2="140" y2="116" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
        <line x1="140" y1="132" x2="152" y2="138" stroke="#10b981" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
        <circle cx="140" cy="132" r="2.5" fill="#10b981" opacity="0.7" />
      </svg>
    );
  },

  /** Warning triangle with a gentle expression */
  error() {
    return (
      <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        {/* Triangle */}
        <path
          d="M100,40 L170,155 L30,155Z"
          fill="rgba(245,158,11,0.1)" stroke="#f59e0b" strokeWidth="2.5" strokeLinejoin="round"
        />
        {/* Inner triangle highlight */}
        <path
          d="M100,58 L158,148 L42,148Z"
          fill="rgba(245,158,11,0.05)" opacity="0.6"
        />

        {/* Gentle face */}
        {/* Eyes – slightly closed / calm */}
        <circle cx="84" cy="118" r="4" fill="#f59e0b" opacity="0.6" />
        <circle cx="116" cy="118" r="4" fill="#f59e0b" opacity="0.6" />
        {/* Small highlight on eyes */}
        <circle cx="85.5" cy="116.5" r="1.5" fill="#fff" opacity="0.5" />
        <circle cx="117.5" cy="116.5" r="1.5" fill="#fff" opacity="0.5" />

        {/* Gentle mouth – slight concern */}
        <path d="M90,134 C95,130 105,130 110,134" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" opacity="0.5" />

        {/* Exclamation mark (above face) */}
        <rect x="96" y="72" width="8" height="24" rx="4" fill="#f59e0b" opacity="0.7" />
        <circle cx="100" cy="104" r="4" fill="#f59e0b" opacity="0.7" />

        {/* Soft shadow beneath */}
        <ellipse cx="100" cy="170" rx="50" ry="6" fill="#f59e0b" opacity="0.06" />
      </svg>
    );
  },
};

/**
 * Renders an empty-state illustration.
 * @param {{ type: 'no-data' | 'no-sessions' | 'error' }} props
 */
export function EmptyStateIllustration({ type, ...rest }) {
  const renderer = emptyStateRenderers[type];
  if (!renderer) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`EmptyStateIllustration: unknown type "${type}"`);
    }
    return null;
  }
  return <div {...rest}>{renderer()}</div>;
}

// ---------------------------------------------------------------------------
// 5. BackgroundPattern
// ---------------------------------------------------------------------------
/**
 * Subtle repeating dot-grid / topographic-line pattern.
 * Uses currentColor so it can be tinted via className (e.g., text-gray-200).
 */
export function BackgroundPattern(props) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <defs>
        <pattern id="bg-dot-grid" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="10" cy="10" r="1" fill="currentColor" opacity="0.4" />
        </pattern>
        <pattern id="bg-topo" x="0" y="0" width="50" height="50" patternUnits="userSpaceOnUse">
          <path
            d="M0,25 C10,20 15,30 25,25 C35,20 40,30 50,25"
            fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.2"
          />
          <path
            d="M0,45 C12,40 18,50 25,45 C32,40 38,50 50,45"
            fill="none" stroke="currentColor" strokeWidth="0.4" opacity="0.15"
          />
          <path
            d="M0,10 C8,5 16,15 25,10 C34,5 42,15 50,10"
            fill="none" stroke="currentColor" strokeWidth="0.3" opacity="0.1"
          />
        </pattern>
      </defs>
      {/* Dot grid layer */}
      <rect width="100" height="100" fill="url(#bg-dot-grid)" />
      {/* Topographic lines layer */}
      <rect width="100" height="100" fill="url(#bg-topo)" />
    </svg>
  );
}
