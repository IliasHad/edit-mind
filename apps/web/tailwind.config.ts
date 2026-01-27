/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "../../packages/shared/**/*.ts",  "../../packages/ui/src/**/*.tsx"],
  darkMode: "class",
  safelist: [
  { pattern: /from-(purple|yellow|pink|blue|indigo)-\d{3}/ },
  { pattern: /to-(indigo|red|teal)-\d{3}/ },
  { pattern: /border-(purple|red|blue|indigo|teal)-\d{3}/ },
  ],
  theme: {
    extend: {
      colors: {},
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      animation: {
        fadeIn: "fadeIn 0.3s ease-out forwards",
        slideUp: "slideUp 0.3s ease-out forwards",
        scaleIn: "scaleIn 0.2s ease-out forwards",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      boxShadow: {
        purple: "0 4px 14px 0 rgba(139, 92, 246, 0.15)",
        "purple-lg": "0 10px 40px 0 rgba(139, 92, 246, 0.2)",
        blue: "0 4px 14px 0 rgba(59, 130, 246, 0.15)",
        "blue-lg": "0 10px 40px 0 rgba(59, 130, 246, 0.2)",
      },
    },
  },
  plugins: [],
};
