import { Link } from 'react-router-dom'

const TYPE_STYLES = {
  learn: 'bg-sky-100 text-sky-700',
  practice: 'bg-violet-100 text-violet-700',
  project: 'bg-emerald-100 text-emerald-700',
  remedial: 'bg-orange-100 text-orange-700',
}

const STATUS_STYLES = {
  pending: 'bg-slate-100 text-slate-600',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700',
}

// One task row: title, badges, skill, score, attempts. Links to /tasks/:id.
export default function TaskCard({ task }) {
  return (
    <Link to={`/tasks/${task.id}`} className="block rounded-xl bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${TYPE_STYLES[task.task_type] || 'bg-slate-100 text-slate-600'}`}>
          {task.task_type}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[task.status] || 'bg-slate-100 text-slate-600'}`}>
          {task.status}
        </span>
        <span className="text-xs text-slate-400">Week {task.week} · #{task.order}</span>
      </div>
      <h4 className="mt-2 font-medium text-slate-900">{task.title}</h4>
      <p className="mt-1 line-clamp-2 text-sm text-slate-500">{task.description}</p>
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
        <span>Skill: <b className="text-slate-700">{task.skill}</b></span>
        {task.score !== null && task.score !== undefined && <span>Score: <b className="text-slate-700">{task.score}</b></span>}
        <span>Attempts: <b className="text-slate-700">{task.attempts}</b></span>
      </div>
    </Link>
  )
}
