// SVG readiness trend chart (no chart libraries). Points = daily snapshots.
export default function ReadinessChart({ history }) {
  const W = 560
  const H = 160
  const PAD = 28
  if (!history || history.length === 0) {
    return <p className="text-sm text-slate-400">No history yet — complete a task to record your first score.</p>
  }
  const n = history.length
  const xs = (i) => (n === 1 ? W / 2 : PAD + (i * (W - 2 * PAD)) / (n - 1))
  const ys = (score) => H - PAD - (Math.min(100, Math.max(0, score)) / 100) * (H - 2 * PAD)
  const pts = history.map((h, i) => `${xs(i)},${ys(h.score)}`).join(' ')

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {[0, 25, 50, 75, 100].map((g) => (
        <g key={g}>
          <line x1={PAD} x2={W - PAD} y1={ys(g)} y2={ys(g)} stroke="#e2e8f0" strokeWidth="1" />
          <text x={4} y={ys(g) + 4} fontSize="10" fill="#94a3b8">{g}</text>
        </g>
      ))}
      <polyline points={pts} fill="none" stroke="#4f46e5" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {history.map((h, i) => (
        <g key={h.id || i}>
          <circle cx={xs(i)} cy={ys(h.score)} r="4" fill="#4f46e5" />
          <title>{`${h.date}: ${h.score}`}</title>
        </g>
      ))}
      <text x={PAD} y={H - 6} fontSize="10" fill="#94a3b8">{history[0].date}</text>
      <text x={W - PAD} y={H - 6} fontSize="10" fill="#94a3b8" textAnchor="end">{history[n - 1].date}</text>
    </svg>
  )
}
