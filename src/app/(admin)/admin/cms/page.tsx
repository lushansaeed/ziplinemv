import type { Metadata } from "next";
import { prisma } from "@/lib/prisma/client";
import { requireRole } from "@/lib/auth/actions";
import { ADMIN_AND_ABOVE } from "@/lib/auth/roles";
import { PageHeader } from "@/components/shared/page-header";
import { CmsWorkspace } from "@/components/admin/cms/cms-workspace";

export const metadata: Metadata = { title: "CMS | Admin" };

async function getCmsData() {
  const [pages, settings, contact, announcements] = await Promise.all([
    prisma.websitePage.findMany({ orderBy: { slug: "asc" }, include: { sections: true } }),
    prisma.setting.findMany({ where: { group: "general" } }),
    prisma.contactSetting.findFirst(),
    prisma.announcement.findMany({ orderBy: { createdAt: "desc" } }),
  ]);
  return { pages, settings, contact, announcements };
}

export default async function CmsPage() {
  await requireRole(ADMIN_AND_ABOVE as any);
  const data = await getCmsData();
  return (
    <div>
      <PageHeader title="Content Management" description="Edit site settings, hero copy, contact details, and page sections." />
      <CmsWorkspace {...(data as any)} />
    </div>
  );
}
