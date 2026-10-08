import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, getErrorMessage } from '../api/client.js'
import ErrorBanner from '../components/ErrorBanner.jsx'
import Loader from '../components/Loader.jsx'
import { useToast } from '../context/ToastContext.jsx'

// Report card: readiness circle, category bars, chips, next steps, PDF + print.
export default function Report() {
  const { id } = useParams()
  const toast = useToast()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setReport(await api.getReport(id))
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load report'))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  async function handleDownload() {
    setDownloading(true)
    try {
      const blob = await api.downloadReportPdf(id)
      saveBlob(blob, `agentos-report-goal-${id}.pdf`)
      toast.success('PDF downloaded')
    } catch (err) {
      const msg = getErrorMessage(err, 'Could not download PDF')
      setError(msg)
      toast.error(msg)
    } finally {
      setDownloading(false)
    }
  }

  async function handleCareerDownload() {
    setDownloading(true)
    try {
      const blob = await api.downloadCareerPdf(Number(id))
      saveBlob(blob, 'career-report.pdf')
      toast.success('Career PDF downloaded')
    } catch (err) {
      const msg = getErrorMessage(err, 'Could not download career PDF')
      setError(msg)
      toast.error(msg)
    } finally {
      setDownloading(false)
    }
  }

  function saveBlob(blob, filename) {
    const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }))
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)
  }

  if (loading) return <Loader label="Building report…" />
  if (!report) return <ErrorBanner message={error || 'Report not found'} onRetry={load} />

  const circle = 2 * Math.PI * 40
  const offset = circle - (circle * Math.min(100, Math.max(0, report.readiness_score))) / 100
  const labels = {
    technical_skills: 'Technical Skills',
    projects: 'Projects',
    problem_solving: 'Problem Solving',
    interview: 'Interview',
    communication: 'Communication',
  }

  return (
    <div className="space-y-6">
      <div className="no-print">
        <Link to={`/goals/${id}`} className="text-sm font-medium text-indigo-600 hover:underline">← Back to goal</Link>
      </div>
      <ErrorBanner message={error} onRetry={load} />

      <div className="rounded-2xl border-t-4 border-indigo-600 bg-white p-6 text-center shadow-sm">
        <p className="text-xs uppercase tracking-widest text-slate-400">AGENTOS Career Report</p>
        <svg width="120" height="120" viewBox="0 0 120 120" className="mx-auto mt-3">
          <circle cx="60" cy="60" r="40" fill="none" strokeWidth="10" className="stroke-slate-200" />
          <circle cx="60" cy="60" r="40" fill="none" strokeWidth="10" strokeLinecap="round"
            strokeDasharray={circle} strokeDashoffset={offset} transform="rotate(-90 60 60)" className="stroke-indigo-600" />
          <text x="60" y="69" textAnchor="middle" fontSize="24" fontWeight="bold" fill="#1e293b">{report.readiness_score}</text>
        </svg>
        <p className="mt-1 text-sm text-slate-500">
          {report.tasks_completed}/{report.tasks_total} tasks · avg {report.avg_score ?? '—'}
          {report.latest_interview_score != null && ` · interview ${report.latest_interview_score}`}
        </p>
      </div>

      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Category scores</h2>
        <div className="mt-3 space-y-2">
          {Object.entries(labels).map(([key, label]) => (
            <div key={key}>
              <div className="flex justify-between text-sm text-slate-600"><span>{label}</span><span>{report.categories[key] ?? 0}</span></div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${report.categories[key] ?? 0}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {report.strong_areas.map((s) => <span key={s} className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">{s}</span>)}
          {report.weak_areas.map((s) => <span key={s} className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">{s}</span>)}
        </div>
      </div>

      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Recommended next steps</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-600">
          {report.next_steps.map((s, i) => <li key={i}>{s}</li>)}
        </ol>
      </div>

      <div className="no-print flex flex-wrap gap-2">
        <button onClick={handleDownload} disabled={downloading}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
          {downloading ? 'Preparing PDF…' : 'Download PDF'}
        </button>
        <button onClick={handleCareerDownload} disabled={downloading}
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60">
          Download career report PDF
        </button>
        <button onClick={() => window.print()} className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200">
          Print
        </button>
      </div>
    </div>
  )
}
