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

/**
 * Injects an inline <script> that runs synchronously during HTML parsing.
 * Sets style.backgroundColor directly on .theme-public — this beats
 * everything (CSS specificity, !important, cascade order) because inline
 * style attributes always win.
 *
 * The script runs INSIDE <main>, which is inside .theme-public, so the
 * parent element is already in the DOM when the script executes.
 */
export async function PageBackground({ pageKey }: PageBackgroundProps) {
  const bg = await getBackground(pageKey);
  if (!bg) return null;

  const type = bg.backgroundType ?? "solid";

  // Build the CSS value to apply
  let bgValue: string | null = null;

  if (type === "solid" && bg.solidColor) {
    bgValue = bg.solidColor;
  } else if (type === "gradient" && bg.gradientColors) {
    const stops = (bg.gradientColors as Array<{ color: string; position?: string }>)
      .map((s) => `${s.color}${s.position ? ` ${s.position}` : ""}`)
      .join(", ");
    const dir = bg.gradientDirection ?? "to bottom";
    bgValue = bg.gradientType === "radial"
      ? `radial-gradient(circle, ${stops})`
      : `linear-gradient(${dir}, ${stops})`;
  } else if (type === "image" && bg.imageUrl) {
    // For images use a style tag (multiple properties needed)
    const pos    = bg.bgPosition ?? "center";
    const size   = bg.bgSize     ?? "cover";
    const repeat = bg.bgRepeat   ?? "no-repeat";
    const overlay = (bg.overlayColor && Number(bg.overlayOpacity ?? 0) > 0)
      ? `<div style="position:fixed;inset:0;background:${bg.overlayColor};opacity:${bg.overlayOpacity};pointer-events:none;z-index:0"></div>`
      : "";

    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: `
          .theme-public {
            background-image: url('${bg.imageUrl}') !important;
            background-position: ${pos} !important;
            background-size: ${size} !important;
            background-repeat: ${repeat} !important;
            background-attachment: fixed !important;
          }
        `}} />
        {overlay && <div dangerouslySetInnerHTML={{ __html: overlay }} />}
      </>
    );
  }

  if (!bgValue) return null;

  // Inline script sets style directly on the element — beats all CSS
  const isGradient = type === "gradient";
  const prop       = isGradient ? "background" : "backgroundColor";
  const script     = `(function(){
    var el=document.querySelector('.theme-public');
    if(el){el.style.${prop}=${JSON.stringify(bgValue)};}
    document.documentElement.style.setProperty('--page-bg',${JSON.stringify(bgValue)});
  })();`;

  return (
    <>
      {/* CSS fallback for SSR/no-JS */}
      <style dangerouslySetInnerHTML={{ __html:
        `.theme-public{${isGradient ? "background" : "background-color"}:${bgValue}!important;}`
      }} />
      {/* Script override — runs synchronously, sets inline style directly */}
      <script dangerouslySetInnerHTML={{ __html: script }} />
    </>
  );
}
