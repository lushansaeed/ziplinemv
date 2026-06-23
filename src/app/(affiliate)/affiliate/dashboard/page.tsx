import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Link2, Tag, TrendingUp, MousePointerClick } from "lucide-react";
import { prisma } from "@/lib/prisma/client";
import { getApprovedAffiliate, getAffiliateStats } from "@/lib/affiliate/helpers";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { formatCurrency, formatDate, bookingStatusColor, cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard | Affiliate Portal" };

export default async function AffiliateDashboardPage() {
  const { user, affiliate } = await getApprovedAffiliate();
  const stats = await getAffiliateStats(affiliate.id);

  // Top links by clicks
  const topLinks = await prisma.affiliateLink.findMany({
    where:   { affiliateId: affiliate.id },
    orderBy: { clickCount: "desc" },
    take:    5,
  });

  // Active coupons
  const coupons = await prisma.affiliateCoupon.findMany({
    where:   { affiliateId: affiliate.id, status: "APPROVED" },
    orderBy: { createdAt: "desc" },
    take:    3,
  });

  // Recent conversions
  const recentConversions = await prisma.booking.findMany({
    where:   { affiliateId: affiliate.id },
    orderBy: { createdAt: "desc" },
    take:    6,
    include: {
      customer:           { select: { name: true } },
      package:            { select: { name: true } },
      affiliateCommission:{ select: { amount: true } },
    },
  });

  return (
    <div>
      <PageHeader
        title={`Welcome, ${user.name}`}
        description={affiliate.name}
      />

      <div className="p-6 space-y-8">
        {/* KPI grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total clicks"       value={stats.totalClicks}                  icon={MousePointerClick} iconColor="text-brand-citrus" />
          <StatCard title="Conversions"        value={stats.totalConversions}             icon={TrendingUp}        iconColor="text-brand-lime" />
          <StatCard title="Conversion rate"    value={`${stats.conversionRate}%`}        icon={TrendingUp}        iconColor="text-brand-ocean" subtitle="Clicks → bookings" />
          <StatCard title="Commission payable" value={formatCurrency(stats.commissionPayable)} icon={ArrowRight} iconColor="text-brand-coral" subtitle="Pending payout" />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Links performance */}
          <div className="admin-card space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm">Your referral links</p>
              <Link href="/affiliate/links" className="text-xs text-primary hover:underline flex items-center gap-1">
                Manage <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {topLinks.length === 0 ? (
              <div className="text-center py-8 space-y-3">
                <Link2 className="w-8 h-8 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">No links yet.</p>
                <Link href="/affiliate/links" className="text-xs text-primary hover:underline">
                  Create your first link →
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {topLinks.map((link) => (
                  <div key={link.id} className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl">
                    <Link2 className="w-4 h-4 text-brand-citrus flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono text-foreground truncate">{link.slug}</p>
                      {link.label && <p className="text-xs text-muted-foreground">{link.label}</p>}
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-sm font-bold">{link.clickCount}</p>
                      <p className="text-[10px] text-muted-foreground">clicks</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Coupons */}
          <div className="admin-card space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm">Active coupons</p>
              <Link href="/affiliate/coupons" className="text-xs text-primary hover:underline flex items-center gap-1">
                Manage <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {coupons.length === 0 ? (
              <div className="text-center py-8 space-y-3">
                <Tag className="w-8 h-8 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">No active coupons.</p>
                <Link href="/affiliate/coupons" className="text-xs text-primary hover:underline">
                  Request a coupon →
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {coupons.map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-3 bg-muted/40 rounded-xl">
                    <div>
                      <code className="text-sm font-bold text-brand-citrus">{c.code}</code>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {c.discountType === "PERCENTAGE" ? `${c.discountValue}% off` : `$${c.discountValue} off`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{c.usedCount}</p>
                      <p className="text-[10px] text-muted-foreground">uses</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent conversions */}
        <div className="admin-card p-0 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <p className="font-semibold text-sm">Recent conversions</p>
            <Link href="/affiliate/conversions" className="flex items-center gap-1 text-xs text-primary hover:underline">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <table className="admin-table">
            <thead>
              <tr><th>Booking</th><th>Customer</th><th>Package</th><th>Status</th><th>Commission</th></tr>
            </thead>
            <tbody>
              {recentConversions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-sm text-muted-foreground">
                    No conversions yet. Share your link to start earning.
                  </td>
                </tr>
              ) : (
                recentConversions.map((b) => (
                  <tr key={b.id} className="table-row-hover">
                    <td>
                      <p className="font-mono text-xs font-bold text-primary">{(b as any).reference}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(b.createdAt)}</p>
                    </td>
                    <td className="text-sm">{b.customer.name}</td>
                    <td className="text-sm">{b.package.name}</td>
                    <td>
                      <span className={`status-badge text-xs ${bookingStatusColor((b as any).bookingStatus)}`}>
                        {(b as any).bookingStatus.replace("_", " ")}
                      </span>
                    </td>
                    <td>
                      {b.affiliateCommission
                        ? <span className="text-sm font-bold text-primary">{formatCurrency(Number(b.affiliateCommission.amount))}</span>
                        : <span className="text-muted-foreground text-sm">—</span>
                      }
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Quick stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Active links",   value: stats.activeLinks,          color: "text-brand-citrus" },
            { label: "Active coupons", value: stats.activeCoupons,        color: "text-brand-mango" },
            { label: "Total sales",    value: formatCurrency(stats.totalSales), color: "text-brand-lime" },
            { label: "Total earned",   value: formatCurrency(stats.commissionEarned), color: "text-brand-ocean" },
          ].map((item) => (
            <div key={item.label} className="admin-card text-center py-4">
              <p className={`font-display font-bold text-xl ${item.color}`}>{item.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
