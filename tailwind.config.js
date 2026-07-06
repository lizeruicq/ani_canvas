/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#eef1f6',
        panel: '#ffffff',
        panel1: '#ffffff',
        panel2: '#eef1f6',
        panel3: '#e2e8f0',
        edge: '#dde3ed',
        edge2: '#c4ccd9',
        accent: '#4f7cff',
        accent2: '#7c5cff',
        ok: '#16a34a',
        warn: '#f59e0b',
        danger: '#ef4444',
        kf: '#f59e0b',
        muted: '#6b7689',
        text: '#1a2233',
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
