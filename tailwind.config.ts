import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f3f6fa",
          100: "#e5eaf2",
          200: "#c8d4e4",
          300: "#9db1cc",
          400: "#6d88ac",
          500: "#4b688f",
          600: "#365072",
          700: "#27405c",
          800: "#1b3049",
          900: "#132a45",
          950: "#0b1a2c",
        },
        ouro: {
          300: "#e2c073",
          400: "#d3a44a",
          500: "#b98a31",
        },
        ink: {
          DEFAULT: "#0f172a",
          soft: "#475569",
          muted: "#94a3b8",
        },
      },
      boxShadow: {
        card: "0 1px 2px rgba(19,42,69,.04), 0 10px 30px -22px rgba(19,42,69,.35)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
