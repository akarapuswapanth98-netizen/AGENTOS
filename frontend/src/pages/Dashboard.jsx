import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api, getErrorMessage } from '../api/client.js'
import AgentTrace from '../components/AgentTrace.jsx'
import EmptyState from '../components/EmptyState.jsx'
import ErrorBanner from '../components/ErrorBanner.jsx'
import GoalForm from '../components/GoalForm.jsx'
import Loader from '../components/Loader.jsx'
import ReadinessChart from '../components/ReadinessChart.jsx'
import Skeleton from '../components/Skeleton.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'

// Fake pipeline steps shown while POST /goals is in flight (takes seconds).
const BUILD_STEPS = ['Orchestrator', 'Analyst', 'Planner', 'Validator', 'Saved']

const CATEGORY_LABELS = {
  technical_skills: 'Technical Skills',
  projects: 'Projects',
  problem_solving: 'Problem Solving',
  interview: 'Interview',
  communication: 'Communication',
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function BuildingPlan() {
  const [active, setActive] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setActive((a) => (a + 1) % BUILD_STEPS.length), 900)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-slate-900">Generating your plan…</p>
      <ol className="mt-3 space-y-2">
        {BUILD_STEPS.map((s, i) => (
          <li key={s} className="flex items-center gap-2 text-sm">
            <span className={`h-2.5 w-2.5 rounded-full ${i < active ? 'bg-green-500' : i === active ? 'animate-pulse bg-indigo-600' : 'bg-slate-300'}`} />
            <span className={i <= active ? 'text-slate-700' : 'text-slate-400'}>{s}</span>
          </li>
        ))}
      </ol>
      {/* Shape matches AgentTrace entries so the layout feels consistent. */}
      <div className="hidden"><AgentTrace trace={[]} /></div>
    </div>
  )
}

// Dashboard: greeting, readiness overview, today's work, then goals.
export default function Dashboard() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const prefillSkills = params.get('skills') || ''
  const { user } = useAuth()
  const toast = useToast()
  const [goals, setGoals] = useState([])
  const [dash, setDash] = useState(null)
  const [categories, setCategories] = useState(null)
  const [history, setHistory] = useState([])
  const [dueCount, setDueCount] = useState(null)
  const [myProgress, setMyProgress] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState(null)

  // quiet=true refreshes in the background and keeps what is on screen,
    // so actions like deleting a goal do not flash the loading skeleton.
  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    setError('')
    try {
      const [goalList, dashboard, due, mine] = await Promise.all(
        [api.listGoals(), api.getDashboard(), api.getDueReviews(), api.getMyProgress()])
      setGoals(goalList)
      setDash(dashboard)
      setDueCount(due.count)
      setMyProgress(mine)
      if (dashboard.active_goal) {
        const [prog, hist] = await Promise.all([
          api.getProgress(dashboard.active_goal.id),
          api.getHistory(dashboard.active_goal.id),
        ])
        setCategories(prog.categories || null)
        setHistory(hist)
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load dashboard'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleCreate(payload) {
    setSubmitting(true)
    setError('')
    try {
      const res = await api.createGoal(payload)
      toast.success('Plan generated')
      navigate(`/goals/${res.goal.id}`)
    } catch (err) {
      const msg = getErrorMessage(err, 'Could not create goal')
      setError(msg)
      toast.error(msg)
      setSubmitting(false)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this goal and all its tasks?')) return
    setDeletingId(id)
    try {
      await api.deleteGoal(id)
      setGoals((g) => g.filter((x) => x.id !== id))
      toast.success('Goal deleted')
      load(true)
    } catch (err) {
      const msg = getErrorMessage(err, 'Could not delete goal')
      setError(msg)
      toast.error(msg)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{greeting()}{user ? `, ${user.name}` : ''}</h1>
        <p className="text-sm text-slate-500">Here is where your career prep stands today.</p>
      </div>

      <ErrorBanner message={error} onRetry={() => load()} />

      {loading ? <Loader label="Loading dashboard…" /> : dash && (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500">Readiness</p>
              <p className="text-2xl font-bold text-indigo-600">{dash.active_goal ? dash.active_goal.readiness_score : '—'}</p>
              {dash.active_goal && <Link to={`/goals/${dash.active_goal.id}`} className="text-xs font-medium text-indigo-600 hover:underline">{dash.active_goal.title}</Link>}
            </div>
            <Link to="/review" className="block rounded-xl bg-white p-4 shadow-sm transition hover:shadow-md">
              <p className="text-xs text-slate-500">Reviews due</p>
              <p className="text-2xl font-bold text-slate-900">{dueCount ?? '—'}</p>
              <p className="text-xs font-medium text-indigo-600">Review today →</p>
            </Link>
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500">Due today</p>
              <p className="text-2xl font-bold text-slate-900">{dash.today_tasks.length}</p>
            </div>
            {(() => {
              // Only link somewhere useful: a goal's overdue list when there is
              // one, otherwise a plain card (never a link back to this page).
              const overdueBody = (
                <>
                  <p className="text-xs text-slate-500">Overdue {dash.overdue_count > 0 && <span className="ml-1 rounded-full bg-red-100 px-2 py-0.5 font-semibold text-red-700">{dash.overdue_count}</span>}</p>
                  <p className="text-2xl font-bold text-slate-900">{dash.overdue_count}</p>
                  {dash.overdue_tasks.length > 0
                    ? <p className="text-xs font-medium text-indigo-600">View overdue →</p>
                    : <p className="text-xs text-slate-400">Nothing overdue</p>}
                </>
              )
              return dash.overdue_tasks.length > 0 ? (
                <Link to={`/goals/${dash.overdue_tasks[0].goal_id}?filter=overdue`}
                  className="block rounded-xl bg-white p-4 shadow-sm transition hover:shadow-md">
                  {overdueBody}
                </Link>
              ) : (
                <div className="rounded-xl bg-white p-4 shadow-sm">{overdueBody}</div>
              )
            })()}
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500">Streak</p>
              <p className="text-2xl font-bold text-slate-900">🔥 {myProgress ? myProgress.current_streak : '—'}d</p>
              <p className="text-xs text-slate-400">{dash.completed_this_week} done this week</p>
            </div>
          </div>

          {myProgress && (
            <div className="rounded-xl bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">Badges</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {myProgress.earned.map((b) => (
                  <span key={b.badge} title={`Earned ${new Date(b.awarded_at).toLocaleDateString()}`}
                    className="rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white">🏅 {b.badge}</span>
                ))}
                {myProgress.locked.map((b) => (
                  <span key={b.badge} title={b.hint}
                    className="cursor-help rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-500">🔒 {b.badge}</span>
                ))}
              </div>
            </div>
          )}

          {(dash.today_tasks.length > 0 || dash.overdue_tasks.length > 0) && (
            <div className="rounded-xl bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">Today&apos;s tasks</h2>              <ul className="mt-2 space-y-2">
                {[...dash.overdue_tasks, ...dash.today_tasks].map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-2 text-sm">
                    <Link to={`/tasks/${t.id}`} className="truncate text-slate-700 hover:text-indigo-600">{t.title}</Link>
                    {t.due_date && new Date(t.due_date) < new Date(new Date().toDateString()) ? (
                      <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">overdue</span>
                    ) : (
                      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{t.skill}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {dash.today_tasks.length === 0 && dash.overdue_tasks.length === 0 && (
            <div className="rounded-xl bg-white p-5 text-sm text-slate-500 shadow-sm">Nothing overdue — nice work.</div>
          )}

          {categories && (
            <div className="rounded-xl bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">Readiness breakdown</h2>
              <div className="mt-3 space-y-2">
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <div key={key}>
                    <div className="flex justify-between text-sm text-slate-600"><span>{label}</span><span>{categories[key] ?? 0}</span></div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                      <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${categories[key] ?? 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Readiness trend</h2>
            <div className="mt-2"><ReadinessChart history={history} /></div>
          </div>
        </>
      )}

      {submitting ? <BuildingPlan /> : <GoalForm onSubmit={handleCreate} submitting={submitting} initialSkills={prefillSkills} />}

      <div>
        <h2 className="mb-3 text-base font-semibold text-slate-900">Your goals</h2>
        {loading ? <Skeleton rows={4} /> : goals.length === 0 ? (
          <EmptyState title="No goals yet" hint="Create one above to generate your first AI plan." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {goals.map((g) => (
              <div key={g.id} className="rounded-xl bg-white p-4 shadow-sm">
                <Link to={`/goals/${g.id}`} className="font-medium text-slate-900 hover:text-indigo-600">{g.title}</Link>
                <p className="mt-1 text-sm text-slate-500">{g.target_role} · {g.timeline_days} days</p>
                <p className="text-xs text-slate-400">Created {new Date(g.created_at).toLocaleDateString()}</p>
                <div className="mt-3 flex gap-2">
                  <Link to={`/goals/${g.id}`} className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100">Open</Link>
                  <button
                    onClick={() => handleDelete(g.id)}
                    disabled={deletingId === g.id}
                    className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-60"
                  >
                    {deletingId === g.id ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
