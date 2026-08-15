/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#090a0f',
        sidebar: '#10121a',
        card: '#161922',
        cardHover: '#1d212d',
        border: '#242a38',
        borderSubtle: '#1a1f2c',
        primary: {
          DEFAULT: '#3b82f6',
          hover: '#2563eb',
          light: '#60a5fa'
        },
        termiusCyan: '#00f2fe',
        termiusEmerald: '#10b981',
        termiusPurple: '#8b5cf6',
        termiusAmber: '#f59e0b',
        termiusRose: '#f43f5e',
        muted: '#94a3b8',
        mutedDark: '#64748b'
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
      },
      boxShadow: {
        'glow': '0 0 20px -5px rgba(59, 130, 246, 0.4)',
        'glow-cyan': '0 0 20px -5px rgba(0, 242, 254, 0.35)',
        'modal': '0 25px 50px -12px rgba(0, 0, 0, 0.75)'
      }
    },
  },
  plugins: [],
}
