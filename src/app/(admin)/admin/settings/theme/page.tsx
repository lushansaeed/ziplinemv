import type { Metadata } from "next";
import { prisma } from "@/lib/prisma/client";
import { requirePermission } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { ThemeWorkspace } from "@/components/admin/theme/theme-workspace";

export const metadata: Metadata = { title: "Theme & Appearance | Admin" };

async function getThemeData() {
  const [theme, backgrounds, presets] = await Promise.all([
    prisma.websiteTheme.findFirst({ where: { isActive: true } }),
    prisma.websiteBackground.findMany({ orderBy: { pageKey: "asc" } }),
    prisma.themePreset.findMany({ orderBy: { createdAt: "asc" } }),
  ]);
  return { theme, backgrounds, presets };
}

export default async function ThemePage() {
  await requirePermission("settings", "view");
  const data = await getThemeData();
  return (
    <div>
      <PageHeader
        title="Theme & Appearance"
        description="Control the visual appearance of the public website — colors, backgrounds, gradients, and presets."
      />
      <ThemeWorkspace {...(data as any)} />
    </div>
  );
}
