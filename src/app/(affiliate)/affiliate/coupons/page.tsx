import type { Metadata } from "next";
import { prisma } from "@/lib/prisma/client";
import { getApprovedAffiliate } from "@/lib/affiliate/helpers";
import { PageHeader } from "@/components/shared/page-header";
import { AffiliateCouponsManager } from "@/components/affiliate/coupons/affiliate-coupons-manager";

export const metadata: Metadata = { title: "Coupons | Affiliate Portal" };

export default async function AffiliateCouponsPage() {
  const { affiliate } = await getApprovedAffiliate();

  const [coupons, settings] = await Promise.all([
    prisma.affiliateCoupon.findMany({
      where:   { affiliateId: affiliate.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.setting.findMany({
      where: { key: { in: ["affiliate_coupon_approval_required", "affiliate_allow_own_coupon"] } },
    }),
  ]);

  const settingsMap = Object.fromEntries(settings.map((s) => [s.key, s.value]));
  const approvalRequired = settingsMap["affiliate_coupon_approval_required"] !== false;

  return (
    <div>
      <PageHeader
        title="Coupons"
        description="Create coupon codes your audience can use at checkout."
      />
      <AffiliateCouponsManager
        coupons={coupons}
        affiliateId={affiliate.id}
        approvalRequired={approvalRequired}
      />
    </div>
  );
}
