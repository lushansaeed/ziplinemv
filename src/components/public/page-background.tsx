import { prisma } from "@/lib/prisma/client";
import { unstable_noStore as noStore } from "next/cache";

interface PageBackgroundProps {
  pageKey: string;
  children: React.ReactNode;
  className?: string;
}

async function getBackground(pageKey: string) {
  noStore();
  try {
    return await prisma.websiteBackground.findFirst({
      where: { pageKey, isActive: true },
    });
  } catch { return null; }
}

function buildStyle(bg: any): React.CSSProperties {
  if (!bg) return {};
  const type = bg.backgroundType ?? "solid";

  if (type === "solid" && bg.solidColor) {
    return { backgroundColor: bg.solidColor };
  }

  if (type === "gradient" && bg.gradientColors) {
    const colors = (bg.gradientColors as Array<{ color: string; position?: string }>);
    const stops  = colors.map((s) => `${s.color}${s.position ? ` ${s.position}` : ""}`).join(", ");
    const dir    = bg.gradientDirection ?? "to bottom";
    const fn     = bg.gradientType === "radial"
      ? `radial-gradient(circle, ${stops})`
      : `linear-gradient(${dir}, ${stops})`;
    return { background: fn };
  }

  if (type === "image" && bg.imageUrl) {
    return {
      backgroundImage:    `url('${bg.imageUrl}')`,
      backgroundPosition: bg.bgPosition ?? "center",
      backgroundSize:     bg.bgSize     ?? "cover",
      backgroundRepeat:   bg.bgRepeat   ?? "no-repeat",
    };
  }

  return {};
}

export async function PageBackground({ pageKey, children, className }: PageBackgroundProps) {
  const bg = await getBackground(pageKey);
  const style = buildStyle(bg);

  // If image background with overlay, wrap content
  if (bg?.backgroundType === "image" && bg?.overlayColor && bg?.imageUrl) {
    return (
      <div className={className} style={{ ...style, position: "relative" }}>
        {/* Overlay */}
        <div
          aria-hidden="true"
          style={{
            position:        "fixed",
            inset:           0,
            backgroundColor: bg.overlayColor,
            opacity:         bg.overlayOpacity ?? 0.4,
            pointerEvents:   "none",
            zIndex:          0,
          }}
        />
        <div style={{ position: "relative", zIndex: 1 }}>
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className={className} style={style}>
      {children}
    </div>
  );
}
