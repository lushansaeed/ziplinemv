export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { SiteHeader } from "@/components/public/site-header";
import { SiteFooter } from "@/components/public/site-footer";
import { AnnouncementBar } from "@/components/public/announcement-bar";
import { AffiliateTracker } from "@/components/public/affiliate-tracker";
import { prisma } from "@/lib/prisma/client";

async function getAnnouncement() {
  try {
    const now = new Date();
    return await prisma.announcement.findFirst({
      where: {
        active: true,
        OR:  [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
      orderBy: { createdAt: "desc" },
    });
  } catch { return null; }
}

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const announcement = await getAnnouncement();

  return (
    <div className="theme-public min-h-screen flex flex-col">
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
  );
}
