// Readiness + completion + per-skill bars. Pure presentational.
export default function ProgressPanel({ progress }) {
  if (!progress) return null
  const bar = (pct, color) => (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
      <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
    </div>
  )

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">Progress</h3>
      <div className="mt-3">
        <div className="flex items-baseline justify-between text-sm">
          <span className="text-slate-600">Readiness score</span>
          <span className="text-2xl font-bold text-indigo-600">{progress.readiness_score}</span>
        </div>
        {bar(progress.readiness_score, 'bg-indigo-600')}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
        <div className="rounded-lg bg-slate-50 p-2"><div className="font-bold">{progress.completion_pct}%</div><div className="text-xs text-slate-500">done</div></div>
        <div className="rounded-lg bg-slate-50 p-2"><div className="font-bold">{progress.avg_score ?? '—'}</div><div className="text-xs text-slate-500">avg score</div></div>
        <div className="rounded-lg bg-slate-50 p-2"><div className="font-bold">{progress.tasks_completed}/{progress.tasks_total}</div><div className="text-xs text-slate-500">tasks</div></div>
      </div>
      <div className="mt-4 space-y-2">
        {progress.skill_scores.map((s) => (
          <div key={s.skill}>
            <div className="flex justify-between text-xs text-slate-600"><span>{s.skill}</span><span>{s.score}</span></div>
            {bar(s.score, s.score < 60 ? 'bg-red-500' : s.score >= 75 ? 'bg-green-500' : 'bg-amber-400')}
          </div>
        ))}
        {progress.skill_scores.length === 0 && <p className="text-sm text-slate-400">No skill scores yet.</p>}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {progress.weak_areas.map((s) => <span key={s} className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">{s}</span>)}
        {progress.strong_areas.map((s) => <span key={s} className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">{s}</span>)}
      </div>
    </div>
  )
}
