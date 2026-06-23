import { prisma } from "@/lib/prisma/client";
import { requireRole } from "@/lib/auth/actions";
import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";

export async function getApprovedAffiliate() {
  const user = await requireRole([UserRole.AFFILIATE]);

  const affiliate = await prisma.affiliate.findUnique({
    where: { userId: user.id },
    select: {
      id: true, name: true, contactPerson: true,
      email: true, phone: true, website: true, channel: true,
      commissionRate: true, commissionBasis: true,
      cookieDays: true, status: true,
    },
  });

  if (!affiliate || affiliate.status !== "APPROVED") {
    redirect("/auth/login?error=Your+affiliate+account+is+pending+approval.");
  }

  return { user, affiliate };
}

export async function getAffiliateStats(affiliateId: string) {
  const [
    totalClicks,
    totalConversions,
    totalBookings,
    salesAgg,
    commEarnedAgg,
    commPayableAgg,
    activeCoupons,
    activeLinks,
  ] = await Promise.all([
    prisma.affiliateClick.count({ where: { link: { affiliateId } } }),
    prisma.booking.count({ where: { affiliateId } }),
    prisma.booking.count({ where: { affiliateId, bookingStatus: { notIn: ["CANCELLED", "REFUNDED"] } } }),
    prisma.booking.aggregate({ where: { affiliateId, paymentStatus: "PAID" }, _sum: { total: true } }),
    prisma.affiliateCommission.aggregate({ where: { affiliateId }, _sum: { amount: true } }),
    prisma.affiliateCommission.aggregate({ where: { affiliateId, status: "PENDING" }, _sum: { amount: true } }),
    prisma.affiliateCoupon.count({ where: { affiliateId, status: "APPROVED" } }),
    prisma.affiliateLink.count({ where: { affiliateId, active: true } }),
  ]);

  const conversionRate = totalClicks > 0
    ? ((totalConversions / totalClicks) * 100).toFixed(1)
    : "0.0";

  return {
    totalClicks,
    totalConversions,
    totalBookings,
    conversionRate,
    totalSales:        Number(salesAgg._sum.total ?? 0),
    commissionEarned:  Number(commEarnedAgg._sum.amount ?? 0),
    commissionPayable: Number(commPayableAgg._sum.amount ?? 0),
    activeCoupons,
    activeLinks,
  };
}
