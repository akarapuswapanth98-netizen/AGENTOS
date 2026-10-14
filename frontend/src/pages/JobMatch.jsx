import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Briefcase,
  Target,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  FileText,
  Search,
  Copy,
  Layers,
  ArrowLeft,
  ChevronRight,
  TrendingUp,
  Cpu,
} from 'lucide-react'
import api, { getErrorMessage } from '../api/client.js'
import { useToast } from '../context/ToastContext.jsx'
import ErrorBanner from '../components/ErrorBanner.jsx'

const SAMPLE_ROLES = [
  {
    title: 'Senior Full Stack Engineer',
    jd: `We are seeking a Senior Full Stack Engineer proficient in Python, FastAPI, React, and modern TypeScript.
Key Requirements:
- 4+ years architecting asynchronous Python web services (FastAPI or Django)
- Strong experience with modern frontend SPAs (React 18+, TailwindCSS, state machines)
- Proficiency in relational schema modeling with PostgreSQL/SQL and query optimization
- Hands-on experience with Docker containerization, CI/CD pipelines, and AWS cloud primitives
- Commitment to high test coverage (pytest, automated integration checks)
- Excellent communication and system design fundamentals`,
    skills: ['Python', 'FastAPI', 'React', 'SQL', 'Docker', 'Git'],
  },
  {
    title: 'Distributed Systems & Cloud Architect',
    jd: `Seeking a Platform / Distributed Systems Architect to build mission-critical multi-tenant backends.
Requirements:
- Deep expertise in microservices architecture, gRPC, and asynchronous message streams
- Strong knowledge of Linux internals, system performance tuning, and Redis caching
- Production experience containerizing workloads with Docker and Kubernetes
- Rigorous security posture (OAuth2, JWT authentication, rate limiting)
- Automated testing discipline with end-to-end integration verification`,
    skills: ['Python', 'Docker', 'Linux', 'AWS', 'Distributed Systems', 'Git'],
  },
  {
    title: 'AI/ML Solutions Engineer',
    jd: `Looking for an AI/ML Engineer to deploy generative AI agentic systems and production pipelines.
Requirements:
- Solid background in Python, Scikit-learn, and prompt engineering architectures
- Experience integrating LLM APIs (Anthropic Claude, OpenAI, Groq) with structured output validation
- Experience designing vector similarity search and retrieval-augmented systems
- Strong data structures, algorithms, and modular API design with FastAPI`,
    skills: ['Python', 'FastAPI', 'Machine Learning', 'Docker', 'Git'],
  },
]

export default function JobMatch() {
  const toast = useToast()
  const [goals, setGoals] = useState([])
  const [selectedGoalId, setSelectedGoalId] = useState('')
  const [targetRole, setTargetRole] = useState(SAMPLE_ROLES[0].title)
  const [jobDescription, setJobDescription] = useState(SAMPLE_ROLES[0].jd)
  const [customSkills, setCustomSkills] = useState('Python, FastAPI, React, SQL, Docker, Git')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .getGoals()
      .then((data) => {
        setGoals(data || [])
        if (data && data.length > 0) {
          setSelectedGoalId(String(data[0].id))
        }
      })
      .catch(() => {})
  }, [])

  function loadSample(sample) {
    setTargetRole(sample.title)
    setJobDescription(sample.jd)
    setCustomSkills(sample.skills.join(', '))
    toast.info(`Loaded sample: ${sample.title}`)
  }

  async function handleAnalyze(e) {
    if (e) e.preventDefault()
    if (!targetRole.trim()) {
      setError('Please provide a target role title.')
      return
    }

    setLoading(true)
    setError('')
    try {
      const skillsArray = customSkills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)

      const payload = {
        target_role: targetRole.trim(),
        job_description: jobDescription.trim(),
        candidate_skills: skillsArray,
        goal_id: selectedGoalId ? Number(selectedGoalId) : undefined,
      }

      const res = await api.matchJob(payload)
      setResult(res)
      toast.success('Job Match analysis computed with evidence!')
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to compute job match analysis.'))
    } finally {
      setLoading(false)
    }
  }

  function copyEvidence() {
    if (!result) return
    const text = `AGENTOS Job Match Report: ${result.target_role}\nMatch Score: ${result.match_score}%\nATS Compatibility: ${result.ats_score}%\n\nStrengths:\n${result.key_strengths.join('\n')}\n\nGaps:\n${result.critical_gaps.join('\n')}`
    navigator.clipboard.writeText(text)
    toast.success('Evidence summary copied to clipboard')
  }

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
          <Briefcase className="h-4 w-4" /> Evidence-Based Job Matching
        </div>
        <h1 className="mt-2 font-display text-3xl font-extrabold text-white">
          Your Profile, Held Against the Role
        </h1>
        <p className="mt-2 text-sm text-slate-300 max-w-2xl leading-relaxed">
          Candidate profile + Job Description = verifiable match analysis. Matched requirements backed by real proof, critical gap prioritization, and actionable ATS alignment.
        </p>

        {/* Quick Sample Presets */}
        <div className="mt-5 flex flex-wrap items-center gap-2 pt-4 border-t border-white/10">
          <span className="text-xs font-mono text-slate-400">Quick Test Archetypes:</span>
          {SAMPLE_ROLES.map((s, idx) => (
            <button
              key={idx}
              onClick={() => loadSample(s)}
              className="rounded-xl border border-white/10 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-300 hover:border-indigo-400 hover:text-white transition"
            >
              {s.title}
            </button>
          ))}
        </div>
      </div>

      <ErrorBanner message={error} />

      {/* Input Panel */}
      <form onSubmit={handleAnalyze} className="rounded-3xl cyber-glass border border-white/10 p-6 sm:p-8 shadow-glass-panel space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Target Role Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder="e.g. Senior Backend Engineer"
              required
              className="w-full rounded-xl border border-white/10 bg-[#090d16] px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Sync with Active Career Blueprint
            </label>
            <select
              value={selectedGoalId}
              onChange={(e) => setSelectedGoalId(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#090d16] px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 focus:border-indigo-400 focus:outline-none"
            >
              <option value="">No goal selected (use custom skills below)</option>
              {goals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title} ({g.target_role})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1">
            Candidate Core Skills (Comma-separated)
          </label>
          <input
            type="text"
            value={customSkills}
            onChange={(e) => setCustomSkills(e.target.value)}
            placeholder="Python, FastAPI, React, SQL, Docker, Linux"
            className="w-full rounded-xl border border-white/10 bg-[#090d16] px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-400 focus:outline-none"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-slate-300">
              Job Description / Posting Requirements
            </label>
            <span className="text-[11px] font-mono text-slate-400">
              {jobDescription.length} characters
            </span>
          </div>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            rows={6}
            placeholder="Paste job posting text, qualifications, and responsibilities here..."
            className="w-full rounded-2xl border border-white/10 bg-[#090d16] p-4 text-xs font-mono text-slate-200 placeholder-slate-500 focus:border-indigo-400 focus:outline-none leading-relaxed"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
          <button
            type="submit"
            disabled={loading || !targetRole.trim()}
            className="btn-cyber-primary rounded-xl px-5 py-2.5 text-xs font-semibold flex items-center gap-2 disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            {loading ? 'Analyzing Job Evidence…' : 'Compute Evidence-Based Match'}
          </button>
          <span className="text-xs text-slate-400 font-mono">
            Deterministic analysis • Traceable to claims
          </span>
        </div>
      </form>

      {/* Match Results View */}
      {result && (
        <div className="space-y-6">
          {/* Top Metric Gauges */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl cyber-glass border border-white/10 p-5 shadow-glass-panel">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-mono uppercase">Role Match Score</span>
                <Target className="h-4 w-4 text-indigo-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-display text-4xl font-black text-white">{result.match_score}%</span>
                <span className="text-xs text-emerald-400 font-mono font-bold">
                  {result.match_score >= 70 ? 'Strong Fit' : 'Moderate Fit'}
                </span>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-900 border border-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-700"
                  style={{ width: `${result.match_score}%` }}
                />
              </div>
            </div>

            <div className="rounded-2xl cyber-glass border border-white/10 p-5 shadow-glass-panel">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-mono uppercase">ATS Keyword Alignment</span>
                <Cpu className="h-4 w-4 text-cyan-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-display text-4xl font-black text-cyan-300">{result.ats_score}%</span>
                <span className="text-xs text-cyan-400 font-mono">Semantic Resonance</span>
              </div>
              <p className="mt-3 text-xs text-slate-400">High keyword density against posting rubric</p>
            </div>

            <div className="rounded-2xl cyber-glass border border-white/10 p-5 shadow-glass-panel flex flex-col justify-between sm:col-span-2 lg:col-span-1">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-mono uppercase">Hiring Verdict</span>
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                </div>
                <div className="mt-2 font-display text-lg font-bold text-white">
                  {result.match_score >= 75 ? 'Ready for Technical Screen' : 'Preparation Recommended'}
                </div>
              </div>
              <button
                onClick={copyEvidence}
                className="btn-cyber-ghost mt-3 rounded-xl px-3 py-1.5 text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <Copy className="h-3.5 w-3.5 text-cyan-400" /> Copy Evidence Summary
              </button>
            </div>
          </div>

          {/* Qualitative Summary */}
          <div className="rounded-2xl cyber-glass border border-white/10 p-5 shadow-glass-panel">
            <h3 className="font-display font-bold text-white text-sm mb-1">Executive Summary</h3>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">{result.summary}</p>
          </div>

          {/* Matched Requirements with Evidence */}
          <div className="rounded-3xl cyber-glass border border-white/10 p-6 sm:p-8 shadow-glass-panel space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <h2 className="font-display font-bold text-base text-white">
                  Matched Requirements ({result.matched_requirements.length})
                </h2>
              </div>
              <span className="text-xs font-mono text-emerald-400">VERIFIED CLAIMS</span>
            </div>

            <div className="space-y-3">
              {result.matched_requirements.map((req, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-white/10 bg-[#080c15] p-4 text-xs transition hover:border-emerald-500/30"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-bold text-white text-sm">{req.requirement}</span>
                    <span className="rounded-md border border-emerald-500/30 bg-emerald-950/40 px-2 py-0.5 text-[10px] font-mono text-emerald-300 shrink-0">
                      MATCHED
                    </span>
                  </div>
                  <div className="mt-2 rounded-xl bg-slate-900/60 p-3 border border-white/5 text-slate-300 font-mono text-[11px] leading-relaxed">
                    <span className="text-indigo-300 font-bold">Candidate Evidence: </span>
                    {req.evidence}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Missing Requirements & Action Steps */}
          {result.missing_requirements.length > 0 && (
            <div className="rounded-3xl cyber-glass border border-white/10 p-6 sm:p-8 shadow-glass-panel space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                  <h2 className="font-display font-bold text-base text-white">
                    Missing Requirements & Actionable Gaps ({result.missing_requirements.length})
                  </h2>
                </div>
                <span className="text-xs font-mono text-amber-400">HIGH PRIORITY GAPS</span>
              </div>

              <div className="space-y-3">
                {result.missing_requirements.map((gap, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl border border-white/10 bg-[#080c15] p-4 text-xs transition hover:border-amber-500/30"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-bold text-white text-sm">{gap.requirement}</span>
                      <span className="rounded-md border border-amber-500/30 bg-amber-950/40 px-2 py-0.5 text-[10px] font-mono text-amber-300 shrink-0 uppercase">
                        {gap.priority} Priority
                      </span>
                    </div>
                    <p className="mt-2 text-slate-400">{gap.evidence}</p>
                    <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-indigo-300">
                      <span className="font-sans">
                        <b>Recommended Action:</b> {gap.next_step}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
