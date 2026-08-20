import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eff5ff",
          100: "#dbe7fe",
          200: "#bfd5fe",
          300: "#93b8fd",
          400: "#6091fa",
          500: "#3b6bf6",
          600: "#254deb",
          700: "#1d3cd8",
          800: "#1e34af",
          900: "#1e328a",
          950: "#172154",
        },
        ink: {
          DEFAULT: "#0f172a",
          soft: "#475569",
          muted: "#94a3b8",
        },
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,23,42,.06), 0 8px 24px -12px rgba(15,23,42,.18)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
