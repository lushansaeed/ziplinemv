import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Vahmāfushi Brand Palette
        brand: {
          citrus:    "#F5A623",
          mango:     "#FF7B2E",
          lime:      "#84CC16",
          coral:     "#FF6B6B",
          turquoise: "#06B6D4",
          ocean:     "#0EA5E9",
          sand:      "#F5E6C8",
          shell:     "#FFF5E4",
          ember:     "#C4451C",
          deep:      "#0A0F1A",
          "deep-2":  "#111827",
          "deep-3":  "#1F2937",
        },
        // shadcn/ui semantic tokens (CSS variable-backed)
        background:  "hsl(var(--background))",
        foreground:  "hsl(var(--foreground))",
        card: {
          DEFAULT:    "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT:    "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT:    "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT:    "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT:    "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT:    "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT:    "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border:  "hsl(var(--border))",
        input:   "hsl(var(--input))",
        ring:    "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body:    ["var(--font-body)", "system-ui", "sans-serif"],
        mono:    ["var(--font-mono)", "monospace"],
      },
      fontSize: {
        "display-2xl": ["4.5rem",  { lineHeight: "1.1", letterSpacing: "-0.02em" }],
        "display-xl":  ["3.75rem", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
        "display-lg":  ["3rem",    { lineHeight: "1.1", letterSpacing: "-0.02em" }],
        "display-md":  ["2.25rem", { lineHeight: "1.2", letterSpacing: "-0.02em" }],
        "display-sm":  ["1.875rem",{ lineHeight: "1.2", letterSpacing: "-0.01em" }],
      },
      borderRadius: {
        lg:  "var(--radius)",
        md:  "calc(var(--radius) - 2px)",
        sm:  "calc(var(--radius) - 4px)",
        xl:  "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 8px)",
        "3xl": "calc(var(--radius) + 16px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to:   { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to:   { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-left": {
          from: { opacity: "0", transform: "translateX(-24px)" },
          to:   { opacity: "1", transform: "translateX(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to:   { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":      { transform: "translateY(-8px)" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(245, 166, 35, 0.4)" },
          "50%":      { boxShadow: "0 0 0 12px rgba(245, 166, 35, 0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up":   "accordion-up 0.2s ease-out",
        "fade-in":        "fade-in 0.5s ease-out",
        "slide-in-left":  "slide-in-left 0.4s ease-out",
        "scale-in":       "scale-in 0.3s ease-out",
        shimmer:          "shimmer 2s linear infinite",
        float:            "float 3s ease-in-out infinite",
        "pulse-glow":     "pulse-glow 2s ease-in-out infinite",
      },
      backgroundImage: {
        "brand-gradient":         "linear-gradient(135deg, #F5A623 0%, #FF7B2E 50%, #C4451C 100%)",
        "ocean-gradient":         "linear-gradient(180deg, #0EA5E9 0%, #06B6D4 50%, #0A0F1A 100%)",
        "hero-overlay":           "linear-gradient(180deg, rgba(10,15,26,0.3) 0%, rgba(10,15,26,0.7) 60%, rgba(10,15,26,0.95) 100%)",
        "card-shimmer":           "linear-gradient(90deg, transparent 0%, rgba(245,166,35,0.08) 50%, transparent 100%)",
      },
      boxShadow: {
        "brand-sm":  "0 2px 8px rgba(245, 166, 35, 0.15)",
        "brand-md":  "0 4px 20px rgba(245, 166, 35, 0.25)",
        "brand-lg":  "0 8px 40px rgba(245, 166, 35, 0.3)",
        "ocean-sm":  "0 2px 8px rgba(6, 182, 212, 0.15)",
        "ocean-md":  "0 4px 20px rgba(6, 182, 212, 0.25)",
        "glass":     "0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255,255,255,0.05)",
        "card":      "0 1px 3px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.08)",
        "card-hover":"0 4px 12px rgba(0,0,0,0.08), 0 12px 32px rgba(0,0,0,0.12)",
      },
      backdropBlur: {
        xs: "2px",
      },
      spacing: {
        "18":  "4.5rem",
        "22":  "5.5rem",
        "88":  "22rem",
        "112": "28rem",
        "128": "32rem",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
