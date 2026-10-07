import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, getErrorMessage } from '../api/client.js'
import ErrorBanner from '../components/ErrorBanner.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'

// Account settings: rename, change password, delete account (typed confirm).
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

  const inputCls = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none'

  async function handleName(e) {
    e.preventDefault()
    setBusy(true)
    try {
      const updated = await api.updateMe({ name: name.trim() })
      setUser(updated)
      toast.success('Name updated')
    } catch (err) {
      const msg = getErrorMessage(err, 'Could not update name')
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
      toast.success('Password changed')
    } catch (err) {
      const msg = getErrorMessage(err, 'Could not change password')
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
      toast.success('Account deleted')
      navigate('/register')
    } catch (err) {
      const msg = getErrorMessage(err, 'Could not delete account')
      setError(msg)
      toast.error(msg)
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
      <ErrorBanner message={error} />

      <form onSubmit={handleName} className="space-y-3 rounded-xl bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Profile</h2>
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" required />
        <button disabled={busy} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
          Save name
        </button>
      </form>

      <form onSubmit={handlePassword} className="space-y-3 rounded-xl bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Change password</h2>
        <input className={inputCls} type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} placeholder="Current password" required />
        <input className={inputCls} type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="New password (min 8 chars)" minLength={8} required />
        <button disabled={busy} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
          Change password
        </button>
      </form>

      <form onSubmit={handleDelete} className="space-y-3 rounded-xl border border-red-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-red-700">Delete account</h2>
        <p className="text-sm text-slate-500">Removes your account and every goal, task, interview, and score. This cannot be undone.</p>
        <input className={inputCls} type="password" value={delPw} onChange={(e) => setDelPw(e.target.value)} placeholder="Current password" required />
        <input className={inputCls} value={delConfirm} onChange={(e) => setDelConfirm(e.target.value)} placeholder='Type DELETE to confirm' required />
        <button disabled={busy} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">
          Delete my account
        </button>
      </form>
    </div>
  )
}
