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
  Plus,
  Trash2,
  Building2,
  Check,
  Mail,
  ShieldCheck,
  Eye,
} from 'lucide-react'
import { useWorkspace } from '../context/WorkspaceContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { workspaceSchema, inviteMemberSchema } from '../lib/validators.js'

export default function Workspaces() {
  const toast = useToast()
  const {
    workspaces,
    currentWorkspace,
    currentRole,
    members,
    loading,
    switchWorkspace,
    createWorkspace,
    inviteMember,
    removeMember,
    updateMemberRole,
  } = useWorkspace()

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newWsName, setNewWsName] = useState('')
  const [newWsSlug, setNewWsSlug] = useState('')
  const [busy, setBusy] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  const canManage = currentRole === 'owner' || currentRole === 'admin'

  async function handleInvite(e) {
    e.preventDefault()
    if (!inviteEmail.trim()) return

    const valResult = inviteMemberSchema.safeParse({ email: inviteEmail.trim(), role: inviteRole })
    if (!valResult.success) {
      toast.error(valResult.error.errors[0]?.message || 'Invalid email')
      return
    }

    setBusy(true)
    try {
      await inviteMember({ email: inviteEmail.trim(), role: inviteRole })
      setInviteEmail('')
      toast.success(`Invitation sent to ${inviteEmail}`)
    } catch (err) {
      toast.error(err.message || 'Failed to send invitation')
    } finally {
      setBusy(false)
    }
  }

  async function handleCreateWorkspace(e) {
    e.preventDefault()
    const slug = newWsSlug.trim() || newWsName.toLowerCase().replace(/[^a-z0-9]/g, '-')
    const valResult = workspaceSchema.safeParse({ name: newWsName.trim(), slug })
    if (!valResult.success) {
      toast.error(valResult.error.errors[0]?.message || 'Invalid workspace details')
      return
    }

    setBusy(true)
    try {
      await createWorkspace({ name: newWsName.trim(), slug })
      setShowCreateModal(false)
      setNewWsName('')
      setNewWsSlug('')
      toast.success('New workspace initialized')
    } catch (err) {
      toast.error(err.message || 'Failed to create workspace')
    } finally {
      setBusy(false)
    }
  }

  function copyInviteLink() {
    const origin = window.location.origin
    const inviteUrl = `${origin}/join?workspace=${currentWorkspace?.slug || 'default'}&token=${Date.now()}`
    navigator.clipboard.writeText(inviteUrl)
    setCopiedLink(true)
    toast.success('Shareable workspace invite URL copied to clipboard')
    setTimeout(() => setCopiedLink(false), 2500)
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono uppercase text-cyan-300">
              <Users2 className="h-4 w-4" /> Multi-Tenant Team Workspaces
            </div>
            <h1 className="mt-2 font-display text-3xl font-extrabold text-white">
              Workspaces & Access Control
            </h1>
            <p className="mt-2 text-sm text-slate-300 max-w-2xl leading-relaxed">
              Isolate pipelines, invite team collaborators, and enforce strict PostgreSQL Row-Level Security (RLS) across shared agent clusters.
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-cyber-primary rounded-xl px-4 py-2.5 text-xs font-semibold flex items-center gap-2 self-start shadow-glow-sm"
          >
            <Plus className="h-4 w-4" /> New Workspace
          </button>
        </div>
      </div>

      {/* Workspaces Switcher Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {workspaces.map((ws) => {
          const isSelected = ws.id === currentWorkspace?.id
          return (
            <div
              key={ws.id}
              onClick={() => switchWorkspace(ws)}
              className={`p-4 rounded-2xl cursor-pointer transition border ${
                isSelected
                  ? 'border-indigo-500/80 bg-indigo-950/30 shadow-glow-sm'
                  : 'border-white/10 bg-[#090d16]/70 hover:border-white/20 hover:bg-[#0b101c]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{ws.name}</h3>
                    <span className="text-[10px] font-mono text-slate-400">/{ws.slug}</span>
                  </div>
                </div>
                {isSelected && (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    <Check className="h-3 w-3" /> Active
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400 mt-3 pt-2 border-t border-white/5">
                <span>Role: <strong className="text-slate-200 capitalize">{ws.role || 'Member'}</strong></span>
                <span className="text-indigo-400 text-[11px]">Switch →</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Invite Member Card */}
      {canManage && (
        <form
          onSubmit={handleInvite}
          className="rounded-3xl cyber-glass border border-white/10 p-6 shadow-glass-panel flex flex-col sm:flex-row items-end gap-3"
        >
          <div className="flex-1 w-full">
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Invite Engineer to <strong className="text-white">{currentWorkspace?.name}</strong>
            </label>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@company.com"
              required
              className="w-full rounded-xl border border-white/10 bg-[#090d16] px-3.5 py-2 text-xs text-slate-100 focus:border-indigo-400 focus:outline-none"
            />
          </div>
          <div className="w-full sm:w-48">
            <label className="text-xs font-semibold text-slate-300 block mb-1">Access Role</label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#090d16] px-3.5 py-2 text-xs text-slate-100 focus:border-indigo-400 focus:outline-none capitalize"
            >
              <option value="admin">Admin (Full Control)</option>
              <option value="member">Member (Create & Run)</option>
              <option value="viewer">Viewer (Read-Only)</option>
            </select>
          </div>
          <button
            disabled={busy}
            className="btn-cyber-primary rounded-xl px-4 py-2 text-xs font-semibold flex items-center gap-1.5 shrink-0 w-full sm:w-auto justify-center disabled:opacity-50"
          >
            <UserPlus className="h-3.5 w-3.5" />
            {busy ? 'Sending…' : 'Send Invite'}
          </button>
        </form>
      )}

      {/* Member Directory */}
      <div className="rounded-3xl cyber-glass border border-white/10 p-6 shadow-glass-panel space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
              <Shield className="h-5 w-5 text-indigo-400" />
              Workspace Team Members ({members.length})
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Current tenant: <span className="text-cyan-300 font-mono">{currentWorkspace?.name}</span>
            </p>
          </div>
          <button
            onClick={copyInviteLink}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10 hover:border-white/25 transition self-start"
          >
            {copiedLink ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            {copiedLink ? 'Invite Link Copied!' : 'Copy Shareable Link'}
          </button>
        </div>

        <div className="divide-y divide-white/5">
          {members.map((member) => (
            <div key={member.id} className="py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500/30 to-purple-500/30 border border-indigo-500/30 flex items-center justify-center text-xs font-bold text-indigo-200 overflow-hidden">
                  {member.avatar_url ? (
                    <img src={member.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    (member.full_name || member.email || 'U').slice(0, 2).toUpperCase()
                  )}
                </div>
                <div>
                  <div className="text-xs font-semibold text-white flex items-center gap-2">
                    {member.full_name}
                    {member.status === 'invited' && (
                      <span className="text-[10px] text-amber-400 font-mono bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                        Pending
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">{member.email}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {canManage && member.role !== 'owner' ? (
                  <select
                    value={member.role}
                    onChange={(e) => updateMemberRole(member.id, e.target.value)}
                    className="rounded-lg border border-white/10 bg-[#090d16] px-2 py-1 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="admin">Admin</option>
                    <option value="member">Member</option>
                    <option value="viewer">Viewer</option>
                  </select>
                ) : (
                  <span className="text-xs font-mono capitalize px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300">
                    {member.role}
                  </span>
                )}

                {canManage && member.role !== 'owner' && (
                  <button
                    onClick={() => removeMember(member.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition"
                    title="Remove member"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Workspace Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl cyber-glass border border-white/15 p-6 shadow-glass-panel space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Building2 className="h-4 w-4 text-indigo-400" /> Create Workspace
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateWorkspace} className="space-y-3">
              <div>
                <label className="text-xs text-slate-300 block mb-1">Workspace Name</label>
                <input
                  type="text"
                  value={newWsName}
                  onChange={(e) => {
                    setNewWsName(e.target.value)
                    setNewWsSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'))
                  }}
                  placeholder="Acme AI Research"
                  required
                  className="w-full rounded-xl border border-white/10 bg-[#090d16] px-3.5 py-2 text-xs text-slate-100 focus:border-indigo-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300 block mb-1">URL Identifier (Slug)</label>
                <input
                  type="text"
                  value={newWsSlug}
                  onChange={(e) => setNewWsSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="acme-ai-research"
                  required
                  className="w-full rounded-xl border border-white/10 bg-[#090d16] px-3.5 py-2 text-xs text-slate-100 focus:border-indigo-400 focus:outline-none font-mono"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl border border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  disabled={busy}
                  className="btn-cyber-primary rounded-xl px-4 py-1.5 text-xs font-semibold disabled:opacity-50"
                >
                  {busy ? 'Creating…' : 'Create Workspace'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
