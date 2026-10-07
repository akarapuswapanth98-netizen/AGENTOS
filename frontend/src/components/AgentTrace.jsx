const DOT = { running: 'bg-amber-400', done: 'bg-green-500', error: 'bg-red-500' }

function fmtTime(iso) {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso || ''
  }
}

// Vertical timeline of agent activity for a goal.
export default function AgentTrace({ trace }) {
  if (!trace || trace.length === 0) return <p className="text-sm text-slate-400">No agent activity yet.</p>
  return (
    <ol className="relative space-y-4 border-l-2 border-slate-200 pl-4">
      {trace.map((t) => (
        <li key={t.id} className="relative">
          <span className={`absolute -left-[22px] top-1 h-3 w-3 rounded-full ${DOT[t.status] || 'bg-slate-300'}`} />
          <div className="rounded-lg bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-slate-700">{t.agent_name}</span>
              <span className="text-slate-400">{fmtTime(t.created_at)}</span>
            </div>
            <p className="mt-1 text-sm text-slate-600">{t.message}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}
