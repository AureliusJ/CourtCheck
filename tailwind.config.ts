import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#EAE5DB',
          text: '#222220',
          muted: '#7A766F',
          cream: '#F8F6F1',
          terracotta: '#BC5F48',
          'terracotta-dark': '#A64F3A',
          sage: '#7C8B70',
          'sage-dark': '#6A795F',
          amber: '#D49A4C',
          blue: '#6B8296',
          dusk: '#4A5D70',
          gray: '#A8A49C',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Playfair Display', 'serif'],
      },
      borderRadius: {
        court: '12px',
        card: '20px',
        modal: '24px',
      },
    },
  },
  plugins: [],
};

export default config;