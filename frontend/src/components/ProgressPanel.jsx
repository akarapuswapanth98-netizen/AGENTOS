// Cyber readiness + completion + per-skill telemetry panel
import { Activity, CheckCircle, BarChart3, TrendingUp, AlertTriangle, ShieldCheck } from 'lucide-react'

export default function ProgressPanel({ progress }) {
  if (!progress) return null

  const bar = (pct, gradient) => (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-900 border border-indigo-500/20">
      <div
        className={`progress-stripes h-2 rounded-full ${gradient} transition-all duration-700`}
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  )

  return (
    <div className="rounded-2xl cyber-glass border border-indigo-500/20 p-5 shadow-glass-panel text-slate-200">
      <div className="flex items-center justify-between border-b border-indigo-500/15 pb-3">
        <h3 className="flex items-center gap-2 text-sm font-bold font-display uppercase tracking-wider text-white">
          <Activity className="h-4 w-4 text-cyan-400" />
          Roadmap Telemetry
        </h3>
        <span className="text-xs text-indigo-400 font-mono">LIVE AGENT METRICS</span>
      </div>

      <div className="mt-4">
        <div className="flex items-baseline justify-between text-sm mb-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Readiness Index
          </span>
          <span className="text-2xl font-display font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-300">
            {progress.readiness_score}
            <span className="text-xs text-indigo-400/80 font-normal"> / 100</span>
          </span>
        </div>
        {bar(progress.readiness_score, 'bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-400')}
      </div>

      {/* Mini Stat Chips */}
      <div className="mt-4 grid grid-cols-3 gap-2.5 text-center">
        <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/30 p-2.5">
          <div className="font-display text-base font-bold text-white">{progress.completion_pct}%</div>
          <div className="text-[10px] uppercase font-mono text-indigo-300">completed</div>
        </div>
        <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/30 p-2.5">
          <div className="font-display text-base font-bold text-white">{progress.avg_score ?? '—'}</div>
          <div className="text-[10px] uppercase font-mono text-indigo-300">avg score</div>
        </div>
        <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/30 p-2.5">
          <div className="font-display text-base font-bold text-white">
            {progress.tasks_completed}/{progress.tasks_total}
          </div>
          <div className="text-[10px] uppercase font-mono text-indigo-300">tasks</div>
        </div>
      </div>

      {/* Per-skill mastery breakdown */}
      <div className="mt-5 space-y-2.5">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
          Skill Mastery Projections
        </div>
        {progress.skill_scores.map((s) => (
          <div key={s.skill}>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium text-slate-300">{s.skill}</span>
              <span className="font-mono text-indigo-300 font-bold">{s.score}%</span>
            </div>
            {bar(
              s.score,
              s.score < 60
                ? 'bg-gradient-to-r from-red-500 to-rose-400'
                : s.score >= 75
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                : 'bg-gradient-to-r from-amber-500 to-yellow-400'
            )}
          </div>
        ))}
        {progress.skill_scores.length === 0 && (
          <p className="text-xs text-slate-400">No skill evaluations recorded yet.</p>
        )}
      </div>

      {/* Weak & Strong Areas */}
      {(progress.weak_areas?.length > 0 || progress.strong_areas?.length > 0) && (
        <div className="mt-5 pt-3 border-t border-indigo-500/15 space-y-2">
          {progress.weak_areas?.length > 0 && (
            <div>
              <span className="text-[10px] font-mono uppercase text-red-400 flex items-center gap-1 mb-1">
                <AlertTriangle className="h-3 w-3" /> Focus Deficits:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {progress.weak_areas.map((s) => (
                  <span
                    key={s}
                    className="rounded-full border border-red-500/30 bg-red-950/40 px-2 py-0.5 text-[11px] font-medium text-red-300"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {progress.strong_areas?.length > 0 && (
            <div className="mt-2">
              <span className="text-[10px] font-mono uppercase text-emerald-400 flex items-center gap-1 mb-1">
                <ShieldCheck className="h-3 w-3" /> Mastered Skills:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {progress.strong_areas.map((s) => (
                  <span
                    key={s}
                    className="rounded-full border border-emerald-500/30 bg-emerald-950/40 px-2 py-0.5 text-[11px] font-medium text-emerald-300"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
