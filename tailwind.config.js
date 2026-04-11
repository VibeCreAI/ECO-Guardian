/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './App.tsx',
    './components/**/*.{ts,tsx}',
    './store/**/*.{ts,tsx}',
    './constants.ts',
  ],
  theme: {
    extend: {
      keyframes: {
        shine: {
          '100%': { transform: 'translateX(120%)' },
        },
      },
    },
  },
  plugins: [],
};
