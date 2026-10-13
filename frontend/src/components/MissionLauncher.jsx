import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import {
  Rocket,
  Zap,
  CheckCircle2,
  X,
  Cpu,
  Activity,
  Terminal,
  ShieldCheck,
  ArrowRight
} from 'lucide-react'
import { useSound } from '../context/SoundContext.jsx'
import { useNavigate } from 'react-router-dom'

export default function MissionLauncher({ isOpen, onClose }) {
  const { playWarp, playSuccess, playClick } = useSound()
  const navigate = useNavigate()
  const [phase, setPhase] = useState(0) // 0: initializing, 1: analyst, 2: planner, 3: validator, 4: complete
  const [isWarping, setIsWarping] = useState(true)

  const steps = [
    { title: 'Neural Topology Sync', desc: 'Syncing multi-agent lattice and memory vectors', icon: Cpu },
    { title: 'Analyst Assessment', desc: 'Diagnosing skill deficits and roadmap difficulty', icon: Activity },
    { title: 'DAG Plan Synthesis', desc: 'Constructing adaptive weekly milestones and tasks', icon: Terminal },
    { title: 'Mission Armed', desc: 'Telemetry hooked, readiness scorer online', icon: ShieldCheck },
  ]

  useEffect(() => {
    if (!isOpen) {
      setPhase(0)
      setIsWarping(true)
      return
    }

    playWarp()

    const t1 = setTimeout(() => {
      setPhase(1)
    }, 900)

    const t2 = setTimeout(() => {
      setPhase(2)
    }, 1800)

    const t3 = setTimeout(() => {
      setPhase(3)
    }, 2800)

    const t4 = setTimeout(() => {
      setPhase(4)
      setIsWarping(false)
      playSuccess()
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#8b5cf6', '#06b6d4', '#10b981', '#f43f5e']
        })
      } catch {
        // Confetti fallback
      }
    }, 3800)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
      clearTimeout(t4)
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop blur and warp speed overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={phase === 4 ? onClose : undefined}
          className="fixed inset-0 bg-[#060810]/90 backdrop-blur-2xl"
        >
          {/* Warp speed particle streaks */}
          {isWarping && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
              <div className="absolute inset-0 bg-gradient-to-b from-violet-600/10 via-transparent to-cyan-500/10" />
              <div className="w-full h-full animate-pulse bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent" />
            </div>
          )}
        </motion.div>

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative w-full max-w-lg glass-panel p-6 sm:p-8 z-10 border-indigo-500/40 shadow-glow-md overflow-hidden"
        >
          {/* Glowing Top Ambient */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-32 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

          {/* Close button (active once complete) */}
          <button
            onClick={() => {
              playClick()
              onClose()
            }}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800/60 transition"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-cyan-400 text-white shadow-glow-sm mb-3">
              <Rocket className={`h-6 w-6 ${phase < 4 ? 'animate-bounce' : ''}`} />
            </div>
            <h2 className="text-2xl font-bold font-display text-white tracking-tight">
              {phase < 4 ? 'WARP SPEED MISSION DEPLOYMENT' : 'MISSION ACTIVATED'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {phase < 4
                ? 'Accelerating multi-agent cognitive lattice into real-time autonomy...'
                : 'All agent nodes initialized and monitoring operational boundaries.'}
            </p>
          </div>

          {/* Progress Sequence */}
          <div className="space-y-3 mb-6">
            {steps.map((step, idx) => {
              const Icon = step.icon
              const isPast = phase > idx
              const isCurrent = phase === idx
              return (
                <div
                  key={idx}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 ${
                    isPast
                      ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                      : isCurrent
                      ? 'bg-violet-950/40 border-violet-500/50 text-white shadow-glow-sm'
                      : 'bg-slate-900/30 border-slate-800/60 text-slate-500'
                  }`}
                >
                  <div
                    className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-mono ${
                      isPast
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : isCurrent
                        ? 'bg-violet-500/20 text-violet-400 animate-pulse'
                        : 'bg-slate-800 text-slate-600'
                    }`}
                  >
                    {isPast ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-bold font-sans flex items-center justify-between">
                      <span>{step.title}</span>
                      <span className="text-[10px] font-mono opacity-80">
                        {isPast ? 'DONE' : isCurrent ? 'RUNNING' : 'QUEUED'}
                      </span>
                    </div>
                    <p className="text-[11px] opacity-70 mt-0.5">{step.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Action buttons on completion */}
          {phase === 4 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3"
            >
              <button
                onClick={() => {
                  playClick()
                  onClose()
                  navigate('/monitoring')
                }}
                className="flex-1 cyber-button-primary inline-flex items-center justify-center gap-2 text-xs py-2.5"
              >
                <Activity className="h-4 w-4" />
                Live Telemetry
              </button>
              <button
                onClick={() => {
                  playClick()
                  onClose()
                }}
                className="flex-1 cyber-button-secondary inline-flex items-center justify-center gap-2 text-xs py-2.5"
              >
                Return to HUD
              </button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
