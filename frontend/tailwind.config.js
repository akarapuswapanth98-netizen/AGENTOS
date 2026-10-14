/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cyber: {
          void: '#05070c',
          bg: '#080c15',
          surface: '#0e1322',
          card: '#13192a',
          glass: 'rgba(15, 20, 34, 0.75)',
          border: 'rgba(255, 255, 255, 0.08)',
          'border-bright': 'rgba(99, 102, 241, 0.35)',
          muted: '#94a3b8',
        },
        neon: {
          violet: '#6366f1',
          cyan: '#0284c7',
          magenta: '#f43f5e',
          emerald: '#10b981',
          amber: '#f59e0b',
          blue: '#3b82f6',
        },
      },
      boxShadow: {
        'glow-sm': '0 2px 8px rgba(99, 102, 241, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
        'glow-violet': '0 8px 24px -4px rgba(99, 102, 241, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.18)',
        'glow-cyan': '0 8px 24px -4px rgba(14, 165, 233, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.18)',
        'glow-magenta': '0 8px 24px -4px rgba(244, 63, 94, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.18)',
        'glow-emerald': '0 8px 24px -4px rgba(16, 185, 129, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.18)',
        'glass-panel': '0 20px 48px -12px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
        'depth-card': '0 4px 16px -2px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
        'depth-elevated': '0 16px 36px -6px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(99, 102, 241, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
      },
      animation: {
        'float-slow': 'float 7s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2.5s ease-in-out infinite',
        'spin-slow': 'spin 22s linear infinite',
        'laser-sweep': 'laserSweep 3s cubic-bezier(0.4, 0, 0.2, 1) infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: 0.6, transform: 'scale(1)' },
          '50%': { opacity: 1, transform: 'scale(1.05)' },
        },
        laserSweep: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(200%)' },
        },
      },
    },
  },
  plugins: [],
}
