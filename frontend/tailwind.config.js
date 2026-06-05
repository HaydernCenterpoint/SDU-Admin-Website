/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary:     '#CC0000',
        'primary-dark': '#990000',
        'primary-light': '#FF1A1A',
        secondary:   '#0099DD',
        accent:      '#FFD700',
        navy:        '#1B365D',
        destructive: '#DC2626',
        surface:     '#F5F6FA',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      spacing: {
        68: '17rem',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
        '6xl': '3rem',
      },
      backgroundImage: {
        'gradient-sdo': 'linear-gradient(135deg, #B80010 0%, #CC0000 50%, #990000 100%)',
        'gradient-navy': 'linear-gradient(135deg, #1B365D 0%, #0099DD 100%)',
      },
      boxShadow: {
        'card':    '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        'card-md': '0 4px 12px -2px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
        'red':     '0 4px 14px -3px rgb(204 0 0 / 0.35)',
      },
    },
  },
  plugins: [],
}
