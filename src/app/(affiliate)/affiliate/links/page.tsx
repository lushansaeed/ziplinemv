import type { Metadata } from "next";
import { prisma } from "@/lib/prisma/client";
import { getApprovedAffiliate } from "@/lib/affiliate/helpers";
import { PageHeader } from "@/components/shared/page-header";
import { AffiliateLinksManager } from "@/components/affiliate/links/affiliate-links-manager";

export const metadata: Metadata = { title: "Referral Links | Affiliate Portal" };

export default async function AffiliateLinksPage() {
  const { affiliate } = await getApprovedAffiliate();

  const links = await prisma.affiliateLink.findMany({
    where:   { affiliateId: affiliate.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { clicks: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Referral Links"
        description="Share your unique link. Every booking through it earns you commission."
      />
      <AffiliateLinksManager links={links} affiliateId={affiliate.id} />
    </div>
  );
}
