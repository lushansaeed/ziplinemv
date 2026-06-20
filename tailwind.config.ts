import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ocean: {
          50: "rgb(var(--color-ocean-50) / <alpha-value>)",
          100: "rgb(var(--color-ocean-100) / <alpha-value>)",
          500: "rgb(var(--color-ocean-500) / <alpha-value>)",
          700: "rgb(var(--color-ocean-700) / <alpha-value>)",
          950: "rgb(var(--color-ocean-950) / <alpha-value>)"
        },
        lagoon: "rgb(var(--color-lagoon) / <alpha-value>)",
        sunset: "rgb(var(--color-sunset) / <alpha-value>)"
      },
      boxShadow: {
        glow: "0 24px 80px rgb(var(--color-ocean-500) / 0.24)"
      }
    }
  },
  plugins: []
};

export default config;
