import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
  Trash2,
  Loader2,
  Bot,
  ExternalLink,
} from 'lucide-react'
import { useToast } from '../context/ToastContext.jsx'
import { useWorkspace } from '../context/WorkspaceContext.jsx'
import { supabase, isSupabaseConfigured } from '../lib/supabase.js'
import { scheduleSchema } from '../lib/validators.js'

const DEFAULT_SCHEDULES = [
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
  const navigate = useNavigate()
  const { currentWorkspace } = useWorkspace()

  const [schedules, setSchedules] = useState(DEFAULT_SCHEDULES)
  const [agents, setAgents] = useState([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [schedName, setSchedName] = useState('')
  const [targetAgentId, setTargetAgentId] = useState('')
  const [cronExpr, setCronExpr] = useState('0 9 * * 1')
  const [busy, setBusy] = useState(false)
  const [copiedWebhook, setCopiedWebhook] = useState(false)

  const webhookUrl = `${window.location.origin}/api/webhooks/trigger?workspace=${currentWorkspace?.slug || 'default'}&token=${currentWorkspace?.id?.slice(0, 8) || 'secret'}`

  // Fetch agents for schedule target dropdown
  const fetchAgents = useCallback(async () => {
    if (!currentWorkspace?.id || !isSupabaseConfigured) return
    try {
      const { data } = await supabase
        .from('agents')
        .select('id, name, role')
        .eq('workspace_id', currentWorkspace.id)
        .eq('is_archived', false)

      if (data && data.length > 0) {
        setAgents(data)
        setTargetAgentId(data[0].id)
      }
    } catch (e) {
      console.warn('Could not load agents for scheduler:', e)
    }
  }, [currentWorkspace?.id])

  // Fetch persistent schedules
  const fetchSchedules = useCallback(async () => {
    if (!currentWorkspace?.id || !isSupabaseConfigured) return
    try {
      const { data, error } = await supabase
        .from('schedules')
        .select(`
          id,
          name,
          cron_expression,
          is_active,
          last_run_at,
          next_run_at,
          agents (id, name, role)
        `)
        .eq('workspace_id', currentWorkspace.id)

      if (!error && data && data.length > 0) {
        setSchedules(
          data.map((s) => ({
            id: s.id,
            name: s.name,
            cron: s.cron_expression,
            target: s.agents?.name || 'Autonomous Agent',
            status: s.is_active ? 'active' : 'paused',
            lastRun: s.last_run_at ? new Date(s.last_run_at).toLocaleString() : 'Pending trigger',
            nextRun: s.next_run_at ? new Date(s.next_run_at).toLocaleString() : 'Calculated via cron',
          }))
        )
      }
    } catch (e) {
      console.warn('Could not load schedules:', e)
    }
  }, [currentWorkspace?.id])

  useEffect(() => {
    fetchAgents()
    fetchSchedules()
  }, [fetchAgents, fetchSchedules])

  function copyWebhook() {
    navigator.clipboard.writeText(webhookUrl)
    setCopiedWebhook(true)
    toast.success('Inbound Webhook URL copied to clipboard')
    setTimeout(() => setCopiedWebhook(false), 2500)
  }

  async function handleCreateSchedule(e) {
    e.preventDefault()
    const valResult = scheduleSchema.safeParse({
      name: schedName.trim(),
      agentId: targetAgentId || 'default',
      cronExpression: cronExpr.trim(),
    })

    if (!valResult.success) {
      toast.error(valResult.error.errors[0]?.message || 'Invalid cron expression')
      return
    }

    setBusy(true)
    try {
      if (isSupabaseConfigured && currentWorkspace?.id) {
        try {
          const { data, error } = await supabase
            .from('schedules')
            .insert({
              workspace_id: currentWorkspace.id,
              agent_id: targetAgentId || null,
              name: schedName.trim(),
              cron_expression: cronExpr.trim(),
              is_active: true,
            })
            .select('*, agents(name)')
            .single()

          if (!error && data) {
            await fetchSchedules()
            toast.success(`Schedule "${schedName}" registered`)
            setShowCreateModal(false)
            setSchedName('')
            return
          }
        } catch (subErr) {
          console.warn('Supabase schedule save fallback to local:', subErr)
        }
      }

      const selectedAgent = agents.find((a) => a.id === targetAgentId)
      setSchedules((prev) => [
        {
          id: `s-${Date.now()}`,
          name: schedName.trim(),
          cron: cronExpr.trim(),
          target: selectedAgent?.name || 'Career Copilot',
          status: 'active',
          lastRun: 'Pending initial trigger',
          nextRun: 'Calculated via cron',
        },
        ...prev,
      ])
      toast.success(`Schedule "${schedName}" registered in workspace`)
      setShowCreateModal(false)
      setSchedName('')
    } catch (err) {
      toast.error(err.message || 'Failed to create schedule')
    } finally {
      setBusy(false)
    }
  }

  async function toggleStatus(id) {
    const targetSched = schedules.find((s) => s.id === id)
    if (!targetSched) return

    const newStatus = targetSched.status === 'active' ? 'paused' : 'active'

    if (isSupabaseConfigured && id.includes('-') && id.length > 20) {
      await supabase
        .from('schedules')
        .update({ is_active: newStatus === 'active' })
        .eq('id', id)
    }

    setSchedules((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: newStatus } : s))
    )
    toast.success(`Schedule ${newStatus === 'active' ? 'resumed' : 'paused'}`)
  }

  async function handleTriggerNow(sched) {
    toast.info(`Triggering schedule "${sched.name}" immediately…`)
    try {
      if (isSupabaseConfigured && currentWorkspace?.id) {
        // Create run with trigger_type schedule
        const { data: run } = await supabase
          .from('runs')
          .insert({
            workspace_id: currentWorkspace.id,
            agent_id: targetAgentId || agents[0]?.id,
            trigger_type: 'schedule',
            status: 'running',
            input_data: { schedule_name: sched.name, cron: sched.cron },
          })
          .select()
          .single()

        if (run) {
          navigate(`/monitoring?runId=${run.id}`)
          return
        }
      }
      setTimeout(() => {
        toast.success(`Execution completed for ${sched.name}`)
        navigate('/monitoring')
      }, 800)
    } catch (e) {
      toast.error('Could not execute trigger')
    }
  }

  async function handleDeleteSchedule(id) {
    if (isSupabaseConfigured && id.includes('-') && id.length > 20) {
      await supabase.from('schedules').delete().eq('id', id)
    }
    setSchedules((prev) => prev.filter((s) => s.id !== id))
    toast.success('Schedule removed')
  }

  return (
    <div className="space-y-6 text-slate-200">
      {/* Header Banner */}
      <div className="rounded-3xl cyber-glass border border-indigo-500/25 p-6 sm:p-8 shadow-glass-panel">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono uppercase text-cyan-300">
              <Clock className="h-4 w-4" /> Autonomous Execution Scheduler
            </div>
            <h1 className="mt-2 font-display text-3xl font-extrabold text-white">
              Cron Schedules & Inbound Webhooks
            </h1>
            <p className="mt-2 text-sm text-slate-300 max-w-2xl leading-relaxed">
              Schedule periodic agent evaluations, automated Leitner review alerts, or trigger pipelines externally via authenticated HTTP webhooks.
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-cyber-primary rounded-xl px-4 py-2 text-xs font-semibold flex items-center gap-2 self-start shadow-glow-sm"
          >
            <Plus className="h-4 w-4" /> New Cron Schedule
          </button>
        </div>
      </div>

      {/* Webhook Endpoint Card */}
      <div className="rounded-3xl cyber-glass border border-indigo-500/20 p-6 shadow-glass-panel space-y-3">
        <div className="flex items-center gap-2">
          <Webhook className="h-4 w-4 text-cyan-400" />
          <h2 className="font-display font-bold text-sm text-white">Inbound Webhook Trigger</h2>
        </div>
        <p className="text-xs text-slate-400">
          POST JSON with <code className="text-indigo-300">&ldquo;event&rdquo;: &ldquo;trigger_pipeline&rdquo;</code> to execute multi-agent pipelines remotely.
        </p>
        <div className="flex items-center gap-2 bg-[#080d1a] p-2.5 rounded-xl border border-indigo-500/20 font-mono text-xs">
          <span className="text-cyan-300 flex-1 truncate">{webhookUrl}</span>
          <button
            onClick={copyWebhook}
            className="btn-cyber-primary rounded-lg px-3 py-1 text-[11px] font-semibold flex items-center gap-1 shrink-0"
          >
            {copiedWebhook ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copiedWebhook ? 'Copied!' : 'Copy Webhook'}
          </button>
        </div>
      </div>

      {/* Schedules List */}
      <div className="rounded-3xl cyber-glass border border-indigo-500/25 p-6 shadow-glass-panel space-y-4">
        <div className="flex items-center justify-between border-b border-indigo-500/15 pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-violet-400" />
            <h2 className="font-display font-bold text-sm text-white">Active Autonomous Timers</h2>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {schedules.filter((s) => s.status === 'active').length} Active Triggers
          </span>
        </div>

        <div className="space-y-3">
          {schedules.map((sched) => (
            <div
              key={sched.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-white/5 bg-[#090d16]/70 hover:border-white/15 transition"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <h3 className="font-display font-bold text-sm text-white">{sched.name}</h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-mono font-bold uppercase ${
                      sched.status === 'active'
                        ? 'border border-emerald-500/30 bg-emerald-950/40 text-emerald-300'
                        : 'border border-slate-700 bg-slate-900 text-slate-400'
                    }`}
                  >
                    {sched.status}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-mono">
                  <span>
                    Cron: <code className="text-cyan-300">{sched.cron}</code>
                  </span>
                  <span>•</span>
                  <span>Target: <strong className="text-slate-200">{sched.target}</strong></span>
                  <span>•</span>
                  <span>Next: <strong className="text-slate-300">{sched.nextRun}</strong></span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleTriggerNow(sched)}
                  className="rounded-xl border border-indigo-500/30 bg-indigo-950/30 px-3 py-1.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-900/40 transition flex items-center gap-1.5"
                >
                  <Play className="h-3.5 w-3.5" /> Run Now
                </button>
                <button
                  onClick={() => toggleStatus(sched.id)}
                  className={`p-1.5 rounded-xl border transition ${
                    sched.status === 'active'
                      ? 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-950/40'
                      : 'border-slate-700 text-slate-400 hover:text-white'
                  }`}
                  title={sched.status === 'active' ? 'Pause Schedule' : 'Resume Schedule'}
                >
                  <Power className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDeleteSchedule(sched.id)}
                  className="p-1.5 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition"
                  title="Delete schedule"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* New Schedule Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl cyber-glass border border-white/15 p-6 shadow-glass-panel space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="h-4 w-4 text-indigo-400" /> Create Cron Schedule
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateSchedule} className="space-y-3">
              <div>
                <label className="text-xs text-slate-300 block mb-1">Schedule Name</label>
                <input
                  type="text"
                  value={schedName}
                  onChange={(e) => setSchedName(e.target.value)}
                  placeholder="Daily Retrospective Review"
                  required
                  className="w-full rounded-xl border border-white/10 bg-[#090d16] px-3.5 py-2 text-xs text-slate-100 focus:border-indigo-400 focus:outline-none"
                />
              </div>

              {agents.length > 0 && (
                <div>
                  <label className="text-xs text-slate-300 block mb-1">Target Agent</label>
                  <select
                    value={targetAgentId}
                    onChange={(e) => setTargetAgentId(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#090d16] px-3.5 py-2 text-xs text-slate-100 focus:border-indigo-400 focus:outline-none"
                  >
                    {agents.map((ag) => (
                      <option key={ag.id} value={ag.id}>
                        {ag.name} ({ag.role})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs text-slate-300 block mb-1">
                  Cron Expression (5 Fields: minute hour dom month dow)
                </label>
                <input
                  type="text"
                  value={cronExpr}
                  onChange={(e) => setCronExpr(e.target.value)}
                  placeholder="0 9 * * 1"
                  required
                  className="w-full rounded-xl border border-white/10 bg-[#090d16] px-3.5 py-2 text-xs text-slate-100 focus:border-indigo-400 focus:outline-none font-mono"
                />
                <span className="text-[10px] text-slate-500 block mt-1">
                  Examples: <code className="text-cyan-300">0 9 * * 1</code> (Mon 9AM), <code className="text-cyan-300">0 * * * *</code> (Hourly)
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl border border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  disabled={busy}
                  className="btn-cyber-primary rounded-xl px-4 py-1.5 text-xs font-semibold disabled:opacity-50"
                >
                  {busy ? 'Registering…' : 'Register Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
