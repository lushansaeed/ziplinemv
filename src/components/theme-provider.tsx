import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/lib/prisma/client";

// ─── Defaults (Vahmāfushi brand) ─────────────────────────────────────────────
const DEFAULTS = {
  primaryColor:     "#F5A623",
  secondaryColor:   "#FF7B2E",
  accentColor:      "#06B6D4",
  backgroundColor:  "#0A0F1A",
  textColor:        "#FFFFFF",
  buttonColor:      "#F5A623",
  buttonTextColor:  "#0A0F1A",
  headerBgColor:    "#0A0F1A",
  footerBgColor:    "#050A10",
  buttonRadius:     "rounded-full",
  // Legacy theme settings keys
  theme_primary:    "#F5A623",
  theme_secondary:  "#FF7B2E",
  theme_accent:     "#06B6D4",
  theme_success:    "#84CC16",
  theme_danger:     "#FF6B6B",
};

async function getActiveTheme() {
  noStore(); // always fetch fresh — never serve cached theme vars
  try {
    const [theme, settings] = await Promise.all([
      prisma.websiteTheme.findFirst({ where: { isActive: true } }),
      prisma.setting.findMany({ where: { key: { in: [
        "theme_primary","theme_secondary","theme_accent","theme_success","theme_danger",
        "hero_font_size", "hero_rotation",
        "site_logo_url",
      ] } } }),
    ]);
    const overrides: Record<string, string> = {};
    for (const s of settings) {
      if (typeof s.value === "string") overrides[s.key] = s.value;
    }
    return { theme, settingOverrides: overrides };
  } catch {
    return { theme: null, settingOverrides: {} };
  }
}

// Convert hex to HSL for shadcn
function hexToHsl(hex: string): string {
  try {
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
  } catch { return "38 91% 55%"; }
}

export async function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, settingOverrides } = await getActiveTheme();

  // Load logo URL so we can preload it in <head> — prevents blink on navigation
  const logoUrl = settingOverrides["site_logo_url"] as string | undefined ?? "";

  // Merge: DB theme > settings overrides > defaults
  const colors = {
    ...DEFAULTS,
    ...settingOverrides,
    ...(theme ? {
      primaryColor:    theme.primaryColor,
      secondaryColor:  theme.secondaryColor,
      accentColor:     theme.accentColor,
      backgroundColor: theme.backgroundColor,
      textColor:       theme.textColor,
      buttonColor:     theme.buttonColor,
      buttonTextColor: theme.buttonTextColor,
      headerBgColor:   theme.headerBgColor,
      footerBgColor:   theme.footerBgColor,
      buttonRadius:    theme.buttonRadius,
    } : {}),
  };

  const cssVars = `
    :root {
      /* ── Website theme (public site only) ── */
      --site-primary:         ${colors.primaryColor};
      --site-secondary:       ${colors.secondaryColor};
      --site-accent:          ${colors.accentColor};
      --site-bg:              ${colors.backgroundColor};
      --site-text:            ${colors.textColor};
      --site-button:          ${colors.buttonColor};
      --site-button-text:     ${colors.buttonTextColor};
      --site-header-bg:       ${colors.headerBgColor};
      --site-footer-bg:       ${colors.footerBgColor};

      /* ── Legacy theme vars (settings-based) ── */
      --theme-primary:        ${colors.theme_primary ?? colors.primaryColor};
      --theme-secondary:      ${colors.theme_secondary ?? colors.secondaryColor};
      --theme-accent:         ${colors.theme_accent ?? colors.accentColor};
      --theme-success:        ${colors.theme_success ?? "#84CC16"};
      --theme-danger:         ${colors.theme_danger ?? "#FF6B6B"};

      /* ── Booking calendar ── */
      --booking-selected:     ${colors.theme_primary ?? colors.primaryColor};
      --booking-success:      ${colors.theme_success ?? "#84CC16"};

      /* ── shadcn/ui primary override ── */
      --primary: ${hexToHsl(colors.primaryColor)};
      --ring:    ${hexToHsl(colors.primaryColor)};

      /* ── Hero typography ── */
      --hero-font-size: ${(colors as any).hero_font_size ?? "82"}px;
      --hero-rotation:  ${(colors as any).hero_rotation ?? "0"}deg;
    }

    /* Apply global site theme — per-page backgrounds handled by PageBackground component */
    .theme-public {
      background-color: ${colors.backgroundColor};
      color: ${colors.textColor};
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: cssVars }} />
      {/* Favicon is set via generateMetadata in layout.tsx — don't add <link rel=icon> here */}
      {/* Preload logo image for the header so it's ready before first paint */}
      {logoUrl && <link rel="preload" href={logoUrl} as="image" />}
      {children}
    </>
  );
}
