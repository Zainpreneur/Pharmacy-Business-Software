/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eefcf6",
          100: "#d6f7e8",
          200: "#aeeed3",
          300: "#79e0b8",
          400: "#43cb99",
          500: "#1fae7d",
          600: "#128c66",
          700: "#107053",
          800: "#115945",
          900: "#0f4a3a",
        },
      },
    },
  },
  plugins: [],
};
