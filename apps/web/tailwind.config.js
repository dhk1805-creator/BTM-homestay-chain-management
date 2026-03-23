/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#e6f1fb',
          100: '#b5d4f4',
          500: '#185FA5',
          600: '#0C447C',
          700: '#093360',
        },
        success: { 500: '#1D9E75', 600: '#0F6E56' },
        warning: { 500: '#BA7517', 600: '#854F0B' },
        danger: { 500: '#E24B4A', 600: '#A32D2D' },
      },
    },
  },
  plugins: [],
};
