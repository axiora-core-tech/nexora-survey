/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
         accent: '#10B981',
        'accent-light': '#D1FAE5',
         dark: { DEFAULT: '#0A0A0A', 50: '#111111', 100: '#1A1A1A', 200: '#2A2A2A', 300: '#3A3A3A' },
         muted: '#6B7280',
         soft: '#F3F4F6',
      },
      fontFamily: { sans: ['Outfit', 'system-ui', 'sans-serif'] },
      boxShadow: {
        'glow': '0 0 40px rgba(16,185,129,0.15)',
        'glow-lg': '0 0 80px rgba(16,185,129,0.2)',
        'up': '0 -4px 20px rgba(0,0,0,0.05)',
      },
    },
  },
  plugins: [],
};
