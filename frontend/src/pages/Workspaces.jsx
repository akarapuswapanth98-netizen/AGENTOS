import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Users2,
  ArrowLeft,
  Shield,
  UserPlus,
  Share2,
  CheckCircle2,
  Copy,
  Layers,
  Sparkles,
} from 'lucide-react'
import { useToast } from '../context/ToastContext.jsx'

const MEMBERS = [
  { id: '1', name: 'Dr. Ada Lovelace', email: 'ada@agentos.dev', role: 'Lead Architect', status: 'Active' },
  { id: '2', name: 'Alan Turing', email: 'alan@agentos.dev', role: 'Senior Contributor', status: 'Active' },
  { id: '3', name: 'Claude Shannon', email: 'claude@agentos.dev', role: 'Observer', status: 'Invited' },
]

export default function Workspaces() {
  const toast = useToast()
  const [members, setMembers] = useState(MEMBERS)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('Contributor')

  function handleInvite(e) {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    setMembers((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        name: inviteEmail.split('@')[0],
        email: inviteEmail.trim(),
        role: inviteRole,
        status: 'Invited',
      },
    ])
    setInviteEmail('')
    toast.success('Invitation sent with shareable workspace credentials')
  }

  function copyInviteLink() {
    navigator.clipboard.writeText('https://agentos-six-omega.vercel.app/join?team=cyber-lab-42')
    toast.success('Shareable team link copied to clipboard')
  }

  return (
    <div className="space-y-6 text-slate-200">
      <div className="rounded-3xl cyber-glass border border-indigo-500/25 p-6 sm:p-8 shadow-glass-panel">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
        </Link>
        <div className="flex items-center gap-2 text-xs font-mono uppercase text-cyan-300">
          <Users2 className="h-4 w-4" /> Multi-Tenant Team Workspaces
        </div>
        <h1 className="mt-2 font-display text-3xl font-extrabold text-white">
          Team Workspaces & Role-Based Access
        </h1>
        <p className="mt-2 text-sm text-slate-300 max-w-2xl leading-relaxed">
          Collaborate on career blueprints, share interviewer assessment scorecards, and assign fine-grained workspace permissions.
        </p>
      </div>

      {/* Invite Member Card */}
      <form
        onSubmit={handleInvite}
        className="rounded-3xl cyber-glass border border-indigo-500/20 p-6 shadow-glass-panel flex flex-col sm:flex-row items-end gap-3"
      >
        <div className="flex-1 w-full">
          <label className="text-xs font-semibold text-slate-300 block mb-1">
            Invite Engineer by Email
          </label>
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="colleague@company.com"
            required
            className="w-full rounded-xl border border-indigo-500/25 bg-[#090d18] px-3.5 py-2 text-xs text-slate-100 focus:border-indigo-400 focus:outline-none"
          />
        </div>
        <div className="w-full sm:w-48">
          <label className="text-xs font-semibold text-slate-300 block mb-1">Workspace Role</label>
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            className="w-full rounded-xl border border-indigo-500/25 bg-[#090d18] px-3.5 py-2 text-xs text-slate-100 focus:border-indigo-400 focus:outline-none"
          >
            <option value="Lead Architect">Lead Architect</option>
            <option value="Contributor">Contributor</option>
            <option value="Observer">Observer</option>
          </select>
        </div>
        <button className="btn-cyber-primary rounded-xl px-4 py-2 text-xs font-semibold flex items-center gap-1.5 shrink-0 w-full sm:w-auto justify-center">
          <UserPlus className="h-4 w-4" /> Send Invite
        </button>
        <button
          type="button"
          onClick={copyInviteLink}
          className="btn-cyber-ghost rounded-xl px-4 py-2 text-xs font-semibold flex items-center gap-1.5 shrink-0 w-full sm:w-auto justify-center"
        >
          <Share2 className="h-4 w-4 text-cyan-400" /> Copy Team Link
        </button>
      </form>

      {/* Team Members List */}
      <div className="rounded-3xl cyber-glass border border-indigo-500/25 p-6 sm:p-8 shadow-glass-panel space-y-4">
        <div className="flex items-center justify-between border-b border-indigo-500/15 pb-3">
          <h2 className="font-display font-bold text-base text-white">Active Team Members</h2>
          <span className="text-xs font-mono text-cyan-300">{members.length} COLLABORATORS</span>
        </div>

        <div className="divide-y divide-indigo-500/10">
          {members.map((m) => (
            <div key={m.id} className="py-3 flex items-center justify-between gap-3 text-xs">
              <div>
                <p className="font-display font-bold text-white text-sm">{m.name}</p>
                <p className="text-slate-400 font-mono">{m.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full border border-indigo-500/30 bg-indigo-950/40 px-2.5 py-0.5 font-mono text-indigo-300">
                  {m.role}
                </span>
                <span className="text-slate-500 font-mono">{m.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
