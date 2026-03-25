import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { 400: "#f59e0b", 500: "#d97706", 600: "#b45309" },
      },
    },
  },
  plugins: [],
};
export default config;
