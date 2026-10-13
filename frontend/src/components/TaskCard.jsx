import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Clock, AlertCircle } from 'lucide-react'

const TYPE_STYLES = {
  learn: 'border-cyan-500/40 bg-cyan-950/40 text-cyan-300',
  practice: 'border-violet-500/40 bg-violet-950/40 text-violet-300',
  project: 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300',
  remedial: 'border-amber-500/40 bg-amber-950/40 text-amber-300',
}

const STATUS_STYLES = {
  pending: 'border-slate-800 bg-slate-900/60 text-slate-400',
  in_progress: 'border-amber-500/50 bg-amber-950/50 text-amber-300 shadow-sm',
  completed: 'border-emerald-500/50 bg-emerald-950/50 text-emerald-300 shadow-sm',
}

export default function TaskCard({ task }) {
  return (
    <Link
      to={`/tasks/${task.id}`}
      className="card-lift block rounded-2xl cyber-glass border border-indigo-500/20 p-5 shadow-glass-panel transition-all hover:border-indigo-500/50 group"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full border px-2.5 py-0.5 text-[11px] font-mono uppercase font-semibold ${
              TYPE_STYLES[task.task_type] || 'border-slate-800 bg-slate-900 text-slate-400'
            }`}
          >
            {task.task_type}
          </span>
          <span
            className={`rounded-full border px-2.5 py-0.5 text-[11px] font-mono uppercase font-semibold ${
              STATUS_STYLES[task.status] || 'border-slate-800 bg-slate-900 text-slate-400'
            }`}
          >
            {task.status.replace('_', ' ')}
          </span>
          <span className="text-xs text-slate-400 font-mono">
            W{task.week} · #{task.order}
          </span>
        </div>

        {task.is_overdue && (
          <span className="flex items-center gap-1 rounded-full border border-red-500/40 bg-red-950/60 px-2.5 py-0.5 text-xs font-bold text-red-400">
            <AlertCircle className="h-3 w-3" />
            {task.days_overdue}d overdue
          </span>
        )}
      </div>

      <h4 className="mt-3 font-display font-bold text-base text-white group-hover:text-cyan-300 transition">
        {task.title}
      </h4>
      <p className="mt-1 line-clamp-2 text-xs text-slate-400 leading-relaxed">
        {task.description}
      </p>

      <div className="mt-4 pt-3 border-t border-indigo-500/15 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
        <div className="flex flex-wrap items-center gap-3">
          <span>
            Skill: <b className="text-indigo-300 font-mono">{task.skill}</b>
          </span>
          {task.due_date && (
            <span>
              Due: <b className="text-slate-300 font-mono">{new Date(task.due_date).toLocaleDateString()}</b>
            </span>
          )}
          {task.score !== null && task.score !== undefined && (
            <span>
              Score:{' '}
              <b
                className={`font-mono font-bold ${
                  task.score >= 80 ? 'text-emerald-400' : task.score >= 50 ? 'text-amber-400' : 'text-red-400'
                }`}
              >
                {task.score}/100
              </b>
            </span>
          )}
        </div>

        <span className="text-xs text-indigo-400 font-semibold group-hover:translate-x-1 transition flex items-center gap-1">
          Open Workspace <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </Link>
  )
}
