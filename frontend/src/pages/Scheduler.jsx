import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Calendar,
  Clock,
  ArrowLeft,
  Webhook,
  Play,
  CheckCircle2,
  Copy,
  Plus,
  Power,
  Sparkles,
} from 'lucide-react'
import { useToast } from '../context/ToastContext.jsx'

const SCHEDULES = [
  {
    id: 's-1',
    name: 'Monday Morning Executive Briefing',
    cron: '0 9 * * 1',
    target: 'Weekly Coaching Summary',
    status: 'active',
    lastRun: 'Yesterday at 09:00 UTC',
    nextRun: 'Next Monday at 09:00 UTC',
  },
  {
    id: 's-2',
    name: 'Daily Spaced Repetition Recall',
    cron: '0 19 * * *',
    target: 'Leitner Retention Deck',
    status: 'active',
    lastRun: 'Today at 19:00 UTC',
    nextRun: 'Tomorrow at 19:00 UTC',
  },
  {
    id: 's-3',
    name: 'Weekend Algorithmic Quiz Challenge',
    cron: '0 10 * * 6',
    target: 'Timed 5-Min Assessment',
    status: 'paused',
    lastRun: '3 days ago',
    nextRun: 'Saturday at 10:00 UTC',
  },
]

export default function Scheduler() {
  const toast = useToast()
  const [schedules, setSchedules] = useState(SCHEDULES)
  const webhookUrl = 'https://agentos-six-omega.vercel.app/api/webhooks/trigger-agent'

  function copyWebhook() {
    navigator.clipboard.writeText(webhookUrl)
    toast.success('Inbound Webhook URL copied to clipboard')
  }

  function toggleStatus(id) {
    setSchedules((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, status: s.status === 'active' ? 'paused' : 'active' } : s
      )
    )
    toast.success('Trigger status toggled')
  }

  return (
    <div className="space-y-6 text-slate-200">
      <div className="rounded-3xl cyber-glass border border-indigo-500/25 p-6 sm:p-8 shadow-glass-panel">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
        </Link>
        <div className="flex items-center gap-2 text-xs font-mono uppercase text-cyan-300">
          <Clock className="h-4 w-4" /> Autonomous Execution Scheduler
        </div>
        <h1 className="mt-2 font-display text-3xl font-extrabold text-white">
          Cron Schedules & Inbound Webhooks
        </h1>
        <p className="mt-2 text-sm text-slate-300 max-w-2xl leading-relaxed">
          Schedule periodic agent runs, automated Leitner review alerts, or trigger pipelines externally via authenticated HTTP webhooks.
        </p>
      </div>

      {/* Webhook Endpoint Card */}
      <div className="rounded-3xl cyber-glass border border-indigo-500/20 p-6 shadow-glass-panel space-y-3">
        <div className="flex items-center gap-2">
          <Webhook className="h-4 w-4 text-cyan-400" />
          <h2 className="font-display font-bold text-sm text-white">Inbound Webhook Trigger</h2>
        </div>
        <p className="text-xs text-slate-400">
          POST JSON with &ldquo;event&rdquo;: &ldquo;trigger_plan&rdquo; to execute multi-agent pipelines remotely.
        </p>
        <div className="flex items-center gap-2 bg-[#080d1a] p-2.5 rounded-xl border border-indigo-500/20 font-mono text-xs">
          <span className="text-cyan-300 flex-1 truncate">{webhookUrl}</span>
          <button
            onClick={copyWebhook}
            className="btn-cyber-primary rounded-lg px-3 py-1 text-[11px] font-semibold flex items-center gap-1 shrink-0"
          >
            <Copy className="h-3 w-3" /> Copy
          </button>
        </div>
      </div>

      {/* Cron Schedules Table */}
      <div className="rounded-3xl cyber-glass border border-indigo-500/25 p-6 sm:p-8 shadow-glass-panel space-y-4">
        <div className="flex items-center justify-between border-b border-indigo-500/15 pb-3">
          <h2 className="font-display font-bold text-base text-white flex items-center gap-2">
            <Calendar className="h-4 w-4 text-indigo-400" />
            Active Scheduled Triggers
          </h2>
          <span className="text-xs font-mono text-cyan-300">{schedules.length} SCHEDULES</span>
        </div>

        <div className="space-y-3">
          {schedules.map((s) => (
            <div
              key={s.id}
              className="rounded-2xl border border-indigo-500/15 bg-slate-900/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition hover:border-indigo-500/35"
            >
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="font-display font-bold text-white text-sm">{s.name}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-mono uppercase font-bold border ${
                      s.status === 'active'
                        ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
                        : 'border-slate-700 bg-slate-900 text-slate-500'
                    }`}
                  >
                    {s.status}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs font-mono text-slate-400">
                  <span>Cron: <b className="text-cyan-300">{s.cron}</b></span>
                  <span>•</span>
                  <span>Target: <b className="text-violet-300">{s.target}</b></span>
                  <span>•</span>
                  <span>Next: {s.nextRun}</span>
                </div>
              </div>

              <button
                onClick={() => toggleStatus(s.id)}
                className="btn-cyber-ghost rounded-xl px-3.5 py-1.5 text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto"
              >
                <Power className="h-3.5 w-3.5" />
                {s.status === 'active' ? 'Pause' : 'Activate'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
