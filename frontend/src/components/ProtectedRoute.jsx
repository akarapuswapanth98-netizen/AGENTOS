import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

// Blocks a route when there is no stored token.
export default function ProtectedRoute({ children }) {
  const { token, loading } = useAuth()
  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500/30 border-t-cyan-400" />
        <span className="font-mono text-xs uppercase tracking-wider text-slate-400">Verifying Neural Session...</span>
      </div>
    )
  }
  if (!token) return <Navigate to="/login" replace />
  return children
}
