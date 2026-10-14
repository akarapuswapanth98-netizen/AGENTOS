import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase.js'
import { useAuth } from './AuthContext.jsx'
import { useToast } from './ToastContext.jsx'

const WorkspaceContext = createContext(null)

const DEMO_WORKSPACE = {
  id: 'ws-demo-cyber-lab',
  name: 'Cybernetic Systems Lab',
  slug: 'cyber-lab',
  owner_id: 'usr-demo-1',
  role: 'owner',
}

export function WorkspaceProvider({ children }) {
  const { user } = useAuth()
  const toast = useToast()
  const [workspaces, setWorkspaces] = useState([DEMO_WORKSPACE])
  const [currentWorkspace, setCurrentWorkspace] = useState(() => {
    try {
      const saved = localStorage.getItem('agentos_active_workspace')
      return saved ? JSON.parse(saved) : DEMO_WORKSPACE
    } catch {
      return DEMO_WORKSPACE
    }
  })
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(false)

  // Fetch user workspaces from Supabase
  const fetchWorkspaces = useCallback(async () => {
    if (!user) return
    if (!isSupabaseConfigured) {
      setWorkspaces([DEMO_WORKSPACE])
      return
    }

    try {
      setLoading(true)
      // Fetch workspaces where user is owner or active member
      const { data, error } = await supabase
        .from('workspaces')
        .select(`
          id,
          name,
          slug,
          logo_url,
          owner_id,
          created_at,
          workspace_members!inner(role, status)
        `)
        .eq('workspace_members.user_id', user.id)
        .eq('workspace_members.status', 'active')

      if (error) throw error

      if (data && data.length > 0) {
        const formatted = data.map((ws) => ({
          ...ws,
          role: ws.owner_id === user.id ? 'owner' : ws.workspace_members?.[0]?.role || 'member',
        }))
        setWorkspaces(formatted)

        // Ensure currentWorkspace is still valid
        const stillValid = formatted.find((w) => w.id === currentWorkspace?.id)
        if (stillValid) {
          setCurrentWorkspace(stillValid)
        } else {
          setCurrentWorkspace(formatted[0])
          localStorage.setItem('agentos_active_workspace', JSON.stringify(formatted[0]))
        }
      }
    } catch (err) {
      console.warn('[WorkspaceContext] Could not fetch workspaces:', err.message)
    } finally {
      setLoading(false)
    }
  }, [user, currentWorkspace?.id])

  // Fetch members for active workspace
  const fetchMembers = useCallback(async (workspaceId) => {
    if (!workspaceId) return
    if (!isSupabaseConfigured) {
      setMembers([
        { id: '1', user_id: '1', full_name: 'Dr. Ada Lovelace', email: 'ada@agentos.dev', role: 'owner', status: 'active' },
        { id: '2', user_id: '2', full_name: 'Alan Turing', email: 'alan@agentos.dev', role: 'admin', status: 'active' },
        { id: '3', user_id: '3', full_name: 'Claude Shannon', email: 'claude@agentos.dev', role: 'member', status: 'invited' },
      ])
      return
    }

    try {
      const { data, error } = await supabase
        .from('workspace_members')
        .select(`
          id,
          role,
          status,
          invited_email,
          created_at,
          user_id,
          profiles (
            id,
            full_name,
            email,
            avatar_url
          )
        `)
        .eq('workspace_id', workspaceId)

      if (error) throw error

      const formatted = (data || []).map((m) => ({
        id: m.id,
        user_id: m.user_id,
        full_name: m.profiles?.full_name || m.invited_email?.split('@')[0] || 'Invited User',
        email: m.profiles?.email || m.invited_email,
        avatar_url: m.profiles?.avatar_url,
        role: m.role,
        status: m.status,
        created_at: m.created_at,
      }))
      setMembers(formatted)
    } catch (err) {
      console.warn('[WorkspaceContext] Could not fetch members:', err.message)
    }
  }, [])

  useEffect(() => {
    if (user) {
      fetchWorkspaces()
    }
  }, [user, fetchWorkspaces])

  useEffect(() => {
    if (currentWorkspace?.id) {
      fetchMembers(currentWorkspace.id)
    }
  }, [currentWorkspace?.id, fetchMembers])

  const switchWorkspace = (workspace) => {
    setCurrentWorkspace(workspace)
    localStorage.setItem('agentos_active_workspace', JSON.stringify(workspace))
    toast?.success?.(`Switched to ${workspace.name}`)
  }

  const createWorkspace = async ({ name, slug }) => {
    if (!user) throw new Error('Must be signed in to create workspace')

    if (!isSupabaseConfigured) {
      const newWs = {
        id: 'ws-' + Math.random().toString(36).substring(2, 9),
        name,
        slug: slug || name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        owner_id: user.id || 'demo-user',
        role: 'owner',
      }
      setWorkspaces((prev) => [...prev, newWs])
      switchWorkspace(newWs)
      return newWs
    }

    const { data: ws, error: wsError } = await supabase
      .from('workspaces')
      .insert({
        name,
        slug: slug || name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        owner_id: user.id,
      })
      .select()
      .single()

    if (wsError) throw wsError

    // Add owner as active member
    await supabase.from('workspace_members').insert({
      workspace_id: ws.id,
      user_id: user.id,
      role: 'owner',
      status: 'active',
    })

    const formattedWs = { ...ws, role: 'owner' }
    setWorkspaces((prev) => [...prev, formattedWs])
    switchWorkspace(formattedWs)
    return formattedWs
  }

  const inviteMember = async ({ email, role }) => {
    if (!currentWorkspace?.id) throw new Error('No active workspace')

    if (!isSupabaseConfigured) {
      const newMember = {
        id: String(Date.now()),
        user_id: null,
        full_name: email.split('@')[0],
        email,
        role,
        status: 'invited',
      }
      setMembers((prev) => [...prev, newMember])
      return newMember
    }

    const { data, error } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: currentWorkspace.id,
        invited_email: email,
        role,
        status: 'invited',
      })
      .select()
      .single()

    if (error) throw error

    await fetchMembers(currentWorkspace.id)
    return data
  }

  const removeMember = async (memberId) => {
    if (!currentWorkspace?.id) return

    if (!isSupabaseConfigured) {
      setMembers((prev) => prev.filter((m) => m.id !== memberId))
      return
    }

    const { error } = await supabase
      .from('workspace_members')
      .delete()
      .eq('id', memberId)
      .eq('workspace_id', currentWorkspace.id)

    if (error) throw error
    setMembers((prev) => prev.filter((m) => m.id !== memberId))
  }

  const updateMemberRole = async (memberId, newRole) => {
    if (!currentWorkspace?.id) return

    if (!isSupabaseConfigured) {
      setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m)))
      return
    }

    const { error } = await supabase
      .from('workspace_members')
      .update({ role: newRole })
      .eq('id', memberId)
      .eq('workspace_id', currentWorkspace.id)

    if (error) throw error
    setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m)))
  }

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        currentWorkspace,
        currentRole: currentWorkspace?.role || 'member',
        members,
        loading,
        switchWorkspace,
        createWorkspace,
        inviteMember,
        removeMember,
        updateMemberRole,
        refreshWorkspaces: fetchWorkspaces,
        refreshMembers: () => fetchMembers(currentWorkspace?.id),
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace must be used inside WorkspaceProvider')
  return ctx
}
