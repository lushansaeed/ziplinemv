"use client";

import { DollarSign, Clock, CheckCircle2, TrendingUp } from "lucide-react";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { StatCard } from "@/components/shared/stat-card";

interface CommissionRow {
  id: string; amount: number; rate: number; status: string; createdAt: Date;
  booking: {
    reference: string; bookingDate: Date; total: number;
    customer: { name: string };
    package:  { name: string };
  };
}

interface Props {
  commissions:    CommissionRow[];
  totals:         Array<{ status: string; _sum: { amount: number | null }; _count: number }>;
  commissionRate: number;
  commissionBasis: string;
  touristCommissionType?: string | null;
  touristCommissionValue?: number | null;
  localCommissionType?: string | null;
  localCommissionValue?: number | null;
  addOnCommissionType?: string | null;
  addOnCommissionValue?: number | null;
}

const STATUS_COLOR: Record<string, string> = {
  PENDING:    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  PROCESSING: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  PAID:       "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  REJECTED:   "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

function formatRule(type?: string | null, value?: number | null, unit = "") {
  if (value == null || Number(value) <= 0) return "Default";
  return type === "FIXED" ? `${formatCurrency(Number(value))}${unit}` : `${Number(value)}%`;
}

export function AgentCommissionStatement({
  commissions, totals, commissionRate, commissionBasis,
  touristCommissionType, touristCommissionValue,
  localCommissionType, localCommissionValue,
  addOnCommissionType, addOnCommissionValue,
}: Props) {
  const getTotal = (status: string) => {
    const t = totals.find((x) => x.status === status);
    return Number(t?._sum.amount ?? 0);
  };

  const pending    = getTotal("PENDING");
  const paid       = getTotal("PAID");
  const totalEarned = totals.reduce((s, t) => s + Number(t._sum.amount ?? 0), 0);

  return (
    <div className="p-6 space-y-8">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total earned"     value={formatCurrency(totalEarned)}  icon={TrendingUp}    iconColor="text-brand-citrus" />
        <StatCard title="Pending payout"   value={formatCurrency(pending)}      icon={Clock}         iconColor="text-yellow-500" subtitle="Awaiting payment" />
        <StatCard title="Paid out"         value={formatCurrency(paid)}         icon={CheckCircle2}  iconColor="text-green-500" />
        <StatCard title="Default rate"     value={`${commissionRate}%`}         icon={DollarSign}    iconColor="text-brand-ocean" subtitle={commissionBasis.replace("_", " ").toLowerCase()} />
      </div>

      {/* How commission is calculated */}
      <div className="admin-card bg-primary/5 border-primary/20 space-y-2">
        <p className="font-semibold text-sm text-primary">How your commission is calculated</p>
        <p className="text-sm text-muted-foreground">
          Your commission can differ for tourist packages, local packages, and add-ons. Current rules:
          <strong className="text-foreground"> tourist {formatRule(touristCommissionType, touristCommissionValue, " / rider")}</strong>,
          <strong className="text-foreground"> local {formatRule(localCommissionType, localCommissionValue, " / rider")}</strong>,
          and <strong className="text-foreground">add-ons {formatRule(addOnCommissionType, addOnCommissionValue, " / unit")}</strong>.
          Any default rule uses your fallback rate of <strong className="text-foreground">{commissionRate}%</strong>.
          Commission is paid out by Zipline Maldives on a regular schedule.
        </p>
      </div>

      {/* Commission table */}
      <div className="admin-card p-0 overflow-hidden">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Booking</th>
              <th>Customer</th>
              <th>Date</th>
              <th>Package</th>
              <th>Booking total</th>
              <th>Rate</th>
              <th>Commission</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {commissions.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-muted-foreground text-sm">
                  No commission records yet. Create a booking to start earning.
                </td>
              </tr>
            ) : (
              commissions.map((c) => (
                <tr key={c.id} className="table-row-hover">
                  <td>
                    <a
                      href={`/book/confirmation?ref=${c.booking.reference}`}
                      target="_blank"
                      className="font-mono text-xs font-bold text-primary hover:underline"
                    >
                      {c.booking.reference}
                    </a>
                  </td>
                  <td className="text-sm">{c.booking.customer.name}</td>
                  <td className="text-sm text-muted-foreground">{formatDate(c.booking.bookingDate)}</td>
                  <td className="text-sm">{c.booking.package.name}</td>
                  <td className="text-sm">{formatCurrency(Number(c.booking.total))}</td>
                  <td className="text-sm text-muted-foreground">{c.rate}%</td>
                  <td className="font-bold text-sm text-primary">{formatCurrency(Number(c.amount))}</td>
                  <td>
                    <span className={cn("status-badge text-xs capitalize", STATUS_COLOR[c.status] ?? "bg-muted text-muted-foreground")}>
                      {c.status.toLowerCase()}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Request payout note */}
      {pending > 0 && (
        <div className="admin-card border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/10 space-y-2">
          <p className="font-semibold text-sm text-yellow-800 dark:text-yellow-400">
            You have {formatCurrency(pending)} pending
          </p>
          <p className="text-sm text-yellow-700 dark:text-yellow-500">
            Payouts are processed by Zipline Maldives on a regular schedule. Contact us if you have questions about your statement.
          </p>
          <a href="/contact" className="inline-block text-sm text-primary font-medium hover:underline">
            Contact us →
          </a>
        </div>
      )}
    </div>
  );
}
