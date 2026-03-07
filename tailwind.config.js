/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        coral: '#FF4500',
        'coral-bright': '#FF6B35',
        saffron: '#FFB800',
        'saffron-light': '#FFD166',
        terracotta: '#D63B1F',
        cream: '#FDF5E8',
        'cream-deep': '#F7EDD8',
        espresso: '#160F08',
        'espresso-mid': '#2C1A0E',
        blush: '#FADDCA',
        sage: '#1E7A4A',
        cobalt: '#0047FF',
        electric: '#00D4FF',
        lime: '#C8F54A',
        'warm-white': '#FFFBF4',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        ui: ['Syne', 'sans-serif'],
        body: ['Fraunces', 'serif'],
        sans: ['Fraunces', 'serif'],
      },
      borderRadius: {
        '2xl': '18px',
        '3xl': '24px',
        '4xl': '32px',
      },
      boxShadow: {
        'warm': '0 24px 80px rgba(22, 15, 8, 0.1), 0 4px 12px rgba(22, 15, 8, 0.05)',
        'coral': '0 24px 48px rgba(255, 69, 0, 0.35)',
        'soft': '0 8px 32px rgba(255, 69, 0, 0.12)',
      },
    },
  },
  plugins: [],
};
