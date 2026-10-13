import { useState, useMemo } from 'react'
import {
  Activity,
  BarChart3,
  TrendingUp,
  Cpu,
  Zap,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Download,
  Filter,
  Layers,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  Brain,
  Gauge
} from 'lucide-react'
import { useToast } from '../context/ToastContext.jsx'

export default function Analytics() {
  const { addToast } = useToast()
  const [timeRange, setTimeRange] = useState('7d')
  const [selectedModel, setSelectedModel] = useState('all')

  const kpis = [
    {
      label: 'Agent Executions',
      value: '2,849',
      change: '+18.4%',
      trend: 'up',
      icon: Cpu,
      color: 'from-violet-500 to-indigo-500',
      glow: 'shadow-neon-violet',
    },
    {
      label: 'Token Consumption',
      value: '1.42M',
      change: '+9.2%',
      trend: 'up',
      icon: Zap,
      color: 'from-cyan-500 to-blue-500',
      glow: 'shadow-neon-cyan',
    },
    {
      label: 'Avg Latency',
      value: '284ms',
      change: '-12.8%',
      trend: 'down',
      icon: Clock,
      color: 'from-emerald-500 to-teal-500',
      glow: 'shadow-neon-emerald',
    },
    {
      label: 'Mission Success Rate',
      value: '99.1%',
      change: '+1.5%',
      trend: 'up',
      icon: CheckCircle2,
      color: 'from-amber-500 to-rose-500',
      glow: 'shadow-neon-amber',
    },
  ]

  const skills = [
    { name: 'System Architecture & Microservices', score: 94, category: 'Core Eng', delta: '+12%' },
    { name: 'Full-Stack React & Next.js Performance', score: 88, category: 'Frontend', delta: '+8%' },
    { name: 'Distributed Systems & Concurrency', score: 82, category: 'Backend', delta: '+15%' },
    { name: 'LLM Prompt Engineering & RAG Workflows', score: 96, category: 'AI/Agents', delta: '+22%' },
    { name: 'Database Indexing & Query Tuning', score: 78, category: 'Data', delta: '+5%' },
    { name: 'Cloud Infrastructure & Kubernetes', score: 85, category: 'DevOps', delta: '+10%' },
  ]

  const retentionPoints = [
    { day: 'Day 1', baseline: 100, activeRecall: 100 },
    { day: 'Day 2', baseline: 58, activeRecall: 92 },
    { day: 'Day 4', baseline: 36, activeRecall: 88 },
    { day: 'Day 7', baseline: 24, activeRecall: 84 },
    { day: 'Day 14', baseline: 18, activeRecall: 81 },
    { day: 'Day 30', baseline: 12, activeRecall: 79 },
  ]

  const executionLogs = [
    {
      id: 'exec-8921',
      task: 'Synthesize distributed caching strategy',
      agent: 'Senior Architect Agent',
      model: 'GPT-4o',
      tokens: '4,210',
      latency: '312ms',
      status: 'success',
      timestamp: '2 mins ago',
    },
    {
      id: 'exec-8920',
      task: 'Generate multi-round technical interview questions',
      agent: 'Interview Master v2',
      model: 'Claude 3.5 Sonnet',
      tokens: '6,140',
      latency: '420ms',
      status: 'success',
      timestamp: '6 mins ago',
    },
    {
      id: 'exec-8919',
      task: 'Ingest resume vector embeddings and match skills',
      agent: 'Career Sentinel',
      model: 'Gemini 2.5 Flash',
      tokens: '1,890',
      latency: '185ms',
      status: 'success',
      timestamp: '14 mins ago',
    },
    {
      id: 'exec-8918',
      task: 'Run Leitner spaced repetition card scheduler',
      agent: 'Cognitive Engine',
      model: 'Rule Engine',
      tokens: '0',
      latency: '24ms',
      status: 'success',
      timestamp: '22 mins ago',
    },
  ]

  const handleExport = () => {
    const data = {
      timestamp: new Date().toISOString(),
      timeRange,
      selectedModel,
      kpis,
      skills,
      retentionPoints,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `agent-os-telemetry-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    addToast('Telemetry report exported successfully!', 'success')
  }

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-indigo-500/10 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-950/40 px-3 py-1 text-xs font-mono text-cyan-400 mb-3 shadow-glow-sm">
            <Activity className="h-3.5 w-3.5 animate-pulse text-cyan-400" />
            TELEMETRY STREAM ACTIVE
          </div>
          <h1 className="text-3xl font-bold font-display text-white tracking-tight flex items-center gap-3">
            Holographic Analytics & Intelligence
          </h1>
          <p className="text-slate-400 text-sm mt-1 max-w-2xl">
            Real-time multi-agent performance metrics, cognitive retention curves, and skill readiness velocity across your Agent OS workspace.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Time Filter */}
          <div className="flex items-center rounded-xl bg-slate-900/80 border border-slate-800 p-1">
            {['24h', '7d', '30d', 'all'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase transition ${
                  timeRange === range
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-glow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          <button
            onClick={handleExport}
            className="cyber-button-secondary inline-flex items-center gap-2 text-xs"
          >
            <Download className="h-4 w-4" />
            Export Telemetry
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon
          return (
            <div
              key={idx}
              className="glass-card relative overflow-hidden p-5 group hover:border-indigo-500/40 transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono uppercase text-slate-400 tracking-wider">
                  {kpi.label}
                </span>
                <div
                  className={`h-9 w-9 rounded-xl bg-gradient-to-tr ${kpi.color} flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform`}
                >
                  <Icon className="h-4 w-4" />
                </div>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-display text-white tracking-tight">
                  {kpi.value}
                </span>
                <span
                  className={`text-xs font-mono flex items-center ${
                    kpi.trend === 'up' ? 'text-emerald-400' : 'text-cyan-400'
                  }`}
                >
                  <TrendingUp className="h-3 w-3 mr-0.5" />
                  {kpi.change}
                </span>
              </div>

              <div className="mt-3 h-1 w-full bg-slate-800/80 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${kpi.color} rounded-full`}
                  style={{ width: `${65 + idx * 10}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Retention Curve Chart (SVG) */}
        <div className="lg:col-span-7 glass-panel p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold font-display text-white flex items-center gap-2">
                <Brain className="h-5 w-5 text-violet-400" />
                Cognitive Retention Curve
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Spaced repetition recall probability vs standard Ebbinghaus forgetting curve
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#06b6d4]" />
                Agent OS Active Recall
              </span>
              <span className="flex items-center gap-1.5 text-slate-500">
                <span className="h-2 w-2 rounded-full bg-slate-600" />
                Natural Forgetting
              </span>
            </div>
          </div>

          {/* Holographic Retention SVG Graph */}
          <div className="relative h-64 w-full bg-slate-950/60 rounded-xl border border-slate-800/80 p-4 flex flex-col justify-between">
            {/* Grid lines */}
            <div className="absolute inset-x-4 inset-y-4 grid grid-rows-4 pointer-events-none opacity-15">
              <div className="border-b border-indigo-400" />
              <div className="border-b border-indigo-400" />
              <div className="border-b border-indigo-400" />
              <div className="border-b border-indigo-400" />
            </div>

            <svg className="w-full h-full overflow-visible" viewBox="0 0 500 160">
              <defs>
                <linearGradient id="cyanGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="slateGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#64748b" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#64748b" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Natural Forgetting Curve Area & Path */}
              <path
                d="M 10 10 Q 90 90, 180 120 T 350 140 T 490 145"
                fill="none"
                stroke="#475569"
                strokeWidth="2"
                strokeDasharray="4 4"
              />

              {/* Active Recall Area & Curve */}
              <path
                d="M 10 10 Q 90 25, 180 32 T 350 38 T 490 42 L 490 160 L 10 160 Z"
                fill="url(#cyanGradient)"
              />
              <path
                d="M 10 10 Q 90 25, 180 32 T 350 38 T 490 42"
                fill="none"
                stroke="#06b6d4"
                strokeWidth="3.5"
                filter="drop-shadow(0px 0px 6px rgba(6, 182, 212, 0.8))"
              />

              {/* Data Points */}
              {retentionPoints.map((pt, i) => {
                const x = 10 + i * 96
                const yActive = 10 + (100 - pt.activeRecall) * 1.5
                return (
                  <g key={i}>
                    <circle
                      cx={x}
                      cy={yActive}
                      r="4"
                      className="fill-cyan-400 stroke-slate-950 stroke-2 hover:r-6 transition-all cursor-pointer"
                    />
                    <text
                      x={x}
                      y="155"
                      fill="#94a3b8"
                      fontSize="10"
                      textAnchor="middle"
                      fontFamily="monospace"
                    >
                      {pt.day}
                    </text>
                  </g>
                )
              })}
            </svg>

            <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 pt-2 border-t border-slate-800/60">
              <span>Confidence: 99.4% based on Leitner SRS algorithm</span>
              <span>Predicted 60-day Mastery: 89.2%</span>
            </div>
          </div>
        </div>

        {/* Skill Mastery Velocity Breakdown */}
        <div className="lg:col-span-5 glass-panel p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold font-display text-white flex items-center gap-2">
                <Gauge className="h-5 w-5 text-indigo-400" />
                Skill Mastery Velocity
              </h2>
              <span className="text-xs font-mono text-indigo-400 bg-indigo-950/60 border border-indigo-500/30 px-2 py-0.5 rounded-full">
                Rank: Senior L5
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-5">
              Live proficiency indices calculated from task evaluations and quiz iterations.
            </p>

            <div className="space-y-4">
              {skills.map((skill, i) => (
                <div key={i} className="group">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-medium text-slate-300 group-hover:text-white transition">
                      {skill.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-emerald-400 text-[11px]">{skill.delta}</span>
                      <span className="font-mono font-bold text-white">{skill.score}%</span>
                    </div>
                  </div>
                  <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-400 transition-all duration-700 group-hover:brightness-125"
                      style={{ width: `${skill.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span className="text-xs text-slate-400">Ready for Staff Assessment</span>
            </div>
            <button
              onClick={() => addToast('Opening curriculum planner...', 'info')}
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              Curriculum Plan <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Execution Audit Feed */}
      <div className="glass-panel p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold font-display text-white flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-cyan-400" />
              Recent Agent Telemetry Events
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Structured traces emitted by Agent OS background inference engines
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs font-mono text-emerald-400">Streaming 12 events/min</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 uppercase tracking-wider">
                <th className="pb-3 font-semibold">Event ID</th>
                <th className="pb-3 font-semibold">Mission / Task</th>
                <th className="pb-3 font-semibold">Agent Role</th>
                <th className="pb-3 font-semibold">Model</th>
                <th className="pb-3 font-semibold">Tokens</th>
                <th className="pb-3 font-semibold">Latency</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold text-right">Age</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {executionLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-900/40 transition">
                  <td className="py-3 text-cyan-400 font-semibold">{log.id}</td>
                  <td className="py-3 text-slate-300 font-sans">{log.task}</td>
                  <td className="py-3 text-violet-400">{log.agent}</td>
                  <td className="py-3 text-slate-400">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-[11px]">
                      {log.model}
                    </span>
                  </td>
                  <td className="py-3 text-slate-300">{log.tokens}</td>
                  <td className="py-3 text-emerald-400">{log.latency}</td>
                  <td className="py-3">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 text-[10px] text-emerald-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      COMPLETED
                    </span>
                  </td>
                  <td className="py-3 text-right text-slate-500">{log.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
