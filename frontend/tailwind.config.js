/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Custom color palette for dark premium feel
        darkBg: '#0f0c1b',
        darkCard: '#18142c',
        darkBorder: '#29234d',
        accentViolet: '#7c3aed',
        accentPink: '#db2777',
      }
    },
  },
  plugins: [],
}
