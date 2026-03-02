/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sora: ['Sora', 'sans-serif'],
        dm: ['DM Sans', 'sans-serif'],
      },
      colors: {
        bg:      '#F7F5F2',
        surface: '#FFFFFF',
        border:  '#E8E2D9',
        text1:   '#1C1917',
        text2:   '#6B6460',
        text3:   '#A8A29E',
        accent:  '#4F63D2',
      },
      boxShadow: {
        'soft-sm': '0 1px 3px rgba(28,25,23,.06), 0 1px 2px rgba(28,25,23,.04)',
        'soft-md': '0 4px 12px rgba(28,25,23,.08), 0 2px 4px rgba(28,25,23,.04)',
        'soft-lg': '0 12px 32px rgba(28,25,23,.10), 0 4px 8px rgba(28,25,23,.06)',
        'soft-xl': '0 24px 64px rgba(28,25,23,.12), 0 8px 16px rgba(28,25,23,.06)',
      },
      animation: {
        'fade-up':   'fadeUp 0.4s ease both',
        'fade-in':   'fadeIn 0.3s ease both',
        'scale-in':  'scaleIn 0.2s ease both',
        'slide-in':  'slideIn 0.3s ease both',
        'shimmer':   'shimmer 2s linear infinite',
        'pulse-soft':'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeUp:    { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        fadeIn:    { from: { opacity: 0 }, to: { opacity: 1 } },
        scaleIn:   { from: { opacity: 0, transform: 'scale(0.95)' }, to: { opacity: 1, transform: 'scale(1)' } },
        slideIn:   { from: { opacity: 0, transform: 'translateX(-12px)' }, to: { opacity: 1, transform: 'translateX(0)' } },
        shimmer:   { from: { backgroundPosition: '-200% 0' }, to: { backgroundPosition: '200% 0' } },
        pulseSoft: { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.6 } },
      },
    },
  },
  plugins: [],
}