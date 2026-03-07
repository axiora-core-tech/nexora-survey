/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Lyssna-inspired warm green
        green: { 50:'#ECFDF5', 100:'#D1FAE5', 200:'#A7F3D0', 300:'#6EE7B7', 400:'#34D399', 500:'#10B981', 600:'#059669', 700:'#047857', 800:'#065F46', 900:'#064E3B' },
        // Warm coral accent
        coral: { 50:'#FFF5F2', 100:'#FFE8E0', 200:'#FFCBB8', 300:'#FFA98A', 400:'#FF7A55', 500:'#FF5733', 600:'#E64525' },
        // Soft purple for variety
        plum: { 50:'#F5F0FF', 100:'#E8DEFF', 400:'#A78BFA', 500:'#8B5CF6' },
        // Neutrals — warm gray, not cold
        n: { 0:'#FFFFFF', 50:'#FAFAF9', 100:'#F5F5F4', 200:'#E7E5E4', 300:'#D6D3D1', 400:'#A8A29E', 500:'#78716C', 600:'#57534E', 700:'#44403C', 800:'#292524', 900:'#1C1917', 950:'#0C0A09' },
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '20px',
        '4xl': '24px',
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(0,0,0,0.04)',
        'card': '0 2px 12px rgba(0,0,0,0.06)',
        'card-hover': '0 8px 24px rgba(0,0,0,0.08)',
        'lg': '0 12px 36px rgba(0,0,0,0.1)',
        'green': '0 4px 16px rgba(16,185,129,0.2)',
        'green-lg': '0 8px 24px rgba(16,185,129,0.25)',
      },
      animation: {
        'in': 'fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) both',
        'in-delay-1': 'fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) 0.1s both',
        'in-delay-2': 'fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) 0.2s both',
        'in-delay-3': 'fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) 0.3s both',
        'pop': 'pop 0.35s cubic-bezier(0.16,1,0.3,1) both',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16,1,0.3,1) both',
        'float': 'float 5s ease-in-out infinite',
        'float-slow': 'float 7s ease-in-out infinite',
        'pulse-soft': 'pulseSoft 2.5s ease-in-out infinite',
        'draw': 'draw 0.6s ease-out 0.2s both',
        'confetti': 'confetti 1s ease-out both',
      },
      keyframes: {
        fadeUp: { '0%': { opacity:'0', transform:'translateY(12px)' }, '100%': { opacity:'1', transform:'translateY(0)' } },
        pop: { '0%': { opacity:'0', transform:'scale(0.9)' }, '100%': { opacity:'1', transform:'scale(1)' } },
        slideUp: { '0%': { opacity:'0', transform:'translateY(20px)' }, '100%': { opacity:'1', transform:'translateY(0)' } },
        float: { '0%,100%': { transform:'translateY(0)' }, '50%': { transform:'translateY(-8px)' } },
        pulseSoft: { '0%,100%': { opacity:'1' }, '50%': { opacity:'0.5' } },
        draw: { '0%': { strokeDashoffset:'100' }, '100%': { strokeDashoffset:'0' } },
        confetti: { '0%': { transform:'translateY(0) rotate(0) scale(0)', opacity:'0' }, '30%': { opacity:'1', transform:'translateY(-20px) rotate(90deg) scale(1)' }, '100%': { transform:'translateY(50px) rotate(360deg) scale(0.3)', opacity:'0' } },
      },
    },
  },
  plugins: [],
};
