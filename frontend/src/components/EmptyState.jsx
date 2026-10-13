import { Layers } from 'lucide-react'

export default function EmptyState({ title, hint, action }) {
  return (
    <div className="rounded-2xl cyber-glass border border-indigo-500/20 p-8 text-center shadow-glass-panel">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 mx-auto mb-3 shadow-glow-sm">
        <Layers className="h-6 w-6" />
      </div>
      <p className="font-display font-bold text-white text-base">{title}</p>
      {hint && <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
