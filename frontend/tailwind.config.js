/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cyber: {
          void: '#030508',
          bg: '#070a12',
          surface: '#0d1322',
          card: '#121a2e',
          glass: 'rgba(18, 26, 46, 0.65)',
          border: 'rgba(99, 102, 241, 0.22)',
          'border-bright': 'rgba(129, 140, 248, 0.45)',
          muted: '#8b9bb4',
        },
        neon: {
          violet: '#8b5cf6',
          cyan: '#06b6d4',
          magenta: '#f43f5e',
          emerald: '#10b981',
          amber: '#f59e0b',
          blue: '#3b82f6',
        },
      },
      boxShadow: {
        'glow-sm': '0 0 15px rgba(139, 92, 246, 0.25)',
        'glow-violet': '0 0 30px rgba(139, 92, 246, 0.4)',
        'glow-cyan': '0 0 30px rgba(6, 182, 212, 0.4)',
        'glow-magenta': '0 0 30px rgba(244, 63, 94, 0.4)',
        'glow-emerald': '0 0 30px rgba(16, 185, 129, 0.4)',
        'glass-panel': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
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
