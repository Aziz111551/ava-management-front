/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e6f2f8',
          100: '#c8e2ee',
          200: '#a2cddd',
          300: '#7cb8cc',
          400: '#4f93ac',
          500: '#1e4a66',
          600: '#1b425c',
          700: '#1a3a52',
          800: '#16384d',
          900: '#0f2940',
        },
        accent: {
          cyan: '#06b6d4',
          blue: '#3b82f6',
          light: '#22d3ee',
        },
      },
      boxShadow: {
        soft: '0 12px 32px rgba(6, 22, 34, 0.35)',
      },
    },
  },
  plugins: [],
}
