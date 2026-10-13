import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, getErrorMessage } from '../api/client.js'
import { useToast } from '../context/ToastContext.jsx'
import {
  Boxes,
  ArrowLeft,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Layers,
  Flame,
  ShieldCheck,
  Code2,
} from 'lucide-react'

const TEMPLATES = [
  {
    id: 'ai-fullstack',
    title: 'Full-Stack AI Application Architect',
    role: 'Full-Stack AI Engineer',
    days: 30,
    difficulty: 'Advanced',
    skills: ['react', 'fastapi', 'vector-rag', 'langchain', 'typescript', 'tailwind'],
    desc: 'Autonomous pipeline specializing in LLM tool calling, streaming RAG architectures, and reactive frontend engineering.',
    agents: ['Analyst', 'Planner', 'Validator', 'Tutor'],
    color: 'from-indigo-500 to-cyan-400',
  },
  {
    id: 'dist-systems',
    title: 'Distributed Systems & Backend Lead',
    role: 'Staff Backend Engineer',
    days: 35,
    difficulty: 'Expert',
    skills: ['go', 'distributed-consensus', 'kafka', 'kubernetes', 'postgresql-tuning'],
    desc: 'High-throughput system architecture with rigorous focus on CAP theorem trade-offs, raft consensus, and partitioned streaming.',
    agents: ['Architect', 'Planner', 'System Validator'],
    color: 'from-cyan-500 to-blue-500',
  },
  {
    id: 'algo-master',
    title: 'Algorithmic Rigor & Interview Specialist',
    role: 'Competitive Programmer & Algorithmic Specialist',
    days: 21,
    difficulty: 'Challenging',
    skills: ['dynamic-programming', 'graph-theory', 'sliding-window', 'trees-and-tries', 'complexity-analysis'],
    desc: 'Focused 3-week sprint dedicated to mastering top 75 FAANG-style algorithmic patterns and spaced-repetition edge cases.',
    agents: ['Analyst', 'Interviewer', 'Validator'],
    color: 'from-amber-500 to-rose-400',
  },
  {
    id: 'cloud-sre',
    title: 'Cloud Infrastructure & SRE Architect',
    role: 'DevOps & Cloud SRE',
    days: 28,
    difficulty: 'Advanced',
    skills: ['terraform', 'kubernetes', 'aws-well-architected', 'prometheus-grafana', 'ci-cd'],
    desc: 'Production-ready cloud reliability engineering, zero-downtime rolling deployments, and container orchestration.',
    agents: ['Analyst', 'Planner', 'Tutor'],
    color: 'from-emerald-500 to-teal-400',
  },
  {
    id: 'mlops-ai',
    title: 'MLOps & LLM Fine-Tuning Engineer',
    role: 'Machine Learning Engineer',
    days: 28,
    difficulty: 'Advanced',
    skills: ['pytorch', 'huggingface', 'lora-finetuning', 'vllm-serving', 'model-quantization'],
    desc: 'Practical open-source LLM customization, parameter-efficient fine-tuning (PEFT), and high-throughput vLLM inference.',
    agents: ['Analyst', 'Planner', 'Validator'],
    color: 'from-violet-500 to-purple-400',
  },
  {
    id: 'cyber-security',
    title: 'Application Security & Pen-Tester',
    role: 'Security Engineer',
    days: 25,
    difficulty: 'Advanced',
    skills: ['owasp-top-10', 'cryptography', 'auth-protocols', 'threat-modeling', 'container-security'],
    desc: 'Deep security posture analysis, JWT/OAuth hardening, and automated vulnerability scanning protocols.',
    agents: ['Security Analyst', 'Planner', 'Auditor'],
    color: 'from-rose-500 to-pink-500',
  },
]

export default function Marketplace() {
  const navigate = useNavigate()
  const toast = useToast()
  const [cloningId, setCloningId] = useState(null)

  async function handleClone(template) {
    setCloningId(template.id)
    try {
      const res = await api.createGoal({
        title: template.title,
        target_role: template.role,
        timeline_days: template.days,
        current_skills: template.skills,
      })
      toast.success(`Cloned ${template.title} blueprint!`)
      navigate(`/goals/${res.goal.id}`)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to clone template'))
    } finally {
      setCloningId(null)
    }
  }

  return (
    <div className="space-y-6 text-slate-200">
      {/* Header Banner */}
      <div className="rounded-3xl cyber-glass border border-indigo-500/25 p-6 sm:p-8 shadow-glass-panel">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
        </Link>
        <div className="flex items-center gap-2 text-xs font-mono uppercase text-cyan-300">
          <Boxes className="h-4 w-4" /> Autonomous Agent Marketplace
        </div>
        <h1 className="mt-2 font-display text-3xl font-extrabold text-white">
          Pre-Configured Career Agent Templates
        </h1>
        <p className="mt-2 text-sm text-slate-300 max-w-2xl leading-relaxed">
          Clone state-of-the-art multi-agent pipelines with 1 click. Each blueprint comes with pre-calibrated skill targets, curriculum milestones, and AI tutor configurations.
        </p>
      </div>

      {/* Templates Gallery */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {TEMPLATES.map((tmpl) => (
          <div
            key={tmpl.id}
            className="card-lift rounded-3xl cyber-glass border border-indigo-500/20 p-6 shadow-glass-panel flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full border border-indigo-500/40 bg-indigo-950/60 px-2.5 py-0.5 text-[10px] font-mono text-cyan-300 font-bold uppercase">
                  {tmpl.difficulty}
                </span>
                <span className="text-xs font-mono text-slate-400">{tmpl.days} DAYS</span>
              </div>

              <h2 className="mt-3 font-display font-bold text-lg text-white leading-snug">
                {tmpl.title}
              </h2>
              <p className="mt-1 text-xs text-cyan-300 font-mono">Role: {tmpl.role}</p>
              <p className="mt-3 text-xs text-slate-300 leading-relaxed font-sans">{tmpl.desc}</p>

              <div className="mt-4 pt-3 border-t border-indigo-500/15">
                <p className="text-[10px] uppercase font-mono text-slate-400 mb-1.5 font-bold">
                  Target Competencies:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {tmpl.skills.map((s) => (
                    <span
                      key={s}
                      className="rounded-md border border-slate-700/60 bg-[#090e1c] px-2 py-0.5 text-[10px] font-mono text-slate-300"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-indigo-500/15">
              <button
                onClick={() => handleClone(tmpl)}
                disabled={cloningId === tmpl.id}
                className="btn-cyber-primary w-full rounded-xl py-2.5 text-xs font-bold flex items-center justify-center gap-2 shadow-glow-sm disabled:opacity-50"
              >
                <Sparkles className="h-4 w-4" />
                {cloningId === tmpl.id ? 'Cloning Blueprint…' : '1-Click Clone Blueprint'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
