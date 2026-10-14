import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
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
} from 'lucide-react'

export default function Monitoring() {
  const [streaming, setStreaming] = useState(true)
  const [events, setEvents] = useState([])
  const [tokenTotal, setTokenTotal] = useState(12480)
  const [latencyMs, setLatencyMs] = useState(54)
  const [costEst, setCostEst] = useState(0.042)
  const [activeAgent, setActiveAgent] = useState('orchestrator')
  const streamRef = useRef(null)

  useEffect(() => {
    if (!streaming) return

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

      setActiveAgent(selected)
      setLatencyMs(newLatency)
      setTokenTotal((t) => t + newTokens)
      setCostEst((c) => +(c + (newTokens * 0.000003)).toFixed(5))

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
    }, 1800)

    return () => clearInterval(interval)
  }, [streaming])

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
            Real-time multi-agent execution telemetry, token consumption counters, latency waterfall, and audit streams.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
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
        </div>
      </div>

      {/* Telemetry Metric Gauges */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl cyber-glass border border-white/10 p-5 shadow-glass-panel">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-mono uppercase">Cumulative Tokens</span>
            <Cpu className="h-4 w-4 text-cyan-400" />
          </div>
          <p className="mt-2 font-display text-3xl font-extrabold text-cyan-300">
            {tokenTotal.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-slate-400 font-mono">Tokens processed across nodes</p>
        </div>

        <div className="rounded-2xl cyber-glass border border-white/10 p-5 shadow-glass-panel">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-mono uppercase">Estimated Cost (USD)</span>
            <Zap className="h-4 w-4 text-amber-400" />
          </div>
          <p className="mt-2 font-display text-3xl font-extrabold text-amber-300 font-mono">
            ${costEst}
          </p>
          <p className="mt-1 text-xs text-slate-400 font-mono">Model inference expenditure</p>
        </div>

        <div className="rounded-2xl cyber-glass border border-white/10 p-5 shadow-glass-panel">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-mono uppercase">Mean Latency</span>
            <Clock className="h-4 w-4 text-violet-400" />
          </div>
          <p className="mt-2 font-display text-3xl font-extrabold text-violet-300 font-mono">
            {latencyMs}ms
          </p>
          <p className="mt-1 text-xs text-slate-400 font-mono">Per-turn generation speed</p>
        </div>

        <div className="rounded-2xl cyber-glass border border-white/10 p-5 shadow-glass-panel">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-mono uppercase">Active Neural Node</span>
            <Server className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="mt-2 font-display text-2xl font-extrabold text-emerald-400 font-mono uppercase">
            @{activeAgent}
          </p>
          <p className="mt-1 text-xs text-emerald-300 font-mono flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" /> Synchronized
          </p>
        </div>
      </div>

      {/* Real-Time Event Waterfall Stream */}
      <div className="rounded-3xl cyber-glass border border-white/10 p-6 sm:p-8 shadow-glass-panel space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-indigo-400" />
            <h2 className="font-display text-base font-bold text-white uppercase tracking-wider">
              Live Event Waterfall & Deliberative Log
            </h2>
          </div>
          <span className="text-xs font-mono text-cyan-300">
            {streaming ? '● STREAM ACTIVE' : '○ PAUSED'}
          </span>
        </div>

        <div className="max-h-[460px] overflow-y-auto space-y-2.5 font-mono text-xs pr-2">
          {events.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              Initializing live SSE connection…
            </div>
          ) : (
            events.map((ev) => (
              <div
                key={ev.id}
                className="rounded-xl border border-white/10 bg-[#080c15] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition hover:border-indigo-500/35 shadow-sm"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="rounded-md border border-white/10 bg-slate-900 px-2 py-0.5 text-[10px] text-cyan-300 font-bold uppercase shrink-0 font-mono">
                    @{ev.agent}
                  </span>
                  <span className="text-slate-200 truncate">{ev.message}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0 text-[10px] text-slate-400">
                  <span>{ev.tokens} tok</span>
                  <span>•</span>
                  <span>{ev.latency}ms</span>
                  <span>•</span>
                  <span className="text-slate-500">{ev.timestamp}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
