import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/actions";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { formatCurrency, formatDate, bookingStatusColor, paymentStatusColor } from "@/lib/utils";
import { CalendarCheck, DollarSign, TrendingUp, Users } from "lucide-react";

export const metadata: Metadata = { title: "Dashboard | Agent Portal" };

export default async function AgentDashboardPage() {
  const user = await requireRole([UserRole.AGENT]);

  const agent = await prisma.agent.findUnique({
    where: { userId: user.id },
    select: { id: true, businessName: true, commissionRate: true },
  });

  if (!agent) return null;

  const [totalBookings, upcomingBookings, completedBookings, recentBookings] =
    await Promise.all([
      prisma.booking.count({ where: { agentId: agent.id } }),
      prisma.booking.count({
        where: { agentId: agent.id, bookingStatus: "CONFIRMED", bookingDate: { gte: new Date() } },
      }),
      prisma.booking.count({ where: { agentId: agent.id, bookingStatus: "COMPLETED" } }),
      prisma.booking.findMany({
        where: { agentId: agent.id },
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          customer: { select: { name: true, phone: true } },
          package:  { select: { name: true } },
          slot:     { select: { startTime: true } },
        },
      }),
    ]);

  const totalSalesAgg = await prisma.booking.aggregate({
    where: { agentId: agent.id, paymentStatus: "PAID" },
    _sum: { total: true },
  });

  const commissionAgg = await prisma.agentCommission.aggregate({
    where: { agentId: agent.id },
    _sum: { amount: true },
  });

  const commissionPayableAgg = await prisma.agentCommission.aggregate({
    where: { agentId: agent.id, status: "PENDING" },
    _sum: { amount: true },
  });

  const totalSales          = Number(totalSalesAgg._sum.total ?? 0);
  const commissionEarned    = Number(commissionAgg._sum.amount ?? 0);
  const commissionPayable   = Number(commissionPayableAgg._sum.amount ?? 0);

  return (
    <div>
      <PageHeader
        title={`Welcome, ${user.name}`}
        description={agent.businessName}
      />

      <div className="p-6 space-y-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total bookings"       value={totalBookings}              icon={CalendarCheck} iconColor="text-sky-500" />
          <StatCard title="Upcoming"             value={upcomingBookings}           icon={TrendingUp}    iconColor="text-brand-citrus" />
          <StatCard title="Total sales"          value={formatCurrency(totalSales)} icon={DollarSign}    iconColor="text-brand-lime" subtitle="From paid bookings" />
          <StatCard title="Commission payable"   value={formatCurrency(commissionPayable)} icon={DollarSign} iconColor="text-brand-coral" subtitle="Pending payout" />
        </div>

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
                    <th>Package</th>
                    <th>Status</th>
                    <th>Payment</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {recentBookings.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-muted-foreground text-sm">
                        No bookings yet. Create your first booking to get started.
                      </td>
                    </tr>
                  ) : (
                    recentBookings.map((b) => (
                      <tr key={b.id} className="table-row-hover">
                        <td><span className="font-mono text-xs font-semibold text-sky-500">{b.reference}</span></td>
                        <td>
                          <div>
                            <p className="text-sm font-medium">{b.customer.name}</p>
                            <p className="text-xs text-muted-foreground">{b.customer.phone}</p>
                          </div>
                        </td>
                        <td className="text-sm">{formatDate(b.bookingDate)}</td>
                        <td className="text-sm">{b.package.name}</td>
                        <td><span className={`status-badge ${bookingStatusColor(b.bookingStatus)}`}>{b.bookingStatus.replace("_"," ")}</span></td>
                        <td><span className={`status-badge ${paymentStatusColor(b.paymentStatus)}`}>{b.paymentStatus.replace("_"," ")}</span></td>
                        <td className="font-semibold text-sm">{formatCurrency(Number(b.total), b.currency)}</td>
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
