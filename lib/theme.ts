export type ThemePalette = {
  id: string;
  name: string;
  description: string;
  colors: {
    ocean50: string;
    ocean100: string;
    ocean500: string;
    ocean700: string;
    ocean950: string;
    lagoon: string;
    sunset: string;
  };
};

export const themePresets: ThemePalette[] = [
  {
    id: "maldives",
    name: "Maldives Lagoon",
    description: "Bright turquoise, deep ocean, and warm sunset CTA.",
    colors: {
      ocean50: "#ecfeff",
      ocean100: "#cffafe",
      ocean500: "#06b6d4",
      ocean700: "#0e7490",
      ocean950: "#083344",
      lagoon: "#13d6c6",
      sunset: "#ff8a4c"
    }
  },
  {
    id: "coral",
    name: "Coral Adventure",
    description: "Higher-energy reef colors for campaigns and peak season.",
    colors: {
      ocean50: "#f0fdfa",
      ocean100: "#ccfbf1",
      ocean500: "#14b8a6",
      ocean700: "#0f766e",
      ocean950: "#134e4a",
      lagoon: "#2dd4bf",
      sunset: "#fb7185"
    }
  },
  {
    id: "midnight",
    name: "Midnight Premium",
    description: "Deep luxury tones with crisp cyan and gold accents.",
    colors: {
      ocean50: "#eff6ff",
      ocean100: "#dbeafe",
      ocean500: "#0ea5e9",
      ocean700: "#0369a1",
      ocean950: "#082f49",
      lagoon: "#38bdf8",
      sunset: "#f59e0b"
    }
  }
];

export const themeCssVariables = {
  ocean50: "--color-ocean-50",
  ocean100: "--color-ocean-100",
  ocean500: "--color-ocean-500",
  ocean700: "--color-ocean-700",
  ocean950: "--color-ocean-950",
  lagoon: "--color-lagoon",
  sunset: "--color-sunset"
} as const;

export function hexToRgbTriplet(hex: string) {
  const normalized = hex.replace("#", "");
  const value = normalized.length === 3 ? normalized.split("").map((char) => char + char).join("") : normalized;
  const numeric = Number.parseInt(value, 16);
  return `${(numeric >> 16) & 255} ${(numeric >> 8) & 255} ${numeric & 255}`;
}
