import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#FF6B6B',      // Soft Bright Coral
        accent: '#FFD93D',       // Golden Yellow
        tertiary: '#6BCB77',     // Fresh Mint

        background: {
          main: '#F8F9FA',       // Light Gray
          secondary: '#FFF0F3',  // Very Soft Pink
        },

        text: {
          primary: '#212529',    // Deep Charcoal
          secondary: '#6C757D',  // Medium Gray
        },
      },
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
      },
      fontSize: {
        hero: ['4rem', { lineHeight: '1.1', letterSpacing: '-0.5px' }],      // 64px
        section: ['2rem', { lineHeight: '1.3' }],                             // 32px
        body: ['1.125rem', { lineHeight: '1.6' }],                            // 18px
        small: ['0.875rem', { lineHeight: '1.4' }],                           // 14px
      },
      fontWeight: {
        regular: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
      },
      letterSpacing: {
        tight: '-0.5px',
        tighter: '-1px',
      },
    },
  },
  plugins: [],
}

export default config
