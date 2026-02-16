/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: 'rgb(var(--color-primary-50) / <alpha-value>)',
          100: 'rgb(var(--color-primary-100) / <alpha-value>)',
          200: 'rgb(var(--color-primary-200) / <alpha-value>)',
          300: 'rgb(var(--color-primary-300) / <alpha-value>)',
          400: 'rgb(var(--color-primary-400) / <alpha-value>)',
          500: 'rgb(var(--color-primary-500) / <alpha-value>)',
          600: 'rgb(var(--color-primary-600) / <alpha-value>)',
          700: 'rgb(var(--color-primary-700) / <alpha-value>)',
          800: 'rgb(var(--color-primary-800) / <alpha-value>)',
          900: 'rgb(var(--color-primary-900) / <alpha-value>)',
          950: 'rgb(var(--color-primary-950) / <alpha-value>)',
        },
        surface: {
          canvas: 'rgb(var(--bg-canvas) / <alpha-value>)',
          card: 'rgb(var(--bg-surface) / <alpha-value>)',
          elevated: 'rgb(var(--bg-elevated) / <alpha-value>)',
          hover: 'rgb(var(--bg-hover) / <alpha-value>)',
        },
        content: {
          primary: 'rgb(var(--text-primary) / <alpha-value>)',
          secondary: 'rgb(var(--text-secondary) / <alpha-value>)',
          muted: 'rgb(var(--text-muted) / <alpha-value>)',
          inverse: 'rgb(var(--text-inverse) / <alpha-value>)',
        },
        border: {
          DEFAULT: 'rgb(var(--border-default) / <alpha-value>)',
          strong: 'rgb(var(--border-strong) / <alpha-value>)',
          focus: 'rgb(var(--border-focus) / <alpha-value>)',
        },
        overlay: 'rgb(var(--overlay-backdrop) / <alpha-value>)',
        feedback: {
          accent: {
            bg: 'rgb(var(--feedback-accent-bg) / <alpha-value>)',
            fg: 'rgb(var(--feedback-accent-fg) / <alpha-value>)',
            border: 'rgb(var(--feedback-accent-border) / <alpha-value>)',
          },
          success: {
            bg: 'rgb(var(--feedback-success-bg) / <alpha-value>)',
            fg: 'rgb(var(--feedback-success-fg) / <alpha-value>)',
            border: 'rgb(var(--feedback-success-border) / <alpha-value>)',
          },
          warning: {
            bg: 'rgb(var(--feedback-warning-bg) / <alpha-value>)',
            fg: 'rgb(var(--feedback-warning-fg) / <alpha-value>)',
            border: 'rgb(var(--feedback-warning-border) / <alpha-value>)',
          },
          danger: {
            bg: 'rgb(var(--feedback-danger-bg) / <alpha-value>)',
            fg: 'rgb(var(--feedback-danger-fg) / <alpha-value>)',
            border: 'rgb(var(--feedback-danger-border) / <alpha-value>)',
            solid: 'rgb(var(--feedback-danger-solid) / <alpha-value>)',
          },
          info: {
            bg: 'rgb(var(--feedback-info-bg) / <alpha-value>)',
            fg: 'rgb(var(--feedback-info-fg) / <alpha-value>)',
            border: 'rgb(var(--feedback-info-border) / <alpha-value>)',
          },
          neutral: {
            bg: 'rgb(var(--feedback-neutral-bg) / <alpha-value>)',
            fg: 'rgb(var(--feedback-neutral-fg) / <alpha-value>)',
            border: 'rgb(var(--feedback-neutral-border) / <alpha-value>)',
          },
        },
        tag: {
          purple: {
            bg: 'rgb(var(--tag-purple-bg) / <alpha-value>)',
            fg: 'rgb(var(--tag-purple-fg) / <alpha-value>)',
            border: 'rgb(var(--tag-purple-border) / <alpha-value>)',
          },
          indigo: {
            bg: 'rgb(var(--tag-indigo-bg) / <alpha-value>)',
            fg: 'rgb(var(--tag-indigo-fg) / <alpha-value>)',
            border: 'rgb(var(--tag-indigo-border) / <alpha-value>)',
          },
          cyan: {
            bg: 'rgb(var(--tag-cyan-bg) / <alpha-value>)',
            fg: 'rgb(var(--tag-cyan-fg) / <alpha-value>)',
            border: 'rgb(var(--tag-cyan-border) / <alpha-value>)',
          },
          pink: {
            bg: 'rgb(var(--tag-pink-bg) / <alpha-value>)',
            fg: 'rgb(var(--tag-pink-fg) / <alpha-value>)',
            border: 'rgb(var(--tag-pink-border) / <alpha-value>)',
          },
          teal: {
            bg: 'rgb(var(--tag-teal-bg) / <alpha-value>)',
            fg: 'rgb(var(--tag-teal-fg) / <alpha-value>)',
            border: 'rgb(var(--tag-teal-border) / <alpha-value>)',
          },
          orange: {
            bg: 'rgb(var(--tag-orange-bg) / <alpha-value>)',
            fg: 'rgb(var(--tag-orange-fg) / <alpha-value>)',
            border: 'rgb(var(--tag-orange-border) / <alpha-value>)',
          },
          softred: {
            bg: 'rgb(var(--tag-softred-bg) / <alpha-value>)',
            fg: 'rgb(var(--tag-softred-fg) / <alpha-value>)',
            border: 'rgb(var(--tag-softred-border) / <alpha-value>)',
          },
        },
        azure: {
          50: '#f0f8ff',
          100: '#dbf0ff',
          200: '#b3e0ff',
          300: '#8cd1ff',
          400: '#57bcff',
          500: '#1aa2ff', // Azul primário padrão
          600: '#0093f1',
          700: '#0076cc',
          800: '#005899',
          900: '#003b66',
          950: '#00233d',
        },
        gold: {
          50: '#f0f8ff',
          100: '#dbf0ff',
          200: '#b3e0ff',
          300: '#8cd1ff',
          400: '#57bcff',
          500: '#1aa2ff', // Azul primário (anteriormente dourado)
          600: '#0093f1',
          700: '#0076cc',
          800: '#005899',
          900: '#003b66',
          950: '#00233d',
        },
      },
      fontFamily: {
        sans: ['Montserrat', 'system-ui', 'sans-serif'],
        display: ['Montserrat', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'soft-lg': '0 10px 40px -15px rgba(0, 0, 0, 0.1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      gridTemplateColumns: {
        24: 'repeat(24, minmax(0, 1fr))',
      },
      gridColumn: {
        'span-4': 'span 4 / span 4',
        'span-5': 'span 5 / span 5',
        'span-6': 'span 6 / span 6',
        'span-8': 'span 8 / span 8',
        'span-10': 'span 10 / span 10',
        'span-12': 'span 12 / span 12',
        'span-13': 'span 13 / span 13',
        'span-16': 'span 16 / span 16',
        'span-24': 'span 24 / span 24',
      },
    },
  },
  plugins: [],
};
