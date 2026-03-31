/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0a0b10",
          900: "#0f1219",
          800: "#151923",
        },
        mist: {
          50: "#f6f7fb",
          100: "#eaedf5",
          200: "#cfd7e6",
        },
        brand: {
          300: "#8ae3ff",
          400: "#5cc7ff",
          500: "#2aa6ff",
          600: "#1d82d6",
        },
      },
      boxShadow: {
        glow: "0 0 40px rgba(92, 199, 255, 0.25)",
        soft: "0 20px 60px rgba(5, 10, 30, 0.55)",
      },
    },
  },
  plugins: [],
};
