import { Link } from 'react-router-dom'
import { Sparkles, Shield, Cpu, ExternalLink, Heart } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-white/10 pt-12 pb-10 text-slate-400 no-print">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:gap-12">
          {/* Brand & Mission */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 font-display font-bold text-white shadow-depth-card border border-white/20">
                A
              </div>
              <span className="font-display font-bold text-white tracking-tight text-lg">AGENTOS</span>
            </Link>
            <p className="mt-3 text-xs leading-relaxed text-slate-400">
              Autonomous multi-agent career intelligence. Synthesizing blueprints, evaluating solutions, and predicting hiring readiness.
            </p>
            <div className="mt-4 flex items-center gap-2 text-[11px] font-mono text-cyan-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Multi-Agent Neural Runtime Active</span>
            </div>
          </div>

          {/* Platform Navigation */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono mb-3">
              Platform
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/" className="hover:text-indigo-400 transition">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link to="/job-match" className="hover:text-indigo-400 transition flex items-center gap-1.5">
                  <span>Job Matching</span>
                  <span className="rounded bg-indigo-500/20 px-1.5 py-0.2 text-[9px] font-mono text-indigo-300">NEW</span>
                </Link>
              </li>
              <li>
                <Link to="/skills" className="hover:text-indigo-400 transition flex items-center gap-1.5">
                  <span>Skill Gap Matrix</span>
                  <span className="rounded bg-indigo-500/20 px-1.5 py-0.2 text-[9px] font-mono text-indigo-300">NEW</span>
                </Link>
              </li>
              <li>
                <Link to="/resume" className="hover:text-indigo-400 transition">
                  Resume Analysis
                </Link>
              </li>
              <li>
                <Link to="/interviews" className="hover:text-indigo-400 transition">
                  Mock Interview Coach
                </Link>
              </li>
              <li>
                <Link to="/workspaces" className="hover:text-indigo-400 transition">
                  Team Workspaces
                </Link>
              </li>
            </ul>
          </div>

          {/* Learn & Architecture */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono mb-3">
              Learn
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/how-it-works" className="hover:text-indigo-400 transition">
                  How It Works
                </Link>
              </li>
              <li>
                <Link to="/prompt-engineering" className="hover:text-indigo-400 transition">
                  Prompt Engineering
                </Link>
              </li>
              <li>
                <Link to="/monitoring" className="hover:text-indigo-400 transition">
                  Neural Telemetry
                </Link>
              </li>
              <li>
                <Link to="/knowledge" className="hover:text-indigo-400 transition">
                  Knowledge Base
                </Link>
              </li>
              <li>
                <Link to="/analytics" className="hover:text-indigo-400 transition">
                  Analytics & Gauges
                </Link>
              </li>
            </ul>
          </div>

          {/* Company & Ethics */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono mb-3">
              Governance
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/about" className="hover:text-indigo-400 transition">
                  About CareerPilot AI
                </Link>
              </li>
              <li>
                <Link to="/about#ethics" className="hover:text-indigo-400 transition">
                  Ethical AI & Privacy
                </Link>
              </li>
              <li>
                <Link to="/settings" className="hover:text-indigo-400 transition">
                  Settings & API Keys
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-indigo-400 transition inline-flex items-center gap-1"
                >
                  <span>GitHub Repository</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Legal Disclaimer & Ethics Banner */}
        <div className="mt-10 border-t border-white/10 pt-6">
          <p className="text-[11px] leading-relaxed text-slate-500 font-sans max-w-4xl">
            <b>Career Guidance Notice:</b> Career guidance and readiness signals only — not a hiring decision. Scores are readiness estimations, never absolute guarantees. CareerPilot AI / AGENTS OS never invents qualifications, and resumes are analyzed in-memory without persistent retention of raw documents.
          </p>
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500 font-mono">
            <span>© {new Date().getFullYear()} CareerPilot AI / AGENTS OS • All rights reserved</span>
            <span className="flex items-center gap-1">
              Crafted with <Heart className="h-3 w-3 text-rose-500 fill-rose-500" /> for engineers & architects
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
