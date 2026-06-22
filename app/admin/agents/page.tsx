import { DashboardShell } from "@/components/dashboard-shell";
import { AdminAgentManagementWorkspace, type AgentManagementAgent } from "@/components/admin-agent-management-workspace";
import { defaultPricing } from "@/lib/pricing";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

type MoneyBucket = {
  usd: number;
  mvr: number;
  mvrEquivalent: number;
};

export default async function AgentsPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const agents = await getDb().agent.findMany({
    include: {
      user: true,
      rates: { orderBy: { name: "asc" } },
      commissions: true,
      bookings: {
        include: { customer: true, timeSlot: true },
        orderBy: { createdAt: "desc" }
      }
    },
    orderBy: { agencyName: "asc" }
  });

  const mappedAgents: AgentManagementAgent[] = agents.map((agent) => {
    const paidBookings = agent.bookings.filter((booking) => booking.paymentStatus === "PAID");
    const sales = paidBookings.reduce(addMoneyFromBooking, emptyMoney());
    const pendingCommission = agent.commissions.filter((commission) => ["PENDING", "ELIGIBLE", "APPROVED"].includes(commission.status)).reduce((sum, commission) => sum + Number(commission.amount), 0);
    const paidCommission = agent.commissions.filter((commission) => commission.status === "PAID").reduce((sum, commission) => sum + Number(commission.amount), 0);

    return {
      id: agent.id,
      userId: agent.userId,
      agencyName: agent.agencyName,
      contactName: agent.user.name ?? "",
      email: agent.user.email,
      phone: "",
      commissionPercent: agent.commissionPercent.toString(),
      isActive: agent.user.isActive,
      isApproved: agent.isApproved,
      isSuspended: agent.isSuspended,
      bookingsCount: agent.bookings.length,
      commissionsCount: agent.commissions.length,
      ratesCount: agent.rates.length,
      rateLabel: agent.rates.length ? agent.rates.map((rate) => `${rate.name}: ${rate.currency} ${Number(rate.price).toFixed(2)}`).join(", ") : "Default Rate",
      rates: agent.rates.map((rate) => ({
        id: rate.id,
        name: rate.name,
        price: Number(rate.price),
        currency: rate.currency,
        validFrom: rate.validFrom?.toISOString() ?? null,
        validTo: rate.validTo?.toISOString() ?? null
      })),
      performance: {
        name: agent.agencyName || agent.user.name || agent.user.email,
        bookings: agent.bookings.length,
        sales,
        pendingCommission,
        paidCommission,
        payableCommission: pendingCommission
      },
      recentBookings: agent.bookings.slice(0, 8).map((booking) => ({
        id: booking.id,
        reference: booking.reference,
        customerName: booking.customer.name,
        date: booking.date.toISOString(),
        timeSlot: booking.timeSlot.label,
        amount: Number(booking.totalAmount),
        currency: booking.currency,
        paymentStatus: booking.paymentStatus,
        bookingStatus: booking.bookingStatus
      }))
    };
  });

  return (
    <DashboardShell title="Agent Management" subtitle="Manage agent profiles, rates, and commission." nav={["Agents"]} showSignOut>
      <Messages message={params.message} error={params.error} />
      <AdminAgentManagementWorkspace agents={mappedAgents} exchangeRate={defaultPricing.exchangeRateMvrPerUsd} />
    </DashboardShell>
  );
}

function emptyMoney(): MoneyBucket {
  return { usd: 0, mvr: 0, mvrEquivalent: 0 };
}

function addMoney(bucket: MoneyBucket, value: MoneyBucket) {
  bucket.usd += value.usd;
  bucket.mvr += value.mvr;
  bucket.mvrEquivalent += value.mvrEquivalent;
  return bucket;
}

function addMoneyFromBooking<T extends { totalAmount: unknown; currency: string }>(bucket: MoneyBucket, booking: T) {
  const amount = Number(booking.totalAmount);
  if (booking.currency === "MVR") {
    return addMoney(bucket, { usd: 0, mvr: amount, mvrEquivalent: amount });
  }

  return addMoney(bucket, { usd: amount, mvr: 0, mvrEquivalent: amount * defaultPricing.exchangeRateMvrPerUsd });
}

function Messages({ message, error }: { message?: string; error?: string }) {
  return (
    <div className="mb-4 grid gap-3">
      {message ? <p className="rounded-2xl bg-white p-4 text-sm font-bold text-ocean-700 shadow-sm">{message}</p> : null}
      {error ? <p className="rounded-2xl bg-white p-4 text-sm font-bold text-red-600 shadow-sm">{error}</p> : null}
    </div>
  );
}
