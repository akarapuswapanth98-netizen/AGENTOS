import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api } from '../api/client.js'

const AuthContext = createContext(null)

// Holds the JWT (localStorage) + the current user profile.
export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('agentos_token'))
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(!!localStorage.getItem('agentos_token'))

  // On boot, validate any stored token by fetching the profile.
  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }
    api.getMe()
      .then(setUser)
      .catch(() => {
        localStorage.removeItem('agentos_token')
        setToken(null)
      })
      .finally(() => setLoading(false))
  }, [token])

  const saveToken = (t) => {
    localStorage.setItem('agentos_token', t)
    setToken(t)
  }

  const login = useCallback(async (email, password) => {
    const data = await api.login({ email, password })
    saveToken(data.access_token)
    setUser(await api.getMe())
  }, [])

  const register = useCallback(async (name, email, password) => {
    const data = await api.register({ name, email, password })
    saveToken(data.access_token)
    setUser(await api.getMe())
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('agentos_token')
    setToken(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ token, user, loading, login, register, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
