import { createClient } from '@supabase/supabase-js'

const rawUrl = import.meta.env.VITE_SUPABASE_URL || 'https://uptezhanqndjuxysrygu.supabase.co'
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_hf4S79KpGyuM-whS9CH3Ig_c2sno2zz'

export const isSupabaseConfigured = Boolean(
  rawUrl &&
  rawKey &&
  rawUrl.startsWith('http') &&
  !rawUrl.includes('your-project') &&
  !rawKey.includes('your-anon-key')
)

// Fallback to demo URL if not configured so createClient doesn't throw on initialization
const supabaseUrl = isSupabaseConfigured ? rawUrl : 'https://demo-agentos.supabase.co'
const supabaseAnonKey = isSupabaseConfigured ? rawKey : 'ey-demo-placeholder-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

if (!isSupabaseConfigured) {
  console.info(
    '%c[Agent OS] Supabase keys not detected in environment.',
    'color: #818cf8; font-weight: bold;',
    'Running with graceful offline/demo fallbacks. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to connect your live Supabase database.'
  )
}
