// Red banner showing the backend's error message.
export default function ErrorBanner({ message, onRetry }) {
  if (!message) return null
  return (
    <div className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      <span>{message}</span>
      {onRetry && <button onClick={onRetry} className="shrink-0 font-semibold underline">Retry</button>}
    </div>
  )
}
