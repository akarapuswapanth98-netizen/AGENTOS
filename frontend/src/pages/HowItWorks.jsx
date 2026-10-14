import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Sparkles,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Layers,
  ShieldCheck,
  Zap,
  Terminal,
  FileText,
  Target,
  RefreshCw,
  GitBranch,
} from 'lucide-react'

const STAGES = [
  {
    step: '01',
    title: 'Ingestion & Resume Parsing',
    agent: 'Ingestion Engine',
    subtitle: 'Strict token extraction with zero prompt leakage',
    desc: 'Upload a PDF or TXT resume. The engine strips formatting, normalizes technical tokens, and wraps the text in defensive delimiters to prevent candidate prompt injection.',
    bullets: [
      'Extracts structured text via PyPDF and in-memory buffer',
      'Defensive delimiters <<<RESUME>>> guarantee safe parsing',
      'Deterministic fallback vocabulary guarantees 100% availability',
    ],
    technicalSpec: 'FastAPI multipart handler • Memory-only processing • Zero document retention',
  },
  {
    step: '02',
    title: 'Benchmark & Skill Gap Matrix',
    agent: 'Analyst Agent',
    subtitle: 'Evidence-based audit of candidate vs market requirements',
    desc: 'The Analyst Agent cross-references your current skills with industry rubrics for your target role. Every competency is categorized into Strong, Matched, Needs Work, or Missing.',
    bullets: [
      'Identifies exact hiring barriers before human recruiters do',
      'Assigns baseline 0–100 mastery scores per skill vector',
      'Provides actionable feedback on resume impact quantification',
    ],
    technicalSpec: 'Claude 3.5 Sonnet / Groq Llama 3 • Pydantic JSON schema • Pydantic field validators',
  },
  {
    step: '03',
    title: 'Adaptive Milestone Roadmap',
    agent: 'Planner Agent',
    subtitle: 'Decomposing senior requirements into weekly sprints',
    desc: 'The Planner Agent synthesizes a customized 4–12 week career blueprint. Each milestone week pairs technical concept deep dives with hands-on implementation challenges.',
    bullets: [
      'Actionable milestone tasks tailored to your specific timeline',
      'Every task comes equipped with an on-demand Autonomous AI Tutor',
      'Integrated private notes and due date tracking',
    ],
    technicalSpec: 'Sequential task graph • SQL persistence • Real-time SSE execution telemetry',
  },
  {
    step: '04',
    title: 'Deliberative Validator & Remediation',
    agent: 'Validator Agent',
    subtitle: 'Strict technical grading with automated Leitner spaced review',
    desc: 'Submit technical solutions, architectural explanations, or code snippets. The Validator Agent scores answers from 0–100. Scores <70 automatically spawn remedial learning tasks.',
    bullets: [
      'Detailed grading breakdown: Accuracy, Technical Depth, Clarity',
      'Automatic remediation generation for detected weak concepts',
      'Leitner spaced repetition schedules (1 → 3 → 7 → 14 days) ensure retention',
    ],
    technicalSpec: 'Automated test suite (154 pytest checks) • Guard against empty/whitespace answers',
  },
  {
    step: '05',
    title: 'Multi-Round Interview Simulation',
    agent: 'Interviewer Agent',
    subtitle: 'Realistic 5-round behavioral, technical, and architecture rounds',
    desc: 'Simulate high-bar technical interviews across System Architecture, Algorithms, Behavioral, and Domain Knowledge. Get per-round scorecards and an overall ML readiness projection.',
    bullets: [
      'Adaptive probing questions that react to candidate depth',
      'Instant constructive feedback and better-answer formulation',
      'Machine learning model projects hiring readiness score from 0–100%',
    ],
    technicalSpec: 'Scikit-learn readiness projection model • Per-round rubric grading',
  },
]

export default function HowItWorks() {
  const [activeStage, setActiveStage] = useState(0)
  const current = STAGES[activeStage]

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
          <GitBranch className="h-4 w-4" /> The 5-Stage Agentic Method
        </div>
        <h1 className="mt-2 font-display text-3xl font-extrabold text-white">
          Five Stages. Zero Guesswork.
        </h1>
        <p className="mt-2 text-sm text-slate-300 max-w-2xl leading-relaxed">
          From raw resume parsing to production milestone validation and simulated interviews: explore the deterministic architecture powering AGENTS OS.
        </p>
      </div>

      {/* Horizontal Stage Progress Bar */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {STAGES.map((s, idx) => (
          <button
            key={idx}
            onClick={() => setActiveStage(idx)}
            className={`p-3.5 rounded-2xl border text-left transition ${
              activeStage === idx
                ? 'border-indigo-400 bg-indigo-950/40 text-white shadow-depth-card'
                : 'border-white/10 bg-[#080c15] text-slate-400 hover:border-white/20'
            }`}
          >
            <span className="font-mono text-xs font-bold text-cyan-300">STAGE {s.step}</span>
            <h4 className="font-display font-bold text-xs mt-1 text-white line-clamp-1">{s.title}</h4>
          </button>
        ))}
      </div>

      {/* Active Stage Detailed Spotlight */}
      <div className="rounded-3xl cyber-glass border border-white/10 p-6 sm:p-8 shadow-glass-panel space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-indigo-500/30 bg-indigo-950/60 px-3 py-0.5 text-xs font-mono font-bold text-indigo-300 uppercase">
                Stage {current.step} / {current.agent}
              </span>
            </div>
            <h2 className="font-display text-2xl font-extrabold text-white mt-1">
              {current.title}
            </h2>
            <p className="text-xs text-slate-400">{current.subtitle}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveStage((p) => Math.max(0, p - 1))}
              disabled={activeStage === 0}
              className="btn-cyber-ghost rounded-xl px-3 py-1.5 text-xs font-semibold disabled:opacity-30"
            >
              ← Prev Stage
            </button>
            <button
              onClick={() => setActiveStage((p) => Math.min(STAGES.length - 1, p + 1))}
              disabled={activeStage === STAGES.length - 1}
              className="btn-cyber-primary rounded-xl px-3 py-1.5 text-xs font-semibold disabled:opacity-30"
            >
              Next Stage →
            </button>
          </div>
        </div>

        <p className="text-sm text-slate-200 leading-relaxed max-w-3xl">
          {current.desc}
        </p>

        {/* Feature Checkpoints */}
        <div className="grid gap-3 sm:grid-cols-3">
          {current.bullets.map((b, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-white/10 bg-[#080c15] p-4 text-xs space-y-2"
            >
              <div className="flex items-center gap-2 text-emerald-400 font-semibold font-mono text-[11px]">
                <CheckCircle2 className="h-4 w-4" /> CHECKPOINT 0{idx + 1}
              </div>
              <p className="text-slate-300 leading-relaxed font-sans">{b}</p>
            </div>
          ))}
        </div>

        {/* Technical Architecture Footnote */}
        <div className="rounded-xl bg-slate-900/60 border border-white/10 p-3.5 flex items-center justify-between text-xs font-mono text-cyan-300">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-indigo-400" />
            <span>Architecture Specification: {current.technicalSpec}</span>
          </div>
          <Link
            to="/prompt-engineering"
            className="text-xs text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1 transition"
          >
            <span>Inspect Prompts</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Interactive Quick Action CTAs */}
      <div className="rounded-3xl cyber-glass border border-white/10 p-6 shadow-glass-panel flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-display font-bold text-white text-base">Ready to test the pipeline?</h3>
          <p className="text-xs text-slate-400 mt-0.5">Upload a resume or check your fit against an active job posting.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Link to="/job-match" className="btn-cyber-primary rounded-xl px-4 py-2 text-xs font-semibold w-full sm:w-auto text-center">
            Run Job Matching →
          </Link>
          <Link to="/skills" className="btn-cyber-ghost rounded-xl px-4 py-2 text-xs font-semibold w-full sm:w-auto text-center">
            Explore Skill Gaps
          </Link>
        </div>
      </div>
    </div>
  )
}
