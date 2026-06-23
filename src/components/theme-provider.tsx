import { prisma } from "@/lib/prisma/client";

// Default Vahmāfushi brand colors (from brand guidelines)
const DEFAULTS: Record<string, string> = {
  theme_primary:    "#F5A623", // Citrus
  theme_secondary:  "#FF7B2E", // Mango
  theme_accent:     "#06B6D4", // Turquoise
  theme_success:    "#84CC16", // Lime
  theme_danger:     "#FF6B6B", // Coral
  theme_dark:       "#0A0F1A", // Deep
  theme_font_display: "var(--font-display)",
  theme_font_body:    "var(--font-body)",
  theme_radius:     "0.625rem",
};

async function getThemeColors(): Promise<Record<string, string>> {
  try {
    const settings = await prisma.setting.findMany({
      where: { key: { startsWith: "theme_" } },
    });
    const overrides: Record<string, string> = {};
    for (const s of settings) {
      if (typeof s.value === "string") overrides[s.key] = s.value;
    }
    return { ...DEFAULTS, ...overrides };
  } catch {
    return DEFAULTS;
  }
}

export async function ThemeProvider({ children }: { children: React.ReactNode }) {
  const colors = await getThemeColors();

  // Build CSS custom property overrides from admin-controlled settings
  const cssVars = `
    :root {
      --theme-primary:   ${colors.theme_primary};
      --theme-secondary: ${colors.theme_secondary};
      --theme-accent:    ${colors.theme_accent};
      --theme-success:   ${colors.theme_success};
      --theme-danger:    ${colors.theme_danger};
      --theme-dark:      ${colors.theme_dark};
      --radius:          ${colors.theme_radius};

      /* Override shadcn primary with brand primary */
      --primary: ${hexToHsl(colors.theme_primary)};
      --ring:    ${hexToHsl(colors.theme_primary)};

      /* Booking calendar — uses these vars for selected/today states */
      --booking-selected:  ${colors.theme_primary};
      --booking-success:   ${colors.theme_success};
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: cssVars }} />
      {children}
    </>
  );
}

// Convert hex to HSL string for shadcn CSS variables
function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}
