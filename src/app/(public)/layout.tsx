export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { headers } from "next/headers";
import { SiteHeader } from "@/components/public/site-header";
import { SiteFooter } from "@/components/public/site-footer";
import { AnnouncementBar } from "@/components/public/announcement-bar";
import { AffiliateTracker } from "@/components/public/affiliate-tracker";
import { prisma } from "@/lib/prisma/client";
import { unstable_noStore as noStore } from "next/cache";

// Map URL path → page key used in website_backgrounds table
function pathToPageKey(pathname: string): string {
  if (pathname === "/" || pathname === "") return "home";
  const segment = pathname.split("/").filter(Boolean)[0] ?? "home";
  const map: Record<string, string> = {
    "packages": "packages",
    "add-ons":  "add-ons",
    "gallery":  "gallery",
    "our-story":"our-story",
    "faq":      "faq",
    "contact":  "contact",
    "book":     "book",
  };
  return map[segment] ?? "home";
}

function buildBgStyle(bg: any): React.CSSProperties {
  if (!bg) return {};
  const type = bg.backgroundType ?? "solid";

  if (type === "solid" && bg.solidColor) {
    return { backgroundColor: bg.solidColor };
  }
  if (type === "gradient" && bg.gradientColors) {
    const stops = (bg.gradientColors as Array<{ color: string; position?: string }>)
      .map((s) => `${s.color}${s.position ? ` ${s.position}` : ""}`)
      .join(", ");
    const dir = bg.gradientDirection ?? "to bottom";
    const fn  = bg.gradientType === "radial"
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

async function getLayoutData(pageKey: string) {
  noStore();
  try {
    const [announcement, background] = await Promise.all([
      prisma.announcement.findFirst({
        where: {
          active: true,
          OR: [{ startsAt: null }, { startsAt: { lte: new Date() } }],
          AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }] }],
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.websiteBackground.findFirst({
        where: { pageKey, isActive: true },
      }),
    ]);
    return { announcement, background };
  } catch {
    return { announcement: null, background: null };
  }
}

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Read pathname forwarded by middleware
  const headersList = headers();
  const pathname    = headersList.get("x-pathname") ?? "/";
  const pageKey     = pathToPageKey(pathname);

  const { announcement, background } = await getLayoutData(pageKey);
  const bgStyle = buildBgStyle(background);

  // Build overlay for image backgrounds
  const hasOverlay = background?.backgroundType === "image"
    && background?.overlayColor
    && background?.imageUrl;

  return (
    <div
      className="theme-public min-h-screen flex flex-col"
      style={bgStyle}
    >
      {/* Image overlay */}
      {hasOverlay && (
        <div
          aria-hidden="true"
          style={{
            position:        "fixed",
            inset:           0,
            backgroundColor: background.overlayColor ?? "#000000",
            opacity:         background.overlayOpacity ?? 0.4,
            pointerEvents:   "none",
            zIndex:          0,
          }}
        />
      )}

      <div className={hasOverlay ? "relative z-10 flex flex-col min-h-screen" : "flex flex-col flex-1"}>
        {announcement && (
          <AnnouncementBar
            text={announcement.text}
            ctaLabel={announcement.ctaLabel ?? undefined}
            ctaUrl={announcement.ctaUrl ?? undefined}
          />
        )}
        <SiteHeader />
        <Suspense fallback={null}><AffiliateTracker /></Suspense>
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </div>
    </div>
  );
}
