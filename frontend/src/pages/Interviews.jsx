import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api, getErrorMessage } from '../api/client.js'
import ErrorBanner from '../components/ErrorBanner.jsx'
import EmptyState from '../components/EmptyState.jsx'
import Skeleton from '../components/Skeleton.jsx'
import { useToast } from '../context/ToastContext.jsx'

// Interview history + start-a-session form (goal picker).
export default function Interviews() {
  const navigate = useNavigate()
  const toast = useToast()
  const [params] = useSearchParams()
  const [sessions, setSessions] = useState([])
  const [goals, setGoals] = useState([])
  const [goalId, setGoalId] = useState(params.get('goalId') || '')
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [list, goalList] = await Promise.all([api.listInterviews(), api.listGoals()])
      setSessions(list)
      setGoals(goalList)
      if (!params.get('goalId') && goalList.length > 0) setGoalId((g) => g || String(goalList[0].id))
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load interviews'))
    } finally {
      setLoading(false)
    }
  }, [params])

  useEffect(() => { load() }, [load])

  async function handleStart(e) {
    e.preventDefault()
    if (!goalId) return
    setStarting(true)
    setError('')
    try {
      const session = await api.startInterview(Number(goalId))
      toast.success('Interview started')
      navigate(`/interviews/${session.id}`)
    } catch (err) {
      const msg = getErrorMessage(err, 'Could not start interview')
      setError(msg)
      toast.error(msg)
      setStarting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Interview simulator</h1>
        <p className="text-sm text-slate-500">Practice with 5 rounds × 2 questions, then get scored.</p>
      </div>
      <ErrorBanner message={error} onRetry={load} />

      <form onSubmit={handleStart} className="flex flex-wrap items-end gap-3 rounded-xl bg-white p-5 shadow-sm">
        <div className="min-w-0 flex-1">
          <label className="mb-1 block text-xs font-medium text-slate-600">Interview for goal</label>
          <select value={goalId} onChange={(e) => setGoalId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none">
            {goals.map((g) => <option key={g.id} value={g.id}>{g.title} ({g.target_role})</option>)}
          </select>
        </div>
        <button disabled={starting || !goalId}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
          {starting ? 'Preparing questions…' : 'Start interview'}
        </button>
      </form>

      <div>
        <h2 className="mb-3 text-base font-semibold text-slate-900">History</h2>
        {loading ? <Skeleton rows={3} /> : sessions.length === 0 ? (
          <EmptyState title="No interviews yet" hint="Start one above to practice under exam conditions." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {sessions.map((s) => (
              <Link key={s.id} to={`/interviews/${s.id}`} className="block rounded-xl bg-white p-4 shadow-sm transition hover:shadow-md">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-900">{s.role}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${s.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {s.status}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {s.overall_score != null ? `Score: ${s.overall_score}` : `${s.questions.filter((q) => q.score != null).length}/${s.questions.length} answered`}
                </p>
                <p className="text-xs text-slate-400">{new Date(s.created_at).toLocaleString()}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
