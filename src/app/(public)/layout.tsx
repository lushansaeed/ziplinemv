import { SiteHeader } from "@/components/public/site-header";
import { SiteFooter } from "@/components/public/site-footer";
import { AnnouncementBar } from "@/components/public/announcement-bar";
import { prisma } from "@/lib/prisma/client";

async function getAnnouncement() {
  const now = new Date();
  return prisma.announcement.findFirst({
    where: {
      active: true,
      OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
    },
    orderBy: { createdAt: "desc" },
  });
}

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const announcement = await getAnnouncement();

  return (
    <div className="theme-public min-h-screen bg-brand-deep flex flex-col">
      {announcement && (
        <AnnouncementBar text={announcement.text} ctaLabel={announcement.ctaLabel ?? undefined} ctaUrl={announcement.ctaUrl ?? undefined} />
      )}
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
