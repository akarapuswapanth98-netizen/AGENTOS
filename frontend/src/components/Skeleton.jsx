// Shimmer placeholder blocks shown while list pages load.
export default function Skeleton({ rows = 3 }) {
  return (
    <div className="space-y-3" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-xl bg-white p-4 shadow-sm">
          <div className="skeleton-shimmer h-4 w-2/3 rounded" />
          <div className="skeleton-shimmer mt-2 h-3 w-1/3 rounded" />
        </div>
      ))}
    </div>
  )
}
