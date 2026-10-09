import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getErrorMessage } from '../api/client.js'
import { useAuth } from '../context/AuthContext.jsx'
import AuthShell from '../components/AuthShell.jsx'
import ErrorBanner from '../components/ErrorBanner.jsx'

// Public sign-up form (password >= 8 chars, enforced by the backend too).
export default function Register() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await register(name.trim(), email.trim(), password)
      navigate('/')
    } catch (err) {
      setError(getErrorMessage(err, 'Registration failed'))
    } finally {
      setBusy(false)
    }
  }

  const inputCls = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none'

  return (
    <AuthShell
      title="Create account"
      subtitle="Start planning your career with AI."
      footer={<>Have an account? <Link to="/login" className="font-medium text-indigo-600 hover:underline">Log in</Link></>}
    >
      <ErrorBanner message={error} />
      <form onSubmit={handleSubmit} className="space-y-3">
        <input className={inputCls} placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input className={inputCls} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className={inputCls} type="password" placeholder="Password (min 8 chars)" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button disabled={busy} className="btn-shine w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
          {busy ? 'Creating…' : 'Register'}
        </button>
      </form>
    </AuthShell>
  )
}
