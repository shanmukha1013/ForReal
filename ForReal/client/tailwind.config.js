/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: 'var(--brand-primary)',
          hover: 'var(--brand-hover)',
          accent: 'var(--brand-accent)',
          glow: 'var(--brand-glow)',
        },
        ai: {
          DEFAULT: 'var(--ai)',
        },
        success: {
          DEFAULT: 'var(--success)',
        },
        warning: {
          DEFAULT: 'var(--warning)',
        },
        info: {
          DEFAULT: 'var(--info)',
        },
        bg: {
          primary: 'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
        },
        surface: {
          DEFAULT: 'var(--surface)',
          elevated: 'var(--surface-elevated)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
        border: {
          DEFAULT: 'var(--border)',
          active: 'var(--border-active)',
          subtle: 'var(--border-subtle)',
        },
        // Kept for backward compatibility while refactoring
        neon: 'var(--success)', 
        dark: {
          base: 'var(--bg-primary)',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['Space Mono', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 20px var(--brand-glow)',
        'glow-lg': '0 0 40px var(--brand-glow)',
        'glow-ai': '0 0 20px rgba(245, 158, 11, 0.25)',
      }
    },
  },
  plugins: [],
};
