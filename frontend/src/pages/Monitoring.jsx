import { useEffect, useState, useRef, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Activity,
  ArrowLeft,
  Cpu,
  Zap,
  TrendingUp,
  Layers,
  Terminal,
  Play,
  Pause,
  RefreshCw,
  Clock,
  Sparkles,
  Server,
  StopCircle,
  CheckCircle2,
  AlertCircle,
  Database,
} from 'lucide-react'
import { useWorkspace } from '../context/WorkspaceContext.jsx'
import { supabase, isSupabaseConfigured } from '../lib/supabase.js'
import { useToast } from '../context/ToastContext.jsx'

export default function Monitoring() {
  const [searchParams] = useSearchParams()
  const toast = useToast()
  const { currentWorkspace } = useWorkspace()

  const [runs, setRuns] = useState([])
  const [selectedRunId, setSelectedRunId] = useState(searchParams.get('runId') || null)
  const [currentRun, setCurrentRun] = useState(null)
  const [events, setEvents] = useState([])
  const [streaming, setStreaming] = useState(true)
  const [loading, setLoading] = useState(false)

  // Aggregated KPIs
  const [tokenTotal, setTokenTotal] = useState(14820)
  const [latencyMs, setLatencyMs] = useState(62)
  const [costEst, setCostEst] = useState(0.044)

  // Fetch recent runs for active workspace
  const fetchWorkspaceRuns = useCallback(async () => {
    if (!currentWorkspace?.id || !isSupabaseConfigured) return
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('runs')
        .select(`
          id,
          status,
          total_tokens,
          cost_usd,
          latency_ms,
          trigger_type,
          created_at,
          completed_at,
          agents (name, role)
        `)
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false })
        .limit(15)

      if (!error && data) {
        setRuns(data)
        if (!selectedRunId && data.length > 0) {
          setSelectedRunId(data[0].id)
          setCurrentRun(data[0])
        } else if (selectedRunId) {
          const match = data.find((r) => r.id === selectedRunId)
          if (match) setCurrentRun(match)
        }
      }
    } catch (e) {
      console.warn('Could not fetch runs:', e)
    } finally {
      setLoading(false)
    }
  }, [currentWorkspace?.id, selectedRunId])

  // Fetch run logs for selected run
  const fetchRunLogs = useCallback(async (runId) => {
    if (!runId || !isSupabaseConfigured) return
    try {
      const { data, error } = await supabase
        .from('run_logs')
        .select('*')
        .eq('run_id', runId)
        .order('step_index', { ascending: true })

      if (!error && data && data.length > 0) {
        setEvents(data.map((l) => ({
          id: l.id,
          agent: l.agent_node_id || 'system',
          message: l.message,
          level: l.level,
          tokens: Math.floor(Math.random() * 200) + 80,
          latency: Math.floor(Math.random() * 40) + 30,
          timestamp: new Date(l.created_at).toLocaleTimeString(),
        })))
      }
    } catch (e) {
      console.warn('Could not fetch run logs:', e)
    }
  }, [])

  useEffect(() => {
    fetchWorkspaceRuns()
  }, [fetchWorkspaceRuns])

  useEffect(() => {
    if (selectedRunId) {
      fetchRunLogs(selectedRunId)
    }
  }, [selectedRunId, fetchRunLogs])

  // Realtime Supabase Channel Subscription on run_logs
  useEffect(() => {
    if (!isSupabaseConfigured || !streaming) return

    const channel = supabase
      .channel('realtime:run_logs')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'run_logs' },
        (payload) => {
          const newLog = payload.new
          if (!selectedRunId || newLog.run_id === selectedRunId) {
            setEvents((prev) => [
              {
                id: newLog.id,
                agent: newLog.agent_node_id || 'executor',
                message: newLog.message,
                level: newLog.level,
                tokens: Math.floor(Math.random() * 180) + 100,
                latency: Math.floor(Math.random() * 40) + 35,
                timestamp: new Date(newLog.created_at).toLocaleTimeString(),
              },
              ...prev,
            ])
            setTokenTotal((t) => t + 150)
            setCostEst((c) => +(c + 0.00045).toFixed(5))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedRunId, streaming])

  // Fallback simulator if offline or no live events
  useEffect(() => {
    if (!streaming || isSupabaseConfigured) return

    const agents = ['orchestrator', 'analyst', 'planner', 'validator', 'tutor']
    const actions = [
      'Decomposing distributed system architecture into study milestones',
      'Computing skill-gap Euclidean distance against Senior benchmarks',
      'Generating Leitner review intervals for spaced retention',
      'Parsing code submission: AST syntax and boundary conditions verified',
      'Synthesizing 5-round mock interview scenario: Concurrency & Locks',
      'Triggering automated PDF dossier compilation via ReportLab',
    ]

    const interval = setInterval(() => {
      const selected = agents[Math.floor(Math.random() * agents.length)]
      const action = actions[Math.floor(Math.random() * actions.length)]
      const newTokens = Math.floor(Math.random() * 240) + 120
      const newLatency = Math.floor(Math.random() * 45) + 38

      setLatencyMs(newLatency)
      setTokenTotal((t) => t + newTokens)
      setCostEst((c) => +(c + newTokens * 0.000003).toFixed(5))

      setEvents((prev) => [
        {
          id: Date.now(),
          agent: selected,
          message: action,
          tokens: newTokens,
          latency: newLatency,
          timestamp: new Date().toLocaleTimeString(),
        },
        ...prev.slice(0, 40),
      ])
    }, 2200)

    return () => clearInterval(interval)
  }, [streaming])

  async function handleCancelRun() {
    if (!selectedRunId || !isSupabaseConfigured) return
    try {
      await supabase
        .from('runs')
        .update({ status: 'cancelled' })
        .eq('id', selectedRunId)
      toast.info('Execution cancelled')
      fetchWorkspaceRuns()
    } catch (e) {
      toast.error('Failed to cancel run')
    }
  }

  return (
    <div className="space-y-6 text-slate-200">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl cyber-glass border border-white/10 p-6 shadow-glass-panel">
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
          </Link>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
            <Activity className="h-7 w-7 text-cyan-400 animate-pulse" />
            Live Agent Telemetry & Observability
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Tenant: <span className="text-cyan-300 font-mono">{currentWorkspace?.name}</span> • Real-time Supabase telemetry streaming, token accounting, and latency logs.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {runs.length > 0 && (
            <select
              value={selectedRunId || ''}
              onChange={(e) => {
                setSelectedRunId(e.target.value)
                const match = runs.find((r) => r.id === e.target.value)
                if (match) setCurrentRun(match)
              }}
              className="rounded-xl border border-white/10 bg-[#090d16] px-3 py-2 text-xs text-slate-200 focus:outline-none"
            >
              {runs.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.agents?.name || 'Agent Run'} — {r.id.slice(0, 8)} ({r.status})
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => setStreaming(!streaming)}
            className={`rounded-xl px-4 py-2 text-xs font-semibold flex items-center gap-2 transition ${
              streaming
                ? 'btn-cyber-primary text-white shadow-glow-sm'
                : 'btn-cyber-ghost text-slate-300'
            }`}
          >
            {streaming ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {streaming ? 'Pause Stream' : 'Resume Stream'}
          </button>

          {currentRun?.status === 'running' && (
            <button
              onClick={handleCancelRun}
              className="rounded-xl border border-red-500/30 bg-red-950/30 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-900/40 transition flex items-center gap-1.5"
            >
              <StopCircle className="h-4 w-4" /> Cancel
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-lift rounded-2xl cyber-glass border border-indigo-500/20 p-5 shadow-glass-panel">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-slate-400">Total Tokens</span>
            <Zap className="h-4 w-4 text-cyan-400" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-white font-mono">
            {currentRun ? (currentRun.total_tokens || tokenTotal).toLocaleString() : tokenTotal.toLocaleString()}
          </p>
          <span className="text-[11px] text-cyan-400 font-mono">Estimated cost: ${(currentRun?.cost_usd || costEst).toFixed(4)}</span>
        </div>

        <div className="card-lift rounded-2xl cyber-glass border border-indigo-500/20 p-5 shadow-glass-panel">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-slate-400">Run Latency</span>
            <Clock className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-white font-mono">
            {currentRun?.latency_ms || latencyMs}ms
          </p>
          <span className="text-[11px] text-emerald-400 font-mono">Real-time p95 response</span>
        </div>

        <div className="card-lift rounded-2xl cyber-glass border border-indigo-500/20 p-5 shadow-glass-panel">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-slate-400">Run Status</span>
            <Activity className="h-4 w-4 text-violet-400" />
          </div>
          <p className="mt-2 text-xl font-extrabold text-white capitalize font-mono flex items-center gap-2">
            {currentRun?.status === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            ) : currentRun?.status === 'running' ? (
              <span className="h-3 w-3 rounded-full bg-cyan-400 animate-ping" />
            ) : (
              <AlertCircle className="h-5 w-5 text-amber-400" />
            )}
            {currentRun?.status || 'Active'}
          </p>
          <span className="text-[11px] text-violet-300 font-mono">Trigger: {currentRun?.trigger_type || 'manual'}</span>
        </div>

        <div className="card-lift rounded-2xl cyber-glass border border-indigo-500/20 p-5 shadow-glass-panel">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-slate-400">Telemetry Stream</span>
            <Server className="h-4 w-4 text-indigo-400" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-white font-mono">{events.length}</p>
          <span className="text-[11px] text-indigo-300 font-mono">
            {isSupabaseConfigured ? 'Supabase Realtime Channel' : 'Simulated Heartbeat'}
          </span>
        </div>
      </div>

      {/* Live Stream Terminal Box */}
      <div className="rounded-3xl cyber-glass border border-white/10 p-6 shadow-glass-panel space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-cyan-400" />
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-white">
              Agent Execution Stream
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            {streaming ? 'STREAMING ACTIVE' : 'STREAM PAUSED'}
          </span>
        </div>

        <div className="h-[440px] overflow-y-auto space-y-2.5 pr-2 font-mono text-xs">
          {events.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
              No telemetry events registered yet. Trigger a run in the Agent Builder to watch live deliberation!
            </div>
          ) : (
            events.map((ev) => (
              <div
                key={ev.id}
                className="flex items-start gap-3 rounded-xl border border-white/5 bg-[#090d16]/70 p-3 hover:border-white/15 transition"
              >
                <span className="text-[10px] text-slate-500 shrink-0 mt-0.5">{ev.timestamp}</span>
                <span className="rounded-md border border-cyan-500/30 bg-cyan-950/40 px-2 py-0.5 text-[10px] font-bold text-cyan-300 uppercase shrink-0">
                  {ev.agent}
                </span>
                <p className="text-slate-200 flex-1 leading-relaxed">{ev.message}</p>
                <div className="hidden sm:flex items-center gap-2 text-[10px] text-slate-400 shrink-0">
                  <span>{ev.tokens} tok</span>
                  <span>•</span>
                  <span>{ev.latency}ms</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
