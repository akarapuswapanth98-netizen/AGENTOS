export default function Skeleton({ rows = 3 }) {
  return (
    <div className="space-y-3" aria-label="Loading telemetry">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl cyber-glass border border-indigo-500/15 p-5 shadow-glass-panel space-y-2.5"
        >
          <div className="skeleton-shimmer h-4 w-1/3 rounded-lg" />
          <div className="skeleton-shimmer h-3 w-3/4 rounded-lg" />
          <div className="skeleton-shimmer h-2.5 w-1/2 rounded-lg opacity-60" />
        </div>
      ))}
    </div>
  )
}
