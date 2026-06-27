import type { Metadata } from "next";
import { prisma } from "@/lib/prisma/client";
import { getHomepageSections } from "@/lib/public/section-manager";
import { getUserPermissionSet, requirePermission } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { WebsiteCustomizationWorkspace } from "@/components/admin/website-customization/website-customization-workspace";

export const metadata: Metadata = { title: "Website Customization | Admin" };

async function getWebsiteCustomizationData() {
  const [cmsData, mediaData, themeData] = await Promise.all([
    Promise.all([
      prisma.websitePage.findMany({ orderBy: { slug: "asc" }, include: { sections: true } }),
      prisma.setting.findMany({
        where: {
          OR: [
            { group: { in: ["general", "hero", "typography", "homepage_sections", "theme", "global"] } },
            { key: { startsWith: "page_" } },
            { key: { startsWith: "section_" } },
            { key: { in: ["site_logo_url", "site_logo_size", "site_logo_text", "site_name", "site_tagline"] } },
          ],
        },
      }),
      prisma.contactSetting.findFirst(),
      prisma.announcement.findMany({ orderBy: { createdAt: "desc" } }),
      getHomepageSections(),
    ]).then(([pages, settings, contact, announcements, sectionOrder]) => ({
      pages,
      settings,
      contact,
      announcements,
      sectionOrder,
    })),
    Promise.all([
      prisma.mediaCategory.findMany({ orderBy: { name: "asc" } }),
      prisma.websiteMedia.findMany({
        orderBy: [{ category: { slug: "asc" } }, { displayOrder: "asc" }],
        include: { category: true },
      }),
    ]).then(([categories, media]) => ({ categories, media })),
    Promise.all([
      prisma.websiteTheme.findFirst({ where: { isActive: true } }),
      prisma.websiteBackground.findMany({ orderBy: { pageKey: "asc" } }),
      prisma.themePreset.findMany({ orderBy: { createdAt: "asc" } }),
    ]).then(([theme, backgrounds, presets]) => ({ theme, backgrounds, presets })),
  ]);

  return { cmsData, mediaData, themeData };
}

export default async function WebsiteCustomizationPage() {
  const user = await requirePermission("website_customization", "view");
  const [data, permissionSet] = await Promise.all([
    getWebsiteCustomizationData(),
    getUserPermissionSet(user.id, user.role),
  ]);

  return (
    <div>
      <PageHeader
        title="Website Customization"
        description="Theme, media, page text, captions, and public website settings."
      />
      <WebsiteCustomizationWorkspace
        {...(data as any)}
        permissions={Array.from(permissionSet)}
      />
    </div>
  );
}
