import Link from "next/link";
import { DashboardShell } from "@/components/dashboard-shell";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const db = getDb();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [todayBookings, pendingBookings, pendingCommissions, agents, affiliates, revenue] = await Promise.all([
    db.booking.count({ where: { createdAt: { gte: today } } }),
    db.booking.count({ where: { bookingStatus: "PENDING" } }),
    db.commission.count({ where: { status: { in: ["PENDING", "ELIGIBLE"] } } }),
    db.agent.count(),
    db.affiliate.count(),
    db.booking.aggregate({ _sum: { totalAmount: true }, where: { paymentStatus: "PAID" } })
  ]);

  const metrics = [
    { label: "Today bookings", value: String(todayBookings), trend: `${pendingBookings} pending` },
    { label: "Paid revenue", value: `$${revenue._sum.totalAmount?.toFixed(2) ?? "0.00"}`, trend: "All paid bookings" },
    { label: "Pending commission", value: String(pendingCommissions), trend: "Needs review" },
    { label: "Partners", value: String(agents + affiliates), trend: `${agents} agents / ${affiliates} affiliates` }
  ];

  return (
    <DashboardShell title="Admin dashboard" subtitle="Manage bookings, customers, agents, affiliates, pricing, time slots, media, commissions, reports, roles, themes, and audit logs." nav={["Bookings", "Customers", "Agents", "Affiliates", "Pricing", "Media", "Commission", "Reports", "Theme", "Roles"]} showSignOut>
      <div className="grid gap-5 md:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-lg bg-white p-6 shadow-sm">
            <p className="text-sm font-bold text-ocean-950/55">{metric.label}</p>
            <p className="mt-2 text-3xl font-black">{metric.value}</p>
            <p className="mt-1 text-sm font-bold text-ocean-700">{metric.trend}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-6">
        {[
          ["/admin/bookings", "Booking management"],
          ["/admin/customers", "Customer management"],
          ["/admin/agents", "Agent management"],
          ["/admin/affiliates", "Affiliate management"],
          ["/admin/pricing", "Pricing management"],
          ["/admin/media", "Media management"],
          ["/admin/commissions", "Commission management"],
          ["/admin/reports", "Reports"],
          ["/admin/theme", "Theme settings"],
          ["/admin/roles", "Role approvals"]
        ].map(([href, label]) => (
          <Link key={href} href={href} className="rounded-lg bg-white p-5 font-black shadow-sm">{label}</Link>
        ))}
      </div>
    </DashboardShell>
  );
}
