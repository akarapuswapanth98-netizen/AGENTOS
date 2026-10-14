import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, getErrorMessage } from '../api/client.js'
import { supabase, isSupabaseConfigured } from '../lib/supabase.js'
import ErrorBanner from '../components/ErrorBanner.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import {
  Settings as SettingsIcon,
  User,
  Key,
  ShieldAlert,
  Save,
  Trash2,
  Camera,
  Upload,
  Loader2,
} from 'lucide-react'

export default function Settings() {
  const navigate = useNavigate()
  const { user, updateProfile, updatePassword, logout } = useAuth()
  const toast = useToast()
  const [name, setName] = useState(user?.name || '')
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '')
  const [error, setError] = useState('')
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [delPw, setDelPw] = useState('')
  const [delConfirm, setDelConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (user?.name) setName(user.name)
    if (user?.avatar_url) setAvatarUrl(user.avatar_url)
  }, [user?.name, user?.avatar_url])

  const inputCls =
    'w-full rounded-xl border border-indigo-500/25 bg-[#090d18] px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400/40 transition'

  async function handleAvatarUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Avatar file size must be under 2MB')
      return
    }

    setUploadingAvatar(true)
    setError('')
    try {
      if (isSupabaseConfigured && user?.id) {
        const fileExt = file.name.split('.').pop()
        const filePath = `${user.id}/${Date.now()}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, file, { upsert: true })

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath)

        setAvatarUrl(publicUrl)
        await updateProfile({ name: name.trim(), avatar_url: publicUrl })
        toast.success('Avatar updated and persisted')
      } else {
        // Fallback local preview
        const reader = new FileReader()
        reader.onload = (event) => {
          setAvatarUrl(event.target.result)
          toast.success('Avatar updated (local preview)')
        }
        reader.readAsDataURL(file)
      }
    } catch (err) {
      const msg = err.message || 'Failed to upload avatar'
      setError(msg)
      toast.error(msg)
    } finally {
      setUploadingAvatar(false)
    }
  }

  async function handleProfileSave(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await updateProfile({ name: name.trim(), avatar_url: avatarUrl })
      toast.success('Agent Architect profile updated')
    } catch (err) {
      const msg = getErrorMessage(err, 'Could not update profile name')
      setError(msg)
      toast.error(msg)
    } finally {
      setBusy(false)
    }
  }

  async function handlePassword(e) {
    e.preventDefault()
    if (newPw.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setBusy(true)
    setError('')
    try {
      if (isSupabaseConfigured) {
        await updatePassword(newPw)
      } else {
        await api.changePassword({ current_password: currentPw, new_password: newPw })
      }
      setCurrentPw('')
      setNewPw('')
      toast.success('Security credentials updated')
    } catch (err) {
      const msg = getErrorMessage(err, 'Could not update password')
      setError(msg)
      toast.error(msg)
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(e) {
    e.preventDefault()
    if (delConfirm !== 'DELETE') {
      toast.error('Type DELETE to confirm account deletion')
      return
    }
    setBusy(true)
    try {
      await api.deleteAccount(delPw)
      logout()
      toast.success('Account and associated data destroyed')
      navigate('/register')
    } catch (err) {
      const msg = getErrorMessage(err, 'Could not delete account')
      setError(msg)
      toast.error(msg)
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 text-slate-200">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2">
          <SettingsIcon className="h-6 w-6 text-indigo-400" />
          Operating System Settings
        </h1>
        <p className="mt-1 text-xs text-slate-400 font-mono">
          PROFILE PARAMETERS • STORAGE ASSETS • CREDENTIAL SECURITY • PURGE CONTROLS
        </p>
      </div>

      <ErrorBanner message={error} />

      {/* Profile & Avatar Form */}
      <form
        onSubmit={handleProfileSave}
        className="space-y-4 rounded-3xl cyber-glass border border-indigo-500/25 p-6 shadow-glass-panel"
      >
        <div className="flex items-center gap-2 border-b border-indigo-500/15 pb-3">
          <User className="h-4 w-4 text-cyan-400" />
          <h2 className="font-display text-base font-bold text-white">Agent Architect Identity</h2>
        </div>

        {/* Avatar Upload */}
        <div className="flex items-center gap-4 py-2">
          <div className="relative group">
            <div className="h-16 w-16 rounded-2xl bg-indigo-950/60 border border-indigo-500/40 flex items-center justify-center text-lg font-bold text-white overflow-hidden shadow-inner">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <span>{(name || user?.email || 'A').slice(0, 2).toUpperCase()}</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 rounded-lg bg-indigo-600 p-1.5 text-white hover:bg-indigo-500 shadow transition"
              title="Upload Avatar Image"
            >
              {uploadingAvatar ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarUpload}
              accept="image/*"
              className="hidden"
            />
          </div>
          <div>
            <div className="text-xs font-semibold text-white">Avatar Photo</div>
            <p className="text-[11px] text-slate-400">
              Persisted in Supabase <code className="text-indigo-300">avatars</code> bucket. Max 2MB.
            </p>
          </div>
        </div>

        <div>
          <label className="text-xs text-slate-400 block mb-1">Display Name</label>
          <input
            className={inputCls}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            required
          />
        </div>

        <div>
          <label className="text-xs text-slate-400 block mb-1">Email Address (Read-only)</label>
          <input
            className={`${inputCls} opacity-60 cursor-not-allowed`}
            value={user?.email || ''}
            disabled
          />
        </div>

        <button
          disabled={busy || uploadingAvatar}
          className="btn-cyber-primary rounded-xl px-4 py-2 text-xs font-semibold flex items-center gap-2 disabled:opacity-50"
        >
          <Save className="h-3.5 w-3.5" />
          Save Identity
        </button>
      </form>

      {/* Password Form */}
      <form
        onSubmit={handlePassword}
        className="space-y-4 rounded-3xl cyber-glass border border-indigo-500/25 p-6 shadow-glass-panel"
      >
        <div className="flex items-center gap-2 border-b border-indigo-500/15 pb-3">
          <Key className="h-4 w-4 text-violet-400" />
          <h2 className="font-display text-base font-bold text-white">Access Credentials</h2>
        </div>
        {!isSupabaseConfigured && (
          <div>
            <label className="text-xs text-slate-400 block mb-1">Current Password</label>
            <input
              className={inputCls}
              type="password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              placeholder="Current authentication password"
              required
            />
          </div>
        )}
        <div>
          <label className="text-xs text-slate-400 block mb-1">New Password (Min 8 characters)</label>
          <input
            className={inputCls}
            type="password"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            placeholder="New secure password"
            minLength={8}
            required
          />
        </div>
        <button
          disabled={busy}
          className="btn-cyber-primary rounded-xl px-4 py-2 text-xs font-semibold flex items-center gap-2 disabled:opacity-50"
        >
          <Key className="h-3.5 w-3.5" />
          Rotate Password
        </button>
      </form>

      {/* Danger Zone: Purge Account */}
      <form
        onSubmit={handleDelete}
        className="space-y-4 rounded-3xl border border-red-500/30 bg-red-950/20 p-6 shadow-glass-panel"
      >
        <div className="flex items-center gap-2 border-b border-red-500/20 pb-3">
          <ShieldAlert className="h-5 w-5 text-red-400" />
          <h2 className="font-display text-base font-bold text-red-400">Purge Agent OS Account</h2>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          Permanently destroys your user account, agent pipelines, vector embeddings, and telemetry logs. This action is irrevocable.
        </p>
        <div>
          <label className="text-xs text-slate-400 block mb-1">Confirm with Password</label>
          <input
            className={inputCls}
            type="password"
            value={delPw}
            onChange={(e) => setDelPw(e.target.value)}
            placeholder="Your password"
            required
          />
        </div>
        <div>
          <label className="text-xs text-slate-400 block mb-1">Type DELETE to confirm</label>
          <input
            className={inputCls}
            value={delConfirm}
            onChange={(e) => setDelConfirm(e.target.value)}
            placeholder="DELETE"
            required
          />
        </div>
        <button
          disabled={busy}
          className="rounded-xl border border-red-500/50 bg-red-600/80 px-4 py-2 text-xs font-bold text-white hover:bg-red-600 transition flex items-center gap-2 disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Purge All Account Data
        </button>
      </form>
    </div>
  )
}
