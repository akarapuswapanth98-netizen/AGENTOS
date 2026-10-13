import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getErrorMessage } from '../api/client.js'
import { useAuth } from '../context/AuthContext.jsx'
import AuthShell from '../components/AuthShell.jsx'
import ErrorBanner from '../components/ErrorBanner.jsx'
import { LogIn, Sparkles } from 'lucide-react'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await login(email.trim(), password)
      navigate('/')
    } catch (err) {
      setError(getErrorMessage(err, 'Authentication failed'))
    } finally {
      setBusy(false)
    }
  }

  const inputCls =
    'w-full rounded-xl border border-indigo-500/25 bg-[#090d18] px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400/40 transition'

  return (
    <AuthShell
      title="Welcome Back"
      subtitle="Authenticate to access your active neural blueprints."
      footer={
        <div className="flex items-center justify-between text-xs">
          <span>New to Agent OS?</span>
          <Link to="/register" className="font-semibold text-cyan-300 hover:underline">
            Register Account →
          </Link>
        </div>
      }
    >
      <ErrorBanner message={error} />
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs text-slate-300 block mb-1">Email Address</label>
          <input
            className={inputCls}
            type="email"
            placeholder="architect@agentos.dev"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="text-xs text-slate-300 block mb-1">Password</label>
          <input
            className={inputCls}
            type="password"
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button
          disabled={busy}
          className="btn-cyber-primary w-full rounded-xl py-2.5 text-xs font-semibold flex items-center justify-center gap-2 shadow-glow-sm disabled:opacity-50"
        >
          <LogIn className="h-4 w-4" />
          {busy ? 'Authenticating…' : 'Access Dashboard'}
        </button>
      </form>
    </AuthShell>
  )
}
