import type { Metadata } from "next";
import { prisma } from "@/lib/prisma/client";
import { getApprovedAffiliate } from "@/lib/affiliate/helpers";
import { PageHeader } from "@/components/shared/page-header";
import { AffiliatePayouts } from "@/components/affiliate/payouts/affiliate-payouts";

export const metadata: Metadata = { title: "Payouts | Affiliate Portal" };

async function getPayoutData(userId: string, affiliateId: string) {
  const [payoutRequests, pendingCommission] = await Promise.all([
    prisma.payoutRequest.findMany({
      where:   { userId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.affiliateCommission.aggregate({
      where: { affiliateId, status: "PENDING" },
      _sum:  { amount: true },
    }),
  ]);

  return {
    payoutRequests,
    pendingAmount: Number(pendingCommission._sum.amount ?? 0),
  };
}

export default async function AffiliatePayoutsPage() {
  const { user, affiliate } = await getApprovedAffiliate();
  const data = await getPayoutData(user.id, affiliate.id);
  return (
    <div>
      <PageHeader title="Payouts" description="Request and track your earnings." />
      <AffiliatePayouts {...(data as any)} userId={user.id} />
    </div>
  );
}
