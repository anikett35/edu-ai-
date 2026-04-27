/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // Safelist prevents Tailwind purging classes built with dynamic strings
  safelist: [
    "bg-primary-600", "bg-primary-50", "bg-primary-100",
    "text-white", "text-primary-600", "text-primary-700",
    "border-primary-500", "border-primary-600",
    "badge-green", "badge-yellow", "badge-red", "badge-purple",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
        },
        surface: "#f8f9ff",
      },
      fontFamily: {
        display: ["'Sora'", "sans-serif"],
        body:    ["'DM Sans'", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(99,102,241,0.08), 0 4px 16px -2px rgba(99,102,241,0.06)",
        glow: "0 0 0 3px rgba(99,102,241,0.18)",
        deep: "0 8px 32px -4px rgba(79,70,229,0.18)",
      },
      borderRadius: {
        xl2: "1rem",
        xl3: "1.25rem",
      },
    },
  },
  plugins: [],
};