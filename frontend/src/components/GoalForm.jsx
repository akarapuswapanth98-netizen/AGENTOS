import { useEffect, useState } from 'react'

// Controlled create-goal form. current_skills is typed comma-separated,
// then converted to a string list on submit.
export default function GoalForm({ onSubmit, submitting, initialSkills = '' }) {
  const [title, setTitle] = useState('')
  const [targetRole, setTargetRole] = useState('')
  const [timelineDays, setTimelineDays] = useState(28)
  const [skillsText, setSkillsText] = useState(initialSkills)

  // Prefill (e.g. from a resume analysis) without clobbering user edits.
  useEffect(() => {
    if (initialSkills) setSkillsText(initialSkills)
  }, [initialSkills])

  function handleSubmit(e) {
    e.preventDefault()
    const current_skills = skillsText.split(',').map((s) => s.trim()).filter(Boolean)
    onSubmit({ title: title.trim(), target_role: targetRole.trim(), timeline_days: Number(timelineDays), current_skills })
  }

  const inputCls = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none'

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">Create a new goal</h2>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Goal title</label>
        <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Become backend developer" required />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Target role</label>
          <input className={inputCls} value={targetRole} onChange={(e) => setTargetRole(e.target.value)} placeholder="Backend Developer" required />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Timeline (days)</label>
          <input className={inputCls} type="number" min="1" max="365" value={timelineDays} onChange={(e) => setTimelineDays(e.target.value)} required />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Current skills (comma-separated)</label>
        <input className={inputCls} value={skillsText} onChange={(e) => setSkillsText(e.target.value)} placeholder="python, sql" />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="btn-shine w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? 'Generating plan…' : 'Generate plan'}
      </button>
    </form>
  )
}
