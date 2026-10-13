import { useCallback, useEffect, useState } from 'react'
import { api, getErrorMessage } from '../api/client.js'
import ErrorBanner from '../components/ErrorBanner.jsx'
import Loader from '../components/Loader.jsx'
import { useToast } from '../context/ToastContext.jsx'
import {
  Calendar,
  Download,
  Sparkles,
  TrendingUp,
  BrainCircuit,
  Award,
  Flame,
  CheckCircle2,
} from 'lucide-react'

export default function Weekly() {
  const toast = useToast()
  const [offset, setOffset] = useState(0)
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setSummary(await api.getWeeklySummary(offset))
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load weekly summary'))
    } finally {
      setLoading(false)
    }
  }, [offset])

  useEffect(() => {
    load()
  }, [load])

  async function handleDownload() {
    setDownloading(true)
    try {
      const blob = await api.downloadWeeklyPdf(offset)
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `agentos-weekly-summary-${offset === 0 ? 'current' : 'previous'}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Weekly Executive Dossier PDF downloaded')
    } catch (err) {
      const msg = getErrorMessage(err, 'Could not download PDF')
      setError(msg)
      toast.error(msg)
    } finally {
      setDownloading(false)
    }
  }

  const cards = summary
    ? [
        { label: 'Milestones Completed', value: summary.tasks_completed, color: 'text-emerald-400' },
        { label: 'Composite Score Average', value: summary.average_score ?? '—', color: 'text-cyan-300' },
        { label: 'Priority Remedial Skill', value: summary.weakest_skill ?? '—', color: 'text-rose-400' },
        { label: 'Spaced Reviews Completed', value: summary.reviews_done, color: 'text-violet-300' },
        { label: 'Active Neural Days', value: summary.active_days, color: 'text-indigo-300' },
        { label: 'Current Streak', value: `${summary.current_streak}d`, color: 'text-amber-400' },
      ]
    : []

  return (
    <div className="space-y-6 text-slate-200">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl cyber-glass border border-indigo-500/25 p-6 sm:p-8 shadow-glass-panel">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase text-cyan-300">
            <Calendar className="h-4 w-4" /> Weekly Executive Telemetry
          </div>
          <h1 className="mt-2 font-display text-3xl font-extrabold text-white">
            Weekly Coaching Summary & Report
          </h1>
          <p className="mt-2 text-sm text-slate-300 max-w-xl leading-relaxed">
            7-day rolling window analytics synthesized by your Coach agent with actionable velocity insights.
          </p>
        </div>

        {/* Week Switcher Chips */}
        <div className="flex rounded-xl border border-indigo-500/20 bg-[#090d18] p-1">
          {[0, 1].map((o) => (
            <button
              key={o}
              onClick={() => setOffset(o)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-mono uppercase font-bold transition ${
                offset === o
                  ? 'btn-cyber-primary text-white shadow-glow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {o === 0 ? 'Current Week' : 'Previous Week'}
            </button>
          ))}
        </div>
      </div>

      <ErrorBanner message={error} onRetry={load} />

      {loading ? (
        <Loader label="Synthesizing weekly executive report…" />
      ) : (
        summary && (
          <>
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-300">
              <Calendar className="h-4 w-4 text-indigo-400" />
              <span>
                Window: {summary.week_start} → {summary.week_end}
              </span>
            </div>

            {/* Metrics HUD Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cards.map((c) => (
                <div
                  key={c.label}
                  className="rounded-2xl cyber-glass border border-indigo-500/20 p-5 shadow-glass-panel transition hover:border-indigo-500/40"
                >
                  <p className="text-xs font-mono uppercase tracking-wider text-slate-400">{c.label}</p>
                  <p className={`mt-2 font-display text-3xl font-extrabold ${c.color}`}>{c.value}</p>
                </div>
              ))}
            </div>

            {/* Coach Briefing Panel */}
            <div className="rounded-3xl cyber-glass border border-indigo-500/25 p-6 sm:p-8 shadow-glass-panel space-y-3">
              <div className="flex items-center gap-2 border-b border-indigo-500/15 pb-3">
                <BrainCircuit className="h-5 w-5 text-indigo-400" />
                <h2 className="font-display text-lg font-bold text-white">
                  Executive Coaching Synthesis
                </h2>
              </div>
              <p className="text-sm text-slate-200 leading-relaxed font-sans">
                {summary.coaching_note}
              </p>
            </div>

            {/* Export PDF Button */}
            <div>
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="btn-cyber-primary rounded-xl px-5 py-2.5 text-xs font-semibold flex items-center gap-2 disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                {downloading ? 'Compiling Dossier PDF…' : 'Export Official Weekly PDF Dossier'}
              </button>
            </div>
          </>
        )
      )}
    </div>
  )
}
