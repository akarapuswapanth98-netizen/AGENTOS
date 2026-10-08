import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, getErrorMessage } from '../api/client.js'
import ErrorBanner from '../components/ErrorBanner.jsx'
import Loader from '../components/Loader.jsx'
import { useToast } from '../context/ToastContext.jsx'

// One-question-at-a-time runner with progress, per-answer feedback, final summary.
export default function InterviewRunner() {
  const { id } = useParams()
  const toast = useToast()
  const [session, setSession] = useState(null)
  const [index, setIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [sending, setSending] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.getInterview(id)
      setSession(data)
      // Jump to the first unanswered question.
      const firstOpen = data.questions.findIndex((q) => q.score == null)
      setIndex(firstOpen === -1 ? 0 : firstOpen)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load interview'))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  const questions = useMemo(() => session?.questions || [], [session])
  const current = questions[index]
  const answered = questions.filter((q) => q.score != null).length
  const allAnswered = questions.length > 0 && answered === questions.length

  async function handleAnswer(e) {
    e.preventDefault()
    if (!answer.trim()) {          // never score an empty answer
      setError('Write an answer before submitting')
      return
    }
    setSending(true)
    setError('')
    try {
      const res = await api.answerQuestion(session.id, current.id, answer)
      setFeedback(res)
      setSession({ ...session, questions: session.questions.map((q) => q.id === current.id ? { ...q, score: res.score, answer_text: answer } : q) })
    } catch (err) {
      setError(getErrorMessage(err, 'Could not submit answer'))
    } finally {
      setSending(false)
    }
  }

  function next() {
    setFeedback(null)
    setAnswer('')
    setIndex((i) => Math.min(i + 1, questions.length - 1))
  }

  async function handleComplete() {
    setCompleting(true)
    setError('')
    try {
      const done = await api.completeInterview(session.id)
      setSession(done)
      toast.success(`Interview scored ${done.overall_score} / 100`)
    } catch (err) {
      const msg = getErrorMessage(err, 'Could not complete interview')
      setError(msg)
      toast.error(msg)
    } finally {
      setCompleting(false)
    }
  }

  if (loading) return <Loader label="Loading interview…" />
  if (!session) return <ErrorBanner message={error || 'Interview not found'} onRetry={load} />

  // Completed view: overall score + per-round breakdown.
  if (session.status === 'completed') {
    return (
      <div className="space-y-6">
        <Link to="/interviews" className="text-sm font-medium text-indigo-600 hover:underline">← All interviews</Link>
        <div className="rounded-xl bg-white p-5 text-center shadow-sm">
          <p className="text-sm text-slate-500">Overall score</p>
          <p className="text-5xl font-bold text-indigo-600">{session.overall_score}</p>
          <p className="mt-1 text-sm text-slate-500">{session.role}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Score per round</h2>
          <div className="mt-3 space-y-2">
            {Object.entries(session.round_scores).map(([round, score]) => (
              <div key={round}>
                <div className="flex justify-between text-sm text-slate-600"><span>{round}</span><span>{score}</span></div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                  <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${score}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <Link to={`/goals/${session.goal_id}`} className="text-sm font-medium text-indigo-600 hover:underline">← Back to goal</Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Link to="/interviews" className="text-sm font-medium text-indigo-600 hover:underline">← All interviews</Link>
      <ErrorBanner message={error} onRetry={load} />

      <div className="rounded-xl bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-slate-900">{session.role} interview</span>
          <span className="text-slate-500">Question {index + 1} of {questions.length}</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div className="h-2 rounded-full bg-indigo-600 transition-all" style={{ width: `${((index + 1) / Math.max(1, questions.length)) * 100}%` }} />
        </div>
        <p className="mt-2 text-xs text-slate-400">{answered}/{questions.length} answered</p>
      </div>

      {current && (
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">{current.round_name}</span>
          <p className="mt-2 font-medium text-slate-900">{current.question_text}</p>
          {current.score != null && !feedback ? (
            <p className="mt-2 text-sm text-green-700">Answered — score {current.score}. Edit below to retry.</p>
          ) : null}
          <form onSubmit={handleAnswer} className="mt-3">
            <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={5}
              placeholder="Answer with a concrete example…"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
            <div className="mt-3 flex gap-2">
              <button disabled={sending || !answer.trim()} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
                {sending ? 'Evaluating…' : 'Submit answer'}
              </button>
              {!answer.trim() && (
                <p className="mt-2 text-xs text-slate-400">Write an answer first — an empty answer is not submitted.</p>
              )}
              {index < questions.length - 1 && (
                <button type="button" onClick={next} className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200">
                  Skip for now →
                </button>
              )}
            </div>
          </form>
          {feedback && (
            <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">
              <p className="font-semibold text-slate-900">Score: {feedback.score} / 100</p>
              <p className="mt-1 text-slate-600">{feedback.feedback}</p>
              <div className="mt-3">
                <button onClick={next} className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700">
                  {index < questions.length - 1 ? 'Next question →' : 'Review answers'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {allAnswered && (
        <button onClick={handleComplete} disabled={completing}
          className="w-full rounded-xl bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-60">
          {completing ? 'Scoring…' : 'Complete interview & see results'}
        </button>
      )}
    </div>
  )
}
