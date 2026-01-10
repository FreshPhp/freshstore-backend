/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        background: "#0a0a0a",
        foreground: "#f5f5f5",
        border: "rgba(255,255,255,0.1)",
        primary: "#7c3aed",
      },
      fontFamily: {
        body: ["Manrope", "sans-serif"],
        heading: ["Unbounded", "sans-serif"],
      },
    },
  },
  plugins: [],
};
