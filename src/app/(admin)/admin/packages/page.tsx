import type { Metadata } from "next";
import { prisma } from "@/lib/prisma/client";
import { requireRole } from "@/lib/auth/actions";
import { ADMIN_AND_ABOVE } from "@/lib/auth/roles";
import { PageHeader } from "@/components/shared/page-header";
import { PackagesManager } from "@/components/admin/packages/packages-manager";

export const metadata: Metadata = { title: "Packages | Admin" };

export default async function PackagesPage() {
  await requireRole(ADMIN_AND_ABOVE as any);

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
