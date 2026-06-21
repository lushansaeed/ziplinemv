import Link from "next/link";
import { CalendarCheck, Camera, DollarSign, FileText, TicketCheck, Users, WalletCards, Waves, type LucideIcon } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { ActionButton, DashboardTable, DataCard, ProgressBar, StatCard, StatusBadge } from "@/components/dashboard-ui";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const db = getDb();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [
    todayBookings,
    monthBookings,
    pendingBookings,
    confirmedBookings,
    completedBookings,
    cancelledBookings,
    pendingCommissions,
    agents,
    affiliates,
    revenue,
    agentSales,
    affiliateSales,
    recentBookings,
    mediaCount
  ] = await Promise.all([
    db.booking.count({ where: { createdAt: { gte: today } } }),
    db.booking.count({ where: { createdAt: { gte: monthStart } } }),
    db.booking.count({ where: { bookingStatus: "PENDING" } }),
    db.booking.count({ where: { bookingStatus: "CONFIRMED" } }),
    db.booking.count({ where: { bookingStatus: "COMPLETED" } }),
    db.booking.count({ where: { bookingStatus: "CANCELLED" } }),
    db.commission.count({ where: { status: { in: ["PENDING", "ELIGIBLE"] } } }),
    db.agent.count(),
    db.affiliate.count(),
    db.booking.aggregate({ _sum: { totalAmount: true }, where: { paymentStatus: "PAID" } }),
    db.booking.aggregate({ _sum: { totalAmount: true }, where: { agentId: { not: null }, paymentStatus: "PAID" } }),
    db.booking.aggregate({ _sum: { totalAmount: true }, where: { affiliateId: { not: null }, paymentStatus: "PAID" } }),
    db.booking.findMany({
      include: { customer: true, timeSlot: true, agent: true, affiliate: true },
      orderBy: { createdAt: "desc" },
      take: 6
    }),
    db.mediaFile.count()
  ]);

  const totalTrackedStatuses = Math.max(pendingBookings + confirmedBookings + completedBookings + cancelledBookings, 1);
  const paidRevenue = revenue._sum.totalAmount?.toFixed(2) ?? "0.00";
  const metrics = [
    { label: "Today's bookings", value: String(todayBookings), detail: `${pendingBookings} pending approval`, icon: CalendarCheck, tone: "lagoon" as const },
    { label: "Monthly revenue", value: `$${paidRevenue}`, detail: `${monthBookings} bookings this month`, icon: DollarSign, tone: "mint" as const },
    { label: "Commission payable", value: String(pendingCommissions), detail: "Pending or eligible items", icon: WalletCards, tone: "sunset" as const },
    { label: "Sales partners", value: String(agents + affiliates), detail: `${agents} agents / ${affiliates} affiliates`, icon: Users, tone: "ocean" as const }
  ];
  const quickActions: Array<[string, string, LucideIcon]> = [
    ["/admin/bookings", "Bookings", CalendarCheck],
    ["/admin/pricing", "Pricing and slots", TicketCheck],
    ["/admin/commissions", "Commissions", WalletCards],
    ["/admin/reports", "Reports", FileText]
  ];

  return (
    <DashboardShell
      title="Admin dashboard"
      subtitle="Manage bookings, customers, agents, affiliates, pricing, time slots, media, commissions, reports, roles, themes, and audit logs."
      nav={["Dashboard", "Bookings", "Customers", "Agents", "Affiliates", "Pricing", "Media", "Commission", "Reports", "Theme", "Roles"]}
      showSignOut
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => <StatCard key={metric.label} {...metric} />)}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <DataCard title="Recent bookings" eyebrow="Live operations" action={<ActionButton href="/admin/bookings">Manage bookings</ActionButton>}>
          <DashboardTable
            columns={["Reference", "Customer", "Date", "Source", "Status", "Amount"]}
            rows={recentBookings.map((booking) => [
              <span key="ref" className="font-black text-ocean-950">{booking.reference}</span>,
              booking.customer.name,
              booking.date.toISOString().slice(0, 10),
              booking.agent ? "Agent" : booking.affiliate ? "Affiliate" : "Direct",
              <StatusBadge key="status" status={booking.bookingStatus} />,
              `${booking.currency} ${booking.totalAmount.toFixed(2)}`
            ])}
          />
        </DataCard>

        <DataCard title="Booking status overview" eyebrow="Pipeline">
          <div className="grid gap-4">
            <ProgressBar label={`Pending (${pendingBookings})`} value={Math.round((pendingBookings / totalTrackedStatuses) * 100)} />
            <ProgressBar label={`Confirmed (${confirmedBookings})`} value={Math.round((confirmedBookings / totalTrackedStatuses) * 100)} />
            <ProgressBar label={`Completed (${completedBookings})`} value={Math.round((completedBookings / totalTrackedStatuses) * 100)} />
            <ProgressBar label={`Cancelled (${cancelledBookings})`} value={Math.round((cancelledBookings / totalTrackedStatuses) * 100)} />
          </div>
        </DataCard>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <DataCard title="Revenue overview" eyebrow="Paid sales">
          <div className="grid gap-3">
            {[
              ["Direct + all channels", `$${paidRevenue}`],
              ["Agent sales", `$${agentSales._sum.totalAmount?.toFixed(2) ?? "0.00"}`],
              ["Affiliate sales", `$${affiliateSales._sum.totalAmount?.toFixed(2) ?? "0.00"}`]
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between rounded-2xl bg-white/65 p-4">
                <span className="text-sm font-black text-ocean-950/55">{label}</span>
                <span className="text-xl font-black text-ocean-950">{value}</span>
              </div>
            ))}
          </div>
        </DataCard>

        <DataCard title="Media upload status" eyebrow="Content">
          <div className="rounded-2xl bg-gradient-to-br from-ocean-950 to-ocean-700 p-5 text-white">
            <Camera className="h-6 w-6 text-lagoon" />
            <p className="mt-4 text-4xl font-black">{mediaCount}</p>
            <p className="mt-1 text-sm font-bold text-white/65">Media files currently managed in the admin library.</p>
            <div className="mt-5">
              <ActionButton href="/admin/media" variant="soft">Open media</ActionButton>
            </div>
          </div>
        </DataCard>

        <DataCard title="Quick actions" eyebrow="Admin tools">
          <div className="grid gap-3">
            {quickActions.map(([href, label, Icon]) => (
              <Link key={href} href={href} className="flex items-center justify-between rounded-2xl bg-white/65 p-4 font-black text-ocean-950 transition hover:bg-white">
                <span className="flex items-center gap-3">
                  <span className="rounded-xl bg-ocean-50 p-2 text-ocean-700">
                    <Icon className="h-4 w-4" />
                  </span>
                  {label}
                </span>
                <Waves className="h-4 w-4 text-lagoon" />
              </Link>
            ))}
          </div>
        </DataCard>
      </div>
    </DashboardShell>
  );
}
