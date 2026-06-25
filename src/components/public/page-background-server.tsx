import { prisma } from "@/lib/prisma/client";
import { unstable_noStore as noStore } from "next/cache";
import { BackgroundApplier } from "./page-background";

async function getBackground(pageKey: string) {
  noStore();
  try {
    return await prisma.websiteBackground.findFirst({
      where: { pageKey, isActive: true },
    });
  } catch { return null; }
}

export async function PageBackground({ pageKey }: { pageKey: string }) {
  const bg = await getBackground(pageKey);

  if (!bg) return <BackgroundApplier bgValue={null} isGradient={false} />;

  const type = bg.backgroundType ?? "solid";

  if (type === "solid" && bg.solidColor) {
    return <BackgroundApplier bgValue={bg.solidColor} isGradient={false} />;
  }

  if (type === "gradient" && bg.gradientColors) {
    const stops = (bg.gradientColors as Array<{ color: string; position?: string }>)
      .map((s) => `${s.color}${s.position ? ` ${s.position}` : ""}`)
      .join(", ");
    const dir = bg.gradientDirection ?? "to bottom";
    const value = bg.gradientType === "radial"
      ? `radial-gradient(circle, ${stops})`
      : `linear-gradient(${dir}, ${stops})`;
    return <BackgroundApplier bgValue={value} isGradient={true} />;
  }

  if (type === "image" && bg.imageUrl) {
    return (
      <BackgroundApplier
        bgValue={null}
        isGradient={false}
        imageUrl={bg.imageUrl}
        imagePosition={bg.bgPosition ?? "center"}
        imageSize={bg.bgSize ?? "cover"}
        imageRepeat={bg.bgRepeat ?? "no-repeat"}
      />
    );
  }

  if (type === "video" && (bg as any).videoUrl) {
    return (
      <BackgroundApplier
        bgValue={null}
        isGradient={false}
        videoUrl={(bg as any).videoUrl}
        overlayColor={bg.overlayColor ?? "#000000"}
        overlayOpacity={bg.overlayOpacity ?? 0.4}
      />
    );
  }

  return <BackgroundApplier bgValue={null} isGradient={false} />;
}
