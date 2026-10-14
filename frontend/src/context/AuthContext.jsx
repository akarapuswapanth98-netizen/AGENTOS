import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase.js'
import { api } from '../api/client.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('agentos_token'))
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Fetch full profile from public.profiles
  const fetchProfile = useCallback(async (authUserId, fallbackUser = null) => {
    if (!authUserId) return fallbackUser
    try {
      if (isSupabaseConfigured) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUserId)
          .maybeSingle()

        if (!error && profile) {
          return {
            id: profile.id,
            email: profile.email,
            name: profile.full_name || fallbackUser?.name || profile.email.split('@')[0],
            avatar_url: profile.avatar_url,
            theme: profile.theme || 'dark',
            notification_preferences: profile.notification_preferences,
            created_at: profile.created_at,
          }
        }
      }
    } catch (err) {
      console.warn('[AuthContext] Could not fetch Supabase profile:', err.message)
    }
    return fallbackUser
  }, [])

  // Initial Auth Verification & Realtime Auth Listener
  useEffect(() => {
    let mounted = true

    async function initAuth() {
      if (isSupabaseConfigured) {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (!mounted) return

          if (session?.user) {
            setToken(session.access_token)
            localStorage.setItem('agentos_token', session.access_token)
            const fallback = {
              id: session.user.id,
              email: session.user.email,
              name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Agent Architect',
              avatar_url: session.user.user_metadata?.avatar_url,
            }
            const fullProfile = await fetchProfile(session.user.id, fallback)
            if (mounted) setUser(fullProfile)
          } else {
            // Check legacy token if no Supabase session
            const stored = localStorage.getItem('agentos_token')
            if (stored) {
              try {
                const me = await api.getMe()
                if (mounted) setUser(me)
              } catch {
                localStorage.removeItem('agentos_token')
                if (mounted) {
                  setToken(null)
                  setUser(null)
                }
              }
            }
          }
        } catch (err) {
          console.warn('[AuthContext] Session init error:', err)
        } finally {
          if (mounted) setLoading(false)
        }

        // Listen for Supabase Auth state changes
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (!mounted) return
          if (session?.user) {
            setToken(session.access_token)
            localStorage.setItem('agentos_token', session.access_token)
            const fallback = {
              id: session.user.id,
              email: session.user.email,
              name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Agent Architect',
              avatar_url: session.user.user_metadata?.avatar_url,
            }
            const fullProfile = await fetchProfile(session.user.id, fallback)
            if (mounted) setUser(fullProfile)
          } else if (event === 'SIGNED_OUT') {
            setToken(null)
            setUser(null)
            localStorage.removeItem('agentos_token')
          }
        })

        return () => {
          authListener?.subscription?.unsubscribe()
        }
      } else {
        // Fallback flow without Supabase keys
        const stored = localStorage.getItem('agentos_token')
        if (stored) {
          api.getMe()
            .then((data) => {
              if (mounted) setUser(data)
            })
            .catch(() => {
              localStorage.removeItem('agentos_token')
              if (mounted) {
                setToken(null)
                setUser(null)
              }
            })
            .finally(() => {
              if (mounted) setLoading(false)
            })
        } else {
          setLoading(false)
        }
      }
    }

    initAuth()

    return () => {
      mounted = false
    }
  }, [fetchProfile])

  const login = useCallback(async (email, password) => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error

      setToken(data.session.access_token)
      localStorage.setItem('agentos_token', data.session.access_token)
      const fallback = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.full_name || data.user.email?.split('@')[0],
      }
      const fullProfile = await fetchProfile(data.user.id, fallback)
      setUser(fullProfile)
      return fullProfile
    } else {
      const data = await api.login({ email, password })
      localStorage.setItem('agentos_token', data.access_token)
      setToken(data.access_token)
      const me = await api.getMe()
      setUser(me)
      return me
    }
  }, [fetchProfile])

  const register = useCallback(async (name, email, password) => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
        },
      })
      if (error) throw error

      if (data.session) {
        setToken(data.session.access_token)
        localStorage.setItem('agentos_token', data.session.access_token)
        const fallback = {
          id: data.user.id,
          email: data.user.email,
          name,
        }
        const fullProfile = await fetchProfile(data.user.id, fallback)
        setUser(fullProfile)
        return fullProfile
      } else {
        // Confirmation email sent
        return { needsEmailConfirmation: true }
      }
    } else {
      const data = await api.register({ name, email, password })
      localStorage.setItem('agentos_token', data.access_token)
      setToken(data.access_token)
      const me = await api.getMe()
      setUser(me)
      return me
    }
  }, [fetchProfile])

  const loginWithOAuth = useCallback(async (provider) => {
    if (!isSupabaseConfigured) {
      throw new Error('OAuth requires Supabase environment keys')
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin,
      },
    })
    if (error) throw error
  }, [])

  const sendMagicLink = useCallback(async (email) => {
    if (!isSupabaseConfigured) {
      throw new Error('Magic links require Supabase environment keys')
    }
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    })
    if (error) throw error
  }, [])

  const resetPassword = useCallback(async (email) => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) throw error
    } else {
      throw new Error('Password reset requires Supabase environment keys')
    }
  }, [])

  const updatePassword = useCallback(async (newPassword) => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
    } else {
      throw new Error('Password update via Supabase requires configured client')
    }
  }, [])

  const updateProfile = useCallback(async (fields) => {
    if (isSupabaseConfigured && user?.id) {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          full_name: fields.name,
          avatar_url: fields.avatar_url,
          theme: fields.theme,
          notification_preferences: fields.notification_preferences,
        })
        .eq('id', user.id)
        .select()
        .single()

      if (error) throw error
      const updated = {
        ...user,
        name: data.full_name || user.name,
        avatar_url: data.avatar_url || user.avatar_url,
        theme: data.theme || user.theme,
      }
      setUser(updated)
      return updated
    } else {
      const updated = await api.updateMe({ name: fields.name })
      setUser(updated)
      return updated
    }
  }, [user])

  const logout = useCallback(async () => {
    try {
      if (isSupabaseConfigured) {
        await supabase.auth.signOut()
      }
    } catch (e) {
      console.warn('Sign out error:', e)
    } finally {
      localStorage.removeItem('agentos_token')
      setToken(null)
      setUser(null)
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        loading,
        login,
        register,
        loginWithOAuth,
        sendMagicLink,
        resetPassword,
        updatePassword,
        updateProfile,
        logout,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
