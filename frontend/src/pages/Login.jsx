import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getErrorMessage } from '../api/client.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { isSupabaseConfigured } from '../lib/supabase.js'
import AuthShell from '../components/AuthShell.jsx'
import ErrorBanner from '../components/ErrorBanner.jsx'
import { LogIn, Sparkles, Mail, Lock, Wand2, Info } from 'lucide-react'
import { loginSchema } from '../lib/validators.js'

export default function Login() {
  const navigate = useNavigate()
  const { login, register, loginWithOAuth, sendMagicLink } = useAuth()
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [mode, setMode] = useState('password') // 'password' | 'magic'

  async function handleDemoAccess() {
    setBusy(true)
    setError('')
    try {
      const demoEmail = 'architect@agentos.ai'
      const demoPass = 'cybernet-os-2026'
      try {
        await login(demoEmail, demoPass)
      } catch {
        if (register) {
          await register('Agent Architect', demoEmail, demoPass)
        }
      }
      toast.success('Welcome, Agent Architect!')
      navigate('/')
    } catch {
      localStorage.setItem('agentos_token', 'demo-session-token-' + Date.now())
      toast.success('Welcome to Agent OS Sandbox!')
      navigate('/')
    } finally {
      setBusy(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (mode === 'password') {
      const valResult = loginSchema.safeParse({ email: email.trim(), password })
      if (!valResult.success) {
        setError(valResult.error.errors[0]?.message || 'Invalid email or password')
        return
      }

      setBusy(true)
      try {
        await login(email.trim(), password)
        toast.success('Authenticated to Agent OS')
        navigate('/')
      } catch (err) {
        setError(getErrorMessage(err, 'Authentication failed. Please verify credentials.'))
      } finally {
        setBusy(false)
      }
    } else {
      if (!email.trim() || !email.includes('@')) {
        setError('Please enter a valid email address')
        return
      }
      setBusy(true)
      try {
        await sendMagicLink(email.trim())
        setMagicLinkSent(true)
        toast.success('Magic link dispatched to your inbox')
      } catch (err) {
        setError(err.message || 'Failed to dispatch magic link')
      } finally {
        setBusy(false)
      }
    }
  }

  async function handleOAuth(provider) {
    setError('')
    if (!isSupabaseConfigured) {
      toast.info(`To authenticate with ${provider}, configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel. Use 1-Click Demo Access below to explore now!`)
      return
    }
    try {
      await loginWithOAuth(provider)
    } catch (err) {
      setError(err.message || `Failed to authenticate with ${provider}`)
      toast.error(err.message || `Failed to authenticate with ${provider}`)
    }
  }

  const inputCls =
    'w-full rounded-xl border border-indigo-500/25 bg-[#090d18] px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400/40 transition'

  return (
    <AuthShell
      title="Welcome Back"
      subtitle="Authenticate to access your active neural blueprints and agent clusters."
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

      {/* 1-Click Sandbox Demo Access */}
      <button
        type="button"
        onClick={handleDemoAccess}
        disabled={busy}
        className="w-full mb-4 flex items-center justify-center gap-2 rounded-xl border border-cyan-500/40 bg-gradient-to-r from-cyan-950/40 via-indigo-950/40 to-cyan-950/40 py-2.5 text-xs font-semibold text-cyan-300 hover:text-white hover:border-cyan-400/70 hover:shadow-glow-cyan transition duration-200"
      >
        <Sparkles className="h-4 w-4 text-cyan-400 animate-pulse" />
        <span>1-Click Demo Architect Access</span>
        <span className="text-[10px] text-cyan-400/80 bg-cyan-900/40 px-1.5 py-0.5 rounded-md font-mono">INSTANT</span>
      </button>

      {/* OAuth Notice when keys pending */}
      {!isSupabaseConfigured && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-indigo-500/20 bg-indigo-950/20 p-2.5 text-[11px] text-slate-300">
          <Info className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-white">Live OAuth:</strong> Requires <code className="text-cyan-300 font-mono">VITE_SUPABASE_URL</code> in Vercel settings. You can also sign in with email/password or use 1-Click Access above.
          </p>
        </div>
      )}

      {/* OAuth Buttons */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <button
          type="button"
          onClick={() => handleOAuth('google')}
          className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2 text-xs font-medium text-slate-200 hover:bg-white/10 hover:border-white/20 transition"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
            />
            <path
              fill="#4285F4"
              d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5.1 3.7-8.8z"
            />
            <path
              fill="#FBBC05"
              d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.1-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.2s.7 5.5 1.9 7.9l3.7-2.9z"
            />
            <path
              fill="#34A853"
              d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16.5C3.7 20.2 7.5 23.5 12 23.5z"
            />
          </svg>
          Google
        </button>
        <button
          type="button"
          onClick={() => handleOAuth('github')}
          className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2 text-xs font-medium text-slate-200 hover:bg-white/10 hover:border-white/20 transition"
        >
          <svg className="h-4 w-4 fill-current text-slate-200" viewBox="0 0 24 24">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
          GitHub
        </button>
      </div>

      <div className="relative flex items-center justify-center my-4">
        <div className="w-full border-t border-white/10" />
        <span className="absolute bg-[#0b0f19] px-2 text-[10px] uppercase font-mono text-slate-500">
          Or continue with
        </span>
      </div>

      {magicLinkSent ? (
        <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-4 text-center space-y-2">
          <Wand2 className="mx-auto h-6 w-6 text-cyan-400" />
          <h4 className="text-xs font-bold text-white">Magic Link Dispatched</h4>
          <p className="text-[11px] text-slate-300">
            Check <strong className="text-white">{email}</strong> to access your workspace without a password.
          </p>
          <button
            type="button"
            onClick={() => setMagicLinkSent(false)}
            className="text-[11px] text-indigo-400 hover:underline pt-1"
          >
            Use standard password instead
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-slate-300">Email Address</label>
              <button
                type="button"
                onClick={() => setMode(mode === 'password' ? 'magic' : 'password')}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 transition"
              >
                {mode === 'password' ? 'Use Magic Link' : 'Use Password'}
              </button>
            </div>
            <input
              className={inputCls}
              type="email"
              placeholder="architect@agentos.dev"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {mode === 'password' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-slate-300">Password</label>
                <Link
                  to="/forgot-password"
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 transition"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                className={inputCls}
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          )}

          <button
            disabled={busy}
            className="btn-cyber-primary w-full rounded-xl py-2.5 text-xs font-semibold flex items-center justify-center gap-2 shadow-glow-sm disabled:opacity-50"
          >
            {mode === 'password' ? <LogIn className="h-4 w-4" /> : <Wand2 className="h-4 w-4" />}
            {busy
              ? 'Authenticating…'
              : mode === 'password'
              ? 'Access Dashboard'
              : 'Send Magic Link'}
          </button>
        </form>
      )}
    </AuthShell>
  )
}
