import React from 'react'
import { AlertTriangle, RotateCcw, Home } from 'lucide-react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[Agent OS] Uncaught interface exception:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#060810] text-slate-100 flex items-center justify-center p-6">
          <div className="w-full max-w-lg rounded-3xl cyber-glass border border-red-500/30 p-8 shadow-glass-panel text-center space-y-4">
            <div className="h-14 w-14 rounded-2xl bg-red-950/60 border border-red-500/40 flex items-center justify-center text-red-400 mx-auto shadow-glow-sm">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <h1 className="font-display text-2xl font-extrabold text-white">
              Neural Subsystem Exception
            </h1>
            <p className="text-xs text-slate-300 leading-relaxed max-w-md mx-auto">
              A critical rendering or telemetry fault occurred. The runtime state was isolated to safeguard your workspace configurations.
            </p>
            {this.state.error?.message && (
              <div className="rounded-xl border border-red-500/20 bg-[#090d18] p-3 text-left font-mono text-[11px] text-red-300 overflow-x-auto max-h-32">
                {this.state.error.message}
              </div>
            )}
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleReset}
                className="btn-cyber-primary rounded-xl px-4 py-2 text-xs font-semibold flex items-center gap-2 shadow-glow-sm"
              >
                <RotateCcw className="h-4 w-4" /> Reload System
              </button>
              <a
                href="/"
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10 transition flex items-center gap-2"
              >
                <Home className="h-4 w-4" /> Return to Root
              </a>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
