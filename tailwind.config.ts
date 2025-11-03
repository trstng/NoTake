import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        // Neon Terminal Theme
        neon: {
          primary: '#00FFAA',
          accent: '#FFD500',
          profit: '#39FF14',
          loss: '#FF3131',
        },
        background: '#000B14',
        surface: '#001122',
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        foreground: '#E2E8F0',
        muted: {
          DEFAULT: '#001122',
          foreground: '#64748B',
        },
        primary: {
          DEFAULT: '#00FFAA',
          foreground: '#000B14',
        },
        secondary: {
          DEFAULT: '#001122',
          foreground: '#E2E8F0',
        },
        destructive: {
          DEFAULT: '#FF3131',
          foreground: '#E2E8F0',
        },
        accent: {
          DEFAULT: '#FFD500',
          foreground: '#000B14',
        },
        popover: {
          DEFAULT: '#001122',
          foreground: '#E2E8F0',
        },
        card: {
          DEFAULT: '#001122',
          foreground: '#E2E8F0',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'glow-pulse': {
          '0%, 100%': {
            boxShadow: '0 0 5px #00FFAA, 0 0 10px #00FFAA',
          },
          '50%': {
            boxShadow: '0 0 10px #00FFAA, 0 0 20px #00FFAA, 0 0 30px #00FFAA',
          },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
      },
      fontFamily: {
        mono: ['var(--font-mono)', 'monospace'],
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
