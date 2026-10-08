import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { api, getErrorMessage } from '../api/client.js'
import AgentTrace from '../components/AgentTrace.jsx'
import EmptyState from '../components/EmptyState.jsx'
import ErrorBanner from '../components/ErrorBanner.jsx'
import ProgressPanel from '../components/ProgressPanel.jsx'
import Skeleton from '../components/Skeleton.jsx'
import TaskCard from '../components/TaskCard.jsx'
import { useToast } from '../context/ToastContext.jsx'

const FILTERS = ['all', 'pending', 'in_progress', 'completed', 'overdue']

// Goal overview: analysis header, progress panel, week-grouped tasks, agent trace.
export default function GoalDetail() {
  const { id } = useParams()
  const toast = useToast()
  const [goal, setGoal] = useState(null)
  const [progress, setProgress] = useState(null)
  const [trace, setTrace] = useState([])
  const [tasks, setTasks] = useState([])
  const [filter, setFilter] = useState('all')
  const [searchQ, setSearchQ] = useState('')
  const [searchSkill, setSearchSkill] = useState('')
  const [searchOverdue, setSearchOverdue] = useState(false)
  const [searching, setSearching] = useState(false)
  const [searchTotal, setSearchTotal] = useState(0)
  const searchActive = searchQ.trim() !== '' || searchSkill !== '' || searchOverdue
  const skillOptions = useMemo(() => goal?.current_skills || [], [goal])
  const [params] = useSearchParams()
  const initialFilter = params.get('filter')
  useEffect(() => {
    if (initialFilter && FILTERS.includes(initialFilter)) setFilter(initialFilter)
  }, [initialFilter])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [replanning, setReplanning] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editRole, setEditRole] = useState('')
  const [editDays, setEditDays] = useState(28)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [detail, prog, tr] = await Promise.all([api.getGoal(id), api.getProgress(id), api.getTrace(id)])
      setGoal(detail.goal)
      setTasks(detail.tasks)
      setProgress(prog)
      setTrace(tr)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load goal'))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  async function handleReplan() {
    if (!window.confirm('Re-plan this goal? Completed tasks are kept; open tasks will be replaced.')) return
    setReplanning(true)
    setError('')
    try {
      const res = await api.replanGoal(id)
      setGoal(res.goal)
      setTasks(res.tasks)
      setTrace(res.trace)
      setProgress(await api.getProgress(id))
      toast.success('Plan regenerated — completed tasks kept')
    } catch (err) {
      const msg = getErrorMessage(err, 'Could not re-plan')
      setError(msg)
      toast.error(msg)
    } finally {
      setReplanning(false)
    }
  }

  function startEditing() {
    setEditTitle(goal.title)
    setEditRole(goal.target_role)
    setEditDays(goal.timeline_days)
    setEditing(true)
  }

  async function handleEdit(e) {
    e.preventDefault()
    setError('')
    try {
      const updated = await api.updateGoal(id, {
        title: editTitle.trim(),
        target_role: editRole.trim(),
        timeline_days: Number(editDays),
      })
      setGoal(updated)
      setEditing(false)
      toast.success('Goal updated')
    } catch (err) {
      const msg = getErrorMessage(err, 'Could not update goal')
      setError(msg)
      toast.error(msg)
    }
  }

  // Re-query the filterable tasks endpoint when the status filter changes.
  // "overdue" is computed client-side from the server's overdue flags.
  useEffect(() => {
    if (searchActive) return  // search effect below takes over
    let cancelled = false
    const status = filter === 'overdue' ? 'all' : filter
    api.getGoalTasks(id, status).then((t) => {
      if (!cancelled) setTasks(filter === 'overdue' ? t.filter((x) => x.is_overdue) : t)
    }).catch((err) => {
      // Never fail silently: a stale list looks like "no tasks".
      if (!cancelled) setError(getErrorMessage(err, 'Could not load tasks'))
    })
    return () => { cancelled = true }
  }, [id, filter, searchActive])

  // Status chips keep working while a search is active: "overdue" is its own
  // flag, the other statuses are sent to the server as ?status=.
  const statusParam = filter !== 'all' && filter !== 'overdue' ? filter : undefined
  const overdueParam = filter === 'overdue' || searchOverdue ? true : undefined

  // Debounced server search scoped to this goal (~300 ms).
  useEffect(() => {
    if (!searchActive) return
    setSearching(true)
    const timer = setTimeout(() => {
      api.searchTasks({ q: searchQ.trim() || undefined, skill: searchSkill || undefined,
                        overdue: overdueParam, status: statusParam, goal_id: id })
        .then((res) => { setTasks(res.items); setSearchTotal(res.total) })
        .catch((err) => setError(getErrorMessage(err, 'Search failed')))
        .finally(() => setSearching(false))
    }, 300)
    return () => clearTimeout(timer)
  }, [id, searchQ, searchSkill, searchOverdue, searchActive, statusParam, overdueParam])

  // Describe what is actually filtered, so an empty search box never shows "for ''".
  const filterLabel = [
    searchQ.trim() ? `“${searchQ.trim()}”` : null,
    searchSkill || null,
    searchOverdue || (filter === 'overdue' ? 'overdue only' : null),
  ].filter(Boolean).join(' · ')

  const byWeek = useMemo(() => {
    const groups = {}
    for (const t of tasks) {
      const k = `Week ${t.week}`
      if (!groups[k]) groups[k] = []
      groups[k].push(t)
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
  }, [tasks])

  if (loading) return <Skeleton rows={5} />
  if (error && !goal) return <ErrorBanner message={error} onRetry={load} />
  if (!goal) return <EmptyState title="Goal not found" hint="It may have been deleted." />

  const difficulty = goal.analysis?.difficulty
  const summary = goal.analysis?.summary

  return (
    <div className="space-y-6">
      <Link to="/" className="text-sm font-medium text-indigo-600 hover:underline">← Back to dashboard</Link>
      <ErrorBanner message={error} onRetry={load} />

      <div className="rounded-xl bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold text-slate-900">{goal.title}</h1>
          {difficulty && (
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold capitalize text-indigo-700">{difficulty}</span>
          )}
        </div>
        <p className="mt-1 text-sm text-slate-500">{goal.target_role} · {goal.timeline_days} days · {goal.current_skills?.join(', ')}</p>
        {summary && <p className="mt-3 text-sm text-slate-600">{summary}</p>}
        <Link to={`/interviews?goalId=${goal.id}`}
          className="mt-3 inline-block rounded-lg bg-violet-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-violet-700">
          Start mock interview
        </Link>
        <Link to={`/goals/${goal.id}/report`}
          className="mt-3 ml-2 inline-block rounded-lg bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white hover:bg-slate-700">
          View Report
        </Link>
        <button onClick={handleReplan} disabled={replanning}
          className="mt-3 ml-2 rounded-lg bg-amber-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60">
          {replanning ? 'Re-planning…' : 'Re-plan'}
        </button>
        <button onClick={() => (editing ? setEditing(false) : startEditing())}
          className="mt-3 ml-2 rounded-lg bg-slate-100 px-4 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-200">
          {editing ? 'Cancel edit' : 'Edit goal'}
        </button>
      </div>

      {replanning && (
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">Regenerating your plan…</p>
          <ol className="mt-3 space-y-2">
            {['Analyst', 'Planner', 'Saving'].map((s) => (
              <li key={s} className="flex items-center gap-2 text-sm text-slate-600">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-indigo-600" />{s}
              </li>
            ))}
          </ol>
        </div>
      )}

      {editing && (
        <form onSubmit={handleEdit} className="space-y-3 rounded-xl bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Edit goal</h2>
          <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
          <div className="grid gap-3 sm:grid-cols-2">
            <input value={editRole} onChange={(e) => setEditRole(e.target.value)} required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
            <input type="number" min="1" max="365" value={editDays} onChange={(e) => setEditDays(e.target.value)} required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
          </div>
          <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
            Save changes
          </button>
        </form>
      )}

      <ProgressPanel progress={progress} />

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <div className="grid gap-2 sm:grid-cols-4">
          <input value={searchQ} onChange={(e) => setSearchQ(e.target.value)} placeholder="Search title, description, note…"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none sm:col-span-2" />
          <select value={searchSkill} onChange={(e) => setSearchSkill(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none">
            <option value="">All skills</option>
            {skillOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={searchOverdue} onChange={(e) => setSearchOverdue(e.target.checked)} />
            Overdue only
          </label>
        </div>
        {searching && <p className="mt-2 text-xs text-slate-400">Searching…</p>}
        {searchActive && !searching && (
          <p className="mt-2 text-xs text-slate-500">{searchTotal} match{searchTotal === 1 ? '' : 'es'}{filterLabel ? ` for ${filterLabel}` : ''}</p>
        )}
        {searchActive && !searching && statusParam === 'completed' && overdueParam && (
          <p className="mt-1 text-xs text-slate-400">No overdue tasks are completed - pick another status chip.</p>
        )}
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-slate-900">Tasks</h2>
          <div className="flex gap-1">
            {FILTERS.map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`rounded-lg px-3 py-1 text-xs font-semibold ${filter === f ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-200'}`}>
                {f}
              </button>
            ))}
          </div>
        </div>
        {tasks.length === 0 ? (
          <EmptyState title="No tasks match" hint="Try a different search or status filter, or re-plan the goal." />
        ) : (
          byWeek.map(([week, list]) => (
            <div key={week} className="mb-4">
              <h3 className="mb-2 text-sm font-semibold text-slate-500">{week}</h3>
              <div className="grid gap-3 md:grid-cols-2">
                {list.map((t) => <TaskCard key={t.id} task={t} />)}
              </div>
            </div>
          ))
        )}
      </div>

      <div>
        <h2 className="mb-3 text-base font-semibold text-slate-900">Agent activity</h2>
        <AgentTrace trace={trace} />
      </div>
    </div>
  )
}
