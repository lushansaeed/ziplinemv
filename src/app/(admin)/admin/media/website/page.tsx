import type { Metadata } from "next";
import { prisma } from "@/lib/prisma/client";
import { requireRole } from "@/lib/auth/actions";
import { MEDIA_ACCESS } from "@/lib/auth/roles";
import { PageHeader } from "@/components/shared/page-header";
import { WebsiteMediaManager } from "@/components/admin/media/website-media-manager";

export const metadata: Metadata = { title: "Website Media | Admin" };

async function getMediaData() {
  const [categories, media] = await Promise.all([
    prisma.mediaCategory.findMany({ orderBy: { name: "asc" } }),
    prisma.websiteMedia.findMany({
      orderBy: [{ category: { slug: "asc" } }, { displayOrder: "asc" }],
      include: { category: true },
    }),
  ]);
  return { categories, media };
}

export default async function WebsiteMediaPage() {
  await requireRole(MEDIA_ACCESS as any);
  const data = await getMediaData();
  return (
    <div>
      <PageHeader title="Website Media" description="Manage hero images, gallery, package images, and all frontend media." />
      <WebsiteMediaManager {...data} />
    </div>
  );
}
