/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#14181B',
        'ink-raised': '#191E22',
        panel: '#1D2226',
        'panel-border': '#2A3136',
        brass: '#C89B3C',
        'brass-soft': '#E4C878',
        ledger: '#4FAE8C',
        copper: '#C1553D',
        paper: '#EDE7DA',
        'paper-dim': '#A8A398',
      },
      fontFamily: {
        display: ['Fraunces', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
