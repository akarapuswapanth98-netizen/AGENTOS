import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import CommandPalette from './CommandPalette.jsx'
import {
  LayoutDashboard,
  BrainCircuit,
  Activity,
  Boxes,
  Users2,
  FileText,
  RotateCcw,
  Sparkles,
  Calendar,
  Settings,
  LogOut,
  Search,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Cpu,
  Radio,
  Database,
  Clock,
  Share2,
  BarChart3,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Briefcase,
  Target,
  GitBranch,
  Shield,
  Terminal,
} from 'lucide-react'
import { useSound } from '../context/SoundContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import ScrollProgress from './ScrollProgress.jsx'
import Footer from './Footer.jsx'

export default function Layout({ children }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { soundEnabled, toggleSound, playClick } = useSound()
  const { theme, toggleTheme, isDark } = useTheme()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [cmdOpen, setCmdOpen] = useState(false)

  // Listen for custom open event dispatched from anywhere
  useEffect(() => {
    function handleOpen() {
      setCmdOpen(true)
    }
    document.addEventListener('open-command-palette', handleOpen)
    return () => document.removeEventListener('open-command-palette', handleOpen)
  }, [])

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const navLinks = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Job Matching', path: '/job-match', icon: Briefcase, badge: 'NEW' },
    { label: 'Skill Gap Matrix', path: '/skills', icon: Target },
    { label: 'How It Works', path: '/how-it-works', icon: GitBranch },
    { label: 'Prompt Architecture', path: '/prompt-engineering', icon: Terminal },
    { label: 'Agent Builder', path: '/builder', icon: BrainCircuit, badge: 'V2' },
    { label: 'Live Monitoring', path: '/monitoring', icon: Activity, badge: 'LIVE' },
    { label: 'Analytics', path: '/analytics', icon: BarChart3 },
    { label: 'Interviews', path: '/interviews', icon: Users2 },
    { label: 'Resume', path: '/resume', icon: FileText },
    { label: 'Workspaces', path: '/workspaces', icon: Share2 },
    { label: 'Spaced Review', path: '/review', icon: RotateCcw },
    { label: 'Quiz', path: '/quiz', icon: Sparkles },
    { label: 'Weekly Summary', path: '/weekly', icon: Calendar },
    { label: 'About & Ethics', path: '/about', icon: Shield },
    { label: 'Settings', path: '/settings', icon: Settings },
  ]

  const isCurrent = (path) => {
    if (path === '/') return pathname === '/'
    return pathname.startsWith(path)
  }

  return (
    <div className="min-h-screen bg-[#060810] text-slate-100 flex flex-col font-sans selection:bg-neon-violet selection:text-white">
      <ScrollProgress />
      {/* Background Cyber Grid Overlay */}
      <div className="fixed inset-0 cyber-grid pointer-events-none opacity-40 z-0" />

      {/* Command Palette Modal */}
      <CommandPalette isOpen={cmdOpen} onClose={() => setCmdOpen(false)} />

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#080c15]/85 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 md:hidden"
              aria-label="Toggle navigation"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 shadow-depth-card border border-white/20">
                <span className="font-display font-extrabold text-white text-lg">A</span>
                <span className="absolute -inset-0.5 rounded-xl bg-gradient-to-tr from-indigo-500 to-blue-400 opacity-0 group-hover:opacity-30 blur transition duration-300" />
              </div>
              <div>
                <span className="gradient-text font-display text-xl font-bold tracking-tight">AGENTOS</span>
                <span className="hidden sm:inline-block ml-2 rounded-full border border-white/10 bg-slate-900/80 px-2 py-0.5 text-[10px] font-mono text-slate-300">
                  SPATIAL OS
                </span>
              </div>
            </Link>
          </div>

          {/* Center search trigger */}
          <div className="hidden sm:flex items-center">
            <button
              onClick={() => setCmdOpen(true)}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-900/60 px-3.5 py-1.5 text-xs text-slate-400 hover:border-white/20 hover:text-slate-200 transition shadow-inner"
            >
              <Search className="h-3.5 w-3.5 text-indigo-400" />
              <span>Search commands, agents, workflows...</span>
              <kbd className="rounded border border-white/10 bg-slate-800/80 px-1.5 py-0.5 text-[10px] text-slate-300 font-mono">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Right Status + User Profile */}
          <div className="flex items-center gap-3">
            {/* Live System Heartbeat */}
            <div className="hidden lg:flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/30 px-3 py-1 text-xs text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="font-mono text-[11px] font-medium tracking-wide">CORE ACTIVE</span>
            </div>

            {/* Audio Toggle Button */}
            <button
              onClick={toggleSound}
              title={soundEnabled ? 'Cyber audio enabled (click to mute)' : 'Cyber audio muted (click to unmute)'}
              className={`p-2 rounded-xl border transition ${
                soundEnabled
                  ? 'border-cyan-500/40 bg-cyan-950/40 text-cyan-400 shadow-glow-sm'
                  : 'border-white/10 bg-slate-900/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              title={isDark ? 'Switch to Light mode' : 'Switch to Dark mode'}
              aria-label={isDark ? 'Switch to Light mode' : 'Switch to Dark mode'}
              className="p-2 rounded-xl border border-white/10 bg-slate-900/60 text-slate-300 hover:text-white transition shadow-sm"
            >
              {isDark ? <Sun className="h-4 w-4 text-amber-300" /> : <Moon className="h-4 w-4 text-indigo-400" />}
            </button>

            {user ? (
              <div className="flex items-center gap-2.5">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-semibold text-slate-200">{user.name}</span>
                  <span className="text-[10px] text-indigo-400 font-mono">AGENT ARCHITECT</span>
                </div>
                <button
                  onClick={handleLogout}
                  title="Logout"
                  className="flex items-center gap-1.5 rounded-xl border border-red-500/25 bg-red-950/20 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-900/40 hover:border-red-500/40 transition"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="rounded-xl border border-indigo-500/30 bg-indigo-950/40 px-3.5 py-1.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-900/60 transition"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="btn-cyber-primary rounded-xl px-3.5 py-1.5 text-xs font-semibold"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Container Layout */}
      <div className="relative mx-auto flex max-w-7xl w-full flex-1 gap-6 px-4 py-6 sm:px-6 z-10">
        {/* Desktop Collapsible Sidebar */}
        <aside
          className={`hidden md:flex flex-col transition-all duration-300 shrink-0 ${
            collapsed ? 'w-18' : 'w-56'
          }`}
        >
          <div className="sticky top-22 flex flex-col justify-between cyber-glass rounded-2xl p-3 border border-white/10 shadow-glass-panel min-h-[calc(100vh-8rem)]">
            <nav className="space-y-1.5">
              {navLinks.map((item) => {
                const active = isCurrent(item.path)
                const Icon = item.icon
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                      active
                        ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-depth-card border border-white/20'
                        : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100 border border-transparent'
                    }`}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-white' : 'text-indigo-400'}`} />
                    {!collapsed && (
                      <div className="flex flex-1 items-center justify-between">
                        <span className="truncate">{item.label}</span>
                        {item.badge && (
                          <span
                            className={`rounded-full px-1.5 py-0.2 text-[9px] font-bold tracking-wider font-mono ${
                              item.badge === 'LIVE'
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 animate-pulse'
                                : 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/30'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}
                  </Link>
                )
              })}
            </nav>

            {/* Sidebar Footer with Collapse Toggle */}
            <div className="pt-4 border-t border-indigo-500/15">
              <button
                onClick={() => setCollapsed(!collapsed)}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition"
              >
                {collapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <>
                    <ChevronLeft className="h-4 w-4" />
                    <span>Collapse Panel</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/80 backdrop-blur-md md:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <div
              className="absolute left-0 top-0 bottom-0 w-64 cyber-glass border-r border-indigo-500/30 p-4 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-indigo-500/20">
                <span className="gradient-text font-display font-bold text-lg">AGENTOS NAVIGATION</span>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="space-y-1">
                {navLinks.map((item) => {
                  const active = isCurrent(item.path)
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                        active
                          ? 'bg-indigo-600 text-white shadow-glow-sm'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <Icon className="h-4 w-4 text-indigo-400" />
                      <span>{item.label}</span>
                      {item.badge && (
                        <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-indigo-900 text-indigo-300 font-bold">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </nav>
            </div>
          </div>
        )}

        {/* Page Content Viewport */}
        <main className="min-w-0 flex-1">
          {children}
          <Footer />
        </main>
      </div>
    </div>
  )
}
