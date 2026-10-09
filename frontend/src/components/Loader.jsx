// Small loading indicator (orbiting dots + optional label).
export default function Loader({ label = 'Loading…' }) {
  return (
    <div className="flex items-center gap-2 py-4 text-sm text-slate-500" role="status">
      <span className="flex items-center gap-1" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span key={i} style={{ animationDelay: `${i * 150}ms` }}
            className="loader-dot inline-block h-2 w-2 rounded-full bg-indigo-600" />
        ))}
      </span>
      <span>{label}</span>
    </div>
  )
}
