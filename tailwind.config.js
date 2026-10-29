/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
    "./node_modules/flowbite/**/*.js",
    "./node_modules/flowbite-datepicker/**/*.js"
  ],
  theme: {
    fontFamily: {
      // Si también quieres que las fuentes sean temáticas, puedes aplicar el mismo patrón:
      display: ['var(--theme-font-display)', 'Blinker', 'IBM\\ Plex\\ Mono', 'Menlo', 'monospace'],
      body: ['var(--theme-font-body)', 'Blinker', 'IBM\\ Plex\\ Mono', 'Menlo', 'monospace']
    },
    extend: {
      colors: {
        primary: {
          50: 'rgb(var(--theme-primary-50) / <alpha-value>)',   // Antes '#00add3'
          100: 'rgb(var(--theme-primary-100) / <alpha-value>)', // Antes '#2d58a7'
        },
        secondary: {
          50: 'rgb(var(--theme-secondary-50) / <alpha-value>)',  // Antes '#dde6f6'
          100: 'rgb(var(--theme-secondary-100) / <alpha-value>)',// Antes '#14274a'
          200: 'rgb(var(--theme-secondary-200) / <alpha-value>)',// Antes '#0c1c38'
          300: 'rgb(var(--theme-secondary-300) / <alpha-value>)',// Antes '#182740'
          400: 'rgb(var(--theme-secondary-400) / <alpha-value>)',
          500: 'rgb(var(--theme-secondary-500) / <alpha-value>)'
        },
        tertiary: {
          50: 'rgb(var(--theme-tertiary-50) / <alpha-value>)', //BG color for dark theme
          100: 'rgb(var(--theme-tertiary-100) / <alpha-value>)' //BG color for dark theme
        },
        // Semantic roles backed by theme tokens in src/styles.css (light + dark). Use these
        // instead of fixed palette colors (gray-*, red-*...) — see docs/theme-tokens.md.
        // Full colors, not channels: opacity modifiers (/50) don't apply to them.
        content: {
          DEFAULT: 'var(--theme-default-text)',
          secondary: 'var(--theme-text-secondary)',
          muted: 'var(--theme-text-muted)',
        },
        surface: {
          DEFAULT: 'var(--card-bg)',
          input: 'var(--theme-input-bg)',
          muted: 'var(--theme-surface-muted)',
          inset: 'var(--card-inset-bg)',
          selected: 'var(--card-selected-bg)',
        },
        line: {
          DEFAULT: 'var(--card-border)',
          input: 'var(--theme-input-border)',
        },
        // Text/icons on primary-colored surfaces (filled chips, active steps, selected options).
        'on-primary': 'var(--theme-primary-text)',
        skeleton: 'var(--theme-skeleton)',
        overlay: 'var(--theme-overlay)',
        focus: 'var(--theme-focus-ring)',
        danger: { DEFAULT: 'var(--theme-danger-text)', soft: 'var(--theme-danger-bg)', border: 'var(--theme-danger-border)' },
        success: { DEFAULT: 'var(--theme-success-text)', soft: 'var(--theme-success-bg)', border: 'var(--theme-success-border)' },
        warning: { DEFAULT: 'var(--theme-warning-text)', soft: 'var(--theme-warning-bg)', border: 'var(--theme-warning-border)' },
        info: { DEFAULT: 'var(--theme-info-text)', soft: 'var(--theme-info-bg)', border: 'var(--theme-info-border)' },
      },
      transitionProperty: {
        width: "width"
      },
      transitionDuration: {
        '0': '0ms',
        '2000': '2000ms',
        '2500': '2500ms',
        '3000': '3000ms',
      },
      keyframes: {
        fadeInOut: {
          '0%, 100%': { opacity: 0 },
          '50%': { opacity: 1 },
        },
        stepIn: {
          '0%': { opacity: 0, transform: 'translateY(6px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      },
      animation: {
        fadeInOut: 'fadeInOut 5s ease-in-out infinite',
        stepIn: 'stepIn 0.3s ease-out',
      },
      gridTemplateColumns:
        {
          '16': 'repeat(16, minmax(0, 1fr))',
          '60/40': '60% 40%',
          '80/20': '80% 20%',
          '40/60': '40% 60%',
          '25/75': '25% 75%',
          '20/80': '20% 80%',
          '10/90': '10% 90%'
        },
      gridTemplateRows:
        {
          '60/40': '60% 40%',
          '80/20': '80% 20%',
          '20/80': '20% 80%',
          '10/90': '10% 90%'
        },
      maxHeight: {
        '3/4': '75%',
      },
    }
  },
  plugins: [
    require('flowbite/plugin')
  ],
  darkMode: 'class' // Esto es compatible con nuestro enfoque de clase por tema
}
