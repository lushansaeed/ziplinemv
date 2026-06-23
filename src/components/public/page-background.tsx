import { prisma } from "@/lib/prisma/client";
import { unstable_noStore as noStore } from "next/cache";

interface PageBackgroundProps {
  pageKey: string;
}

async function getBackground(pageKey: string) {
  noStore();
  try {
    return await prisma.websiteBackground.findFirst({
      where: { pageKey, isActive: true },
    });
  } catch { return null; }
}

function buildCSS(bg: any): string {
  if (!bg) return "";
  const type = bg.backgroundType ?? "solid";

  if (type === "solid" && bg.solidColor) {
    return `background-color: ${bg.solidColor} !important;`;
  }

  if (type === "gradient" && bg.gradientColors) {
    const stops = (bg.gradientColors as Array<{ color: string; position?: string }>)
      .map((s) => `${s.color}${s.position ? ` ${s.position}` : ""}`)
      .join(", ");
    const dir = bg.gradientDirection ?? "to bottom";
    const fn  = bg.gradientType === "radial"
      ? `radial-gradient(circle, ${stops})`
      : `linear-gradient(${dir}, ${stops})`;
    return `background: ${fn} !important;`;
  }

  if (type === "image" && bg.imageUrl) {
    return `
      background-image: url('${bg.imageUrl}') !important;
      background-position: ${bg.bgPosition ?? "center"};
      background-size: ${bg.bgSize ?? "cover"};
      background-repeat: ${bg.bgRepeat ?? "no-repeat"};
      background-attachment: fixed;
    `.trim();
  }

  return "";
}

/**
 * Drop this at the TOP of any public page to override the site background.
 * Injects a <style> tag that targets .theme-public — no middleware needed.
 */
export async function PageBackground({ pageKey }: PageBackgroundProps) {
  const bg = await getBackground(pageKey);
  const css = buildCSS(bg);

  if (!css) return null;

  const overlayCSS = (bg?.backgroundType === "image" && bg?.overlayColor && bg?.imageUrl)
    ? `
      .theme-public::after {
        content: '';
        position: fixed;
        inset: 0;
        background-color: ${bg.overlayColor};
        opacity: ${bg.overlayOpacity ?? 0.4};
        pointer-events: none;
        z-index: 0;
      }
    `
    : "";

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `.theme-public { ${css} }\n${overlayCSS}`,
      }}
    />
  );
}
