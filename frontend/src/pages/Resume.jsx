import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, getErrorMessage } from '../api/client.js'
import ErrorBanner from '../components/ErrorBanner.jsx'
import Loader from '../components/Loader.jsx'
import { useToast } from '../context/ToastContext.jsx'

// Resume upload: picker, progress, results, and handoff to goal creation.
export default function Resume() {
  const navigate = useNavigate()
  const toast = useToast()
  const [file, setFile] = useState(null)
  const [result, setResult] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function handleUpload(e) {
    e.preventDefault()
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const res = await api.analyzeResume(file)
      setResult(res)
      toast.success(`Resume scored ${res.score} / 100`)
    } catch (err) {
      const msg = getErrorMessage(err, 'Could not analyze resume')
      setError(msg)
      toast.error(msg)
    } finally {
      setUploading(false)
    }
  }

  function useForGoal() {
    const skills = (result?.detected_skills || []).join(', ')
    navigate(`/?skills=${encodeURIComponent(skills)}`)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Resume analyzer</h1>
        <p className="text-sm text-slate-500">Upload a PDF or .txt resume (max 2 MB) to detect skills and gaps.</p>
      </div>
      <ErrorBanner message={error} />

      <form onSubmit={handleUpload} className="flex flex-wrap items-end gap-3 rounded-xl bg-white p-5 shadow-sm">
        <div className="min-w-0 flex-1">
          <label className="mb-1 block text-xs font-medium text-slate-600">Resume file</label>
          <input type="file" accept=".pdf,.txt" onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full text-sm text-slate-600" />
        </div>
        <button disabled={uploading || !file}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
          {uploading ? 'Analyzing…' : 'Analyze resume'}
        </button>
      </form>
      {uploading && <Loader label="Reading your resume…" />}

      {result && (
        <div className="space-y-4 rounded-xl bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Results</h2>
            <span className="text-2xl font-bold text-indigo-600">{result.score}</span>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-600">Detected skills</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {result.detected_skills.map((s) => <span key={s} className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">{s}</span>)}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-600">Gaps</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {result.skill_gaps.length === 0
                ? <span className="text-sm text-slate-400">None found.</span>
                : result.skill_gaps.map((s) => <span key={s} className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">{s}</span>)}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-600">Feedback</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-600">
              {result.feedback.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
          </div>
          <button onClick={useForGoal} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
            Use for my goal
          </button>
        </div>
      )}
    </div>
  )
}
