/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.tsx',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // These CSS variables are set by the ThemeProvider
        background: 'var(--color-background)',
        surface: 'var(--color-surface)',
        'surface-variant': 'var(--color-surface-variant)',
        primary: 'var(--color-primary)',
        'primary-container': 'var(--color-primary-container)',
        'on-primary': 'var(--color-on-primary)',
        'on-background': 'var(--color-on-background)',
        'on-surface': 'var(--color-on-surface)',
        accent: 'var(--color-accent)',
        warmup: 'var(--color-warmup)',
        infinite: 'var(--color-infinite)',
        favorite: 'var(--color-favorite)',
        error: 'var(--color-error)',
      },
      borderRadius: {
        card: '12px',
        badge: '8px',
        button: '24px',
      },
    },
  },
  plugins: [],
};
