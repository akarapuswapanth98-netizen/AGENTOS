import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import AuthShell from '../components/AuthShell.jsx'
import ErrorBanner from '../components/ErrorBanner.jsx'
import { Lock, CheckCircle2 } from 'lucide-react'
import { newPasswordSchema } from '../lib/validators.js'

export default function ResetPassword() {
  const navigate = useNavigate()
  const { updatePassword } = useAuth()
  const toast = useToast()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const valResult = newPasswordSchema.safeParse({ password, confirmPassword })
    if (!valResult.success) {
      setError(valResult.error.errors[0]?.message || 'Validation error')
      return
    }

    setBusy(true)
    try {
      await updatePassword(password)
      setSuccess(true)
      toast.success('Password updated successfully')
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      setError(err.message || 'Failed to update password')
      toast.error(err.message || 'Failed to update password')
    } finally {
      setBusy(false)
    }
  }

  const inputCls =
    'w-full rounded-xl border border-indigo-500/25 bg-[#090d18] px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400/40 transition'

  return (
    <AuthShell
      title="Configure New Password"
      subtitle="Establish new cryptographic credentials for your Agent OS architect identity."
      footer={
        <div className="flex items-center justify-center text-xs">
          <Link to="/login" className="font-semibold text-cyan-300 hover:underline">
            Return to Login →
          </Link>
        </div>
      }
    >
      <ErrorBanner message={error} />

      {success ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-5 text-center space-y-3">
          <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400" />
          <h3 className="text-sm font-bold text-white">Credentials Updated</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Your password has been changed. Redirecting to login…
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-slate-300 block mb-1">New Password (Min 8 chars, 1 uppercase, 1 number)</label>
            <input
              className={inputCls}
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-xs text-slate-300 block mb-1">Confirm New Password</label>
            <input
              className={inputCls}
              type="password"
              placeholder="••••••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          <button
            disabled={busy}
            className="btn-cyber-primary w-full rounded-xl py-2.5 text-xs font-semibold flex items-center justify-center gap-2 shadow-glow-sm disabled:opacity-50"
          >
            <Lock className="h-4 w-4" />
            {busy ? 'Updating Credentials…' : 'Save New Password'}
          </button>
        </form>
      )}
    </AuthShell>
  )
}
