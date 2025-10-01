import type { Config } from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: '',
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
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          light: 'hsl(var(--primary-light))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
          light: 'hsl(var(--success-light))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
          light: 'hsl(var(--warning-light))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        'emotion-happy': 'hsl(var(--emotion-happy))',
        'emotion-need': 'hsl(var(--emotion-need))',
        'emotion-urgent': 'hsl(var(--emotion-urgent))',
      },
      backgroundImage: {
        'gradient-primary': 'var(--gradient-primary)',
        'gradient-hero': 'var(--gradient-hero)',
        'gradient-card': 'var(--gradient-card)',
      },
      boxShadow: {
        soft: 'var(--shadow-soft)',
        medium: 'var(--shadow-medium)',
        strong: 'var(--shadow-strong)',
      },
      fontFamily: {
        'cherry-bomb': ['Cherry Bomb One', 'cursive'],
      },
      transitionTimingFunction: {
        smooth: 'var(--transition-smooth)',
        bounce: 'var(--transition-bounce)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
        'pulse-success': {
          '0%, 100%': {
            boxShadow: '0 0 0 0 rgba(34, 197, 94, 0)',
          },
          '50%': {
            boxShadow: '0 0 40px 8px rgba(34, 197, 94, 0.6)',
          },
        },
        'pulse-warning': {
          '0%, 100%': {
            boxShadow: '0 0 0 0 rgba(234, 179, 8, 0)',
          },
          '50%': {
            boxShadow: '0 0 40px 8px rgba(234, 179, 8, 0.6)',
          },
        },
        'pulse-urgent': {
          '0%, 100%': {
            boxShadow: '0 0 0 0 rgba(239, 68, 68, 0)',
          },
          '50%': {
            boxShadow: '0 0 40px 8px rgba(239, 68, 68, 0.6)',
          },
        },
        'toast-progress': {
          '0%': {
            width: '100%',
          },
          '100%': {
            width: '0%',
          },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'toast-progress': 'toast-progress 4s ease-out forwards',
        'pulse-success': 'pulse-success 2s ease-in-out',
        'pulse-warning': 'pulse-warning 2s ease-in-out',
        'pulse-urgent': 'pulse-urgent 2s ease-in-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;
