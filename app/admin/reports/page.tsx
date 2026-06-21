import { DashboardShell } from "@/components/dashboard-shell";
import { defaultPricing } from "@/lib/pricing";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const db = getDb();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [dailyBookings, monthlyBookings, paidBookings, addonSales, agentBookings, affiliateBookings, payableCommissions, cancelledBookings, customers] = await Promise.all([
    db.booking.count({ where: { createdAt: { gte: today } } }),
    db.booking.count({ where: { createdAt: { gte: monthStart } } }),
    db.booking.findMany({ where: { paymentStatus: "PAID" }, select: { totalAmount: true, currency: true } }),
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
    { label: "Revenue", value: moneyLabel(paidBookings.reduce(addMoneyFromBooking, emptyMoney())), detail: usdDetail(paidBookings.reduce(addMoneyFromBooking, emptyMoney())) },
    { label: "Add-on sales", value: mvrFromUsdLabel(Number(addonSales._sum.price ?? 0)), detail: `USD ${Number(addonSales._sum.price ?? 0).toFixed(2)}` },
    { label: "Agent sales", value: String(agentBookings), detail: "Bookings with agent" },
    { label: "Affiliate sales", value: String(affiliateBookings), detail: "Bookings with affiliate" },
    { label: "Commission payable", value: mvrFromUsdLabel(Number(payableCommissions._sum.amount ?? 0)), detail: `USD ${Number(payableCommissions._sum.amount ?? 0).toFixed(2)}` },
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

type MoneyBucket = {
  usd: number;
  mvr: number;
  mvrEquivalent: number;
};

function emptyMoney(): MoneyBucket {
  return { usd: 0, mvr: 0, mvrEquivalent: 0 };
}

function addMoneyFromBooking<T extends { totalAmount: unknown; currency: string }>(bucket: MoneyBucket, booking: T) {
  const amount = Number(booking.totalAmount);
  if (booking.currency === "MVR") {
    bucket.mvr += amount;
    bucket.mvrEquivalent += amount;
  } else {
    bucket.usd += amount;
    bucket.mvrEquivalent += amount * defaultPricing.exchangeRateMvrPerUsd;
  }
  return bucket;
}

function moneyLabel(bucket: MoneyBucket) {
  return `MVR ${bucket.mvrEquivalent.toFixed(2)}`;
}

function usdDetail(bucket: MoneyBucket) {
  return bucket.usd > 0 ? `USD ${bucket.usd.toFixed(2)}` : "No USD sales";
}

function mvrFromUsdLabel(usd: number) {
  return `MVR ${(usd * defaultPricing.exchangeRateMvrPerUsd).toFixed(2)}`;
}
