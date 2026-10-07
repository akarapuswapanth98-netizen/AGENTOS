import { Link } from 'react-router-dom'

function colorFor(score) {
  if (score < 60) return { ring: 'stroke-red-500', text: 'text-red-600' }
  if (score < 75) return { ring: 'stroke-amber-500', text: 'text-amber-600' }
  return { ring: 'stroke-green-500', text: 'text-green-600' }
}

function BreakdownBar({ label, value }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-600"><span className="capitalize">{label.replace(/_/g, ' ')}</span><span>{value}</span></div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
    </div>
  )
}

// Validator result: score circle, breakdown bars, strengths/missing, remedial banner.
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
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <svg width="72" height="72" viewBox="0 0 72 72">
          <circle cx="36" cy="36" r="26" fill="none" strokeWidth="8" className="stroke-slate-200" />
          <circle cx="36" cy="36" r="26" fill="none" strokeWidth="8" strokeLinecap="round"
            strokeDasharray={circle} strokeDashoffset={offset} transform="rotate(-90 36 36)" className={ring} />
          <text x="36" y="41" textAnchor="middle" className={`text-lg font-bold ${text}`}>{result.score}</text>
        </svg>
        <div>
          <p className="font-semibold text-slate-900">Score: {result.score} / 100</p>
          <p className="text-sm text-slate-500">{result.score >= 60 ? 'Task completed 🎉' : 'Keep going — review the gaps below.'}</p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {Object.entries(breakdown).map(([k, v]) => <BreakdownBar key={k} label={k} value={Number(v)} />)}
      </div>

      {strengths.length > 0 && (
        <div className="mt-3"><p className="text-xs font-semibold text-slate-600">Strengths</p>
          <ul className="list-disc pl-5 text-sm text-slate-600">{strengths.map((s, i) => <li key={i}>{s}</li>)}</ul></div>
      )}
      {missing.length > 0 && (
        <div className="mt-3"><p className="text-xs font-semibold text-slate-600">Missing</p>
          <ul className="list-disc pl-5 text-sm text-slate-600">{missing.map((s, i) => <li key={i}>{s}</li>)}</ul></div>
      )}
      {recommendation && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{recommendation}</p>}

      {result.remedial_task && (
        <div className="mt-4 rounded-lg border border-orange-300 bg-orange-50 p-3 text-sm">
          <p className="font-semibold text-orange-700">A review task was created for you.</p>
          <Link to={`/tasks/${result.remedial_task.id}`} className="font-medium text-orange-700 underline">
            Open: {result.remedial_task.title}
          </Link>
        </div>
      )}
    </div>
  )
}
