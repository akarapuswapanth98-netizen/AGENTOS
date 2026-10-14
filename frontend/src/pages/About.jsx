import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Shield,
  Heart,
  Cpu,
  Lock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Code,
  Layers,
} from 'lucide-react'

export default function About() {
  return (
    <div className="space-y-6 text-slate-200">
      {/* Header Banner */}
      <div className="rounded-3xl cyber-glass border border-white/10 p-6 sm:p-8 shadow-glass-panel">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
        </Link>
        <div className="flex items-center gap-2 text-xs font-mono uppercase text-cyan-300">
          <Shield className="h-4 w-4" /> About CareerPilot AI & AGENTS OS
        </div>
        <h1 className="mt-2 font-display text-3xl font-extrabold text-white">
          Career Decisions are Easier When the Next Step is Clear
        </h1>
        <p className="mt-2 text-sm text-slate-300 max-w-2xl leading-relaxed">
          CareerPilot AI is an agentic engineering platform built to turn technical skills and resume experience into transparent, evidence-based career roadmaps.
        </p>
      </div>

      {/* Ethical AI Pillars */}
      <div id="ethics" className="rounded-3xl cyber-glass border border-white/10 p-6 sm:p-8 shadow-glass-panel space-y-5">
        <div className="border-b border-white/10 pb-3">
          <h2 className="font-display font-bold text-lg text-white flex items-center gap-2">
            <Lock className="h-5 w-5 text-emerald-400" />
            Ethical AI & Engineering Commitments
          </h2>
          <p className="text-xs text-slate-400">
            How we protect candidate privacy and guarantee grounded, verifiable evaluations.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-[#080c15] p-5 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-emerald-400 font-bold font-mono">
              <CheckCircle2 className="h-4 w-4" /> EVIDENCE OVER VIBES
            </div>
            <p className="text-slate-300 leading-relaxed font-sans">
              Every strength, gap, and requirement match is substantiated by explicit lines in your resume or submitted code. Anything unstated is marked plainly as &ldquo;not stated&rdquo;.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#080c15] p-5 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-cyan-400 font-bold font-mono">
              <CheckCircle2 className="h-4 w-4" /> ZERO HALLUCINATED CREDENTIALS
            </div>
            <p className="text-slate-300 leading-relaxed font-sans">
              We never fabricate achievements, embellish company names, or invent fake credentials. Recommendations focus strictly on addressing demonstrable gaps.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#080c15] p-5 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-indigo-400 font-bold font-mono">
              <CheckCircle2 className="h-4 w-4" /> IN-MEMORY RESUME PROCESSING
            </div>
            <p className="text-slate-300 leading-relaxed font-sans">
              Uploaded resumes are processed in-memory buffers to extract technical tokens. Raw PDF and document files are never retained permanently or used to train third-party models.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#080c15] p-5 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-amber-400 font-bold font-mono">
              <CheckCircle2 className="h-4 w-4" /> READINESS SIGNALS, NEVER HIRING VERDICTS
            </div>
            <p className="text-slate-300 leading-relaxed font-sans">
              All scores (0–100) are educational readiness benchmarks designed to highlight learning opportunities, not corporate hiring rejections or admissions gatekeeping.
            </p>
          </div>
        </div>
      </div>

      {/* Limitations & Scope */}
      <div className="rounded-3xl cyber-glass border border-white/10 p-6 sm:p-8 shadow-glass-panel space-y-4">
        <div className="border-b border-white/10 pb-3">
          <h2 className="font-display font-bold text-base text-white flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-400" />
            Limitations & Scope
          </h2>
        </div>
        <ul className="space-y-2.5 text-xs text-slate-300">
          <li className="flex items-start gap-2">
            <span className="text-indigo-400 font-bold font-mono">•</span>
            <span>
              <b>Static vs Dynamic Benchmarks:</b> Market expectations vary by company tier (FAANG vs seed startup). Our rubrics reflect senior engineering standards.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-indigo-400 font-bold font-mono">•</span>
            <span>
              <b>Human Judgment:</b> AI evaluation cannot replace nuanced engineering culture fit, soft skills, or portfolio repositories. It is a preparation accelerator.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-indigo-400 font-bold font-mono">•</span>
            <span>
              <b>Model Stochasticity:</b> LLMs may return minor phrasing variations. We mitigate this through low-temperature settings, deterministic schemas, and fallback vocabulary.
            </span>
          </li>
        </ul>
      </div>

      {/* Architecture & Tech Stack */}
      <div className="rounded-3xl cyber-glass border border-white/10 p-6 sm:p-8 shadow-glass-panel space-y-4">
        <h2 className="font-display font-bold text-base text-white flex items-center gap-2 border-b border-white/10 pb-3">
          <Code className="h-5 w-5 text-indigo-400" />
          Technical Stack
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs font-mono">
          <div className="rounded-xl border border-white/10 bg-[#080c15] p-3.5">
            <div className="text-slate-400 text-[10px] uppercase">Backend Core</div>
            <div className="font-bold text-white mt-1">FastAPI + Python 3.13</div>
            <div className="text-slate-400 text-[11px] mt-0.5">Pydantic v2 • SQLAlchemy 2</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#080c15] p-3.5">
            <div className="text-slate-400 text-[10px] uppercase">Frontend SPA</div>
            <div className="font-bold text-white mt-1">React 18 + Vite 5</div>
            <div className="text-slate-400 text-[11px] mt-0.5">TailwindCSS • Three.js 3D</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#080c15] p-3.5">
            <div className="text-slate-400 text-[10px] uppercase">Multi-Model AI</div>
            <div className="font-bold text-white mt-1">Claude 3.5 + Groq Llama 3</div>
            <div className="text-slate-400 text-[11px] mt-0.5">Sub-second failover engine</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#080c15] p-3.5">
            <div className="text-slate-400 text-[10px] uppercase">Quality Assurance</div>
            <div className="font-bold text-white mt-1">154 Pytest Checks</div>
            <div className="text-slate-400 text-[11px] mt-0.5">100% Passing test suite</div>
          </div>
        </div>
      </div>
    </div>
  )
}
