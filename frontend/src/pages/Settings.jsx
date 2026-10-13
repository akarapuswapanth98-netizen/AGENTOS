import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, getErrorMessage } from '../api/client.js'
import ErrorBanner from '../components/ErrorBanner.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import {
  Settings as SettingsIcon,
  User,
  Key,
  ShieldAlert,
  Save,
  Trash2,
} from 'lucide-react'

export default function Settings() {
  const navigate = useNavigate()
  const { user, setUser, logout } = useAuth()
  const toast = useToast()
  const [name, setName] = useState(user?.name || '')
  const [error, setError] = useState('')
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [delPw, setDelPw] = useState('')
  const [delConfirm, setDelConfirm] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (user?.name) setName(user.name)
  }, [user?.name])

  const inputCls =
    'w-full rounded-xl border border-indigo-500/25 bg-[#090d18] px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400/40 transition'

  async function handleName(e) {
    e.preventDefault()
    setBusy(true)
    try {
      const updated = await api.updateMe({ name: name.trim() })
      setUser(updated)
      toast.success('Agent Architect profile updated')
    } catch (err) {
      const msg = getErrorMessage(err, 'Could not update profile name')
      setError(msg)
      toast.error(msg)
    } finally {
      setBusy(false)
    }
  }

  async function handlePassword(e) {
    e.preventDefault()
    setBusy(true)
    try {
      await api.changePassword({ current_password: currentPw, new_password: newPw })
      setCurrentPw('')
      setNewPw('')
      toast.success('Security credentials rotated')
    } catch (err) {
      const msg = getErrorMessage(err, 'Could not update password')
      setError(msg)
      toast.error(msg)
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(e) {
    e.preventDefault()
    if (delConfirm !== 'DELETE') {
      toast.error('Type DELETE to confirm account deletion')
      return
    }
    setBusy(true)
    try {
      await api.deleteAccount(delPw)
      logout()
      toast.success('Account and associated data destroyed')
      navigate('/register')
    } catch (err) {
      const msg = getErrorMessage(err, 'Could not delete account')
      setError(msg)
      toast.error(msg)
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 text-slate-200">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2">
          <SettingsIcon className="h-6 w-6 text-indigo-400" />
          Operating System Settings
        </h1>
        <p className="mt-1 text-xs text-slate-400 font-mono">
          PROFILE PARAMETERS • CREDENTIAL SECURITY • PURGE CONTROLS
        </p>
      </div>

      <ErrorBanner message={error} />

      {/* Profile Form */}
      <form
        onSubmit={handleName}
        className="space-y-4 rounded-3xl cyber-glass border border-indigo-500/25 p-6 shadow-glass-panel"
      >
        <div className="flex items-center gap-2 border-b border-indigo-500/15 pb-3">
          <User className="h-4 w-4 text-cyan-400" />
          <h2 className="font-display text-base font-bold text-white">Agent Architect Identity</h2>
        </div>
        <div>
          <label className="text-xs text-slate-400 block mb-1">Display Name</label>
          <input
            className={inputCls}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            required
          />
        </div>
        <button
          disabled={busy}
          className="btn-cyber-primary rounded-xl px-4 py-2 text-xs font-semibold flex items-center gap-2 disabled:opacity-50"
        >
          <Save className="h-3.5 w-3.5" />
          Save Identity
        </button>
      </form>

      {/* Password Form */}
      <form
        onSubmit={handlePassword}
        className="space-y-4 rounded-3xl cyber-glass border border-indigo-500/25 p-6 shadow-glass-panel"
      >
        <div className="flex items-center gap-2 border-b border-indigo-500/15 pb-3">
          <Key className="h-4 w-4 text-violet-400" />
          <h2 className="font-display text-base font-bold text-white">Access Credentials</h2>
        </div>
        <div>
          <label className="text-xs text-slate-400 block mb-1">Current Password</label>
          <input
            className={inputCls}
            type="password"
            value={currentPw}
            onChange={(e) => setCurrentPw(e.target.value)}
            placeholder="Current authentication password"
            required
          />
        </div>
        <div>
          <label className="text-xs text-slate-400 block mb-1">New Password (Min 8 characters)</label>
          <input
            className={inputCls}
            type="password"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            placeholder="New secure password"
            minLength={8}
            required
          />
        </div>
        <button
          disabled={busy}
          className="btn-cyber-primary rounded-xl px-4 py-2 text-xs font-semibold flex items-center gap-2 disabled:opacity-50"
        >
          <Key className="h-3.5 w-3.5" />
          Rotate Password
        </button>
      </form>

      {/* Danger Zone: Purge Account */}
      <form
        onSubmit={handleDelete}
        className="space-y-4 rounded-3xl border border-red-500/30 bg-red-950/20 p-6 shadow-glass-panel"
      >
        <div className="flex items-center gap-2 border-b border-red-500/20 pb-3">
          <ShieldAlert className="h-5 w-5 text-red-400" />
          <h2 className="font-display text-base font-bold text-red-400">Purge Agent OS Account</h2>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          Permanently destroys your user account, career blueprints, task submissions, interview logs, and test metrics. This action is irrevocable.
        </p>
        <div>
          <label className="text-xs text-slate-400 block mb-1">Confirm with Password</label>
          <input
            className={inputCls}
            type="password"
            value={delPw}
            onChange={(e) => setDelPw(e.target.value)}
            placeholder="Your password"
            required
          />
        </div>
        <div>
          <label className="text-xs text-slate-400 block mb-1">Type DELETE to confirm</label>
          <input
            className={inputCls}
            value={delConfirm}
            onChange={(e) => setDelConfirm(e.target.value)}
            placeholder="DELETE"
            required
          />
        </div>
        <button
          disabled={busy}
          className="rounded-xl border border-red-500/50 bg-red-600/80 px-4 py-2 text-xs font-bold text-white hover:bg-red-600 transition flex items-center gap-2 disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Purge All Account Data
        </button>
      </form>
    </div>
  )
}
