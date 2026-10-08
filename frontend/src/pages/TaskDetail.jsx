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
  const [dueInput, setDueInput] = useState('')
  const [noteInput, setNoteInput] = useState('')
  const [noteState, setNoteState] = useState('idle')  // idle | saving | saved | error
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
      setError(getErrorMessage(err, 'Could not load task'))
    } finally {
      setLoading(false)
    }
  }, [id])

  async function saveDueDate(value) {
    if (savingDue) return  // ignore extra clicks until the save returns
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
      toast.success('Note saved')
    } catch (err) {
      const msg = getErrorMessage(err, 'Could not save note')
      setError(msg)
      setNoteState('error')
      toast.error(msg)
    }
  }

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
        <form onSubmit={handleDueDate} className="mt-3 flex flex-wrap items-center gap-2">
          <label className="text-xs text-slate-500">Due date{task.due_date ? ` (now ${new Date(task.due_date).toLocaleDateString()})` : ' (none)'}</label>
          <input type="date" value={dueInput} onChange={(e) => setDueInput(e.target.value)}
            className="rounded-lg border border-slate-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none" />
          <button disabled={savingDue}
            className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200 disabled:opacity-60">
            {savingDue ? 'Saving…' : 'Save'}
          </button>
          {task.due_date && (
            <button type="button" onClick={clearDueDate} disabled={savingDue}
              className="rounded-lg px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60">Clear</button>
          )}
        </form>
        <div className="mt-3">
          <label className="text-xs text-slate-500">Private note (plain text, never sent to the AI)</label>
          <textarea value={noteInput} onChange={(e) => { setNoteInput(e.target.value); setNoteState('idle') }} rows={3} maxLength={2000}
            placeholder="Anything you want to remember about this task…"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
          <div className="mt-1 flex items-center gap-2">
            <button onClick={saveNote} disabled={noteState === 'saving'}
              className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200 disabled:opacity-60">
              {noteState === 'saving' ? 'Saving…' : 'Save note'}
            </button>
            <span className="text-xs text-slate-400">{noteInput.length}/2000</span>
            {noteState === 'saved' && <span className="text-xs font-medium text-green-600">Saved</span>}
            {noteState === 'error' && <span className="text-xs font-medium text-red-600">Could not save</span>}
          </div>
        </div>
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
