/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        adhd: {
          primary: '#6366f1',    // Indigo 500
          primaryDark: '#4f46e5',
          secondary: '#ec4899',  // Pink 500
          accent: '#10b981',     // Emerald 500
          warning: '#f59e0b',    // Amber 500
          dark: '#0f172a',       // Slate 900
          card: '#1e293b',       // Slate 800
          muted: '#94a3b8',      // Slate 400
        }
      },
      animation: {
        'bounce-subtle': 'bounce 2s infinite',
        'pulse-glow': 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
