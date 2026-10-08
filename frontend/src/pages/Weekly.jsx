import { useCallback, useEffect, useState } from 'react'
import { api, getErrorMessage } from '../api/client.js'
import ErrorBanner from '../components/ErrorBanner.jsx'
import Loader from '../components/Loader.jsx'
import { useToast } from '../context/ToastContext.jsx'

// Weekly summary: stat cards, coaching note, week selector, PDF download.
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

  useEffect(() => { load() }, [load])

  async function handleDownload() {
    setDownloading(true)
    try {
      const blob = await api.downloadWeeklyPdf(offset)
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = 'weekly-summary.pdf'
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      toast.success('PDF downloaded')
    } catch (err) {
      const msg = getErrorMessage(err, 'Could not download PDF')
      setError(msg)
      toast.error(msg)
    } finally {
      setDownloading(false)
    }
  }

  const cards = summary ? [
    ['Tasks completed', summary.tasks_completed],
    ['Average score', summary.average_score ?? '—'],
    ['Weakest skill', summary.weakest_skill ?? '—'],
    ['Reviews finished', summary.reviews_done],
    ['Active days', summary.active_days],
    ['Streak', `${summary.current_streak}d`],
  ] : []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Weekly summary</h1>
          <p className="text-sm text-slate-500">Seven-day windows ending today.</p>
        </div>
        <div className="flex gap-1">
          {[0, 1].map((o) => (
            <button key={o} onClick={() => setOffset(o)}
              className={`rounded-lg px-3 py-1 text-xs font-semibold ${offset === o ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-200'}`}>
              {o === 0 ? 'This week' : 'Last week'}
            </button>
          ))}
        </div>
      </div>
      <ErrorBanner message={error} onRetry={load} />

      {loading ? <Loader label="Loading week…" /> : summary && (
        <>
          <p className="text-sm text-slate-500">{summary.week_start} → {summary.week_end}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {cards.map(([label, value]) => (
              <div key={label} className="rounded-xl bg-white p-4 shadow-sm">
                <p className="text-xs text-slate-500">{label}</p>
                <p className="text-2xl font-bold text-slate-900">{value}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Coaching note</h2>
            <p className="mt-1 text-sm text-slate-600">{summary.coaching_note}</p>
          </div>
          <button onClick={handleDownload} disabled={downloading}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
            {downloading ? 'Preparing PDF…' : 'Download PDF'}
          </button>
        </>
      )}
    </div>
  )
}
