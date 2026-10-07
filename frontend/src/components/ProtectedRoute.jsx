import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

// Blocks a route when there is no stored token.
export default function ProtectedRoute({ children }) {
  const { token, loading } = useAuth()
  if (loading) return <p className="py-10 text-center text-sm text-slate-500">Checking session…</p>
  if (!token) return <Navigate to="/login" replace />
  return children
}
