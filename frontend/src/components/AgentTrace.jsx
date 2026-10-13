import { Terminal, CheckCircle2, Clock, AlertOctagon } from 'lucide-react'

const AGENT_COLORS = {
  orchestrator: 'text-indigo-400 border-indigo-500/40 bg-indigo-950/40',
  analyst: 'text-cyan-400 border-cyan-500/40 bg-cyan-950/40',
  planner: 'text-violet-400 border-violet-500/40 bg-violet-950/40',
  validator: 'text-emerald-400 border-emerald-500/40 bg-emerald-950/40',
  interviewer: 'text-rose-400 border-rose-500/40 bg-rose-950/40',
  coach: 'text-amber-400 border-amber-500/40 bg-amber-950/40',
}

const STATUS_ICONS = {
  running: <Clock className="h-3.5 w-3.5 text-amber-400 animate-spin" />,
  done: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />,
  error: <AlertOctagon className="h-3.5 w-3.5 text-red-400" />,
}

function fmtTime(iso) {
  try {
    const d = new Date(iso)
    return `${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
  } catch {
    return iso || ''
  }
}

export default function AgentTrace({ trace }) {
  if (!trace || trace.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-indigo-500/20 bg-indigo-950/10 p-4 text-center">
        <p className="text-xs text-slate-400 font-mono">No autonomous agent events logged for this blueprint.</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl cyber-glass border border-indigo-500/20 p-5 shadow-glass-panel">
      <div className="flex items-center justify-between border-b border-indigo-500/15 pb-3 mb-4">
        <h3 className="flex items-center gap-2 text-sm font-bold font-display uppercase tracking-wider text-slate-200">
          <Terminal className="h-4 w-4 text-indigo-400" />
          Multi-Agent Audit Trail & Logs
        </h3>
        <span className="text-[10px] text-indigo-400 font-mono">{trace.length} TRACE ENTRIES</span>
      </div>

      <ol className="relative space-y-3.5 border-l border-indigo-500/25 pl-4 ml-2">
        {trace.map((t) => {
          const colorCls = AGENT_COLORS[t.agent_name?.toLowerCase()] || 'text-slate-300 border-slate-700 bg-slate-900'
          const icon = STATUS_ICONS[t.status] || STATUS_ICONS.done

          return (
            <li key={t.id} className="relative group">
              <span className="absolute -left-[23px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#070a12] border border-indigo-500/40">
                {icon}
              </span>
              <div className="rounded-xl border border-indigo-500/15 bg-[#090e1c]/80 p-3.5 transition group-hover:border-indigo-500/40">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className={`rounded-md border px-2 py-0.5 font-mono text-[11px] font-bold uppercase ${colorCls}`}>
                    @{t.agent_name}
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">{fmtTime(t.created_at)}</span>
                </div>
                <p className="mt-2 text-xs text-slate-300 font-mono leading-relaxed">{t.message}</p>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
