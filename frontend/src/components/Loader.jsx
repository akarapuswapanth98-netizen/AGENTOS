// Small loading indicator (spinner + optional label).
export default function Loader({ label = 'Loading…' }) {
  return (
    <div className="flex items-center gap-2 py-4 text-sm text-slate-500">
      <svg className="h-5 w-5 animate-spin text-indigo-600" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
        <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      </svg>
      <span>{label}</span>
    </div>
  )
}
