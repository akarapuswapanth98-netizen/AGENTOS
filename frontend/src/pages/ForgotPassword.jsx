import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import AuthShell from '../components/AuthShell.jsx'
import ErrorBanner from '../components/ErrorBanner.jsx'
import { KeyRound, ArrowLeft, Mail, CheckCircle2 } from 'lucide-react'
import { resetPasswordSchema } from '../lib/validators.js'

export default function ForgotPassword() {
  const { resetPassword } = useAuth()
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const valResult = resetPasswordSchema.safeParse({ email: email.trim() })
    if (!valResult.success) {
      setError(valResult.error.errors[0]?.message || 'Invalid email')
      return
    }

    setBusy(true)
    try {
      await resetPassword(email.trim())
      setSent(true)
      toast.success('Password reset link sent to your email')
    } catch (err) {
      setError(err.message || 'Failed to send reset email')
      toast.error(err.message || 'Failed to send reset email')
    } finally {
      setBusy(false)
    }
  }

  const inputCls =
    'w-full rounded-xl border border-indigo-500/25 bg-[#090d18] px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400/40 transition'

  return (
    <AuthShell
      title="Recover Access"
      subtitle="Enter your email to receive an identity recovery authentication token."
      footer={
        <div className="flex items-center justify-between text-xs">
          <Link to="/login" className="inline-flex items-center gap-1 font-semibold text-slate-400 hover:text-white">
            <ArrowLeft className="h-3 w-3" /> Back to Login
          </Link>
          <Link to="/register" className="font-semibold text-cyan-300 hover:underline">
            Register Account →
          </Link>
        </div>
      }
    >
      <ErrorBanner message={error} />

      {sent ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-5 text-center space-y-3">
          <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400" />
          <h3 className="text-sm font-bold text-white">Reset Link Dispatched</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            We sent a password reset token to <strong className="text-white">{email}</strong>. Please check your inbox and click the link to configure new credentials.
          </p>
          <Link
            to="/login"
            className="btn-cyber-primary inline-flex items-center justify-center rounded-xl px-4 py-2 text-xs font-semibold"
          >
            Return to Login
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-slate-300 block mb-1">Email Address</label>
            <div className="relative">
              <input
                className={inputCls}
                type="email"
                placeholder="architect@agentos.dev"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Mail className="absolute right-3.5 top-3 h-4 w-4 text-slate-500 pointer-events-none" />
            </div>
          </div>
          <button
            disabled={busy}
            className="btn-cyber-primary w-full rounded-xl py-2.5 text-xs font-semibold flex items-center justify-center gap-2 shadow-glow-sm disabled:opacity-50"
          >
            <KeyRound className="h-4 w-4" />
            {busy ? 'Dispatching Recovery Token…' : 'Send Reset Link'}
          </button>
        </form>
      )}
    </AuthShell>
  )
}
