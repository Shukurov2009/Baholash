const colors = require("tailwindcss/colors");

/** Neytral palitra (slate) + bitta urg'u rangi (teal). Dark rejim — "class" orqali. */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: { brand: colors.teal },
      boxShadow: { soft: "0 4px 24px -6px rgb(15 23 42 / 0.12)" },
    },
  },
  plugins: [],
};
