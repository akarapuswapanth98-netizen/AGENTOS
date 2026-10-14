import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Share2,
  Copy,
  Check,
  Download,
  X,
  Sparkles,
  ShieldCheck,
  Cpu,
  ExternalLink
} from 'lucide-react'
import { useToast } from '../context/ToastContext.jsx'
import { useSound } from '../context/SoundContext.jsx'

export default function ShareableAgentCard({ isOpen, onClose, user, readinessScore = 84, targetRole = 'Senior Backend Architect' }) {
  const { addToast } = useToast()
  const { playClick, playSuccess } = useSound()
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const handleCopyMarkdown = () => {
    playClick()
    const md = `[![Agent OS Readiness](https://img.shields.io/badge/AGENTOS-Readiness%20${readinessScore}%25-8b5cf6?style=for-the-badge&logo=openai)](https://agentos-six-omega.vercel.app)`
    navigator.clipboard.writeText(md)
    setCopied(true)
    addToast('Markdown badge copied to clipboard!', 'success')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCopyLink = () => {
    playClick()
    const url = `${window.location.origin}/?ref=${encodeURIComponent(user?.email || 'agent')}`
    navigator.clipboard.writeText(url)
    addToast('Shareable link copied to clipboard!', 'success')
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-[#060810]/85 backdrop-blur-xl"
        />

          {/* Card Window */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 16 }}
          className="relative w-full max-w-md cyber-glass p-6 z-10 border border-white/10 shadow-glass-panel overflow-hidden rounded-3xl"
        >
          {/* Top Close */}
          <button
            onClick={() => {
              playClick()
              onClose()
            }}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800/60 transition"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="text-center mb-5">
            <span className="text-[10px] font-mono uppercase text-indigo-400 tracking-wider">
              Holographic Dossier Card
            </span>
            <h3 className="text-xl font-bold font-display text-white mt-1">
              Agent OS Dossier
            </h3>
          </div>

          {/* Holographic Badge Card Container */}
          <div className="relative rounded-2xl bg-gradient-to-br from-[#101526] via-[#0b0f1d] to-[#070a13] border border-white/10 p-5 shadow-2xl overflow-hidden group">
            {/* Holographic background sheen */}
            <div className="absolute -inset-full bg-gradient-to-r from-transparent via-white/5 to-transparent group-hover:translate-x-full transition-all duration-1000 transform -rotate-45 pointer-events-none" />

            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white text-xs font-bold font-display shadow-depth-card border border-white/20">
                  A
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white leading-tight">
                    {user?.name || user?.email?.split('@')[0] || 'Cyber Operative'}
                  </h4>
                  <p className="text-[10px] font-mono text-indigo-400">AGENTOS ID #8921</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-mono text-emerald-300 shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                VERIFIED
              </div>
            </div>

            <div className="my-3 text-center">
              <div className="inline-block relative">
                <span className="text-4xl font-extrabold font-display gradient-text tracking-tight">
                  {readinessScore}%
                </span>
                <span className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest mt-0.5">
                  Readiness Score
                </span>
              </div>
            </div>

            <div className="bg-slate-950/60 rounded-xl p-3 border border-white/5 mb-3 text-xs">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Target Archetype</div>
              <div className="font-semibold text-white mt-0.5">{targetRole}</div>
            </div>

            <div className="flex flex-wrap gap-1.5 justify-center">
              {['Distributed Systems', 'FastAPI', 'React 18', 'System Design'].map((s, i) => (
                <span
                  key={i}
                  className="rounded-md bg-slate-900/80 border border-white/10 px-2.5 py-0.5 text-[10px] font-mono text-slate-300"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Action Row */}
          <div className="mt-5 space-y-2">
            <button
              onClick={handleCopyMarkdown}
              className="w-full cyber-button-primary inline-flex items-center justify-center gap-2 text-xs py-2.5"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied Markdown Badge!' : 'Copy GitHub README Badge'}
            </button>

            <button
              onClick={handleCopyLink}
              className="w-full cyber-button-secondary inline-flex items-center justify-center gap-2 text-xs py-2.5"
            >
              <Share2 className="h-4 w-4" />
              Copy Shareable Profile Link
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
