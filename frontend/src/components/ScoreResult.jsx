import { Link } from 'react-router-dom'
import { Award, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react'

function colorFor(score) {
  if (score < 60) return { ring: 'stroke-rose-500', text: 'text-rose-400', glow: 'shadow-glow-magenta' }
  if (score < 75) return { ring: 'stroke-amber-500', text: 'text-amber-400', glow: 'shadow-glow-sm' }
  return { ring: 'stroke-emerald-400', text: 'text-emerald-300', glow: 'shadow-glow-emerald' }
}

function BreakdownBar({ label, value }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-300 mb-1">
        <span className="capitalize font-mono">{label.replace(/_/g, ' ')}</span>
        <span className="font-mono text-cyan-300 font-bold">{value}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-900 border border-indigo-500/20">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-700"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  )
}

export default function ScoreResult({ result }) {
  if (!result) return null
  const { ring, text } = colorFor(result.score)
  const circle = 2 * Math.PI * 26
  const offset = circle - (circle * Math.min(100, Math.max(0, result.score))) / 100
  const breakdown = result.feedback?.breakdown || {}
  const strengths = result.feedback?.strengths || []
  const missing = result.feedback?.missing || []
  const recommendation = result.feedback?.recommendation || ''

  return (
    <div className="rounded-2xl cyber-glass border border-indigo-500/30 p-6 shadow-glass-panel text-slate-200">
      <div className="flex items-center gap-5 border-b border-indigo-500/15 pb-4">
        <svg width="76" height="76" viewBox="0 0 72 72" className="shrink-0">
          <circle cx="36" cy="36" r="26" fill="none" strokeWidth="6" className="stroke-slate-800" />
          <circle
            cx="36"
            cy="36"
            r="26"
            fill="none"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circle}
            strokeDashoffset={offset}
            transform="rotate(-90 36 36)"
            className={`${ring} transition-all duration-1000`}
          />
          <text
            x="36"
            y="42"
            textAnchor="middle"
            className={`font-display text-xl font-black ${text}`}
          >
            {result.score}
          </text>
        </svg>

        <div>
          <p className="font-display text-lg font-bold text-white">
            Score: {result.score} / 100
          </p>
          <p className="text-xs text-slate-400">
            {result.score >= 60
              ? '✨ Milestone verified! Task marked completed.'
              : '⚡ Remedial coaching initiated — review the gaps below.'}
          </p>
        </div>
      </div>

      {/* Breakdown dimensions */}
      <div className="mt-4 space-y-3">
        {Object.entries(breakdown).map(([k, v]) => (
          <BreakdownBar key={k} label={k} value={Number(v)} />
        ))}
      </div>

      {strengths.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-mono uppercase text-emerald-400 font-semibold mb-1 flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> Strengths Identified:
          </p>
          <ul className="list-disc pl-5 text-xs text-slate-300 space-y-1">
            {strengths.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      {missing.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-mono uppercase text-amber-400 font-semibold mb-1 flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5" /> Missing Elements:
          </p>
          <ul className="list-disc pl-5 text-xs text-slate-300 space-y-1">
            {missing.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      {recommendation && (
        <div className="mt-4 rounded-xl border border-indigo-500/20 bg-indigo-950/20 p-3.5 text-xs text-indigo-200">
          <p className="font-semibold text-indigo-300 uppercase font-mono text-[10px] mb-1">
            AI Coach Recommendation:
          </p>
          {recommendation}
        </div>
      )}

      {result.remedial_task && (
        <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-950/30 p-4 text-xs">
          <p className="font-bold text-amber-300 flex items-center gap-1.5 font-display text-sm">
            <AlertTriangle className="h-4 w-4" />
            Adaptive Remedial Task Auto-Generated
          </p>
          <p className="mt-1 text-slate-300">
            The validator detected a conceptual gap and synthesized a targeted remedial exercise.
          </p>
          <Link
            to={`/tasks/${result.remedial_task.id}`}
            className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-amber-400 hover:underline"
          >
            Open Remedial Task: {result.remedial_task.title} <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}
    </div>
  )
}
