import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, getErrorMessage } from '../api/client.js'
import ErrorBanner from '../components/ErrorBanner.jsx'
import EmptyState from '../components/EmptyState.jsx'
import Loader from '../components/Loader.jsx'
import ScoreResult from '../components/ScoreResult.jsx'
import { useToast } from '../context/ToastContext.jsx'
import {
  ArrowLeft,
  GraduationCap,
  Sparkles,
  Send,
  Calendar,
  FileEdit,
  History,
  CheckCircle2,
  Clock,
  BookOpen,
  HelpCircle,
  Lightbulb,
} from 'lucide-react'

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
  const [dueInput, setDueInput] = useState('')
  const [noteInput, setNoteInput] = useState('')
  const [noteState, setNoteState] = useState('idle')
  const [savingDue, setSavingDue] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [t, h] = await Promise.all([api.getTask(id), api.getSubmissions(id)])
      setTask(t)
      setHistory(h)
      setDueInput(t.due_date ? t.due_date.slice(0, 10) : '')
      setNoteInput(t.note || '')
      setNoteState('idle')
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load task workspace'))
    } finally {
      setLoading(false)
    }
  }, [id])

  async function saveDueDate(value) {
    if (savingDue) return
    setSavingDue(true)
    setError('')
    try {
      const updated = await api.updateTaskDueDate(id, value || null)
      setTask(updated)
      setDueInput(updated.due_date ? updated.due_date.slice(0, 10) : '')
      toast.success(value ? 'Due date saved' : 'Due date cleared')
    } catch (err) {
      const msg = getErrorMessage(err, 'Could not save due date')
      setError(msg)
      toast.error(msg)
    } finally {
      setSavingDue(false)
    }
  }

  function handleDueDate(e) {
    e.preventDefault()
    saveDueDate(dueInput || null)
  }

  function clearDueDate() {
    saveDueDate(null)
  }

  async function saveNote() {
    if (noteInput.length > 2000) {
      setNoteState('error')
      return
    }
    setNoteState('saving')
    setError('')
    try {
      const updated = await api.updateTaskNote(id, noteInput.trim() ? noteInput : null)
      setTask(updated)
      setNoteInput(updated.note || '')
      setNoteState('saved')
      toast.success('Private note saved')
    } catch (err) {
      const msg = getErrorMessage(err, 'Could not save note')
      setError(msg)
      setNoteState('error')
      toast.error(msg)
    }
  }

  useEffect(() => {
    load()
  }, [load])

  async function handleTutor() {
    setTutorLoading(true)
    setError('')
    try {
      setTutor(await api.getTutor(id))
    } catch (err) {
      setError(getErrorMessage(err, 'Tutor invocation failed'))
    } finally {
      setTutorLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!answer.trim()) {
      setError('Please provide an answer before submitting for AI validation')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const res = await api.submitAnswer(id, answer)
      setResult(res)
      toast.success(`Evaluated: ${res.score} / 100`)
      for (const b of res.newly_earned_badges || []) toast.success(`Badge awarded: ${b}`)
      const [t, h] = await Promise.all([api.getTask(id), api.getSubmissions(id)])
      setTask(t)
      setHistory(h)
    } catch (err) {
      const msg = getErrorMessage(err, 'Submission validation failed')
      setError(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <Loader label="Mounting task workspace…" />
  if (!task) return <ErrorBanner message={error || 'Task not found'} onRetry={load} />

  return (
    <div className="space-y-6 text-slate-200">
      <Link
        to={`/goals/${task.goal_id}`}
        className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Roadmap Blueprint
      </Link>

      <ErrorBanner message={error} onRetry={load} />

      {/* Task Specification Card */}
      <div className="rounded-3xl cyber-glass border border-indigo-500/25 p-6 sm:p-8 shadow-glass-panel">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-cyan-500/40 bg-cyan-950/50 px-2.5 py-0.5 text-xs font-mono font-semibold uppercase text-cyan-300">
            {task.task_type}
          </span>
          <span className="rounded-full border border-indigo-500/40 bg-indigo-950/50 px-2.5 py-0.5 text-xs font-mono font-semibold uppercase text-indigo-300">
            {task.status.replace('_', ' ')}
          </span>
          <span className="rounded-full border border-violet-500/40 bg-violet-950/50 px-2.5 py-0.5 text-xs font-mono font-semibold uppercase text-violet-300">
            {task.skill}
          </span>
        </div>

        <h1 className="mt-3 font-display text-2xl sm:text-3xl font-extrabold text-white">
          {task.title}
        </h1>
        <p className="mt-3 text-sm text-slate-300 leading-relaxed font-sans">{task.description}</p>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400 border-t border-indigo-500/15 pt-3">
          <span>WEEK {task.week}</span>
          <span>•</span>
          <span>STEP #{task.order}</span>
          <span>•</span>
          <span>{task.attempts} ATTEMPT(S)</span>
          {task.score != null && (
            <>
              <span>•</span>
              <span className="text-cyan-300 font-bold">LATEST SCORE: {task.score}/100</span>
            </>
          )}
        </div>

        {/* Due Date & Private Notes Controls */}
        <div className="mt-5 grid gap-4 pt-4 border-t border-indigo-500/15 lg:grid-cols-2">
          {/* Due date picker */}
          <form onSubmit={handleDueDate} className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-indigo-400" />
              Target Deadline {task.due_date ? `(Currently ${new Date(task.due_date).toLocaleDateString()})` : '(Unscheduled)'}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dueInput}
                onChange={(e) => setDueInput(e.target.value)}
                className="rounded-xl border border-indigo-500/25 bg-[#090d18] px-3 py-1.5 text-xs text-slate-100 focus:border-indigo-400 focus:outline-none"
              />
              <button
                disabled={savingDue}
                className="btn-cyber-primary rounded-xl px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
              >
                {savingDue ? 'Saving…' : 'Save'}
              </button>
              {task.due_date && (
                <button
                  type="button"
                  onClick={clearDueDate}
                  disabled={savingDue}
                  className="rounded-xl border border-red-500/25 bg-red-950/20 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-900/40 transition disabled:opacity-50"
                >
                  Clear
                </button>
              )}
            </div>
          </form>

          {/* Private Notes */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1 text-slate-300 font-semibold">
                <FileEdit className="h-3.5 w-3.5 text-cyan-400" /> Private Note (Local Only)
              </span>
              <span>{noteInput.length}/2000</span>
            </div>
            <textarea
              value={noteInput}
              onChange={(e) => {
                setNoteInput(e.target.value)
                setNoteState('idle')
              }}
              rows={2}
              maxLength={2000}
              placeholder="Record your thoughts or reference URLs here..."
              className="w-full rounded-xl border border-indigo-500/25 bg-[#090d18] px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-indigo-400 focus:outline-none"
            />
            <div className="flex items-center justify-between">
              <button
                onClick={saveNote}
                disabled={noteState === 'saving'}
                className="btn-cyber-ghost rounded-xl px-3 py-1 text-xs font-semibold disabled:opacity-50"
              >
                {noteState === 'saving' ? 'Saving note…' : 'Save note'}
              </button>
              {noteState === 'saved' && <span className="text-xs text-emerald-400 font-mono">Saved</span>}
              {noteState === 'error' && <span className="text-xs text-red-400 font-mono">Save failed</span>}
            </div>
          </div>
        </div>
      </div>

      {/* AI Tutor Split Panel */}
      <div className="rounded-3xl cyber-glass border border-indigo-500/25 p-6 sm:p-8 shadow-glass-panel">
        <div className="flex items-center justify-between border-b border-indigo-500/15 pb-4">
          <div>
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-white">
              <GraduationCap className="h-5 w-5 text-cyan-400" />
              Autonomous AI Tutor Copilot
            </h2>
            <p className="text-xs text-slate-400">
              Get an on-demand breakdown of the concept, concrete code examples, and practice prompts.
            </p>
          </div>
          <button
            onClick={handleTutor}
            disabled={tutorLoading}
            className="btn-cyber-primary rounded-xl px-4 py-2 text-xs font-semibold flex items-center gap-2 shrink-0 disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            {tutorLoading ? 'Generating Insights…' : 'Invoke AI Tutor'}
          </button>
        </div>

        {!tutor ? (
          <div className="py-6 text-center text-xs text-slate-400">
            Click &ldquo;Invoke AI Tutor&rdquo; to analyze this task with code examples and guidance hints.
          </div>
        ) : (
          <div className="mt-5 space-y-4 text-xs">
            <div className="rounded-xl border border-indigo-500/15 bg-slate-900/40 p-4">
              <h3 className="font-bold text-cyan-300 font-mono uppercase flex items-center gap-1.5 mb-1.5">
                <BookOpen className="h-4 w-4" /> Explanation
              </h3>
              <p className="text-slate-200 leading-relaxed text-sm font-sans">{tutor.explanation}</p>
            </div>

            <div className="rounded-xl border border-indigo-500/15 bg-[#070b14] p-4">
              <h3 className="font-bold text-violet-300 font-mono uppercase mb-1.5">Example</h3>
              <pre className="font-mono text-xs text-indigo-200 overflow-x-auto whitespace-pre-wrap">
                {tutor.example}
              </pre>
            </div>

            <div className="rounded-xl border border-indigo-500/15 bg-slate-900/40 p-4">
              <h3 className="font-bold text-amber-300 font-mono uppercase flex items-center gap-1.5 mb-1.5">
                <HelpCircle className="h-4 w-4" /> Practice Questions
              </h3>
              <ol className="list-decimal pl-5 space-y-1 text-slate-300 text-xs">
                {tutor.practice_questions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ol>
            </div>

            <div className="rounded-xl border border-indigo-500/15 bg-slate-900/40 p-4">
              <h3 className="font-bold text-emerald-300 font-mono uppercase flex items-center gap-1.5 mb-1.5">
                <Lightbulb className="h-4 w-4" /> Key Hints
              </h3>
              <ul className="list-disc pl-5 space-y-1 text-slate-300 text-xs">
                {tutor.hints.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Answer Submission Workspace */}
      <form
        onSubmit={handleSubmit}
        className="rounded-3xl cyber-glass border border-indigo-500/25 p-6 sm:p-8 shadow-glass-panel space-y-4"
      >
        <div className="border-b border-indigo-500/15 pb-3">
          <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
            <Send className="h-4 w-4 text-indigo-400" />
            Your Milestone Solution
          </h2>
          <p className="text-xs text-slate-400">
            Submit your explanation, code solution, or conceptual analysis. The AI Validator will score it from 0–100.
          </p>
        </div>

        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          rows={6}
          placeholder="Demonstrate your understanding with code snippets or detailed technical explanations..."
          className="w-full rounded-2xl border border-indigo-500/25 bg-[#080d1a] p-4 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400/40 font-mono"
        />

        <div className="flex items-center justify-between">
          <button
            type="submit"
            disabled={submitting || !answer.trim()}
            className="btn-cyber-primary rounded-xl px-5 py-2.5 text-xs font-semibold flex items-center gap-2 disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            {submitting ? 'Validator Deliberating…' : 'Submit for AI Validation'}
          </button>
          {!answer.trim() && (
            <span className="text-xs text-slate-500 font-mono">Input required</span>
          )}
        </div>
      </form>

      {/* Instant Result Gauges */}
      {result && <ScoreResult result={result} />}

      {/* Historical Submissions */}
      <div className="rounded-3xl cyber-glass border border-indigo-500/25 p-6 sm:p-8 shadow-glass-panel">
        <div className="flex items-center justify-between border-b border-indigo-500/15 pb-3 mb-4">
          <h2 className="flex items-center gap-2 font-display text-base font-bold text-white">
            <History className="h-4 w-4 text-indigo-400" />
            Evaluation History
          </h2>
          <span className="text-xs text-slate-400 font-mono">{history.length} SUBMISSIONS</span>
        </div>

        {history.length === 0 ? (
          <EmptyState
            title="No past submissions"
            hint="Submit your first solution above to initiate validation scoring."
          />
        ) : (
          <ul className="space-y-3">
            {history.map((s) => (
              <li
                key={s.id}
                className="rounded-2xl border border-indigo-500/15 bg-slate-900/50 p-4 transition hover:border-indigo-500/30"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-cyan-300 font-bold">
                    Score: {s.score}/100
                  </span>
                  <span className="font-mono text-slate-400 text-[11px]">
                    {new Date(s.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-300 font-mono line-clamp-3 leading-relaxed">
                  {s.answer_text}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
