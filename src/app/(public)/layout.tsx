export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { SiteHeader } from "@/components/public/site-header";
import { SiteFooter } from "@/components/public/site-footer";
import { AnnouncementBar } from "@/components/public/announcement-bar";
import { AffiliateTracker } from "@/components/public/affiliate-tracker";
import { prisma } from "@/lib/prisma/client";
import { getLogoData } from "@/components/shared/site-logo";

async function getLayoutData() {
  try {
    const now = new Date();
    const [announcement, logo] = await Promise.all([
      prisma.announcement.findFirst({
        where: {
          active: true,
          OR:  [{ startsAt: null }, { startsAt: { lte: now } }],
          AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
        },
        orderBy: { createdAt: "desc" },
      }),
      getLogoData(),
    ]);
    return { announcement, logo };
  } catch {
    return { announcement: null, logo: { url: "", size: "md", text: "Zipline Maldives" } };
  }
}

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const { announcement, logo } = await getLayoutData();

  return (
    <div className="theme-public min-h-screen flex flex-col">
      {announcement && (
        <AnnouncementBar
          text={announcement.text}
          ctaLabel={announcement.ctaLabel ?? undefined}
          ctaUrl={announcement.ctaUrl ?? undefined}
        />
      )}
      {/* Logo loaded once in layout and passed directly — no async wrapper, no flash */}
      <SiteHeader logo={logo} />
      <Suspense fallback={null}><AffiliateTracker /></Suspense>
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
