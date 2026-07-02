/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        neon: {
          DEFAULT: '#22c55e', // text-neon
          soft: '#4ade80',
          bright: '#00ff88',
          dim: 'rgba(34,197,94,0.15)',
        },
        dark: {
          root: '#000000',
          base: '#050505',
          raised: '#0a0a0a',
          card: '#121212',
          border: 'rgba(255,255,255,0.08)'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['Space Mono', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 20px rgba(34, 197, 94, 0.25)',
        'glow-lg': '0 0 40px rgba(34, 197, 94, 0.35)',
      },
      backgroundImage: {
        'glass-gradient': 'linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0) 100%)',
      }
    },
  },
  plugins: [],
};

