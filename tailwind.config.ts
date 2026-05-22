import type { Config } from 'tailwindcss';

const NEON = ['pink', 'orange', 'yellow', 'cyan', 'green'] as const;

export default {
  content: ['./src/**/*.{astro,ts,tsx,jsx,js}'],
  safelist: [
    ...NEON.map(c => `text-neon-${c}`),
    ...NEON.map(c => `border-neon-${c}`),
    ...NEON.map(c => `bg-neon-${c}`),
    ...NEON.map(c => `shadow-neon-${c}`),
  ],
  theme: {
    extend: {
      colors: {
        bg: { deep: '#0a0518', mid: '#2a0a4a' },
        neon: {
          pink: '#ff3b8a',
          orange: '#ff8a3d',
          yellow: '#ffeb3b',
          cyan: '#00e5ff',
          green: '#7cff5a',
        },
        ink: '#f8f4ff',
      },
      fontFamily: {
        display: ['"Bebas Neue"', 'Impact', 'sans-serif'],
        script: ['Pacifico', 'cursive'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'neon-pink': '0 0 12px #ff3b8a, 0 0 30px #ff3b8a55',
        'neon-orange': '0 0 12px #ff8a3d, 0 0 30px #ff8a3d55',
        'neon-yellow': '0 0 12px #ffeb3b, 0 0 30px #ffeb3b55',
        'neon-cyan': '0 0 12px #00e5ff, 0 0 30px #00e5ff55',
        'neon-green': '0 0 12px #7cff5a, 0 0 30px #7cff5a55',
      },
    },
  },
} satisfies Config;
