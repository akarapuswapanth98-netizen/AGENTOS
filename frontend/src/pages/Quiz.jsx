import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, getErrorMessage } from '../api/client.js'
import EmptyState from '../components/EmptyState.jsx'
import ErrorBanner from '../components/ErrorBanner.jsx'
import Loader from '../components/Loader.jsx'
import Skeleton from '../components/Skeleton.jsx'
import { useToast } from '../context/ToastContext.jsx'

const TIME_LIMIT = 5 * 60

function fmt(secs) {
  const m = Math.floor(Math.max(0, secs) / 60)
  const s = Math.max(0, secs) % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

// Practice quiz: pick a skill, answer 5 timed questions, review results + history.
export default function Quiz() {
  const toast = useToast()
  const [skills, setSkills] = useState([])
  const [skill, setSkill] = useState('')
  const [customSkill, setCustomSkill] = useState('')
  const [quiz, setQuiz] = useState(null)
  const [answers, setAnswers] = useState([null, null, null, null, null])
  const [left, setLeft] = useState(TIME_LIMIT)
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const timer = useRef(null)
  // Mutable ref so the timer callback always sees the latest picks.
  const answersRef = useRef(answers)
  answersRef.current = answers

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [goalList, hist] = await Promise.all([api.listGoals(), api.getQuizHistory()])
      setSkills([...new Set(goalList.flatMap((g) => g.current_skills || []))])
      setHistory(hist)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load quiz page'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => () => clearInterval(timer.current), [])

  function stopTimer() {
    clearInterval(timer.current)
    timer.current = null
  }

  async function doSubmit(quizId, picked, auto) {
    setSending(true)
    setError('')
    try {
      const res = await api.answerQuiz(quizId, picked)
      setResult(res)
      if (auto) toast.error('Time is up — auto-submitted')
      else toast.success(`Scored ${res.score} / 100`)
      load()
    } catch (err) {
      const msg = getErrorMessage(err, 'Could not submit quiz')
      setError(msg)
      toast.error(msg)  // answers stay in state: nothing is lost
    } finally {
      setSending(false)
    }
  }

  async function handleStart(e) {
    e.preventDefault()
    const chosen = (customSkill.trim() || skill).slice(0, 60)
    if (!chosen) return
    setStarting(true)
    setError('')
    setResult(null)
    try {
      const started = await api.startQuiz(chosen)
      setQuiz(started)
      setAnswers([null, null, null, null, null])
      setLeft(TIME_LIMIT)
      stopTimer()
      timer.current = setInterval(() => {
        setLeft((prev) => {
          if (prev <= 1) {
            stopTimer()
            doSubmit(started.id, answersRef.current, true)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch (err) {
      const msg = getErrorMessage(err, 'Could not start quiz')
      setError(msg)
      toast.error(msg)
    } finally {
      setStarting(false)
    }
  }

  function pick(i, v) {
    setAnswers((prev) => prev.map((a, j) => (j === i ? v : a)))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Practice quiz</h1>
        <p className="text-sm text-slate-500">Five questions, five minutes, instant grading.</p>
      </div>
      <ErrorBanner message={error} onRetry={load} />

      <form onSubmit={handleStart} className="flex flex-wrap items-end gap-3 rounded-xl bg-white p-5 shadow-sm">
        <div className="min-w-0 flex-1">
          <label className="mb-1 block text-xs font-medium text-slate-600">Skill</label>
          <select value={skill} onChange={(e) => setSkill(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none">
            <option value="">Pick from your goals…</option>
            {skills.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="min-w-0 flex-1">
          <label className="mb-1 block text-xs font-medium text-slate-600">Or type one</label>
          <input value={customSkill} onChange={(e) => setCustomSkill(e.target.value)} placeholder="e.g. recursion" maxLength={60}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
        </div>
        <button disabled={starting} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
          {starting ? 'Writing questions…' : 'Start quiz'}
        </button>
      </form>

      {quiz && !result && (
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">{quiz.skill}</h2>
            <span className={`font-mono text-lg font-bold ${left < 60 ? 'text-red-600' : 'text-slate-700'}`}>{fmt(left)}</span>
          </div>
          <div className="mt-2 space-y-4">
            {quiz.questions.map((q, i) => (
              <div key={i}>
                <p className="text-sm font-medium text-slate-800">{i + 1}. {q.question}</p>
                <div className="mt-1 grid gap-1">
                  {q.options.map((opt, oi) => (
                    <button key={oi} type="button" onClick={() => pick(i, oi)}
                      className={`rounded-lg border px-3 py-1.5 text-left text-sm ${answers[i] === oi ? 'border-indigo-600 bg-indigo-50 font-medium' : 'border-slate-200 hover:bg-slate-50'}`}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => { stopTimer(); doSubmit(quiz.id, answers, false) }} disabled={sending}
            className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
            {sending ? 'Grading…' : 'Submit answers'}
          </button>
        </div>
      )}

      {result && (
        <div className="space-y-3 rounded-xl bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Score: {result.score} / 100</h2>
            {result.timed_out && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">timed out</span>}
          </div>
          {result.results.map((r, i) => (
            <div key={i} className={`rounded-lg p-3 text-sm ${r.correct ? 'bg-green-50' : 'bg-red-50'}`}>
              <p className="font-medium text-slate-800">{i + 1}. {r.question}</p>
              <p className="mt-1 text-slate-600">You: {r.your_answer == null ? 'skipped' : r.options[r.your_answer]} · Correct: {r.options[r.correct_index]}</p>
              <p className="mt-1 text-slate-500">{r.explanation}</p>
            </div>
          ))}
          {result.review_created && (
            <Link to="/review" className="inline-block rounded-lg bg-orange-100 px-4 py-2 text-sm font-semibold text-orange-700 hover:bg-orange-200">
              Review today →
            </Link>
          )}
        </div>
      )}

      <div>
        <h2 className="mb-3 text-base font-semibold text-slate-900">History</h2>
        {loading ? <Skeleton rows={3} /> : history.length === 0 ? (
          <EmptyState title="No quizzes yet" hint="Start one above to see your past scores here." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {history.map((h) => (
              <div key={h.id} className="rounded-xl bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-900">{h.skill}</span>
                  <span className="font-bold text-indigo-600">{h.score}</span>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  {h.elapsed_seconds}s{h.timed_out ? ' · timed out' : ''} · {h.submitted_at ? new Date(h.submitted_at).toLocaleString() : ''}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
