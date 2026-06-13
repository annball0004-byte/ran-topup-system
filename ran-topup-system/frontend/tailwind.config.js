/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'ran-red': {
          DEFAULT: '#C41E3A',
          50: '#FEE2E5',
          100: '#FECDD1',
          200: '#FCA5B1',
          300: '#F97088',
          400: '#F43F5E',
          500: '#C41E3A',
          600: '#A1182E',
          700: '#7F1224',
          800: '#5C0D1A',
          900: '#3A0810',
        },
        'ran-dark': {
          DEFAULT: '#0D0D0F',
          50: '#1A1A1F',
          100: '#16161A',
          200: '#121215',
          300: '#0D0D0F',
        }
      },
      fontFamily: {
        'display': ['Orbitron', 'sans-serif'],
        'body': ['Rajdhani', 'sans-serif'],
        'thai': ['Noto Sans Thai', 'sans-serif'],
      },
      animation: {
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px #C41E3A, 0 0 10px #C41E3A' },
          '100%': { boxShadow: '0 0 20px #C41E3A, 0 0 30px #C41E3A' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        }
      }
    },
  },
  plugins: [],
}
