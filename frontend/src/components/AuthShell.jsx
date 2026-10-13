import { Suspense, lazy } from 'react'
import { Sparkles, CheckCircle2, ShieldCheck, Zap } from 'lucide-react'

// Code-split: three.js only downloads when an auth screen renders
const Hero3D = lazy(() => import('./Hero3D.jsx'))

export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-indigo-500/25 bg-[#090d18] text-white shadow-2xl shadow-indigo-950/60 max-w-4xl mx-auto my-6">
      {/* Ambient background glow blooms */}
      <div className="animate-drift pointer-events-none absolute -left-28 -top-28 h-96 w-96 rounded-full bg-indigo-600/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-36 left-1/3 h-80 w-80 rounded-full bg-cyan-500/20 blur-3xl" />

      <div className="relative grid md:grid-cols-2">
        {/* Left 3D Visualizer & Brand Column */}
        <div className="relative hidden min-h-[460px] flex-col justify-between overflow-hidden p-8 md:flex border-r border-indigo-500/15">
          <div className="absolute inset-0">
            <Suspense fallback={null}>
              <Hero3D className="h-full w-full" />
            </Suspense>
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-400 font-display font-black text-white text-xl shadow-glow-sm">
                A
              </div>
              <div>
                <span className="gradient-text font-display text-2xl font-black tracking-tight">AGENTOS</span>
                <span className="block text-[10px] font-mono text-cyan-300 tracking-wider">CYBER OS v2.0</span>
              </div>
            </div>
            <p className="mt-3 max-w-xs text-xs leading-relaxed text-slate-300">
              Autonomous multi-agent intelligence that synthesizes career blueprints, scores technical solutions, and simulates technical interviews.
            </p>
          </div>

          <ul className="relative z-10 space-y-2 text-xs text-slate-200">
            <li className="flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 text-cyan-400" />
              <span>Multi-agent reasoning (Analyst, Planner, Validator)</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>Instant solution scoring and adaptive remedial work</span>
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-violet-400" />
              <span>Simulated 5-round interviews with ML readiness projection</span>
            </li>
          </ul>
        </div>

        {/* Right Auth Form Column */}
        <div className="p-6 sm:p-8 flex flex-col justify-center">
          <div className="cyber-glass rounded-2xl p-6 sm:p-8 border border-indigo-500/25 shadow-glass-panel">
            <h1 className="font-display text-2xl font-extrabold text-white">{title}</h1>
            <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
            <div className="mt-5">{children}</div>
            {footer && <div className="mt-4 pt-3 border-t border-indigo-500/15 text-xs text-slate-400">{footer}</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
