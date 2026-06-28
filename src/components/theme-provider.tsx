import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/lib/prisma/client";

// ─── Defaults (premium Maldives website theme) ───────────────────────────────
const DEFAULTS = {
  primaryColor:     "#00A6B4",
  secondaryColor:   "#064E5F",
  accentColor:      "#F6C85F",
  backgroundColor:  "#c3c3c3",
  sectionBgColor:   "#FFFFFF",
  sectionAltBgColor:"#EEFAF8",
  cardBgColor:      "#FFFFFF",
  cardBorderColor:  "#00A6B4",
  textColor:        "#263238",
  headingColor:     "#083344",
  buttonColor:      "#00A6B4",
  buttonTextColor:  "#FFFFFF",
  headerBgColor:    "#FFFFFF",
  footerBgColor:    "#052F3F",
  textMutedColor:   "#6B7280",
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

function readThemeConfig(theme: any): Record<string, string> {
  if (!theme?.config || typeof theme.config !== "object" || Array.isArray(theme.config)) return {};
  return theme.config as Record<string, string>;
}

function isOldDefaultTheme(theme: any): boolean {
  return (
    (theme?.backgroundColor === "#0A0F1A" && theme?.primaryColor === "#F5A623") ||
    (theme?.backgroundColor === "#F8FAF9" && theme?.primaryColor === "#00A6B4")
  );
}

export async function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, settingOverrides } = await getActiveTheme();

  // Load logo URL so we can preload it in <head> — prevents blink on navigation
  const logoUrl = settingOverrides["site_logo_url"] as string | undefined ?? "";

  // Merge: DB theme > settings overrides > defaults
  const themeConfig = readThemeConfig(theme);
  const colors = {
    ...DEFAULTS,
    ...settingOverrides,
    ...themeConfig,
    ...(theme && !isOldDefaultTheme(theme) ? {
      primaryColor:    theme.primaryColor,
      secondaryColor:  theme.secondaryColor,
      accentColor:     theme.accentColor,
      backgroundColor: theme.backgroundColor,
      textColor:       theme.textColor,
      textMutedColor:  (theme as any).textMutedColor ?? "#8B9CB3",
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
      --section-bg:           ${colors.sectionBgColor};
      --section-alt-bg:       ${colors.sectionAltBgColor};
      --card-bg:              ${colors.cardBgColor};
      --card-border:          ${colors.cardBorderColor};
      --heading:              ${colors.headingColor};
      --body:                 ${colors.textColor};
      --muted:                ${colors.textMutedColor ?? "#6B7280"};
      --button-bg:            ${colors.buttonColor};
      --button-text:          ${colors.buttonTextColor};
      --header-bg:            ${colors.headerBgColor};
      --footer-bg:            ${colors.footerBgColor};
      --site-text:            ${colors.textColor};
      --site-text-muted:      ${colors.textMutedColor ?? "#8B9CB3"};
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

    /* Muted/secondary text — admin-controlled via --site-text-muted */
    .theme-public .text-muted-site,
    .theme-public p.subtitle,
    .theme-public .section-subtitle {
      color: var(--site-text-muted) !important;
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: cssVars }} />
      {children}
    </>
  );
}
