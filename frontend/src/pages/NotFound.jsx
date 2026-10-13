import { Link } from 'react-router-dom'
import { Compass, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="rounded-3xl cyber-glass border border-indigo-500/25 p-12 text-center shadow-glass-panel max-w-lg mx-auto my-12 space-y-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 mx-auto shadow-glow-sm">
        <Compass className="h-8 w-8 animate-spin" />
      </div>
      <p className="font-display text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-cyan-300 to-rose-400">
        404
      </p>
      <h1 className="font-display text-xl font-bold text-white">Route Coordinates Unresolved</h1>
      <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
        The requested neural endpoint does not exist in this Agent OS cluster. Check the address or return to the main dashboard.
      </p>
      <div className="pt-2">
        <Link
          to="/"
          className="btn-cyber-primary rounded-xl px-5 py-2.5 text-xs font-semibold inline-flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Return to Dashboard
        </Link>
      </div>
    </div>
  )
}
