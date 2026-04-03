/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        commute: {
          bg: '#0a0a0a',
          surface: '#1a1a2e',
          primary: '#00d4aa',
          secondary: '#16213e',
          accent: '#0f3460',
          text: '#e0e0e0',
          muted: '#888888',
          danger: '#e74c3c',
          warning: '#f39c12',
          success: '#2ecc71',
        },
      },
    },
  },
  plugins: [],
};
