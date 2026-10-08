import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, getErrorMessage } from '../api/client.js'
import ErrorBanner from '../components/ErrorBanner.jsx'
import EmptyState from '../components/EmptyState.jsx'
import Loader from '../components/Loader.jsx'
import ScoreResult from '../components/ScoreResult.jsx'
import { useToast } from '../context/ToastContext.jsx'

// Single task: tutor help, answer submission, validator result, history.
export default function TaskDetail() {
  const { id } = useParams()
  const toast = useToast()
  const [task, setTask] = useState(null)
  const [tutor, setTutor] = useState(null)
  const [tutorLoading, setTutorLoading] = useState(false)
  const [answer, setAnswer] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [t, h] = await Promise.all([api.getTask(id), api.getSubmissions(id)])
      setTask(t)
      setHistory(h)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load task'))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  async function handleTutor() {
    setTutorLoading(true)
    setError('')
    try {
      setTutor(await api.getTutor(id))
    } catch (err) {
      setError(getErrorMessage(err, 'Tutor failed'))
    } finally {
      setTutorLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const res = await api.submitAnswer(id, answer)
      setResult(res)
      toast.success(`Scored ${res.score} / 100`)
      for (const b of res.newly_earned_badges || []) toast.success(`Badge earned: ${b}`)
      // Refresh task status/score and submission history.
      const [t, h] = await Promise.all([api.getTask(id), api.getSubmissions(id)])
      setTask(t)
      setHistory(h)
    } catch (err) {
      const msg = getErrorMessage(err, 'Submission failed')
      setError(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <Loader label="Loading task…" />
  if (!task) return <ErrorBanner message={error || 'Task not found'} onRetry={load} />

  return (
    <div className="space-y-6">
      <Link to={`/goals/${task.goal_id}`} className="text-sm font-medium text-indigo-600 hover:underline">← Back to goal</Link>
      <ErrorBanner message={error} onRetry={load} />

      <div className="rounded-xl bg-white p-5 shadow-sm">
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">{task.task_type}</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">{task.status}</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">{task.skill}</span>
        </div>
        <h1 className="mt-2 text-xl font-bold text-slate-900">{task.title}</h1>
        <p className="mt-2 text-sm text-slate-600">{task.description}</p>
        <p className="mt-2 text-xs text-slate-400">Week {task.week} · #{task.order} · {task.attempts} attempt(s){task.score != null && ` · score ${task.score}`}</p>
      </div>

      <div className="rounded-xl bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">AI Tutor</h2>
          <button onClick={handleTutor} disabled={tutorLoading}
            className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
            {tutorLoading ? 'Thinking…' : 'Get AI Tutor'}
          </button>
        </div>
        {!tutor ? (
          <p className="mt-2 text-sm text-slate-400">Ask the tutor to explain this task with examples.</p>
        ) : (
          <div className="mt-3 space-y-4 text-sm">
            <div><h3 className="font-semibold text-slate-800">Explanation</h3><p className="mt-1 text-slate-600">{tutor.explanation}</p></div>
            <div><h3 className="font-semibold text-slate-800">Example</h3><p className="mt-1 text-slate-600">{tutor.example}</p></div>
            <div><h3 className="font-semibold text-slate-800">Practice questions</h3>
              <ol className="mt-1 list-decimal space-y-1 pl-5 text-slate-600">{tutor.practice_questions.map((q, i) => <li key={i}>{q}</li>)}</ol></div>
            <div><h3 className="font-semibold text-slate-800">Hints</h3>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-600">{tutor.hints.map((h, i) => <li key={i}>{h}</li>)}</ul></div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Your answer</h2>
        <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={6}
          placeholder="Explain the concept with a concrete example…"
          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
        <button type="submit" disabled={submitting}
          className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
          {submitting ? 'Evaluating…' : 'Submit answer'}
        </button>
      </form>

      {result && <ScoreResult result={result} />}

      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Submission history</h2>
        {history.length === 0 ? (
          <EmptyState title="No submissions yet" hint="Submit your first answer above to get scored." />
        ) : (
          <ul className="mt-2 space-y-2">
            {history.map((s) => (
              <li key={s.id} className="rounded-lg bg-slate-50 p-3 text-sm">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Score <b className="text-slate-700">{s.score}</b></span>
                  <span>{new Date(s.created_at).toLocaleString()}</span>
                </div>
                <p className="mt-1 line-clamp-3 text-slate-600">{s.answer_text}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
