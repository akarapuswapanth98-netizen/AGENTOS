import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, getErrorMessage } from '../api/client.js'
import ErrorBanner from '../components/ErrorBanner.jsx'
import Loader from '../components/Loader.jsx'
import { useToast } from '../context/ToastContext.jsx'
import {
  ArrowLeft,
  Users2,
  Sparkles,
  Send,
  CheckCircle2,
  Award,
  ArrowRight,
  TrendingUp,
} from 'lucide-react'

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
      const firstOpen = data.questions.findIndex((q) => q.score == null)
      setIndex(firstOpen === -1 ? 0 : firstOpen)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load interview session'))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const questions = useMemo(() => session?.questions || [], [session])
  const current = questions[index]
  const answered = questions.filter((q) => q.score != null).length
  const allAnswered = questions.length > 0 && answered === questions.length

  async function handleAnswer(e) {
    e.preventDefault()
    if (!answer.trim()) {
      setError('Please provide an answer before submitting')
      return
    }
    setSending(true)
    setError('')
    try {
      const res = await api.answerQuestion(session.id, current.id, answer)
      setFeedback(res)
      setSession({
        ...session,
        questions: session.questions.map((q) =>
          q.id === current.id ? { ...q, score: res.score, answer_text: answer } : q
        ),
      })
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
      toast.success(`Interview evaluated: ${done.overall_score} / 100`)
    } catch (err) {
      const msg = getErrorMessage(err, 'Could not complete interview')
      setError(msg)
      toast.error(msg)
    } finally {
      setCompleting(false)
    }
  }

  if (loading) return <Loader label="Mounting interview environment…" />
  if (!session) return <ErrorBanner message={error || 'Interview not found'} onRetry={load} />

  // Completed scorecard summary
  if (session.status === 'completed') {
    return (
      <div className="space-y-6 text-slate-200">
        <Link
          to="/interviews"
          className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition"
        >
          <ArrowLeft className="h-4 w-4" /> All Interview Sessions
        </Link>

        {/* Scorecard Hero */}
        <div className="rounded-3xl cyber-glass border border-indigo-500/25 p-8 text-center shadow-glass-panel relative overflow-hidden">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-950/40 px-3 py-1 text-xs font-mono text-emerald-300 mb-3">
            <CheckCircle2 className="h-3.5 w-3.5" /> SIMULATION COMPLETE
          </div>
          <p className="text-xs uppercase font-mono tracking-wider text-slate-400">Final Composite Score</p>
          <p className="font-display text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-300 to-indigo-400 my-2">
            {session.overall_score}
            <span className="text-xl text-slate-400 font-normal"> / 100</span>
          </p>
          <p className="text-sm font-semibold text-slate-300">{session.role} Technical Assessment</p>
        </div>

        {/* Round Scores Breakdown */}
        {session.round_scores && (
          <div className="rounded-3xl cyber-glass border border-indigo-500/20 p-6 shadow-glass-panel">
            <h2 className="flex items-center gap-2 font-display text-base font-bold text-white border-b border-indigo-500/15 pb-3">
              <TrendingUp className="h-4 w-4 text-cyan-400" />
              Per-Round Performance Dimensions
            </h2>
            <div className="mt-4 space-y-3">
              {Object.entries(session.round_scores).map(([round, score]) => (
                <div key={round}>
                  <div className="flex justify-between text-xs text-slate-300 mb-1 font-mono">
                    <span>{round}</span>
                    <span className="text-cyan-300 font-bold">{score}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-900 border border-indigo-500/20">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400"
                      style={{ width: `${score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-between">
          <Link
            to={`/goals/${session.goal_id}`}
            className="btn-cyber-primary rounded-xl px-4 py-2 text-xs font-semibold inline-flex items-center gap-2"
          >
            <span>Return to Career Blueprint</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 text-slate-200">
      <Link
        to="/interviews"
        className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition"
      >
        <ArrowLeft className="h-4 w-4" /> All Interview Sessions
      </Link>

      <ErrorBanner message={error} onRetry={load} />

      {/* Progress Telemetry */}
      <div className="rounded-2xl cyber-glass border border-indigo-500/20 p-5 shadow-glass-panel">
        <div className="flex items-center justify-between text-xs">
          <span className="font-display font-bold text-white text-sm">
            {session.role} Interview Round
          </span>
          <span className="font-mono text-cyan-300 font-semibold">
            Question {index + 1} of {questions.length}
          </span>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-900 border border-indigo-500/20">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-500"
            style={{ width: `${((index + 1) / Math.max(1, questions.length)) * 100}%` }}
          />
        </div>
        <p className="mt-2 text-[11px] font-mono text-slate-400">
          {answered} of {questions.length} questions evaluated
        </p>
      </div>

      {/* Active Question Box */}
      {current && (
        <div className="rounded-3xl cyber-glass border border-indigo-500/25 p-6 sm:p-8 shadow-glass-panel space-y-4">
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-violet-500/40 bg-violet-950/60 px-3 py-0.5 text-xs font-mono font-bold uppercase text-violet-300 shadow-glow-sm">
              Round: {current.round_name}
            </span>
            <span className="rounded-full border border-cyan-500/30 bg-cyan-950/40 px-2.5 py-0.5 text-[11px] font-mono text-cyan-300">
              Skill: {current.skill}
            </span>
          </div>

          <h2 className="font-display text-lg font-bold text-white leading-relaxed">
            {current.question_text}
          </h2>

          {current.score != null && !feedback && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-3 text-xs text-emerald-300">
              Evaluated with score: <b>{current.score}/100</b>. You can refine your answer below to re-evaluate.
            </div>
          )}

          <form onSubmit={handleAnswer} className="space-y-3">
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={6}
              placeholder="Structure your answer clearly with context, approach, and trade-offs..."
              className="w-full rounded-2xl border border-indigo-500/25 bg-[#080d1a] p-4 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400/40 font-mono"
            />
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="submit"
                disabled={sending || !answer.trim()}
                className="btn-cyber-primary rounded-xl px-5 py-2 text-xs font-semibold flex items-center gap-2 disabled:opacity-50"
              >
                <Sparkles className="h-4 w-4" />
                {sending ? 'Interviewer Deliberating…' : 'Submit for Round Evaluation'}
              </button>
              {index < questions.length - 1 && (
                <button
                  type="button"
                  onClick={next}
                  className="btn-cyber-ghost rounded-xl px-4 py-2 text-xs font-semibold"
                >
                  Skip for Now →
                </button>
              )}
            </div>
          </form>

          {/* Real-Time Recruiter Feedback */}
          {feedback && (
            <div className="rounded-2xl border border-indigo-500/30 bg-indigo-950/30 p-5 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-display font-bold text-white text-sm">
                  Interviewer Score: {feedback.score} / 100
                </span>
                <span className="text-[11px] font-mono text-cyan-300">ROUND FEEDBACK</span>
              </div>
              <p className="text-slate-300 leading-relaxed font-sans">{feedback.feedback}</p>
              <div className="pt-2">
                <button
                  onClick={next}
                  className="btn-cyber-cyan rounded-xl px-4 py-2 text-xs font-semibold flex items-center gap-2"
                >
                  {index < questions.length - 1 ? 'Next Question →' : 'Review Assessment'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Complete Interview Button */}
      {allAnswered && (
        <button
          onClick={handleComplete}
          disabled={completing}
          className="btn-cyber-primary w-full rounded-2xl py-3 text-sm font-bold shadow-glow-violet disabled:opacity-50"
        >
          {completing ? 'Computing Final Scorecard…' : 'Complete 5-Round Simulation & Generate Report'}
        </button>
      )}
    </div>
  )
}
