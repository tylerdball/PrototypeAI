import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-outfit)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      colors: {
        bg: {
          base: '#08090e',
          surface: '#0f1117',
          elevated: '#161822',
          border: '#1e2130',
          'border-muted': '#161825',
        },
        accent: {
          DEFAULT: '#60a5fa',
          dim: '#3b82f6',
          glow: 'rgba(96,165,250,0.15)',
        },
        severity: {
          ok: '#34d399',
          'ok-dim': 'rgba(52,211,153,0.15)',
          warning: '#fbbf24',
          'warning-dim': 'rgba(251,191,36,0.15)',
          critical: '#f87171',
          'critical-dim': 'rgba(248,113,113,0.15)',
        },
        text: {
          primary: '#e2e8f0',
          secondary: '#94a3b8',
          muted: '#4b5563',
          dim: '#374151',
        },
      },
      animation: {
        'spin-slow': 'spin 1.2s linear infinite',
        'pulse-soft': 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
      },
    },
  },
  plugins: [],
}

export default config
