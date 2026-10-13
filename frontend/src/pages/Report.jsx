import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, getErrorMessage } from '../api/client.js'
import ErrorBanner from '../components/ErrorBanner.jsx'
import Loader from '../components/Loader.jsx'
import { useToast } from '../context/ToastContext.jsx'
import {
  ArrowLeft,
  Download,
  Printer,
  FileCheck,
  TrendingUp,
  Layers,
  Award,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'

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
      setError(getErrorMessage(err, 'Could not generate career report'))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  async function handleDownload() {
    setDownloading(true)
    try {
      const blob = await api.downloadReportPdf(id)
      saveBlob(blob, `agentos-blueprint-report-${id}.pdf`)
      toast.success('Dossier PDF downloaded')
    } catch (err) {
      const msg = getErrorMessage(err, 'Could not download report PDF')
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
      saveBlob(blob, 'agentos-career-comprehensive-report.pdf')
      toast.success('Comprehensive Career Dossier PDF downloaded')
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

  if (loading) return <Loader label="Compiling AI career verification dossier…" />
  if (!report) return <ErrorBanner message={error || 'Report not found'} onRetry={load} />

  const circle = 2 * Math.PI * 40
  const offset = circle - (circle * Math.min(100, Math.max(0, report.readiness_score))) / 100
  const labels = {
    technical_skills: 'Technical Skills',
    projects: 'Projects & Implementations',
    problem_solving: 'Problem Solving & Algorithmic Rigor',
    interview: 'Technical Interview Readiness',
    communication: 'Technical Articulation & Systems Thinking',
  }

  return (
    <div className="space-y-6 text-slate-200">
      <div className="no-print">
        <Link
          to={`/goals/${id}`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Roadmap Blueprint
        </Link>
      </div>

      <ErrorBanner message={error} onRetry={load} />

      {/* Cyber Dossier Header HUD */}
      <div className="rounded-3xl cyber-glass border border-indigo-500/25 p-8 text-center shadow-glass-panel relative overflow-hidden">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/40 bg-indigo-950/40 px-3 py-1 text-xs font-mono text-cyan-300 mb-4">
          <Sparkles className="h-3.5 w-3.5" /> OFFICIAL AGENTOS VERIFICATION DOSSIER
        </div>

        <svg width="130" height="130" viewBox="0 0 120 120" className="mx-auto">
          <circle cx="60" cy="60" r="40" fill="none" strokeWidth="8" className="stroke-slate-800" />
          <circle
            cx="60"
            cy="60"
            r="40"
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circle}
            strokeDashoffset={offset}
            transform="rotate(-90 60 60)"
            className="stroke-cyan-400 transition-all duration-1000"
          />
          <text
            x="60"
            y="69"
            textAnchor="middle"
            className="font-display text-2xl font-black fill-white"
          >
            {report.readiness_score}
          </text>
        </svg>

        <p className="mt-3 font-display text-2xl font-bold text-white">
          Certified Readiness Index: {report.readiness_score} / 100
        </p>
        <p className="mt-1 text-xs font-mono text-slate-400">
          {report.tasks_completed}/{report.tasks_total} milestones verified · Avg score {report.avg_score ?? '—'}
          {report.latest_interview_score != null && ` · Interview ${report.latest_interview_score}/100`}
        </p>
      </div>

      {/* Category Dimensions Breakdown */}
      <div className="rounded-3xl cyber-glass border border-indigo-500/20 p-6 sm:p-8 shadow-glass-panel space-y-4">
        <h2 className="flex items-center gap-2 font-display text-base font-bold text-white border-b border-indigo-500/15 pb-3">
          <TrendingUp className="h-4 w-4 text-cyan-400" />
          Category Evaluation Matrix
        </h2>
        <div className="space-y-3.5">
          {Object.entries(labels).map(([key, label]) => {
            const val = report.categories[key] ?? 0
            return (
              <div key={key}>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>{label}</span>
                  <span className="font-mono text-cyan-300 font-bold">{val}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-900 border border-indigo-500/20">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-400"
                    style={{ width: `${val}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {/* Strengths & Deficits */}
        <div className="pt-4 border-t border-indigo-500/15 flex flex-wrap gap-2">
          {report.strong_areas.map((s) => (
            <span
              key={s}
              className="rounded-full border border-emerald-500/30 bg-emerald-950/40 px-3 py-1 text-xs font-mono font-medium text-emerald-300 flex items-center gap-1"
            >
              <CheckCircle2 className="h-3 w-3" /> {s}
            </span>
          ))}
          {report.weak_areas.map((s) => (
            <span
              key={s}
              className="rounded-full border border-rose-500/30 bg-rose-950/40 px-3 py-1 text-xs font-mono font-medium text-rose-300 flex items-center gap-1"
            >
              <AlertTriangle className="h-3 w-3" /> {s}
            </span>
          ))}
        </div>
      </div>

      {/* Recommended Next Strategic Steps */}
      <div className="rounded-3xl cyber-glass border border-indigo-500/20 p-6 sm:p-8 shadow-glass-panel space-y-3">
        <h2 className="flex items-center gap-2 font-display text-base font-bold text-white border-b border-indigo-500/15 pb-3">
          <Sparkles className="h-4 w-4 text-indigo-400" />
          AI Autonomous Roadmap Recommendations
        </h2>
        <ol className="list-decimal pl-5 space-y-2 text-xs sm:text-sm text-slate-300">
          {report.next_steps.map((s, i) => (
            <li key={i} className="leading-relaxed">
              {s}
            </li>
          ))}
        </ol>
      </div>

      {/* Action Buttons */}
      <div className="no-print flex flex-wrap items-center gap-3">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="btn-cyber-primary rounded-xl px-5 py-2.5 text-xs font-semibold flex items-center gap-2 disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          {downloading ? 'Compiling PDF…' : 'Export Goal PDF Dossier'}
        </button>
        <button
          onClick={handleCareerDownload}
          disabled={downloading}
          className="btn-cyber-cyan rounded-xl px-5 py-2.5 text-xs font-semibold flex items-center gap-2 disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          Download Comprehensive Career PDF
        </button>
        <button
          onClick={() => window.print()}
          className="btn-cyber-ghost rounded-xl px-4 py-2.5 text-xs font-semibold flex items-center gap-2"
        >
          <Printer className="h-4 w-4" />
          Print View
        </button>
      </div>
    </div>
  )
}
