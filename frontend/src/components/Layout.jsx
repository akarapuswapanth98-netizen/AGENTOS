import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

// App shell: sidebar on desktop, top bar with user name + logout.
export default function Layout({ children }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const linkCls = (active) =>
    `block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${active ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-200'}`

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white">A</span>
            <span className="gradient-text text-lg font-bold tracking-tight">AGENTOS</span>
          </Link>
          <div className="flex items-center gap-3">
            {user && (
              <>
                <span className="hidden text-sm text-slate-600 sm:block">{user.name}</span>
                <button onClick={handleLogout} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200">
                  Logout
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl gap-6 px-4 py-6">
        <aside className="hidden w-48 shrink-0 md:block">
          <nav className="sticky top-20 space-y-1">
            <Link to="/" className={linkCls(pathname === '/')}>Dashboard</Link>
            <Link to="/interviews" className={linkCls(pathname.startsWith('/interviews'))}>Interviews</Link>
            <Link to="/resume" className={linkCls(pathname === '/resume')}>Resume</Link>
            <Link to="/review" className={linkCls(pathname === '/review')}>Review</Link>
            <Link to="/quiz" className={linkCls(pathname === '/quiz')}>Quiz</Link>
            <Link to="/weekly" className={linkCls(pathname === '/weekly')}>Weekly</Link>
            <Link to="/settings" className={linkCls(pathname === '/settings')}>Settings</Link>
            <p className="px-3 pt-4 text-xs text-slate-400">Goals and tasks open from the dashboard.</p>
          </nav>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  )
}
