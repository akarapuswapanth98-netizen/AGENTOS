import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { CheckCircle2, AlertCircle, X } from 'lucide-react'

const ToastContext = createContext(null)
let nextId = 1

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef({})

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id))
    if (timers.current[id]) {
      clearTimeout(timers.current[id])
      delete timers.current[id]
    }
  }, [])

  const push = useCallback((kind, message) => {
    const id = nextId++
    setToasts((list) => [...list, { id, kind, message }])
    timers.current[id] = setTimeout(() => dismiss(id), 4200)
  }, [dismiss])

  const addToast = useCallback((message, kind = 'success') => {
    push(kind, message)
  }, [push])

  const value = {
    success: (message) => push('success', message),
    error: (message) => push('error', message),
    info: (message) => push('info', message),
    addToast,
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex w-84 max-w-[calc(100vw-2.5rem)] flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast-in pointer-events-auto flex items-start justify-between gap-3 rounded-2xl p-4 text-xs shadow-2xl backdrop-blur-xl border ${
              t.kind === 'success'
                ? 'border-emerald-500/40 bg-[#071714]/90 text-emerald-200 shadow-glow-emerald'
                : t.kind === 'info'
                ? 'border-cyan-500/40 bg-[#07131d]/90 text-cyan-200 shadow-glow-cyan'
                : 'border-rose-500/40 bg-[#1f0b12]/90 text-rose-200 shadow-glow-magenta'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {t.kind === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className={`h-4 w-4 shrink-0 mt-0.5 ${t.kind === 'info' ? 'text-cyan-400' : 'text-rose-400'}`} />
              )}
              <span className="leading-relaxed font-medium">{t.message}</span>
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

const fallbackToast = {
  success: (message) => console.log('[Toast:success]', message),
  error: (message) => console.error('[Toast:error]', message),
  info: (message) => console.info('[Toast:info]', message),
  addToast: (message, kind) => console.log(`[Toast:${kind}]`, message),
}

export function useToast() {
  const ctx = useContext(ToastContext)
  return ctx || fallbackToast
}

