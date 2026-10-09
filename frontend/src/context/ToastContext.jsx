import { createContext, useCallback, useContext, useRef, useState } from 'react'

const ToastContext = createContext(null)
let nextId = 1

// Toast system: toast.success(msg) / toast.error(msg), auto-dismiss, no library.
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
    timers.current[id] = setTimeout(() => dismiss(id), 4000)
  }, [dismiss])

  const value = {
    success: (message) => push('success', message),
    error: (message) => push('error', message),
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast-in pointer-events-auto flex items-start justify-between gap-2 rounded-xl p-3 text-sm shadow-lg ${
              t.kind === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
            }`}
          >
            <span>{t.message}</span>
            <button onClick={() => dismiss(t.id)} className="font-bold opacity-80 hover:opacity-100">×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
