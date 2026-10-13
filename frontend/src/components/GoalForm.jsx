import { useEffect, useState } from 'react'
import { Sparkles, Compass, Target, Clock, Code2 } from 'lucide-react'

const SUGGESTIONS = [
  { role: 'Senior Backend Engineer', days: 28, skills: 'python, postgresql, docker, fastapi' },
  { role: 'Full-Stack AI Architect', days: 30, skills: 'react, typescript, nextjs, langchain, openai' },
  { role: 'DevOps & Cloud SRE', days: 21, skills: 'kubernetes, terraform, aws, ci/cd, linux' },
]

export default function GoalForm({ onSubmit, submitting, initialSkills = '' }) {
  const [title, setTitle] = useState('')
  const [targetRole, setTargetRole] = useState('')
  const [timelineDays, setTimelineDays] = useState(28)
  const [skillsText, setSkillsText] = useState(initialSkills)

  useEffect(() => {
    if (initialSkills) setSkillsText(initialSkills)
  }, [initialSkills])

  function handleQuickFill(sug) {
    setTitle(`Master ${sug.role} in ${sug.days} days`)
    setTargetRole(sug.role)
    setTimelineDays(sug.days)
    setSkillsText(sug.skills)
  }

  function handleSubmit(e) {
    e.preventDefault()
    const current_skills = skillsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    onSubmit({
      title: title.trim(),
      target_role: targetRole.trim(),
      timeline_days: Number(timelineDays),
      current_skills,
    })
  }

  const inputCls =
    'w-full rounded-xl border border-indigo-500/25 bg-[#090d18]/90 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 shadow-inner focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400/50 transition'

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl cyber-glass border border-indigo-500/25 p-6 shadow-glass-panel text-slate-200"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-500/15 pb-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold font-display text-white">
            <Compass className="h-5 w-5 text-indigo-400" />
            Initialize AI Career Roadmap
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Our multi-agent pipeline analyzes your baseline, spots skill deficits, and synthesizes weekly executable tasks.
          </p>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] uppercase font-semibold text-indigo-300/80 mr-1">Presets:</span>
          {SUGGESTIONS.map((s) => (
            <button
              key={s.role}
              type="button"
              onClick={() => handleQuickFill(s)}
              className="rounded-full border border-indigo-500/30 bg-indigo-950/40 px-2.5 py-1 text-[11px] font-medium text-indigo-300 hover:border-indigo-400 hover:bg-indigo-900/60 transition"
            >
              {s.role}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-300">
          <Target className="h-3.5 w-3.5 text-indigo-400" />
          Goal Blueprint Title
        </label>
        <input
          className={inputCls}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Master Backend Engineering & System Architecture"
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-300">
            <Target className="h-3.5 w-3.5 text-cyan-400" />
            Target Role Specification
          </label>
          <input
            className={inputCls}
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            placeholder="e.g. Senior Backend Developer"
            required
          />
        </div>
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-300">
            <Clock className="h-3.5 w-3.5 text-violet-400" />
            Execution Timeline (Days)
          </label>
          <input
            className={inputCls}
            type="number"
            min="1"
            max="365"
            value={timelineDays}
            onChange={(e) => setTimelineDays(e.target.value)}
            required
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-300">
          <Code2 className="h-3.5 w-3.5 text-emerald-400" />
          Current Proficiencies (Comma-separated)
        </label>
        <input
          className={inputCls}
          value={skillsText}
          onChange={(e) => setSkillsText(e.target.value)}
          placeholder="e.g. python, postgresql, rest apis, git"
        />
        <p className="mt-1 text-[11px] text-slate-400">
          Tip: Upload a resume on the <span className="text-indigo-400">Resume page</span> to automatically extract detected skills.
        </p>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="btn-cyber-primary w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white shadow-glow-sm disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Sparkles className="h-4 w-4" />
        {submitting ? 'Synthesizing Autonomous Multi-Agent Plan…' : 'Synthesize AI Execution Plan'}
      </button>
    </form>
  )
}
