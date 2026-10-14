import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api, getErrorMessage } from '../api/client.js'
import AgentTrace from '../components/AgentTrace.jsx'
import CountUp from '../components/CountUp.jsx'
import EmptyState from '../components/EmptyState.jsx'
import ErrorBanner from '../components/ErrorBanner.jsx'
import GoalForm from '../components/GoalForm.jsx'
import Loader from '../components/Loader.jsx'
import ReadinessChart from '../components/ReadinessChart.jsx'
import Reveal from '../components/Reveal.jsx'
import Skeleton from '../components/Skeleton.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import {
  Sparkles,
  Flame,
  Award,
  CalendarCheck,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  BrainCircuit,
  Activity,
  Layers,
  Trash2,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Rocket,
  Share2,
  Briefcase,
  Target,
} from 'lucide-react'
import MissionLauncher from '../components/MissionLauncher.jsx'
import ShareableAgentCard from '../components/ShareableAgentCard.jsx'
import { useSound } from '../context/SoundContext.jsx'

// Code-split: three.js only downloads when the dashboard hero renders.
const Hero3D = lazy(() => import('../components/Hero3D.jsx'))

// Pipeline steps shown while POST /goals is in flight
const BUILD_STEPS = [
  { name: 'Orchestrator', desc: 'Validating scope & schema' },
  { name: 'Analyst', desc: 'Computing skill-gap matrix' },
  { name: 'Planner', desc: 'Synthesizing weekly milestones' },
  { name: 'Validator', desc: 'Scoring task difficulty & rubrics' },
  { name: 'Saved', desc: 'Writing plan to database' },
]

const CATEGORY_LABELS = {
  technical_skills: 'Technical Skills',
  projects: 'Projects',
  problem_solving: 'Problem Solving',
  interview: 'Interview Readiness',
  communication: 'Technical Communication',
}

const CATEGORY_COLORS = {
  technical_skills: 'from-indigo-500 to-violet-500',
  projects: 'from-cyan-500 to-blue-500',
  problem_solving: 'from-emerald-500 to-teal-500',
  interview: 'from-amber-500 to-orange-500',
  communication: 'from-rose-500 to-pink-500',
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
    const t = setInterval(() => setActive((a) => (a + 1) % BUILD_STEPS.length), 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="rounded-2xl cyber-glass border border-indigo-500/30 p-6 shadow-glass-panel text-slate-100">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-400">
          <BrainCircuit className="h-5 w-5 animate-pulse" />
        </div>
        <div>
          <p className="font-display text-base font-bold text-white">Synthesizing Autonomous Multi-Agent Plan</p>
          <p className="text-xs text-slate-400">Collaborative agent deliberation in progress...</p>
        </div>
      </div>

      <ol className="mt-5 grid gap-2.5 sm:grid-cols-5">
        {BUILD_STEPS.map((s, i) => (
          <li
            key={s.name}
            className={`rounded-xl p-3 border transition-all ${
              i < active
                ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300'
                : i === active
                ? 'border-indigo-500/50 bg-indigo-950/40 text-white shadow-glow-sm'
                : 'border-slate-800 bg-slate-900/30 text-slate-500'
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  i < active
                    ? 'bg-emerald-400'
                    : i === active
                    ? 'bg-indigo-400 animate-ping'
                    : 'bg-slate-700'
                }`}
              />
              <span className="text-xs font-semibold">{s.name}</span>
            </div>
            <p className="mt-1 text-[11px] opacity-80">{s.desc}</p>
          </li>
        ))}
      </ol>
      <div className="hidden"><AgentTrace trace={[]} /></div>
    </div>
  )
}

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
  const [missionOpen, setMissionOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const { playClick } = useSound()

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    setError('')
    try {
      const [goalList, dashboard, due, mine] = await Promise.all([
        api.listGoals(),
        api.getDashboard(),
        api.getDueReviews(),
        api.getMyProgress(),
      ])
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
      setError(getErrorMessage(err, 'Could not load dashboard telemetry'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleCreate(payload) {
    setSubmitting(true)
    setError('')
    try {
      const res = await api.createGoal(payload)
      toast.success('Agent roadmap synthesized successfully')
      navigate(`/goals/${res.goal.id}`)
    } catch (err) {
      const msg = getErrorMessage(err, 'Could not create goal')
      setError(msg)
      toast.error(msg)
      setSubmitting(false)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this goal and its associated tasks?')) return
    setDeletingId(id)
    try {
      await api.deleteGoal(id)
      setGoals((g) => g.filter((x) => x.id !== id))
      toast.success('Goal removed')
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
      {/* 3D Cyber Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 cyber-glass-panel text-white shadow-glass-panel">
        <div className="animate-drift pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full bg-indigo-600/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 right-48 h-72 w-72 rounded-full bg-sky-500/10 blur-3xl" />

        <div className="relative grid gap-4 p-6 sm:grid-cols-[1fr_280px] lg:grid-cols-[1fr_340px] sm:p-8">
          <div className="flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                <p className="text-xs font-mono font-semibold uppercase tracking-widest text-cyan-300">
                  AI Career Operating System
                </p>
              </div>
              <h1 className="mt-2 font-display text-3xl font-extrabold sm:text-4xl text-white">
                {greeting()}{user ? `, ${user.name}` : ''}
              </h1>
              <p className="mt-2 text-sm text-slate-300 max-w-xl leading-relaxed">
                Your neural career copilots are monitoring your skill trajectories, preparing interview rounds, and scheduling spaced-repetition reviews.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                to="/job-match"
                className="btn-cyber-primary rounded-xl px-4 py-2 text-sm font-semibold flex items-center gap-2"
              >
                <Briefcase className="h-4 w-4 text-cyan-300" />
                Job Matching
              </Link>
              <Link
                to="/skills"
                className="btn-cyber-ghost rounded-xl px-4 py-2 text-sm font-semibold flex items-center gap-2"
              >
                <Target className="h-4 w-4 text-indigo-400" />
                Skill Gap Matrix
              </Link>
              <Link
                to="/builder"
                className="btn-cyber-ghost rounded-xl px-4 py-2 text-sm font-semibold flex items-center gap-2"
              >
                <BrainCircuit className="h-4 w-4" />
                Agent Builder
              </Link>
              <Link
                to="/review"
                className="btn-cyber-cyan rounded-xl px-4 py-2 text-sm font-semibold flex items-center gap-2"
              >
                Review Today ({dueCount ?? 0})
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                to="/quiz"
                className="btn-cyber-ghost rounded-xl px-4 py-2 text-sm font-semibold flex items-center gap-2"
              >
                <Sparkles className="h-4 w-4 text-violet-400" />
                Practice Quiz
              </Link>
              <button
                onClick={() => {
                  playClick()
                  setMissionOpen(true)
                }}
                className="btn-cyber-primary rounded-xl px-4 py-2 text-sm font-semibold flex items-center gap-2 shadow-glow-sm"
              >
                <Rocket className="h-4 w-4 animate-pulse text-cyan-300" />
                Run Mission
              </button>
              <button
                onClick={() => {
                  playClick()
                  setShareOpen(true)
                }}
                className="btn-cyber-ghost rounded-xl px-4 py-2 text-sm font-semibold flex items-center gap-2"
              >
                <Share2 className="h-4 w-4 text-cyan-400" />
                Share ID
              </button>
            </div>
          </div>

          {/* Interactive 3D Canvas */}
          <div className="relative hidden min-h-[220px] sm:block">
            <Suspense
              fallback={
                <div className="flex h-full w-full items-center justify-center rounded-2xl border border-indigo-500/20 bg-slate-900/40">
                  <Loader label="Spawning neural core..." />
                </div>
              }
            >
              <Hero3D className="absolute inset-0 h-full w-full" />
            </Suspense>
          </div>
        </div>
      </div>

      <ErrorBanner message={error} onRetry={() => load()} />

      {loading ? (
        <Loader label="Syncing telemetry across agents…" />
      ) : (
        dash && (
          <>
            {/* Live Telemetry Stat HUD Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {/* Readiness Score Card */}
              <Reveal delay={0}>
                <div className="h-full rounded-2xl cyber-glass-card p-5">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-mono uppercase tracking-wider">Readiness</span>
                    <TrendingUp className="h-4 w-4 text-indigo-400" />
                  </div>
                  <div className="mt-2 text-3xl font-display font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-300">
                    {dash.active_goal ? (
                      <CountUp value={dash.active_goal.readiness_score} />
                    ) : (
                      '—'
                    )}
                    {dash.active_goal && <span className="text-base text-indigo-300 font-normal">/100</span>}
                  </div>
                  {dash.active_goal ? (
                    <Link
                      to={`/goals/${dash.active_goal.id}`}
                      className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-indigo-300 hover:text-white transition"
                    >
                      <span className="truncate">{dash.active_goal.title}</span>
                      <ArrowRight className="h-3 w-3 shrink-0" />
                    </Link>
                  ) : (
                    <p className="mt-1 text-xs text-slate-400">No active blueprint</p>
                  )}
                </div>
              </Reveal>

              {/* Reviews Due Card */}
              <Reveal delay={0.05}>
                <Link
                  to="/review"
                  className="block h-full rounded-2xl cyber-glass-card p-5 group"
                >
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-mono uppercase tracking-wider">Reviews Due</span>
                    <CalendarCheck className="h-4 w-4 text-cyan-400" />
                  </div>
                  <div className="mt-2 text-3xl font-display font-extrabold text-cyan-400">
                    {dueCount ?? '—'}
                  </div>
                  <p className="mt-1 text-xs font-semibold text-cyan-300 group-hover:underline flex items-center gap-1">
                    Spaced Repetition <ArrowRight className="h-3 w-3" />
                  </p>
                </Link>
              </Reveal>

              {/* Due Today Card */}
              <Reveal delay={0.1}>
                <div className="h-full rounded-2xl cyber-glass-card p-5">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-mono uppercase tracking-wider">Due Today</span>
                    <CalendarCheck className="h-4 w-4 text-violet-400" />
                  </div>
                  <div className="mt-2 text-3xl font-display font-extrabold text-slate-100">
                    <CountUp value={dash.today_tasks.length} />
                  </div>
                  <p className="mt-1 text-xs text-slate-400">Milestones to achieve</p>
                </div>
              </Reveal>

              {/* Overdue Card */}
              <Reveal delay={0.15}>
                {dash.overdue_tasks.length > 0 ? (
                  <Link
                    to={`/goals/${dash.overdue_tasks[0].goal_id}?filter=overdue`}
                    className="block h-full rounded-2xl cyber-glass-card border-red-500/30 p-5 group"
                  >
                    <div className="flex items-center justify-between text-xs text-red-300">
                      <span className="font-mono uppercase tracking-wider">Overdue</span>
                      <AlertTriangle className="h-4 w-4 text-red-400" />
                    </div>
                    <div className="mt-2 text-3xl font-display font-extrabold text-red-400">
                      <CountUp value={dash.overdue_count} />
                    </div>
                    <p className="mt-1 text-xs font-semibold text-red-300 group-hover:underline flex items-center gap-1">
                      Clear backlog <ArrowRight className="h-3 w-3" />
                    </p>
                  </Link>
                ) : (
                  <div className="h-full rounded-2xl cyber-glass-card p-5">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="font-mono uppercase tracking-wider">Overdue</span>
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div className="mt-2 text-3xl font-display font-extrabold text-emerald-400">0</div>
                    <p className="mt-1 text-xs text-emerald-400/80">All tasks on track</p>
                  </div>
                )}
              </Reveal>

              {/* Streak Card */}
              <Reveal delay={0.2}>
                <div className="h-full rounded-2xl cyber-glass-card p-5">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-mono uppercase tracking-wider">Neural Streak</span>
                    <Flame className="h-4 w-4 text-amber-400" />
                  </div>
                  <div className="mt-2 text-3xl font-display font-extrabold text-amber-400 flex items-center gap-1">
                    <span>🔥</span>
                    {myProgress ? <CountUp value={myProgress.current_streak} /> : '—'}
                    <span className="text-base text-amber-300/80 font-normal">days</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{dash.completed_this_week} completed this week</p>
                </div>
              </Reveal>
            </div>

            {/* Badges Matrix */}
            {myProgress && (
              <div className="rounded-2xl cyber-glass border border-indigo-500/20 p-5 shadow-glass-panel">
                <div className="flex items-center justify-between border-b border-indigo-500/15 pb-3">
                  <h2 className="flex items-center gap-2 text-sm font-bold font-display uppercase tracking-wider text-slate-200">
                    <Award className="h-4 w-4 text-indigo-400" />
                    Neural Achievements & Badges
                  </h2>
                  <span className="text-xs text-slate-400">
                    {myProgress.earned.length} Unlocked • {myProgress.locked.length} Locked
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {myProgress.earned.map((b, i) => (
                    <span
                      key={b.badge}
                      style={{ '--pop-delay': `${Math.min(i, 8) * 60}ms` }}
                      title={`Earned on ${new Date(b.awarded_at).toLocaleDateString()}`}
                      className="pop-in flex items-center gap-1.5 rounded-full border border-indigo-400/40 bg-gradient-to-r from-indigo-950 to-violet-950 px-3 py-1.5 text-xs font-semibold text-indigo-200 shadow-glow-sm"
                    >
                      <span>🏅</span>
                      <span>{b.badge}</span>
                    </span>
                  ))}
                  {myProgress.locked.map((b) => (
                    <span
                      key={b.badge}
                      title={b.hint}
                      className="cursor-help flex items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900/50 px-3 py-1.5 text-xs font-medium text-slate-500 hover:border-slate-700 transition"
                    >
                      <span>🔒</span>
                      <span>{b.badge}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Dual Column: Today's Tasks + Readiness Breakdown */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Today's Tasks Panel */}
              <div className="rounded-2xl cyber-glass border border-indigo-500/20 p-5 shadow-glass-panel flex flex-col justify-between">
                <div>
                  <h2 className="flex items-center gap-2 text-sm font-bold font-display uppercase tracking-wider text-slate-200 border-b border-indigo-500/15 pb-3">
                    <CalendarCheck className="h-4 w-4 text-cyan-400" />
                    Today&apos;s Focus & Overdue Backlog
                  </h2>

                  {dash.today_tasks.length === 0 && dash.overdue_tasks.length === 0 ? (
                    <div className="py-8 text-center text-sm text-slate-400">
                      <p>✨ No pending tasks due for today. Great velocity!</p>
                      <Link
                        to="/quiz"
                        className="mt-3 inline-flex items-center gap-1 text-xs text-indigo-400 hover:underline"
                      >
                        Reinforce knowledge with a 5-minute quiz →
                      </Link>
                    </div>
                  ) : (
                    <ul className="mt-3 divide-y divide-indigo-500/10 space-y-2">
                      {[...dash.overdue_tasks, ...dash.today_tasks].map((t) => (
                        <li key={t.id} className="pt-2 flex items-center justify-between gap-3 text-sm">
                          <Link
                            to={`/tasks/${t.id}`}
                            className="truncate text-slate-300 hover:text-cyan-300 font-medium transition"
                          >
                            {t.title}
                          </Link>
                          {t.due_date && new Date(t.due_date) < new Date(new Date().toDateString()) ? (
                            <span className="shrink-0 rounded-full border border-red-500/30 bg-red-950/40 px-2 py-0.5 text-xs font-bold text-red-400">
                              OVERDUE
                            </span>
                          ) : (
                            <span className="shrink-0 rounded-full border border-indigo-500/30 bg-indigo-950/40 px-2.5 py-0.5 text-xs font-mono text-indigo-300">
                              {t.skill}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Readiness Categories Breakdown */}
              {categories && (
                <div className="rounded-2xl cyber-glass border border-indigo-500/20 p-5 shadow-glass-panel">
                  <h2 className="flex items-center gap-2 text-sm font-bold font-display uppercase tracking-wider text-slate-200 border-b border-indigo-500/15 pb-3">
                    <Activity className="h-4 w-4 text-violet-400" />
                    Readiness Dimension Matrix
                  </h2>
                  <div className="mt-4 space-y-3">
                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
                      const val = categories[key] ?? 0
                      const gradient = CATEGORY_COLORS[key] || 'from-indigo-500 to-cyan-500'
                      return (
                        <div key={key}>
                          <div className="flex justify-between text-xs text-slate-300 mb-1">
                            <span className="font-medium">{label}</span>
                            <span className="font-mono text-indigo-300 font-bold">{val}%</span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-900 border border-indigo-500/20">
                            <div
                              className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-700`}
                              style={{ width: `${val}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Readiness Trend Chart */}
            <div className="rounded-2xl cyber-glass border border-indigo-500/20 p-5 shadow-glass-panel">
              <div className="flex items-center justify-between border-b border-indigo-500/15 pb-3">
                <h2 className="flex items-center gap-2 text-sm font-bold font-display uppercase tracking-wider text-slate-200">
                  <TrendingUp className="h-4 w-4 text-indigo-400" />
                  Readiness Progression Telemetry
                </h2>
                <span className="text-xs text-slate-400 font-mono">DAILY MODEL ACCUMULATION</span>
              </div>
              <div className="mt-4">
                <ReadinessChart history={history} />
              </div>
            </div>
          </>
        )
      )}

      {/* Goal Creation Form or Building Indicator */}
      {submitting ? (
        <BuildingPlan />
      ) : (
        <GoalForm
          onSubmit={handleCreate}
          submitting={submitting}
          initialSkills={prefillSkills}
        />
      )}

      {/* Goal Blueprints Gallery */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-white">
            <Layers className="h-5 w-5 text-indigo-400" />
            Your AI Career Blueprints
          </h2>
          <span className="text-xs text-slate-400 font-mono">{goals.length} ACTIVE BLUEPRINTS</span>
        </div>

        {loading ? (
          <Skeleton rows={3} />
        ) : goals.length === 0 ? (
          <EmptyState
            title="No career roadmaps yet"
            hint="Synthesize your first blueprint above to launch an autonomous AI multi-agent plan."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {goals.map((g) => (
              <div
                key={g.id}
                className="card-lift rounded-2xl cyber-glass border border-indigo-500/25 p-5 shadow-glass-panel flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      to={`/goals/${g.id}`}
                      className="font-display font-bold text-base text-white hover:text-cyan-300 transition"
                    >
                      {g.title}
                    </Link>
                    <span className="rounded-full border border-indigo-500/30 bg-indigo-950/60 px-2.5 py-0.5 text-[10px] font-mono text-indigo-300 shrink-0">
                      {g.timeline_days} DAYS
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-cyan-300 font-mono">Role: {g.target_role}</p>

                  {g.current_skills && g.current_skills.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1">
                      {g.current_skills.slice(0, 5).map((s) => (
                        <span
                          key={s}
                          className="rounded-md bg-slate-900 border border-slate-700/60 px-2 py-0.5 text-[10px] text-slate-300 font-mono"
                        >
                          {s}
                        </span>
                      ))}
                      {g.current_skills.length > 5 && (
                        <span className="text-[10px] text-slate-500 self-center">
                          +{g.current_skills.length - 5} more
                        </span>
                      )}
                    </div>
                  )}

                  <p className="mt-3 text-[11px] text-slate-500 font-mono">
                    Initialized {new Date(g.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-indigo-500/15 flex items-center justify-between">
                  <Link
                    to={`/goals/${g.id}`}
                    className="btn-cyber-primary rounded-xl px-3.5 py-1.5 text-xs font-semibold flex items-center gap-1.5"
                  >
                    <span>Inspect Roadmap</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>

                  <button
                    onClick={() => handleDelete(g.id)}
                    disabled={deletingId === g.id}
                    className="p-1.5 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-950/40 hover:border-red-500/40 transition disabled:opacity-40"
                    title="Delete Blueprint"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Warp Speed Mission Launcher Modal */}
      <MissionLauncher isOpen={missionOpen} onClose={() => setMissionOpen(false)} />

      {/* Shareable Holographic Cyber ID Card Modal */}
      <ShareableAgentCard
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        user={user}
        readinessScore={dash?.active_goal?.readiness_score || 84}
        targetRole={dash?.active_goal?.title || 'Senior Systems Architect'}
      />
    </div>
  )
}
