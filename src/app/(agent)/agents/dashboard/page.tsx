import type { Metadata } from "next";
import Link from "next/link";
import { Plus, ArrowRight, TrendingUp, CalendarCheck, DollarSign, Users } from "lucide-react";
import { getApprovedAgent, getAgentStats } from "@/lib/agent/helpers";
import { prisma } from "@/lib/prisma/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { formatCurrency, formatDate, bookingStatusColor, paymentStatusColor, cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard | Agent Portal" };

export default async function AgentDashboardPage() {
  const { user, agent } = await getApprovedAgent();
  const stats = await getAgentStats(agent.id);

  // Recent bookings
  const recentBookings = await prisma.booking.findMany({
    where:   { agentId: agent.id },
    orderBy: { createdAt: "desc" },
    take:    8,
    include: {
      customer:        { select: { name: true, phone: true } },
      package:         { select: { name: true } },
      slot:            { select: { startTime: true } },
      agentCommission: { select: { amount: true } },
    },
  });

  // Upcoming bookings
  const upcomingBookings = await prisma.booking.findMany({
    where:   { agentId: agent.id, bookingStatus: "CONFIRMED", bookingDate: { gte: new Date() } },
    orderBy: { bookingDate: "asc" },
    take:    5,
    include: {
      customer: { select: { name: true } },
      slot:     { select: { startTime: true } },
    },
  });

  return (
    <div>
      <PageHeader
        title={`Welcome, ${user.name}`}
        description={agent.businessName}
        actions={
          <Link href="/agents/bookings/new" className="btn-brand text-sm px-4 py-2">
            <Plus className="w-4 h-4" /> New booking
          </Link>
        }
      />

      <div className="p-6 space-y-8">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total bookings"     value={stats.totalBookings}               icon={CalendarCheck} iconColor="text-sky-500" />
          <StatCard title="Upcoming"           value={stats.upcomingBookings}            icon={TrendingUp}    iconColor="text-brand-citrus" subtitle="Confirmed ahead" />
          <StatCard title="Total sales"        value={formatCurrency(stats.totalSales)}  icon={DollarSign}    iconColor="text-brand-lime"   subtitle="Paid bookings" />
          <StatCard title="Commission payable" value={formatCurrency(stats.commissionPayable)} icon={DollarSign} iconColor="text-brand-coral" subtitle="Pending payout" />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Upcoming */}
          <div className="admin-card space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm">Upcoming rides</p>
              <Link href="/agents/bookings?status=CONFIRMED" className="text-xs text-primary hover:underline">View all</Link>
            </div>
            {upcomingBookings.length === 0 ? (
              <div className="text-center py-8 space-y-3">
                <p className="text-sm text-muted-foreground">No upcoming bookings.</p>
                <Link href="/agents/bookings/new" className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
                  <Plus className="w-3.5 h-3.5" /> Create one now
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingBookings.map((b) => (
                  <div key={b.id} className="flex items-center justify-between p-3 bg-muted/40 rounded-xl">
                    <div>
                      <p className="text-sm font-medium">{b.customer.name}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(b.bookingDate)} · {b.slot.startTime}</p>
                    </div>
                    <span className="text-xs font-mono text-primary">{(b as any).reference}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent bookings mini-table */}
          <div className="lg:col-span-2 admin-card p-0 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <p className="font-semibold text-sm">Recent bookings</p>
              <Link href="/agents/bookings" className="flex items-center gap-1 text-xs text-primary hover:underline">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <table className="admin-table">
              <thead>
                <tr><th>Reference</th><th>Customer</th><th>Date</th><th>Status</th><th>Commission</th></tr>
              </thead>
              <tbody>
                {recentBookings.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-sm text-muted-foreground">
                      No bookings yet.
                    </td>
                  </tr>
                ) : (
                  recentBookings.map((b) => (
                    <tr key={b.id} className="table-row-hover">
                      <td>
                        <Link href={`/agents/bookings`} className="font-mono text-xs font-bold text-primary hover:underline">
                          {(b as any).reference}
                        </Link>
                      </td>
                      <td>
                        <p className="text-sm">{b.customer.name}</p>
                        <p className="text-xs text-muted-foreground">{b.customer.phone}</p>
                      </td>
                      <td>
                        <p className="text-sm">{formatDate(b.bookingDate)}</p>
                        <p className="text-xs text-muted-foreground">{b.slot.startTime}</p>
                      </td>
                      <td>
                        <span className={`status-badge text-xs ${bookingStatusColor((b as any).bookingStatus)}`}>
                          {(b as any).bookingStatus.replace("_", " ")}
                        </span>
                      </td>
                      <td>
                        {b.agentCommission
                          ? <span className="text-sm font-semibold text-primary">{formatCurrency(Number(b.agentCommission.amount))}</span>
                          : <span className="text-muted-foreground text-sm">—</span>
                        }
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Info panel */}
        <div className="admin-card bg-sky-50 dark:bg-sky-900/10 border-sky-200 dark:border-sky-800 space-y-3">
          <p className="font-semibold text-sm text-sky-900 dark:text-sky-400">Agent portal tips</p>
          <div className="grid sm:grid-cols-3 gap-4 text-sm text-sky-800 dark:text-sky-300">
            {[
              { icon: Plus,          text: `Create bookings for your customers — your commission of ${agent.commissionRate}% is calculated automatically.` },
              { icon: Users,         text: "All bookings you create are linked to your account. Customers are tracked as yours." },
              { icon: CalendarCheck, text: "Share the booking confirmation link or QR code with your customers before their ride day." },
            ].map((tip, i) => {
              const Icon = tip.icon;
              return (
                <div key={i} className="flex items-start gap-2.5">
                  <Icon className="w-4 h-4 flex-shrink-0 mt-0.5 text-sky-600 dark:text-sky-400" />
                  <p>{tip.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
