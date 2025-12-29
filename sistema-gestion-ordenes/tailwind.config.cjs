/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{astro,html,js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#1e3a8a",
          light: "#3b82f6",
          dark: "#1e40af",
          black: "#000000",
          white: "#FFFFFF"
        }
      }
    },
  },
  plugins: []
};



