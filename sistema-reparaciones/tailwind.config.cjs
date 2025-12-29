/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{astro,html,js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#1e3a8a", // Azul oscuro principal (header) IDocStore
          light: "#3b82f6", // Azul brillante para botones interactivos
          dark: "#1e40af", // Azul oscuro más intenso
          black: "#000000",
          white: "#FFFFFF"
        }
      }
    },
  },
  plugins: []
};

