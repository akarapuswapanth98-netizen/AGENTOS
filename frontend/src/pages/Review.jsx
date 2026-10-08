import { useCallback, useEffect, useState } from 'react'
import { api, getErrorMessage } from '../api/client.js'
import EmptyState from '../components/EmptyState.jsx'
import ErrorBanner from '../components/ErrorBanner.jsx'
import Loader from '../components/Loader.jsx'
import Skeleton from '../components/Skeleton.jsx'
import { useToast } from '../context/ToastContext.jsx'

// "Review today": due items, one question at a time, scored answers.
export default function Review() {
  const toast = useToast()
  const [items, setItems] = useState([])
  const [selected, setSelected] = useState(null)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [asking, setAsking] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  // quiet=true refreshes in the background and keeps the current list visible,
  // so answering an item does not flash the loading skeleton.
  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    setError('')
    try {
      const due = await api.getDueReviews()
      setItems(due.items)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load reviews'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function pick(item) {
    setSelected(item)
    setQuestion('')
    setAnswer('')
    setResult(null)
    setAsking(true)
    setError('')
    try {
      const res = await api.startReview(item.id)
      setQuestion(res.question)
    } catch (err) {
      const msg = getErrorMessage(err, 'Could not get a question')
      setError(msg)
      toast.error(msg)
    } finally {
      setAsking(false)
    }
  }

  async function handleAnswer(e) {
    e.preventDefault()
    setSending(true)
    setError('')
    try {
      const res = await api.answerReview(selected.id, question, answer)
      setResult(res)
      toast.success(`Scored ${res.score} / 100 — next review ${res.next_due_date}`)
      for (const b of res.newly_earned_badges || []) toast.success(`Badge earned: ${b}`)
      load(true)
    } catch (err) {
      const msg = getErrorMessage(err, 'Could not submit answer')
      setError(msg)
      toast.error(msg)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Review today</h1>
        <p className="text-sm text-slate-500">Spaced repetition: pass at 70+ to wait longer, below 70 restarts tomorrow.</p>
      </div>
      <ErrorBanner message={error} onRetry={() => load()} />

      {loading ? <Skeleton rows={3} /> : items.length === 0 ? (
        <EmptyState title="Nothing due today" hint="New reviews appear here after low task scores." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <button key={item.id} onClick={() => pick(item)}
              className={`rounded-xl bg-white p-4 text-left shadow-sm transition hover:shadow-md ${selected?.id === item.id ? 'ring-2 ring-indigo-500' : ''}`}>
              <p className="font-medium text-slate-900">{item.skill}</p>
              <p className="text-xs text-slate-400">Stage {item.stage} · due {item.due_date}</p>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">{selected.skill}</h2>
          {asking ? <Loader label="Writing your question…" /> : question ? (
            <>
              <p className="mt-2 text-sm text-slate-700">{question}</p>
              <form onSubmit={handleAnswer} className="mt-3">
                <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={4}
                  placeholder="Your answer with an example…"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
                <button disabled={sending} className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
                  {sending ? 'Scoring…' : 'Submit answer'}
                </button>
              </form>
            </>
          ) : null}
          {result && (
            <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">
              <p className="font-semibold text-slate-900">Score: {result.score} / 100</p>
              <p className="mt-1 text-slate-600">{result.feedback?.recommendation}</p>
              <p className="mt-1 text-xs text-slate-500">Next review: {result.next_due_date} (stage {result.stage})</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
