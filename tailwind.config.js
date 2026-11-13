/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: { rose: '#ff8fb0', saffron: '#f0b54a', ink: '#eef1f4' },
      fontFamily: { display: ['Unbounded', 'system-ui', 'sans-serif'] },
      keyframes: {
        rise: { '0%': { opacity: '0', transform: 'translateY(0.6em) scale(.8)', filter: 'blur(10px)' }, '100%': { opacity: '1', transform: 'none', filter: 'blur(0)' } },
        wave: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-0.07em)' } },
        glow: { '0%,100%': { filter: 'drop-shadow(0 0 .08em rgba(255,143,176,.35))' }, '50%': { filter: 'drop-shadow(0 0 .22em rgba(255,214,140,.85))' } },
        twinkle: { '0%,100%': { opacity: '0', transform: 'scale(.3) rotate(0)' }, '50%': { opacity: '1', transform: 'scale(1) rotate(45deg)' } },
        floatup: { '0%': { transform: 'translateY(0) scale(.8)', opacity: '0' }, '15%': { opacity: '1' }, '100%': { transform: 'translateY(-110vh) scale(1.2)', opacity: '0' } },
        sheen: { '0%': { transform: 'translateX(-130%) skewX(-18deg)' }, '60%,100%': { transform: 'translateX(330%) skewX(-18deg)' } },
      },
      animation: {
        rise: 'rise .9s cubic-bezier(.2,.8,.2,1) both',
        wave: 'wave 3.2s ease-in-out infinite',
        glow: 'glow 3.2s ease-in-out infinite',
        twinkle: 'twinkle 2.6s ease-in-out infinite',
        sheen: 'sheen 4.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
