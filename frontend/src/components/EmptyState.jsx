// Friendly placeholder used by every list with zero items.
export default function EmptyState({ title, hint, action }) {
  return (
    <div className="rounded-xl bg-white p-8 text-center shadow-sm">
      <p className="text-4xl">📭</p>
      <p className="mt-2 font-medium text-slate-900">{title}</p>
      {hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
