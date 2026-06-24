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
 * Always renders an inline <script> that runs synchronously on page load.
 * - If a background is configured: sets it on .theme-public
 * - If no background: CLEARS any previously set inline style (handles
 *   client-side navigation where the previous page's style persists)
 */
export async function PageBackground({ pageKey }: PageBackgroundProps) {
  const bg = await getBackground(pageKey);

  // Build the value to set (or null to clear)
  let bgValue: string | null = null;
  let isGradient = false;

  if (bg) {
    const type = bg.backgroundType ?? "solid";

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
      isGradient = true;
    } else if (type === "image" && bg.imageUrl) {
      // Image backgrounds: use style tag (multiple CSS properties)
      const pos    = bg.bgPosition ?? "center";
      const size   = bg.bgSize     ?? "cover";
      const repeat = bg.bgRepeat   ?? "no-repeat";
      const overlayStyle = (bg.overlayColor && Number(bg.overlayOpacity ?? 0) > 0)
        ? `
          .theme-public::after {
            content: '';
            position: fixed;
            inset: 0;
            background-color: ${bg.overlayColor};
            opacity: ${bg.overlayOpacity};
            pointer-events: none;
            z-index: 0;
          }`
        : "";

      const script = `(function(){
        var el=document.querySelector('.theme-public');
        if(el){
          el.style.backgroundImage='url(${JSON.stringify(bg.imageUrl).slice(1,-1)})';
          el.style.backgroundPosition=${JSON.stringify(pos)};
          el.style.backgroundSize=${JSON.stringify(size)};
          el.style.backgroundRepeat=${JSON.stringify(repeat)};
          el.style.backgroundColor='';
          el.style.background='';
        }
      })();`;

      return (
        <>
          {overlayStyle && <style dangerouslySetInnerHTML={{ __html: overlayStyle }} />}
          <script dangerouslySetInnerHTML={{ __html: script }} />
        </>
      );
    }
  }

  // Script always runs — sets bg if configured, CLEARS if not
  // This handles client-side nav where previous page's inline style persists
  const script = bgValue
    ? `(function(){
        var el=document.querySelector('.theme-public');
        if(el){
          el.style.background='';
          el.style.backgroundColor='';
          el.style.backgroundImage='';
          el.style.${isGradient ? "background" : "backgroundColor"}=${JSON.stringify(bgValue)};
        }
      })();`
    : `(function(){
        var el=document.querySelector('.theme-public');
        if(el){
          el.style.background='';
          el.style.backgroundColor='';
          el.style.backgroundImage='';
        }
      })();`;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
