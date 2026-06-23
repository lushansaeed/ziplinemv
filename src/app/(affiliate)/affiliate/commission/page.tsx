import type { Metadata } from "next";
import { prisma } from "@/lib/prisma/client";
import { getApprovedAffiliate } from "@/lib/affiliate/helpers";
import { PageHeader } from "@/components/shared/page-header";
import { AffiliateCommissionStatement } from "@/components/affiliate/commission/affiliate-commission-statement";

export const metadata: Metadata = { title: "Commission | Affiliate Portal" };

async function getCommissionData(affiliateId: string) {
  const [commissions, totals] = await Promise.all([
    prisma.affiliateCommission.findMany({
      where:   { affiliateId },
      orderBy: { createdAt: "desc" },
      include: {
        booking: {
          select: {
            reference: true, bookingDate: true, total: true,
            customer: { select: { name: true } },
            package:  { select: { name: true } },
          },
        },
      },
    }),
    prisma.affiliateCommission.groupBy({
      by:    ["status"],
      where: { affiliateId },
      _sum:  { amount: true },
      _count: true,
    }),
  ]);
  return { commissions, totals };
}

export default async function AffiliateCommissionPage() {
  const { affiliate } = await getApprovedAffiliate();
  const data = await getCommissionData(affiliate.id);
  return (
    <div>
      <PageHeader title="Commission" description={`Your current rate: ${affiliate.commissionRate}%`} />
      <AffiliateCommissionStatement
        {...(data as any)}
        commissionRate={Number(affiliate.commissionRate)}
        commissionBasis={affiliate.commissionBasis}
      />
    </div>
  );
}
