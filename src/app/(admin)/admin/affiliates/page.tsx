import type { Metadata } from "next";
import { prisma } from "@/lib/prisma/client";
import { requireRole } from "@/lib/auth/actions";
import { ADMIN_AND_ABOVE } from "@/lib/auth/roles";
import { PageHeader } from "@/components/shared/page-header";
import { AffiliatesWorkspace } from "@/components/admin/affiliates/affiliates-workspace";

export const metadata: Metadata = { title: "Affiliates | Admin" };

async function getAffiliateData() {
  const [affiliates, applications, pendingCoupons] = await Promise.all([
    prisma.affiliate.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        links:   { select: { id: true, clickCount: true } },
        coupons: true,
        _count:  { select: { bookings: true } },
      },
    }),
    prisma.affiliateApplication.findMany({ where: { status: "PENDING" }, orderBy: { submittedAt: "desc" } }),
    prisma.affiliateCoupon.findMany({ where: { status: "PENDING" }, include: { affiliate: { select: { name: true } } } }),
  ]);

  const salesData = await prisma.booking.groupBy({
    by: ["affiliateId"],
    _sum: { total: true },
    where: { paymentStatus: "PAID", affiliateId: { not: null } },
  });
  const salesMap = Object.fromEntries(salesData.map((s) => [s.affiliateId!, Number(s._sum.total ?? 0)]));

  const commissionData = await prisma.affiliateCommission.groupBy({
    by: ["affiliateId"],
    _sum: { amount: true },
    where: { status: "PENDING" },
  });
  const commissionMap = Object.fromEntries(commissionData.map((c) => [c.affiliateId, Number(c._sum.amount ?? 0)]));

  return { affiliates, applications, pendingCoupons, salesMap, commissionMap };
}

export default async function AffiliatesPage() {
  await requireRole(ADMIN_AND_ABOVE as any);
  const data = await getAffiliateData();
  return (
    <div>
      <PageHeader
        title="Affiliates"
        description={`${data.affiliates.length} affiliates · ${data.applications.length} pending · ${data.pendingCoupons.length} coupons awaiting approval`}
      />
      <AffiliatesWorkspace {...data} />
    </div>
  );
}
