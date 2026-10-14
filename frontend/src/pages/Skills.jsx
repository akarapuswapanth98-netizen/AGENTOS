import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Layers,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Search,
  BookOpen,
  ArrowRight,
  TrendingUp,
  Brain,
  Filter,
} from 'lucide-react'
import api from '../api/client.js'
import ErrorBanner from '../components/ErrorBanner.jsx'
import Skeleton from '../components/Skeleton.jsx'

const TONES = [
  { id: 'all', label: 'All Vectors', desc: 'Complete capability graph' },
  { id: 'strong', label: 'Strong', desc: 'Verified strengths to lead with' },
  { id: 'matched', label: 'Matched', desc: 'Required and present' },
  { id: 'needs-work', label: 'Needs Work', desc: 'Present but thin' },
  { id: 'missing', label: 'Missing', desc: 'Required but absent' },
]

export default function Skills() {
  const [activeFilter, setActiveFilter] = useState('all')
  const [searchQ, setSearchQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeGoal, setActiveGoal] = useState(null)
  const [skillsList, setSkillsList] = useState([])

  useEffect(() => {
    async function loadSkills() {
      setLoading(true)
      try {
        const dash = await api.getDashboard()
        if (dash?.active_goal?.id) {
          const goalId = dash.active_goal.id
          setActiveGoal(dash.active_goal)
          const prog = await api.getProgress(goalId)

          // Map skill scores into categories
          const mapped = (prog.skill_scores || []).map((s) => {
            let tone = 'matched'
            if (s.score >= 80) tone = 'strong'
            else if (s.score >= 60) tone = 'matched'
            else if (s.score > 0) tone = 'needs-work'
            else tone = 'missing'

            return {
              name: s.skill,
              score: Math.round(s.score),
              tone,
              category: 'Technical Core',
              evidence: `Demonstrated ${Math.round(s.score)}% proficiency in practical assessments.`,
            }
          })

          // Add gaps
          const existingNames = new Set(mapped.map((m) => m.name.toLowerCase()))
          const gaps = (prog.weak_areas || []).map((w) => ({
            name: w,
            score: 45,
            tone: 'needs-work',
            category: 'Growth Vector',
            evidence: 'Low score recorded during milestone evaluation.',
          }))

          const combined = [...mapped]
          for (const g of gaps) {
            if (!existingNames.has(g.name.toLowerCase())) {
              combined.push(g)
              existingNames.add(g.name.toLowerCase())
            }
          }

          setSkillsList(combined)
        } else {
          // Default baseline if no active goal
          setSkillsList([
            { name: 'Python', score: 88, tone: 'strong', category: 'Backend Architecture', evidence: 'Async web frameworks, typing, testing.' },
            { name: 'FastAPI', score: 82, tone: 'strong', category: 'API Engineering', evidence: 'Pydantic schemas, dependency injection, OpenAPI.' },
            { name: 'React', score: 75, tone: 'matched', category: 'Frontend', evidence: 'Component lifecycle, hooks, state management.' },
            { name: 'SQL', score: 70, tone: 'matched', category: 'Data Modeling', evidence: 'Relational design, JOINs, indexing.' },
            { name: 'Docker', score: 55, tone: 'needs-work', category: 'DevOps & Tooling', evidence: 'Basic Dockerfiles, multi-stage builds needed.' },
            { name: 'Distributed Systems', score: 40, tone: 'needs-work', category: 'Systems Architecture', evidence: 'Message queues, consistency trade-offs.' },
            { name: 'Kubernetes', score: 0, tone: 'missing', category: 'Cloud Infrastructure', evidence: 'Required for target senior staff benchmark.' },
          ])
        }
      } catch (err) {
        setError('Could not load skills matrix from active blueprint.')
      } finally {
        setLoading(false)
      }
    }
    loadSkills()
  }, [])

  const filteredSkills = skillsList.filter((s) => {
    if (activeFilter !== 'all' && s.tone !== activeFilter) return false
    if (searchQ.trim()) {
      return s.name.toLowerCase().includes(searchQ.toLowerCase())
    }
    return true
  })

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
          <Layers className="h-4 w-4" /> Skill Gap Analysis & Knowledge Map
        </div>
        <h1 className="mt-2 font-display text-3xl font-extrabold text-white">
          Know Exactly What to Learn Next
        </h1>
        <p className="mt-2 text-sm text-slate-300 max-w-2xl leading-relaxed">
          Current skills, required competencies, verified overlaps, and prioritized gaps — mapped directly to your personalized career roadmap.
        </p>

        {activeGoal && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900/60 border border-white/10 px-3.5 py-1.5 text-xs font-mono text-indigo-300">
            <span>ACTIVE BLUEPRINT: {activeGoal.title}</span>
          </div>
        )}
      </div>

      <ErrorBanner message={error} />

      {/* Four Method Pillars */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { title: 'Current Skills', desc: 'Extracted strictly from your resume & submissions — what you can claim with confidence.', color: 'text-indigo-400' },
          { title: 'Required Skills', desc: 'Parsed from target role benchmarks — what “ready” actually requires in production.', color: 'text-cyan-400' },
          { title: 'Matched Skills', desc: 'The verified overlap: objective proof you belong in senior engineering discussions.', color: 'text-emerald-400' },
          { title: 'Priority Gaps', desc: 'The missing pieces ranked by hiring impact — these become your next roadmap milestones.', color: 'text-amber-400' },
        ].map((pillar, i) => (
          <div key={i} className="rounded-2xl cyber-glass border border-white/10 p-5 shadow-glass-panel">
            <span className="font-mono text-[11px] text-slate-400 uppercase font-bold">Pillar 0{i + 1}</span>
            <h3 className={`font-display text-base font-bold mt-1 ${pillar.color}`}>{pillar.title}</h3>
            <p className="mt-2 text-xs text-slate-300 leading-relaxed">{pillar.desc}</p>
          </div>
        ))}
      </div>

      {/* Interactive Controls & Filters */}
      <div className="rounded-3xl cyber-glass border border-white/10 p-6 shadow-glass-panel space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Tone Filter Chips */}
          <div className="flex flex-wrap items-center gap-2">
            {TONES.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveFilter(t.id)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                  activeFilter === t.id
                    ? 'btn-cyber-primary'
                    : 'rounded-xl border border-white/10 bg-slate-900/60 text-slate-400 hover:text-white'
                }`}
                title={t.desc}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Filter by skill..."
              className="w-full rounded-xl border border-white/10 bg-[#090d16] pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Skill Cards Grid */}
        {loading ? (
          <Skeleton rows={3} />
        ) : filteredSkills.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No skill vectors matching current filter.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 pt-2">
            {filteredSkills.map((s, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-white/10 bg-[#080c15] p-4 text-xs transition hover:border-indigo-500/35 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-display font-bold text-white text-base">{s.name}</span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase ${
                        s.tone === 'strong'
                          ? 'border border-emerald-500/30 bg-emerald-950/60 text-emerald-300'
                          : s.tone === 'matched'
                          ? 'border border-cyan-500/30 bg-cyan-950/60 text-cyan-300'
                          : s.tone === 'needs-work'
                          ? 'border border-amber-500/30 bg-amber-950/60 text-amber-300'
                          : 'border border-rose-500/30 bg-rose-950/60 text-rose-300'
                      }`}
                    >
                      {s.tone}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-slate-400 font-mono text-[11px]">
                    <span>Proficiency Score</span>
                    <span className="font-bold text-white">{s.score}%</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-900 border border-white/10">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        s.score >= 75 ? 'bg-emerald-400' : s.score >= 50 ? 'bg-cyan-400' : 'bg-amber-400'
                      }`}
                      style={{ width: `${s.score}%` }}
                    />
                  </div>

                  <p className="mt-3 text-slate-300 font-sans leading-relaxed text-[11px]">
                    {s.evidence}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-400 uppercase">{s.category}</span>
                  <Link
                    to="/review"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 transition"
                  >
                    <span>Practice Recall</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
