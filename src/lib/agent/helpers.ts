import { prisma } from "@/lib/prisma/client";
import { requireRole } from "@/lib/auth/actions";
import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";

/** Resolves the current user → their agent record. Redirects if not approved. */
export async function getApprovedAgent() {
  const user = await requireRole([UserRole.AGENT]);

  const agent = await prisma.agent.findUnique({
    where: { userId: user.id },
    select: {
      id: true, businessName: true, contactPerson: true,
      email: true, phone: true, island: true,
      commissionRate: true, commissionBasis: true,
      touristCommissionType: true, touristCommissionValue: true,
      localCommissionType: true, localCommissionValue: true,
      addOnCommissionType: true, addOnCommissionValue: true,
      canMakeUnpaidBookings: true, status: true,
    },
  });

  if (!agent || agent.status !== "APPROVED") {
    redirect("/auth/login?error=Your+agent+account+is+pending+approval.");
  }

  return { user, agent };
}

export async function getAgentStats(agentId: string) {
  const [
    totalBookings,
    upcomingBookings,
    completedBookings,
    cancelledBookings,
    salesAgg,
    commEarnedAgg,
    commPayableAgg,
  ] = await Promise.all([
    prisma.booking.count({ where: { agentId } }),
    prisma.booking.count({ where: { agentId, bookingStatus: "CONFIRMED", bookingDate: { gte: new Date() } } }),
    prisma.booking.count({ where: { agentId, bookingStatus: "COMPLETED" } }),
    prisma.booking.count({ where: { agentId, bookingStatus: "CANCELLED" } }),
    prisma.booking.aggregate({ where: { agentId, paymentStatus: "PAID" }, _sum: { total: true } }),
    prisma.agentCommission.aggregate({ where: { agentId }, _sum: { amount: true } }),
    prisma.agentCommission.aggregate({ where: { agentId, status: "PENDING" }, _sum: { amount: true } }),
  ]);

  return {
    totalBookings,
    upcomingBookings,
    completedBookings,
    cancelledBookings,
    totalSales:        Number(salesAgg._sum.total ?? 0),
    commissionEarned:  Number(commEarnedAgg._sum.amount ?? 0),
    commissionPayable: Number(commPayableAgg._sum.amount ?? 0),
  };
}
