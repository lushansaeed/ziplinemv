export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { prisma } from "@/lib/prisma/client";
import { requirePermission } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { PackagesManager } from "@/components/admin/packages/packages-manager";

export const metadata: Metadata = { title: "Packages | Admin" };

export default async function PackagesPage() {
  await requirePermission("catalog", "view");

  const [packages, activity] = await Promise.all([
    prisma.package.findMany({
      orderBy: { displayOrder: "asc" },
      include: { _count: { select: { bookingsList: true } } },
    }),
    prisma.activity.findUnique({ where: { slug: "zipline" } }),
  ]);

  return (
    <div>
      <PageHeader title="Packages" description={`${packages.length} packages`} />
      <PackagesManager packages={packages as any} activityId={activity?.id ?? ""} />
    </div>
  );
}
