export default function Loader({ label = 'Processing neural operations…' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-6 text-xs text-slate-400 font-mono" role="status">
      <span className="flex items-center gap-1.5" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{ animationDelay: `${i * 180}ms` }}
            className="loader-dot inline-block h-2 w-2 rounded-full bg-cyan-400 shadow-glow-sm"
          />
        ))}
      </span>
      <span>{label}</span>
    </div>
  )
}
