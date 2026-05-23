/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        switchtec: {
          ink: "#2D2D2D",
          forest: "#2F4A3C",
          green: "#3E5B4C",
          mint: "#EEF3EA",
          lime: "#DCCFBE",
          cream: "#FAF8F3",
          sage: "#6F8A75",
          sand: "#EDE6DA",
          line: "#D7DDD4"
        }
      },
      boxShadow: {
        soft: "0 26px 70px rgba(47, 74, 60, 0.14)",
        panel: "0 16px 38px rgba(47, 74, 60, 0.08)"
      }
    }
  },
  plugins: []
};
