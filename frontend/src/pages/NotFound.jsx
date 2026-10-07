import { Link } from 'react-router-dom'

// Rendered by the catch-all route for unknown URLs.
export default function NotFound() {
  return (
    <div className="rounded-xl bg-white p-10 text-center shadow-sm">
      <p className="text-6xl font-bold text-indigo-600">404</p>
      <p className="mt-2 font-medium text-slate-900">This page does not exist.</p>
      <p className="mt-1 text-sm text-slate-500">Check the URL or head back to safety.</p>
      <Link to="/" className="mt-4 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
        Go to dashboard
      </Link>
    </div>
  )
}
