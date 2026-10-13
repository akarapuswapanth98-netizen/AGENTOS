import { useCallback, useEffect, useState } from 'react'
import { api, getErrorMessage } from '../api/client.js'
import EmptyState from '../components/EmptyState.jsx'
import ErrorBanner from '../components/ErrorBanner.jsx'
import Loader from '../components/Loader.jsx'
import Skeleton from '../components/Skeleton.jsx'
import { useToast } from '../context/ToastContext.jsx'
import {
  RotateCcw,
  Sparkles,
  Send,
  Calendar,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Award,
} from 'lucide-react'

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

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    setError('')
    try {
      const due = await api.getDueReviews()
      setItems(due.items)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load spaced repetition deck'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

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
      const msg = getErrorMessage(err, 'Could not synthesize question prompt')
      setError(msg)
      toast.error(msg)
    } finally {
      setAsking(false)
    }
  }

  async function handleAnswer(e) {
    e.preventDefault()
    if (!answer.trim()) {
      setError('Please provide an answer before submitting')
      return
    }
    setSending(true)
    setError('')
    try {
      const res = await api.answerReview(selected.id, question, answer)
      setResult(res)
      toast.success(`Evaluated: ${res.score} / 100 — Next due ${res.next_due_date}`)
      for (const b of res.newly_earned_badges || []) toast.success(`Badge awarded: ${b}`)
      load(true)
    } catch (err) {
      const msg = getErrorMessage(err, 'Could not submit review answer')
      setError(msg)
      toast.error(msg)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6 text-slate-200">
      {/* Header Banner */}
      <div className="rounded-3xl cyber-glass border border-indigo-500/25 p-6 sm:p-8 shadow-glass-panel">
        <div className="flex items-center gap-2 text-xs font-mono uppercase text-cyan-300">
          <RotateCcw className="h-4 w-4" /> Leitner Memory Scheduling
        </div>
        <h1 className="mt-2 font-display text-3xl font-extrabold text-white">
          Spaced Repetition & Retention Deck
        </h1>
        <p className="mt-2 text-sm text-slate-300 max-w-2xl leading-relaxed">
          Active recall intervals dynamically double (1 → 3 → 7 → 14 days) on pass scores of 70+, and reset to tomorrow on lower scores to reinforce long-term mastery.
        </p>
      </div>

      <ErrorBanner message={error} onRetry={() => load()} />

      {/* Due Items Deck */}
      {loading ? (
        <Skeleton rows={3} />
      ) : items.length === 0 ? (
        <EmptyState
          title="All recall intervals satisfied"
          hint="No concepts due for spaced review today. Great retention!"
        />
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-indigo-500/15 pb-2">
            <h2 className="flex items-center gap-2 font-display text-base font-bold text-white">
              <Layers className="h-4 w-4 text-indigo-400" />
              Concepts Due for Recall
            </h2>
            <span className="text-xs text-cyan-300 font-mono">{items.length} DUE TODAY</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => pick(item)}
                className={`card-lift rounded-2xl cyber-glass border p-4 text-left transition-all ${
                  selected?.id === item.id
                    ? 'border-indigo-400 bg-indigo-950/40 shadow-glow-sm'
                    : 'border-indigo-500/20 hover:border-indigo-500/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-display font-bold text-base text-white">{item.skill}</span>
                  <span className="rounded-full border border-indigo-500/30 bg-indigo-950/60 px-2 py-0.5 text-[10px] font-mono text-indigo-300">
                    STAGE {item.stage}
                  </span>
                </div>
                <p className="mt-2 text-xs font-mono text-cyan-300 flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Due: {item.due_date}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Active Question Box */}
      {selected && (
        <div className="rounded-3xl cyber-glass border border-indigo-500/25 p-6 sm:p-8 shadow-glass-panel space-y-4">
          <div className="flex items-center justify-between border-b border-indigo-500/15 pb-3">
            <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-cyan-400" />
              Recall Prompt: {selected.skill}
            </h2>
            <span className="text-xs font-mono text-indigo-400">LEITNER STAGE {selected.stage}</span>
          </div>

          {asking ? (
            <Loader label="Synthesizing challenging recall prompt…" />
          ) : question ? (
            <>
              <p className="rounded-2xl border border-indigo-500/15 bg-slate-900/50 p-4 text-sm text-slate-100 font-sans leading-relaxed">
                {question}
              </p>

              <form onSubmit={handleAnswer} className="space-y-3">
                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  rows={5}
                  placeholder="Demonstrate technical recall with a concrete definition, syntax, or trade-off analysis..."
                  className="w-full rounded-2xl border border-indigo-500/25 bg-[#080d1a] p-4 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400/40 font-mono"
                />

                <div className="flex items-center justify-between">
                  <button
                    disabled={sending || !answer.trim()}
                    className="btn-cyber-primary rounded-xl px-5 py-2.5 text-xs font-semibold flex items-center gap-2 disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    {sending ? 'Scoring Recall Quality…' : 'Submit for Interval Rescheduling'}
                  </button>
                  {!answer.trim() && (
                    <span className="text-xs text-slate-500 font-mono">Input required</span>
                  )}
                </div>
              </form>
            </>
          ) : null}

          {/* Feedback & Rescheduled Interval */}
          {result && (
            <div className="mt-4 rounded-2xl border border-indigo-500/30 bg-indigo-950/30 p-5 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-display font-bold text-white text-base">
                  Score: {result.score} / 100
                </span>
                <span className="font-mono text-cyan-300 font-semibold">
                  {result.score >= 70 ? 'PASS (Advanced to Next Interval)' : 'RETRY SCHEDULED (Reset)'}
                </span>
              </div>
              <p className="text-slate-300 leading-relaxed font-sans">
                {result.feedback?.recommendation}
              </p>
              <div className="pt-2 border-t border-indigo-500/15 flex items-center justify-between font-mono text-[11px] text-slate-400">
                <span>Next Recall Date: <b className="text-cyan-300">{result.next_due_date}</b></span>
                <span>Active Leitner Stage: <b className="text-indigo-300">Stage {result.stage}</b></span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
