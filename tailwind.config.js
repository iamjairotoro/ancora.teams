/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        crema: { DEFAULT: '#F5F0E6', dark: '#E0D8C8' },
        ancora: { DEFAULT: '#1A1A1A' },
        navy: '#1A1A1A',
        gold: '#C9A14A',
      },
      fontFamily: {
        sans: ['ui-rounded', '-apple-system', '"SF Pro Rounded"', '"SF Pro Display"', 'system-ui', 'sans-serif'],
        script: ['"Dancing Script"', 'cursive'],
      },
    },
  },
  plugins: [],
}
