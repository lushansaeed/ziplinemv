import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma/client";
import { requirePermission } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { SettingsWorkspace } from "@/components/admin/settings/settings-workspace";

export const metadata: Metadata = { title: "Settings | Admin" };

async function getAllSettings() {
  return prisma.setting.findMany({ orderBy: [{ group: "asc" }, { key: "asc" }] });
}

export default async function SettingsPage() {
  await requirePermission("settings", "view");
  const settings = await getAllSettings();
  return (
    <div>
      <PageHeader title="Platform Settings" description="Global configuration for the Zipline MV platform." />
      <SettingsWorkspace settings={settings} />
    </div>
  );
}
