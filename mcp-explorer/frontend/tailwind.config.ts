import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { 400: "#34d399", 500: "#10b981", 600: "#059669" },
      },
    },
  },
  plugins: [],
};
export default config;
