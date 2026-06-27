/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./layouts/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./context/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#0C1F32',    // New Dark Navy
          primary: '#1E3A8A', // Standard Blue fallback
          teal: '#00A9C7',    // New Teal Blue Accent
          grey: '#64748B',    // Metallic Grey
          light: '#F8FAFC',   // Light Background
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Playfair Display', 'serif'],
        luxury: ['Cormorant Garamond', 'serif'],
      },
      boxShadow: {
        'soft': '0 10px 40px -10px rgba(0,0,0,0.08)',
        'glow': '0 0 20px rgba(0, 169, 199, 0.3)',
      }
    },
  },
  plugins: [],
}
