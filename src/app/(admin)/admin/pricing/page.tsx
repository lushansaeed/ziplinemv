import type { Metadata } from "next";
import { prisma } from "@/lib/prisma/client";
import { requireRole } from "@/lib/auth/actions";
import { FINANCE_ACCESS } from "@/lib/auth/roles";
import { PageHeader } from "@/components/shared/page-header";
import { PricingWorkspace } from "@/components/admin/pricing/pricing-workspace";

export const metadata: Metadata = { title: "Price Engine | Admin" };

async function getPricingData() {
  const [packages, addOns, promoCodes, settings] = await Promise.all([
    prisma.package.findMany({ orderBy: { displayOrder: "asc" } }),
    prisma.addOn.findMany({ orderBy: { displayOrder: "asc" } }),
    prisma.promoCode.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.setting.findMany({
      where: { group: { in: ["pricing", "agents", "affiliates"] } },
    }),
  ]);
  return { packages, addOns, promoCodes, settings };
}

export default async function PricingPage() {
  await requireRole(FINANCE_ACCESS as any);
  const data = await getPricingData();
  return (
    <div>
      <PageHeader title="Price Engine" description="Packages, add-ons, promo codes, and commission settings." />
      <PricingWorkspace {...(data as any)} />
    </div>
  );
}
