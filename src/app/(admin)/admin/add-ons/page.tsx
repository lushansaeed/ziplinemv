export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { prisma } from "@/lib/prisma/client";
import { requireRole } from "@/lib/auth/actions";
import { ADMIN_AND_ABOVE } from "@/lib/auth/roles";
import { PageHeader } from "@/components/shared/page-header";
import { AddOnsManager } from "@/components/admin/packages/addons-manager";

export const metadata: Metadata = { title: "Add-ons | Admin" };

export default async function AddOnsPage() {
  await requireRole(ADMIN_AND_ABOVE as any);

  const [addOns, activity] = await Promise.all([
    prisma.addOn.findMany({ orderBy: { displayOrder: "asc" } }),
    prisma.activity.findUnique({ where: { slug: "zipline" } }),
  ]);

  return (
    <div>
      <PageHeader title="Add-ons" description={`${addOns.length} add-ons`} />
      <AddOnsManager addOns={addOns as any} activityId={activity?.id ?? ""} />
    </div>
  );
}
