import { prisma } from "@/lib/prisma/client";
import { unstable_noStore as noStore } from "next/cache";
import { BackgroundApplier, PageBackgroundResetter } from "./page-background";

async function getBackground(pageKey: string) {
  noStore();
  try {
    return await prisma.websiteBackground.findFirst({
      where: { pageKey, isActive: true },
    });
  } catch { return null; }
}

function buildCSS(bg: any): string {
  const type = bg?.backgroundType ?? "solid";

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
      background-position: ${bg.bgPosition ?? "center"} !important;
      background-size: ${bg.bgSize ?? "cover"} !important;
      background-repeat: ${bg.bgRepeat ?? "no-repeat"} !important;
    `.trim();
  }

  return "";
}

export async function PageBackground({ pageKey }: { pageKey: string }) {
  const bg = await getBackground(pageKey);
  const type = bg?.backgroundType ?? "";

  // Overlay CSS for image backgrounds
  const overlayCss = (type === "image" && bg?.overlayColor && bg?.imageUrl && (bg?.overlayOpacity ?? 0) > 0)
    ? `
      .theme-public::before {
        content: '';
        position: fixed;
        inset: 0;
        background-color: ${bg.overlayColor};
        opacity: ${bg.overlayOpacity};
        pointer-events: none;
        z-index: 0;
      }
      .theme-public > * { position: relative; z-index: 1; }
    `
    : "";

  const css = bg ? buildCSS(bg) : "";

  // Video needs client-side JS
  if (type === "video" && bg?.videoUrl) {
    return (
      <>
        <PageBackgroundResetter pageKey={pageKey} />
        <BackgroundApplier
          bgValue={null} isGradient={false}
          videoUrl={(bg as any).videoUrl}
          overlayColor={bg.overlayColor ?? "#000000"}
          overlayOpacity={bg.overlayOpacity ?? 0.4}
        />
      </>
    );
  }

  // Solid / gradient / image: pure CSS via <style> tag (server-rendered, no JS)
  return (
    <>
      {/* Resetter removes stale style tags from other pages on client nav */}
      <PageBackgroundResetter pageKey={pageKey} />
      {css && (
        <style
          // @ts-ignore — data attributes on style tags are valid HTML
          data-page-bg={pageKey}
          dangerouslySetInnerHTML={{
            __html: `
              .theme-public { ${css} }
              ${overlayCss}
            `,
          }}
        />
      )}
    </>
  );
}
