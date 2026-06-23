import type { Metadata } from "next";
import {
  CalendarCheck, DollarSign, Users, TrendingUp,
  UserCheck, Handshake, Image, AlertTriangle,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { requireRole } from "@/lib/auth/actions";
import { ADMIN_ROLES } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { bookingStatusColor, paymentStatusColor, sourceColor } from "@/lib/utils";
import { BookingStatus, PaymentStatus } from "@prisma/client";

export const metadata: Metadata = { title: "Dashboard | Admin" };

async function getDashboardData() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [
    todayBookings,
    upcomingBookings,
    pendingMedia,
    recentBookings,
    agentCount,
    affiliateCount,
    pendingAgents,
    pendingAffiliates,
  ] = await Promise.all([
    prisma.booking.count({
      where: { bookingDate: { gte: today, lt: tomorrow } },
    }),
    prisma.booking.count({
      where: {
        bookingDate: { gte: tomorrow },
        bookingStatus: { in: [BookingStatus.CONFIRMED] },
      },
    }),
    prisma.booking.count({
      where: {
        mediaStatus: { in: ["PENDING", "PROCESSING"] },
      },
    }),
    prisma.booking.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        customer: { select: { name: true, phone: true } },
        package:  { select: { name: true } },
        slot:     { select: { startTime: true } },
        agent:    { select: { businessName: true } },
      },
    }),
    prisma.agent.count({ where: { status: "APPROVED" } }),
    prisma.affiliate.count({ where: { status: "APPROVED" } }),
    prisma.agentApplication.count({ where: { status: "PENDING" } }),
    prisma.affiliateApplication.count({ where: { status: "PENDING" } }),
  ]);

  // Revenue aggregates
  const revenueAgg = await prisma.booking.groupBy({
    by: ["source"],
    _sum: { total: true },
    where: { paymentStatus: PaymentStatus.PAID },
  });

  const revenueMap: Record<string, number> = {};
  for (const r of revenueAgg) {
    revenueMap[r.source] = Number(r._sum.total ?? 0);
  }

  return {
    todayBookings,
    upcomingBookings,
    pendingMedia,
    recentBookings,
    agentCount,
    affiliateCount,
    pendingAgents,
    pendingAffiliates,
    revenue: {
      direct:    revenueMap.DIRECT    ?? 0,
      walkIn:    revenueMap.WALK_IN   ?? 0,
      agent:     revenueMap.AGENT     ?? 0,
      affiliate: revenueMap.AFFILIATE ?? 0,
    },
  };
}

export default async function AdminDashboardPage() {
  await requireRole(ADMIN_ROLES as any);
  const data = await getDashboardData();

  const totalRevenue =
    data.revenue.direct + data.revenue.walkIn +
    data.revenue.agent + data.revenue.affiliate;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={`${formatDate(new Date())} · Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}`}
      />

      <div className="p-6 space-y-8">
        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Today's bookings"
            value={data.todayBookings}
            icon={CalendarCheck}
            iconColor="text-brand-citrus"
            subtitle="Scheduled for today"
          />
          <StatCard
            title="Upcoming"
            value={data.upcomingBookings}
            icon={TrendingUp}
            iconColor="text-brand-ocean"
            subtitle="Confirmed ahead"
          />
          <StatCard
            title="Total revenue"
            value={formatCurrency(totalRevenue)}
            icon={DollarSign}
            iconColor="text-brand-lime"
            subtitle="All paid bookings"
          />
          <StatCard
            title="Pending media"
            value={data.pendingMedia}
            icon={Image}
            iconColor="text-brand-coral"
            subtitle="Awaiting delivery"
          />
        </div>

        {/* Revenue breakdown */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Revenue by source
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Direct",    value: data.revenue.direct,    color: "text-brand-turquoise" },
              { label: "Walk-in",   value: data.revenue.walkIn,    color: "text-brand-mango" },
              { label: "Agent",     value: data.revenue.agent,     color: "text-brand-ocean" },
              { label: "Affiliate", value: data.revenue.affiliate, color: "text-brand-citrus" },
            ].map((src) => (
              <div key={src.label} className="admin-card space-y-1">
                <p className="text-xs text-muted-foreground">{src.label}</p>
                <p className={`text-xl font-display font-bold ${src.color}`}>
                  {formatCurrency(src.value)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Partners quick stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Active agents"     value={data.agentCount}         icon={UserCheck}  iconColor="text-sky-500" />
          <StatCard title="Active affiliates" value={data.affiliateCount}     icon={Handshake}  iconColor="text-brand-citrus" />
          <StatCard title="Pending agents"    value={data.pendingAgents}      icon={AlertTriangle} iconColor="text-orange-500" />
          <StatCard title="Pending affiliates"value={data.pendingAffiliates}  icon={AlertTriangle} iconColor="text-orange-500" />
        </div>

        {/* Recent bookings table */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Recent bookings
          </h2>
          <div className="admin-card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Customer</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Package</th>
                    <th>Source</th>
                    <th>Status</th>
                    <th>Payment</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentBookings.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-12 text-muted-foreground text-sm">
                        No bookings yet. They'll appear here once customers start booking.
                      </td>
                    </tr>
                  ) : (
                    data.recentBookings.map((b) => (
                      <tr key={b.id} className="table-row-hover">
                        <td>
                          <span className="font-mono text-xs font-semibold text-brand-citrus">
                            {b.reference}
                          </span>
                        </td>
                        <td>
                          <div>
                            <p className="text-sm font-medium">{b.customer.name}</p>
                            <p className="text-xs text-muted-foreground">{b.customer.phone}</p>
                          </div>
                        </td>
                        <td className="text-sm">{formatDate(b.bookingDate)}</td>
                        <td className="text-sm text-muted-foreground">{b.slot.startTime}</td>
                        <td className="text-sm">{b.package.name}</td>
                        <td>
                          <span className={`status-badge text-xs ${sourceColor(b.source)}`}>
                            {b.source.replace("_", " ")}
                            {b.agent && ` · ${b.agent.businessName}`}
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge ${bookingStatusColor(b.bookingStatus)}`}>
                            {b.bookingStatus.replace("_", " ")}
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge ${paymentStatusColor(b.paymentStatus)}`}>
                            {b.paymentStatus.replace("_", " ")}
                          </span>
                        </td>
                        <td className="font-semibold text-sm">
                          {formatCurrency(Number(b.total), b.currency)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
