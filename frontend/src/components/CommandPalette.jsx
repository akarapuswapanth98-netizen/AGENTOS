import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  LayoutDashboard,
  BrainCircuit,
  Activity,
  Boxes,
  Users2,
  FileText,
  RotateCcw,
  Sparkles,
  Settings,
  Calendar,
  Layers,
  ArrowRight,
  X,
  BarChart3,
  Database,
  Clock,
  Share2,
} from 'lucide-react'

export default function CommandPalette({ isOpen, onClose }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)

  const items = useMemo(() => [
    {
      category: 'Navigation',
      items: [
        { id: 'dash', label: 'Dashboard', desc: 'Main career HUD and readiness score', icon: LayoutDashboard, path: '/' },
        { id: 'builder', label: 'Visual Agent Builder', desc: 'Drag-and-drop agent workflow canvas', icon: BrainCircuit, path: '/builder' },
        { id: 'monitor', label: 'Live Agent Monitoring', desc: 'Real-time telemetry, tokens and logs', icon: Activity, path: '/monitoring' },
        { id: 'analytics', label: 'Holographic Analytics', desc: 'Skill mastery curves & token metrics', icon: BarChart3, path: '/analytics' },
        { id: 'market', label: 'Agent Templates Marketplace', desc: 'Pre-built agent blueprints and workflows', icon: Boxes, path: '/marketplace' },
        { id: 'knowledge', label: 'Knowledge Base', desc: 'Vector search documents & memory chunking', icon: Database, path: '/knowledge' },
        { id: 'schedules', label: 'Automated Schedules', desc: 'Cron triggers and agent webhooks', icon: Clock, path: '/schedules' },
        { id: 'workspaces', label: 'Team Workspaces', desc: 'Multiplayer agents and collaboration', icon: Share2, path: '/workspaces' },
        { id: 'interviews', label: 'Interview Simulator', desc: 'AI mock interviews with scoring', icon: Users2, path: '/interviews' },
        { id: 'resume', label: 'Resume Analyzer', desc: 'Skill extraction and gap analysis', icon: FileText, path: '/resume' },
        { id: 'review', label: 'Spaced Repetition Review', desc: 'Leitner flashcards and retention', icon: RotateCcw, path: '/review' },
        { id: 'quiz', label: 'Practice Quiz', desc: '5-minute timed skill assessments', icon: Sparkles, path: '/quiz' },
        { id: 'weekly', label: 'Weekly Summary', desc: 'Progress summary & PDF export', icon: Calendar, path: '/weekly' },
        { id: 'settings', label: 'Settings', desc: 'Profile and security configuration', icon: Settings, path: '/settings' },
      ],
    },
    {
      category: 'Actions',
      items: [
        { id: 'action-quiz', label: 'Start 5-Minute Quiz', desc: 'Launch immediate skill test', icon: Sparkles, action: () => navigate('/quiz') },
        { id: 'action-interview', label: 'Launch Mock Interview', desc: 'Begin 5-round simulation', icon: Users2, action: () => navigate('/interviews') },
        { id: 'action-resume', label: 'Upload New Resume', desc: 'Extract skills and generate goal', icon: FileText, action: () => navigate('/resume') },
      ],
    },
  ], [navigate])

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return items
    return items
      .map((cat) => ({
        ...cat,
        items: cat.items.filter(
          (i) => i.label.toLowerCase().includes(q) || i.desc.toLowerCase().includes(q)
        ),
      }))
      .filter((cat) => cat.items.length > 0)
  }, [items, query])

  const flatList = useMemo(() => {
    return filtered.flatMap((cat) => cat.items)
  }, [filtered])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  // Global Cmd+K keyboard shortcut listener
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (isOpen) {
          onClose()
        } else {
          // Trigger open via parent
          document.dispatchEvent(new CustomEvent('open-command-palette'))
        }
      }
      if (!isOpen) return
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % (flatList.length || 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + flatList.length) % (flatList.length || 1))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const selected = flatList[selectedIndex]
        if (selected) {
          if (selected.action) {
            selected.action()
          } else if (selected.path) {
            navigate(selected.path)
          }
          onClose()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, flatList, selectedIndex, navigate])

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 sm:pt-28 bg-black/75 backdrop-blur-md px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border border-indigo-500/30 bg-[#0d1222] shadow-2xl shadow-indigo-950/80 overflow-hidden text-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="relative flex items-center border-b border-indigo-500/20 px-4 py-3.5">
          <Search className="h-5 w-5 text-indigo-400 shrink-0 mr-3" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search (e.g. quiz, resume, builder)..."
            className="w-full bg-transparent text-base text-white placeholder-slate-400 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <span className="ml-3 rounded border border-slate-700 bg-slate-800/80 px-2 py-0.5 text-xs text-slate-400">
            ESC
          </span>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-4">
          {flatList.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">
              No commands found for &ldquo;<span className="text-white">{query}</span>&rdquo;
            </div>
          ) : (
            filtered.map((group) => (
              <div key={group.category} className="space-y-1">
                <div className="px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-wider text-indigo-400/80">
                  {group.category}
                </div>
                {group.items.map((item) => {
                  const itemIndex = flatList.findIndex((i) => i.id === item.id)
                  const isSelected = itemIndex === selectedIndex
                  const Icon = item.icon

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (item.action) item.action()
                        else if (item.path) navigate(item.path)
                        onClose()
                      }}
                      onMouseEnter={() => setSelectedIndex(itemIndex)}
                      className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-left transition-all ${
                        isSelected
                          ? 'bg-indigo-600/25 border border-indigo-500/40 text-white shadow-sm'
                          : 'text-slate-300 hover:bg-slate-800/60 border border-transparent'
                      }`}
                    >
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          isSelected
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-800 text-indigo-400'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-100 flex items-center gap-2">
                          {item.label}
                        </div>
                        <div className="text-xs text-slate-400 truncate">{item.desc}</div>
                      </div>
                      {isSelected && (
                        <ArrowRight className="h-4 w-4 text-indigo-400 shrink-0" />
                      )}
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="flex items-center justify-between border-t border-indigo-500/15 bg-[#090d18] px-4 py-2.5 text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <span>↑↓ to navigate</span>
            <span>↵ to select</span>
          </div>
          <span className="text-indigo-400 font-mono">AGENTOS v2.0 • CYBER OPERATING SYSTEM</span>
        </div>
      </div>
    </div>
  )
}
