import type { Config } from 'tailwindcss'

/**
 * SARNIES DESIGN SYSTEM v1.2
 * Tailwind Configuration
 *
 * Consumes CSS variables from design-tokens.css
 */

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      /* ========================================
         COLORS
         ======================================== */
      colors: {
        // Core
        black: 'var(--color-black)',
        white: 'var(--color-white)',
        cream: 'var(--color-cream)',

        // Stone palette (primary neutrals)
        stone: {
          50: 'var(--color-stone-50)',
          100: 'var(--color-stone-100)',
          200: 'var(--color-stone-200)',
          300: 'var(--color-stone-300)',
          400: 'var(--color-stone-400)',
          500: 'var(--color-stone-500)',
          600: 'var(--color-stone-600)',
          700: 'var(--color-stone-700)',
          800: 'var(--color-stone-800)',
          900: 'var(--color-stone-900)',
        },

        // Gray (alias for stone)
        gray: {
          50: 'var(--color-gray-50)',
          100: 'var(--color-gray-100)',
          200: 'var(--color-gray-200)',
          300: 'var(--color-gray-300)',
          400: 'var(--color-gray-400)',
          500: 'var(--color-gray-500)',
          600: 'var(--color-gray-600)',
          700: 'var(--color-gray-700)',
          800: 'var(--color-gray-800)',
          900: 'var(--color-gray-900)',
        },

        // Accent (amber/orange)
        accent: {
          DEFAULT: 'var(--color-accent)',
          light: 'var(--color-accent-light)',
          hover: 'var(--color-accent-hover)',
          pressed: 'var(--color-accent-pressed)',
          muted: 'var(--color-accent-muted)',
          subtle: 'var(--color-accent-subtle)',
        },

        // Amber
        amber: {
          50: 'var(--color-amber-50)',
          100: 'var(--color-amber-100)',
          500: 'var(--color-amber-500)',
          600: 'var(--color-amber-600)',
        },

        // Status colors
        success: {
          DEFAULT: 'var(--color-success)',
          light: 'var(--color-success-light)',
        },
        warning: {
          DEFAULT: 'var(--color-warning)',
          light: 'var(--color-warning-light)',
        },
        error: {
          DEFAULT: 'var(--color-error)',
          light: 'var(--color-error-light)',
        },
        info: {
          DEFAULT: 'var(--color-info)',
          light: 'var(--color-info-light)',
        },

        // Employee brand
        mustard: {
          DEFAULT: 'var(--color-mustard)',
          dark: 'var(--color-mustard-dark)',
          muted: 'var(--color-mustard-muted)',
        },

        // Semantic backgrounds
        bg: {
          primary: 'var(--color-bg-primary)',
          secondary: 'var(--color-bg-secondary)',
          inverse: 'var(--color-bg-inverse)',
        },

        // Semantic surfaces
        surface: {
          DEFAULT: 'var(--color-surface)',
          elevated: 'var(--color-surface-elevated)',
          muted: 'var(--color-surface-muted)',
          subtle: 'var(--color-surface-subtle)',
        },

        // Semantic text
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          tertiary: 'var(--color-text-tertiary)',
          muted: 'var(--color-text-muted)',
          inverse: 'var(--color-text-inverse)',
        },

        // Semantic borders
        border: {
          DEFAULT: 'var(--color-border)',
          light: 'var(--color-border-light)',
          muted: 'var(--color-border-muted)',
          error: 'var(--color-border-error)',
          focus: 'var(--color-border-focus)',
        },
      },

      /* ========================================
         TYPOGRAPHY
         ======================================== */
      fontFamily: {
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
      },

      fontSize: {
        'xs': 'var(--text-xs)',
        'sm': 'var(--text-sm)',
        'base': 'var(--text-base)',
        'md': 'var(--text-md)',
        'lg': 'var(--text-lg)',
        'xl': 'var(--text-xl)',
        '2xl': 'var(--text-2xl)',
        '3xl': 'var(--text-3xl)',
        '4xl': 'var(--text-4xl)',
      },

      fontWeight: {
        normal: 'var(--font-normal)',
        medium: 'var(--font-medium)',
        semibold: 'var(--font-semibold)',
      },

      letterSpacing: {
        tight: 'var(--tracking-tight)',
        normal: 'var(--tracking-normal)',
        wide: 'var(--tracking-wide)',
        wider: 'var(--tracking-wider)',
        widest: 'var(--tracking-widest)',
      },

      lineHeight: {
        none: 'var(--leading-none)',
        tight: 'var(--leading-tight)',
        snug: 'var(--leading-snug)',
        normal: 'var(--leading-normal)',
        relaxed: 'var(--leading-relaxed)',
      },

      /* ========================================
         SPACING
         ======================================== */
      spacing: {
        '0': 'var(--space-0)',
        '1': 'var(--space-1)',
        '2': 'var(--space-2)',
        '3': 'var(--space-3)',
        '4': 'var(--space-4)',
        '5': 'var(--space-5)',
        '6': 'var(--space-6)',
        '8': 'var(--space-8)',
        '10': 'var(--space-10)',
        '12': 'var(--space-12)',
        '16': 'var(--space-16)',
        '20': 'var(--space-20)',
        '24': 'var(--space-24)',
      },

      /* ========================================
         LAYOUT
         ======================================== */
      maxWidth: {
        container: 'var(--container-max)',
        content: 'var(--container-content)',
        narrow: 'var(--container-narrow)',
      },

      height: {
        header: 'var(--header-height)',
        nav: 'var(--nav-height)',
      },

      /* ========================================
         BORDERS
         ======================================== */
      borderRadius: {
        none: 'var(--radius-none)',
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius-md)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        full: 'var(--radius-full)',
      },

      borderColor: {
        DEFAULT: 'var(--border-color)',
      },

      /* ========================================
         SHADOWS
         ======================================== */
      boxShadow: {
        sm: 'var(--shadow-sm)',
        DEFAULT: 'var(--shadow-md)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
      },

      /* ========================================
         TRANSITIONS
         ======================================== */
      transitionDuration: {
        fast: 'var(--duration-fast)',
        DEFAULT: 'var(--duration-normal)',
        slow: 'var(--duration-slow)',
      },

      /* ========================================
         Z-INDEX
         ======================================== */
      zIndex: {
        base: 'var(--z-base)',
        dropdown: 'var(--z-dropdown)',
        sticky: 'var(--z-sticky)',
        fixed: 'var(--z-fixed)',
        'modal-backdrop': 'var(--z-modal-backdrop)',
        modal: 'var(--z-modal)',
        toast: 'var(--z-toast)',
      },

      /* ========================================
         ANIMATIONS
         ======================================== */
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
      },
      animation: {
        'fade-in': 'fade-in var(--duration-normal) var(--ease-default)',
        'slide-up': 'slide-up var(--duration-slow) var(--ease-default)',
        shimmer: 'shimmer 2s infinite',
      },
    },
  },
  plugins: [],
}

export default config
