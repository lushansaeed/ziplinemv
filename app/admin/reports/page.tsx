import { DashboardShell } from "@/components/dashboard-shell";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const db = getDb();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [dailyBookings, monthlyBookings, paidRevenue, addonSales, agentBookings, affiliateBookings, payableCommissions, cancelledBookings, customers] = await Promise.all([
    db.booking.count({ where: { createdAt: { gte: today } } }),
    db.booking.count({ where: { createdAt: { gte: monthStart } } }),
    db.booking.aggregate({ _sum: { totalAmount: true }, where: { paymentStatus: "PAID" } }),
    db.bookingAddon.aggregate({ _sum: { price: true } }),
    db.booking.count({ where: { agentId: { not: null } } }),
    db.booking.count({ where: { affiliateId: { not: null } } }),
    db.commission.aggregate({ _sum: { amount: true }, where: { status: { in: ["ELIGIBLE", "APPROVED"] } } }),
    db.booking.count({ where: { bookingStatus: "CANCELLED" } }),
    db.customer.findMany({ select: { nationality: true } })
  ]);

  const nationalityCounts = customers.reduce<Record<string, number>>((counts, customer) => {
    const key = customer.nationality || "Unknown";
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});

  const reports = [
    { label: "Daily bookings", value: String(dailyBookings), detail: "Created today" },
    { label: "Monthly bookings", value: String(monthlyBookings), detail: "Created this month" },
    { label: "Revenue", value: `USD ${paidRevenue._sum.totalAmount?.toFixed(2) ?? "0.00"}`, detail: "Paid bookings" },
    { label: "Add-on sales", value: `USD ${addonSales._sum.price?.toFixed(2) ?? "0.00"}`, detail: "All add-ons" },
    { label: "Agent sales", value: String(agentBookings), detail: "Bookings with agent" },
    { label: "Affiliate sales", value: String(affiliateBookings), detail: "Bookings with affiliate" },
    { label: "Commission payable", value: `USD ${payableCommissions._sum.amount?.toFixed(2) ?? "0.00"}`, detail: "Eligible or approved" },
    { label: "Cancelled bookings", value: String(cancelledBookings), detail: "Cancelled status" }
  ];

  return (
    <DashboardShell title="Reports" subtitle="Export operational reports to CSV or Excel for finance, sales, and booking staff." nav={["Daily", "Monthly", "Revenue", "CSV", "Excel"]} showSignOut>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => (
          <div key={report.label} className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black">{report.label}</h2>
            <p className="mt-3 text-3xl font-black">{report.value}</p>
            <p className="mt-1 text-sm font-bold text-ocean-950/60">{report.detail}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 rounded-lg bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-black">Customer nationality</h2>
        <div className="mt-4 grid gap-2 md:grid-cols-3">
          {Object.entries(nationalityCounts).length ? Object.entries(nationalityCounts).map(([nationality, count]) => (
            <div key={nationality} className="rounded-lg bg-ocean-50 p-4">
              <p className="font-black">{nationality}</p>
              <p className="text-sm font-bold text-ocean-950/60">{count} customers</p>
            </div>
          )) : <p className="text-sm font-bold text-ocean-950/60">No customer data yet.</p>}
        </div>
      </div>
    </DashboardShell>
  );
}
