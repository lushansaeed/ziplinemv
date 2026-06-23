import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/actions";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, DollarSign, Link2, MousePointerClick } from "lucide-react";

export const metadata: Metadata = { title: "Dashboard | Affiliate Portal" };

export default async function AffiliateDashboardPage() {
  const user = await requireRole([UserRole.AFFILIATE]);

  const affiliate = await prisma.affiliate.findUnique({
    where: { userId: user.id },
    select: { id: true, name: true, commissionRate: true },
  });

  if (!affiliate) return null;

  const [totalClicks, totalConversions, links] = await Promise.all([
    prisma.affiliateClick.count({
      where: {
        link: { affiliateId: affiliate.id },
      },
    }),
    prisma.booking.count({ where: { affiliateId: affiliate.id } }),
    prisma.affiliateLink.findMany({
      where: { affiliateId: affiliate.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const salesAgg = await prisma.booking.aggregate({
    where: { affiliateId: affiliate.id, paymentStatus: "PAID" },
    _sum: { total: true },
  });

  const commissionPayableAgg = await prisma.affiliateCommission.aggregate({
    where: { affiliateId: affiliate.id, status: "PENDING" },
    _sum: { amount: true },
  });

  const totalSales        = Number(salesAgg._sum.total ?? 0);
  const commissionPayable = Number(commissionPayableAgg._sum.amount ?? 0);
  const conversionRate    = totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(1) : "0.0";

  return (
    <div>
      <PageHeader
        title={`Welcome, ${user.name}`}
        description={affiliate.name}
      />

      <div className="p-6 space-y-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total clicks"       value={totalClicks}              icon={MousePointerClick} iconColor="text-brand-citrus" />
          <StatCard title="Conversions"        value={totalConversions}         icon={TrendingUp}        iconColor="text-brand-lime" />
          <StatCard title="Conversion rate"    value={`${conversionRate}%`}    icon={TrendingUp}        iconColor="text-brand-ocean" />
          <StatCard title="Commission payable" value={formatCurrency(commissionPayable)} icon={DollarSign} iconColor="text-brand-coral" subtitle="Pending payout" />
        </div>

        {/* Links */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Your referral links
          </h2>
          {links.length === 0 ? (
            <div className="admin-card text-center py-10 text-sm text-muted-foreground">
              No referral links yet. Go to <strong>Referral Links</strong> to create one.
            </div>
          ) : (
            <div className="space-y-2">
              {links.map((link) => (
                <div key={link.id} className="admin-card flex items-center gap-3 py-3">
                  <Link2 className="w-4 h-4 text-brand-citrus flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono text-foreground truncate">{link.fullUrl}</p>
                    {link.label && <p className="text-xs text-muted-foreground">{link.label}</p>}
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {link.clickCount} clicks
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
