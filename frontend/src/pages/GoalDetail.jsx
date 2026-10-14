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
import {
  ArrowLeft,
  Sparkles,
  Users2,
  FileBarChart,
  RefreshCw,
  Edit3,
  Search,
  Filter,
  Layers,
  Calendar,
  AlertCircle,
  Clock,
  Compass,
} from 'lucide-react'

const FILTERS = ['all', 'pending', 'in_progress', 'completed', 'overdue']

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
  const [saving, setSaving] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editRole, setEditRole] = useState('')
  const [editDays, setEditDays] = useState(28)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [detail, prog, tr] = await Promise.all([
        api.getGoal(id),
        api.getProgress(id),
        api.getTrace(id),
      ])
      setGoal(detail.goal)
      setTasks(detail.tasks)
      setProgress(prog)
      setTrace(tr)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load goal blueprint'))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  async function handleReplan() {
    if (!window.confirm('Re-plan this goal? Completed tasks will be kept; pending tasks will be dynamically rescheduled.')) return
    setReplanning(true)
    setError('')
    try {
      const res = await api.replanGoal(id)
      setGoal(res.goal)
      setTasks(res.tasks)
      setTrace(res.trace)
      setProgress(await api.getProgress(id))
      toast.success('Agent roadmap regenerated — completed milestones retained')
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
    if (saving) return
    setSaving(true)
    setError('')
    try {
      const updated = await api.updateGoal(id, {
        title: editTitle.trim(),
        target_role: editRole.trim(),
        timeline_days: Number(editDays),
      })
      setGoal(updated)
      setEditing(false)
      toast.success('Blueprint configuration updated')
    } catch (err) {
      const msg = getErrorMessage(err, 'Could not update goal')
      setError(msg)
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    if (searchActive) return
    let cancelled = false
    const status = filter === 'overdue' ? 'all' : filter
    api.getGoalTasks(id, status).then((t) => {
      if (!cancelled) setTasks(filter === 'overdue' ? t.filter((x) => x.is_overdue) : t)
    }).catch((err) => {
      if (!cancelled) setError(getErrorMessage(err, 'Could not load tasks'))
    })
    return () => { cancelled = true }
  }, [id, filter, searchActive])

  const statusParam = filter !== 'all' && filter !== 'overdue' ? filter : undefined
  const overdueParam = filter === 'overdue' || searchOverdue ? true : undefined

  useEffect(() => {
    if (!searchActive) return
    setSearching(true)
    const timer = setTimeout(() => {
      api.searchTasks({
        q: searchQ.trim() || undefined,
        skill: searchSkill || undefined,
        overdue: overdueParam,
        status: statusParam,
        goal_id: id,
      })
        .then((res) => {
          setTasks(res.items)
          setSearchTotal(res.total)
        })
        .catch((err) => setError(getErrorMessage(err, 'Search failed')))
        .finally(() => setSearching(false))
    }, 300)
    return () => clearTimeout(timer)
  }, [id, searchQ, searchSkill, searchOverdue, searchActive, statusParam, overdueParam])

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
  if (!goal) return <EmptyState title="Goal blueprint not found" hint="It may have been deleted." />

  const difficulty = goal.analysis?.difficulty
  const summary = goal.analysis?.summary

  return (
    <div className="space-y-6 text-slate-200">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Dashboard
      </Link>

      <ErrorBanner message={error} onRetry={load} />

      {/* Blueprint Header HUD */}
      <div className="rounded-3xl cyber-glass border border-indigo-500/25 p-6 sm:p-8 shadow-glass-panel relative overflow-hidden">
        <div className="relative">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
              {goal.title}
            </h1>
            {difficulty && (
              <span className="rounded-full border border-indigo-500/40 bg-indigo-950/70 px-3 py-0.5 text-xs font-mono font-bold uppercase text-indigo-300 shadow-glow-sm">
                DIFFICULTY: {difficulty}
              </span>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-4 text-xs font-mono text-cyan-300">
            <span>ROLE: {goal.target_role}</span>
            <span>•</span>
            <span>TIMELINE: {goal.timeline_days} DAYS</span>
            {goal.current_skills?.length > 0 && (
              <>
                <span>•</span>
                <span className="text-slate-400">SKILLS: {goal.current_skills.join(', ')}</span>
              </>
            )}
          </div>

          {summary && (
            <p className="mt-4 rounded-xl border border-indigo-500/15 bg-slate-900/40 p-4 text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
              {summary}
            </p>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-2.5">
            <Link
              to={`/interviews?goalId=${goal.id}`}
              className="btn-cyber-primary rounded-xl px-4 py-2 text-xs font-semibold flex items-center gap-2"
            >
              <Users2 className="h-4 w-4" />
              Launch Mock Interview
            </Link>
            <Link
              to={`/goals/${goal.id}/report`}
              className="btn-cyber-cyan rounded-xl px-4 py-2 text-xs font-semibold flex items-center gap-2"
            >
              <FileBarChart className="h-4 w-4" />
              Career Dossier (PDF)
            </Link>
            <button
              onClick={handleReplan}
              disabled={replanning}
              className="btn-cyber-ghost rounded-xl px-4 py-2 text-xs font-semibold flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 text-amber-400 ${replanning ? 'animate-spin' : ''}`} />
              {replanning ? 'Re-planning…' : 'Dynamic Re-plan'}
            </button>
            <button
              onClick={() => (editing ? setEditing(false) : startEditing())}
              className="btn-cyber-ghost rounded-xl px-4 py-2 text-xs font-semibold flex items-center gap-2"
            >
              <Edit3 className="h-4 w-4 text-indigo-400" />
              {editing ? 'Cancel' : 'Edit Blueprint'}
            </button>
          </div>
        </div>
      </div>

      {/* Dynamic Re-planning Progress Indicator */}
      {replanning && (
        <div className="rounded-2xl cyber-glass border border-indigo-500/30 p-5 shadow-glass-panel">
          <p className="font-display text-sm font-bold text-white flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-amber-400 animate-spin" />
            Synthesizing Updated Plan with Historical Work Preserved...
          </p>
          <div className="mt-3 flex items-center gap-4 text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1 text-cyan-300">
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" /> Analyst Active
            </span>
            <span>→</span>
            <span className="flex items-center gap-1 text-violet-300">Planner Optimizing</span>
            <span>→</span>
            <span className="text-slate-500">Persisting</span>
          </div>
        </div>
      )}

      {/* In-place Blueprint Editor Form */}
      {editing && (
        <form
          onSubmit={handleEdit}
          className="space-y-4 rounded-2xl cyber-glass border border-indigo-500/25 p-6 shadow-glass-panel"
        >
          <h2 className="font-display text-base font-bold text-white">Edit Blueprint Parameters</h2>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Blueprint Title</label>
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              required
              className="w-full rounded-xl border border-indigo-500/25 bg-[#090d18] px-3.5 py-2 text-sm text-slate-100 focus:border-indigo-400 focus:outline-none"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Target Role</label>
              <input
                value={editRole}
                onChange={(e) => setEditRole(e.target.value)}
                required
                className="w-full rounded-xl border border-indigo-500/25 bg-[#090d18] px-3.5 py-2 text-sm text-slate-100 focus:border-indigo-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Timeline Days</label>
              <input
                type="number"
                min="1"
                max="365"
                value={editDays}
                onChange={(e) => setEditDays(e.target.value)}
                required
                className="w-full rounded-xl border border-indigo-500/25 bg-[#090d18] px-3.5 py-2 text-sm text-slate-100 focus:border-indigo-400 focus:outline-none"
              />
            </div>
          </div>
          <button
            disabled={saving}
            className="btn-cyber-primary rounded-xl px-4 py-2 text-xs font-semibold disabled:opacity-50"
          >
            {saving ? 'Saving changes...' : 'Save Changes'}
          </button>
        </form>
      )}

      {/* Progress Telemetry */}
      <ProgressPanel progress={progress} />

      {/* Search and Filters Hub */}
      <div className="rounded-2xl cyber-glass border border-indigo-500/20 p-5 shadow-glass-panel space-y-3">
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Search task title, description, or notes..."
              className="w-full rounded-xl border border-indigo-500/25 bg-[#090d18] pl-9 pr-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-indigo-400 focus:outline-none"
            />
          </div>

          <select
            value={searchSkill}
            onChange={(e) => setSearchSkill(e.target.value)}
            className="rounded-xl border border-indigo-500/25 bg-[#090d18] px-3 py-2 text-xs text-slate-200 focus:border-indigo-400 focus:outline-none"
          >
            <option value="">All skills</option>
            {skillOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-2 text-xs text-slate-300 font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={searchOverdue}
              onChange={(e) => setSearchOverdue(e.target.checked)}
              className="rounded border-indigo-500/40 bg-slate-900 text-indigo-600 focus:ring-0"
            />
            Show Overdue Only
          </label>
        </div>

        {searching && <p className="text-xs text-slate-400 font-mono">Querying task matrix…</p>}
        {searchActive && !searching && (
          <p className="text-xs text-slate-400 font-mono">
            {searchTotal} match{searchTotal === 1 ? '' : 'es'}
            {filterLabel ? ` for ${filterLabel}` : ''}
            {statusParam === 'completed' && overdueParam ? ' (completed tasks are never overdue)' : ''}
          </p>
        )}
      </div>

      {/* Task Milestones Grouped by Week */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-500/15 pb-3">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-white">
            <Layers className="h-5 w-5 text-indigo-400" />
            Execution Roadmap & Milestones
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-xl px-3 py-1 text-xs font-mono uppercase font-semibold transition ${
                  filter === f
                    ? 'btn-cyber-primary text-white shadow-glow-sm'
                    : 'bg-slate-900/60 text-slate-400 hover:text-white border border-indigo-500/15'
                }`}
              >
                {f.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {tasks.length === 0 ? (
          <EmptyState
            title="No tasks match active criteria"
            hint="Try resetting your search query or selecting a different status filter."
          />
        ) : (
          byWeek.map(([week, list]) => (
            <div key={week} className="space-y-3">
              <div className="flex items-center gap-2 pt-2">
                <Calendar className="h-4 w-4 text-cyan-400" />
                <h3 className="font-display font-bold text-sm text-slate-300 uppercase tracking-wider">
                  {week}
                </h3>
                <span className="text-xs font-mono text-slate-500">({list.length} tasks)</span>
              </div>
              <div className="grid gap-3.5 md:grid-cols-2">
                {list.map((t) => (
                  <TaskCard key={t.id} task={t} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Multi-Agent Audit Trail */}
      <div>
        <AgentTrace trace={trace} />
      </div>
    </div>
  )
}
