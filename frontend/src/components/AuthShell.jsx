import { Suspense, lazy } from 'react'

// Code-split: three.js only downloads when an auth screen renders.
const Hero3D = lazy(() => import('./Hero3D.jsx'))

// Split-screen auth layout: brand + 3D scene on the left, glass form card on
// the right. Pure layout — forms keep their own state and handlers.
export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-slate-900 text-white shadow-lg">
      <div className="animate-drift pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-indigo-600/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-violet-500/30 blur-3xl" />
      <div className="relative grid md:grid-cols-2">
        <div className="relative hidden min-h-[440px] flex-col justify-between overflow-hidden p-8 md:flex">
          <div className="absolute inset-0">
            <Suspense fallback={null}>
              <Hero3D className="h-full w-full" />
            </Suspense>
          </div>
          <div className="relative">
            <p className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 font-bold text-white">A</span>
              <span className="gradient-text text-2xl font-bold tracking-tight">AGENTOS</span>
            </p>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-300">
              Your AI career planner — a personal roadmap, tutoring, scoring and interview prep in one loop.
            </p>
          </div>
          <ul className="relative space-y-2 text-sm text-slate-200">
            <li className="flex items-center gap-2"><span className="text-indigo-300">✦</span> Week-by-week AI study plans</li>
            <li className="flex items-center gap-2"><span className="text-indigo-300">✦</span> Every answer scored with feedback</li>
            <li className="flex items-center gap-2"><span className="text-indigo-300">✦</span> Mock interviews + readiness score</li>
          </ul>
        </div>
        <div className="p-5 sm:p-8">
          <div className="glass rounded-2xl p-6 text-slate-800">
            <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
            <div className="mt-4">{children}</div>
            {footer && <div className="mt-3 text-sm text-slate-500">{footer}</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
