// Cyber SVG readiness trend chart with neon gradient stroke and glowing area fill
export default function ReadinessChart({ history }) {
  const W = 560
  const H = 170
  const PAD = 28

  if (!history || history.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-indigo-500/20 bg-indigo-950/10 p-4 text-center">
        <p className="text-sm text-slate-400">
          No readiness snapshots yet — complete your first task to initialize telemetric tracking.
        </p>
      </div>
    )
  }

  const n = history.length
  const xs = (i) => (n === 1 ? W / 2 : PAD + (i * (W - 2 * PAD)) / (n - 1))
  const ys = (score) => H - PAD - (Math.min(100, Math.max(0, score)) / 100) * (H - 2 * PAD)
  const pts = history.map((h, i) => `${xs(i)},${ys(h.score)}`).join(' ')

  // Area polygon points closing back down to bottom baseline
  const areaPts = [
    `${xs(0)},${H - PAD}`,
    ...history.map((h, i) => `${xs(i)},${ys(h.score)}`),
    `${xs(n - 1)},${H - PAD}`,
  ].join(' ')

  return (
    <div className="relative w-full overflow-hidden">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible">
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#f43f5e" />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#8b5cf6" floodOpacity="0.8" />
          </filter>
        </defs>

        {/* Gridlines */}
        {[0, 25, 50, 75, 100].map((g) => (
          <g key={g}>
            <line
              x1={PAD}
              x2={W - PAD}
              y1={ys(g)}
              y2={ys(g)}
              stroke="rgba(129, 140, 248, 0.12)"
              strokeDasharray="4 4"
              strokeWidth="1"
            />
            <text x={4} y={ys(g) + 3} fontSize="9" fill="#64748b" fontFamily="monospace">
              {g}
            </text>
          </g>
        ))}

        {/* Shaded Area */}
        <polygon points={areaPts} fill="url(#areaGradient)" />

        {/* Polyline */}
        <polyline
          points={pts}
          fill="none"
          stroke="url(#lineGradient)"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
          filter="url(#glow)"
        />

        {/* Data points */}
        {history.map((h, i) => (
          <g key={h.id || i} className="cursor-pointer group">
            <circle
              cx={xs(i)}
              cy={ys(h.score)}
              r="6"
              fill="#070a12"
              stroke="#22d3ee"
              strokeWidth="2.5"
            />
            <circle
              cx={xs(i)}
              cy={ys(h.score)}
              r="2.5"
              fill="#ffffff"
            />
            <title>{`${h.date}: ${h.score}% readiness`}</title>
          </g>
        ))}

        {/* Date labels */}
        <text x={PAD} y={H - 8} fontSize="9" fill="#94a3b8" fontFamily="monospace">
          {history[0].date}
        </text>
        <text x={W - PAD} y={H - 8} fontSize="9" fill="#94a3b8" textAnchor="end" fontFamily="monospace">
          {history[n - 1].date}
        </text>
      </svg>
    </div>
  )
}
