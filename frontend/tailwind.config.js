/** @type {import('tailwindcss').Config} */

// Colours are CSS variables defined in src/features/haunting/palettes.ts so the
// whole UI can switch (and be tweened) between the Elegant and Haunted looks.
// A unit test asserts that these names match the palette tokens.
const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
const v = (token) => `rgb(var(--c-${token}) / <alpha-value>)`;
const scale = (prefix, extra = {}) => ({
  ...Object.fromEntries(STEPS.map((s) => [s, v(`${prefix}-${s}`)])),
  ...extra,
});

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: scale('navy', { 950: v('navy-950') }),
        purple: scale('purple'),
        amber: scale('amber'),
        ivory: { DEFAULT: v('ivory') },
        accent: { DEFAULT: v('accent'), hover: v('accent-hover') },
        'on-accent': v('on-accent'),
        cta: { DEFAULT: v('cta'), hover: v('cta-hover') },
        header: v('header'),
        paper: v('paper'),
        ink: v('ink'),
        success: v('success'),
        danger: v('danger'),
        info: v('info'),
        warning: v('warning'),
        blood: '#9D2028',
        sick: '#728C74',
      },
      fontFamily: {
        // Newsreader in Elegant, Playfair Display in Haunted (set per experience in globals.css)
        heading: ['var(--font-heading)', 'Georgia', 'serif'],
        body: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      spacing: {
        18: '4.5rem',
        88: '22rem',
        128: '32rem',
      },
      boxShadow: {
        glow: '0 0 20px rgb(var(--c-amber-600) / 0.3)',
        'glow-lg': '0 0 40px rgb(var(--c-amber-600) / 0.4)',
      },
      animation: {
        float: 'float 3s ease-in-out infinite',
        glow: 'glow 2s ease-in-out infinite alternate',
        mist: 'mist 20s linear infinite',
        'fade-in': 'fadeIn 300ms ease-out',
        'slide-up': 'slideUp 400ms ease-out',
        'scale-in': 'scaleIn 300ms ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          from: { boxShadow: '0 0 10px rgb(var(--c-amber-600) / 0.3)' },
          to: { boxShadow: '0 0 20px rgb(var(--c-amber-600) / 0.6)' },
        },
        mist: {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(100%)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};
