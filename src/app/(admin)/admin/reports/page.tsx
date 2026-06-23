import type { Metadata } from "next";
import { prisma } from "@/lib/prisma/client";
import { requireRole } from "@/lib/auth/actions";
import { FINANCE_ACCESS } from "@/lib/auth/roles";
import { PageHeader } from "@/components/shared/page-header";
import { ReportsHub } from "@/components/admin/reports/reports-hub";
import { subDays, startOfDay, endOfDay, startOfMonth, format } from "date-fns";

export const metadata: Metadata = { title: "Reports | Admin" };

async function getReportsData(from?: string, to?: string) {
  const dateFrom = from ? startOfDay(new Date(from)) : startOfMonth(new Date());
  const dateTo   = to   ? endOfDay(new Date(to))     : endOfDay(new Date());

  const where = { bookingDate: { gte: dateFrom, lte: dateTo } };
  const paidWhere = { ...where, paymentStatus: "PAID" as const };

  const [
    bookingsByStatus,
    bookingsBySource,
    revenueBySource,
    revenueByPackage,
    revenueByAddOn,
    agentCommissions,
    affiliateCommissions,
    dailyRevenue,
    totalBookings,
    totalRevenue,
  ] = await Promise.all([
    // Bookings by status
    prisma.booking.groupBy({ by: ["bookingStatus"], _count: true, where }),
    // Bookings by source
    prisma.booking.groupBy({ by: ["source"], _count: true, where }),
    // Revenue by source
    prisma.booking.groupBy({ by: ["source"], _sum: { total: true }, where: paidWhere }),
    // Revenue by package
    prisma.booking.groupBy({ by: ["packageId"], _sum: { total: true }, _count: true, where: paidWhere }),
    // Add-on revenue
    prisma.bookingAddOn.groupBy({ by: ["addOnId"], _sum: { total: true }, _count: true }),
    // Agent commissions
    prisma.agentCommission.groupBy({ by: ["status"], _sum: { amount: true }, _count: true }),
    // Affiliate commissions
    prisma.affiliateCommission.groupBy({ by: ["status"], _sum: { amount: true }, _count: true }),
    // Daily revenue (last 30 days)
    prisma.booking.groupBy({
      by: ["bookingDate"],
      _sum: { total: true },
      _count: true,
      where: { bookingDate: { gte: subDays(new Date(), 30) }, paymentStatus: "PAID" },
      orderBy: { bookingDate: "asc" },
    }),
    // Totals
    prisma.booking.count({ where }),
    prisma.booking.aggregate({ where: paidWhere, _sum: { total: true } }),
  ]);

  // Enrich package names
  const packageIds = revenueByPackage.map((r) => r.packageId);
  const packages   = await prisma.package.findMany({ where: { id: { in: packageIds } }, select: { id: true, name: true } });
  const pkgMap     = Object.fromEntries(packages.map((p) => [p.id, p.name]));

  // Enrich add-on names
  const addOnIds = revenueByAddOn.map((r) => r.addOnId);
  const addOns   = await prisma.addOn.findMany({ where: { id: { in: addOnIds } }, select: { id: true, name: true } });
  const addOnMap = Object.fromEntries(addOns.map((a) => [a.id, a.name]));

  return {
    dateFrom: format(dateFrom, "yyyy-MM-dd"),
    dateTo:   format(dateTo,   "yyyy-MM-dd"),
    totalBookings,
    totalRevenue: Number(totalRevenue._sum.total ?? 0),
    bookingsByStatus: bookingsByStatus.map((r) => ({ status: r.bookingStatus, count: r._count })),
    bookingsBySource: bookingsBySource.map((r) => ({ source: r.source, count: r._count })),
    revenueBySource:  revenueBySource.map((r) => ({ source: r.source, total: Number(r._sum.total ?? 0) })),
    revenueByPackage: revenueByPackage.map((r) => ({
      packageId: r.packageId, name: pkgMap[r.packageId] ?? r.packageId,
      total: Number(r._sum.total ?? 0), bookings: r._count,
    })),
    revenueByAddOn: revenueByAddOn.map((r) => ({
      addOnId: r.addOnId, name: addOnMap[r.addOnId] ?? r.addOnId,
      total: Number(r._sum.total ?? 0), count: r._count,
    })),
    agentCommissions: agentCommissions.map((r) => ({ status: r.status, total: Number(r._sum.amount ?? 0), count: r._count })),
    affiliateCommissions: affiliateCommissions.map((r) => ({ status: r.status, total: Number(r._sum.amount ?? 0), count: r._count })),
    dailyRevenue: dailyRevenue.map((r) => ({
      date:  format(r.bookingDate, "dd MMM"),
      total: Number(r._sum.total ?? 0),
      bookings: r._count,
    })),
  };
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string };
}) {
  await requireRole(FINANCE_ACCESS as any);
  const data = await getReportsData(searchParams.from, searchParams.to);
  return (
    <div>
      <PageHeader title="Reports" description="Sales, bookings, commissions, and operational analytics." />
      <ReportsHub data={data} />
    </div>
  );
}
