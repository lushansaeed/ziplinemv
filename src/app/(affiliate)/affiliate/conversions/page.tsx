import type { Metadata } from "next";
import { prisma } from "@/lib/prisma/client";
import { getApprovedAffiliate } from "@/lib/affiliate/helpers";
import { PageHeader } from "@/components/shared/page-header";
import { AffiliateConversionsTable } from "@/components/affiliate/conversions/affiliate-conversions-table";

export const metadata: Metadata = { title: "Conversions | Affiliate Portal" };

const PER_PAGE = 25;

async function getConversions(affiliateId: string, params: Record<string, string | undefined>) {
  const page = Math.max(1, parseInt(params.page ?? "1"));

  const [bookings, total, clickTotal] = await Promise.all([
    prisma.booking.findMany({
      where:   { affiliateId },
      orderBy: { createdAt: "desc" },
      skip:    (page - 1) * PER_PAGE,
      take:    PER_PAGE,
      include: {
        customer:           { select: { name: true, nationality: true } },
        package:            { select: { name: true } },
        affiliateCommission:{ select: { amount: true, status: true } },
        affiliateCoupon:    { select: { code: true } },
      },
    }),
    prisma.booking.count({ where: { affiliateId } }),
    prisma.affiliateClick.count({ where: { link: { affiliateId } } }),
  ]);

  return { bookings, total, page, perPage: PER_PAGE, clickTotal };
}

export default async function AffiliateConversionsPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  const { affiliate } = await getApprovedAffiliate();
  const data = await getConversions(affiliate.id, searchParams);
  return (
    <div>
      <PageHeader
        title="Conversions"
        description={`${data.total} booking${data.total !== 1 ? "s" : ""} from ${data.clickTotal} clicks`}
      />
      <AffiliateConversionsTable {...data} searchParams={searchParams as Record<string, string | undefined>} />
    </div>
  );
}
