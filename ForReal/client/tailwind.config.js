/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#16a34a',
        secondary: '#22c55e',
        neon: '#22c55e',
        'neon-soft': '#4ade80',
        'neon-bright': '#00ff88',
        bg: '#ffffff',
        surface: '#f9fafb',
        text: '#111827',
      },
      borderRadius: {
        card: '14px',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(16,24,39,0.06), 0 6px 18px rgba(16,24,39,0.06)',
      },
      transitionDuration: {
        200: '200ms',
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

