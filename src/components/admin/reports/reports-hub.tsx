"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  TrendingUp, DollarSign, CalendarCheck, Users,
  BarChart3, Download, UserCheck, Handshake,
} from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { StatCard } from "@/components/shared/stat-card";

interface ReportsHubProps {
  data: {
    dateFrom:          string;
    dateTo:            string;
    totalBookings:     number;
    totalRevenue:      number;
    bookingsByStatus:  Array<{ status: string; count: number }>;
    bookingsBySource:  Array<{ source: string; count: number }>;
    revenueBySource:   Array<{ source: string; total: number }>;
    revenueByPackage:  Array<{ packageId: string; name: string; total: number; bookings: number }>;
    revenueByAddOn:    Array<{ addOnId: string; name: string; total: number; count: number }>;
    agentCommissions:  Array<{ status: string; total: number; count: number }>;
    affiliateCommissions: Array<{ status: string; total: number; count: number }>;
    dailyRevenue:      Array<{ date: string; total: number; bookings: number }>;
  };
}

const SOURCE_COLORS: Record<string, string> = {
  DIRECT:    "bg-brand-turquoise",
  WALK_IN:   "bg-brand-mango",
  AGENT:     "bg-brand-ocean",
  AFFILIATE: "bg-brand-citrus",
};

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED:  "bg-blue-500",
  CHECKED_IN: "bg-purple-500",
  COMPLETED:  "bg-green-500",
  CANCELLED:  "bg-red-500",
  NO_SHOW:    "bg-gray-500",
  REFUNDED:   "bg-yellow-500",
};

export function ReportsHub({ data }: ReportsHubProps) {
  const router   = useRouter();
  const pathname = usePathname();
  const [from, setFrom] = useState(data.dateFrom);
  const [to, setTo]     = useState(data.dateTo);

  function applyDateRange() {
    router.push(`${pathname}?from=${from}&to=${to}`);
  }

  async function exportCSV(type: string) {
    const res = await fetch(`/api/admin/reports/export?type=${type}&from=${data.dateFrom}&to=${data.dateTo}`);
    if (!res.ok) return;
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `zipline-${type}-${data.dateFrom}-${data.dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totalDailyMax = Math.max(...data.dailyRevenue.map((d) => d.total), 1);
  const pendingAgentComm    = data.agentCommissions.find((c) => c.status === "PENDING")?.total ?? 0;
  const pendingAffComm      = data.affiliateCommissions.find((c) => c.status === "PENDING")?.total ?? 0;

  return (
    <div className="p-6 space-y-8">
      {/* Date filter */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground font-medium">From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground font-medium">To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <button onClick={applyDateRange}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
          Apply
        </button>
        <div className="flex gap-2 ml-auto">
          {[
            { type: "bookings",   label: "Bookings CSV" },
            { type: "sales",      label: "Sales CSV" },
            { type: "agents",     label: "Agent commission CSV" },
            { type: "affiliates", label: "Affiliate CSV" },
          ].map((e) => (
            <button key={e.type} onClick={() => exportCSV(e.type)}
              className="flex items-center gap-1.5 text-xs border border-border rounded-lg px-3 py-2 hover:bg-muted transition-colors">
              <Download className="w-3.5 h-3.5" /> {e.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total bookings"     value={data.totalBookings}               icon={CalendarCheck} iconColor="text-brand-citrus" />
        <StatCard title="Total revenue"      value={formatCurrency(data.totalRevenue)} icon={DollarSign}    iconColor="text-brand-lime" />
        <StatCard title="Agent commission"   value={formatCurrency(pendingAgentComm)}  icon={UserCheck}     iconColor="text-brand-ocean"   subtitle="Pending payout" />
        <StatCard title="Affiliate commission" value={formatCurrency(pendingAffComm)} icon={Handshake}     iconColor="text-brand-citrus"  subtitle="Pending payout" />
      </div>

      {/* Daily revenue bar chart */}
      <div className="admin-card space-y-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-sm">Daily revenue (last 30 days)</p>
          <p className="text-xs text-muted-foreground">Peak: {formatCurrency(totalDailyMax)}</p>
        </div>
        <div className="flex items-end gap-1 h-32 overflow-x-auto pb-2 no-scrollbar">
          {data.dailyRevenue.length === 0 ? (
            <p className="text-sm text-muted-foreground w-full text-center py-8">No revenue data for this period.</p>
          ) : data.dailyRevenue.map((d) => (
            <div key={d.date} className="flex flex-col items-center gap-1 flex-shrink-0 group" style={{ minWidth: "24px" }}>
              <div
                className="w-5 bg-primary/70 hover:bg-primary rounded-t transition-all duration-150"
                style={{ height: `${Math.max(2, (d.total / totalDailyMax) * 112)}px` }}
                title={`${d.date}: ${formatCurrency(d.total)} (${d.bookings} bookings)`}
              />
              <span className="text-[9px] text-muted-foreground rotate-45 origin-left">{d.date}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Source split */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Revenue by source */}
        <div className="admin-card space-y-4">
          <p className="font-semibold text-sm">Revenue by source</p>
          <div className="space-y-3">
            {data.revenueBySource.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data.</p>
            ) : data.revenueBySource.map((s) => {
              const pct = data.totalRevenue > 0 ? (s.total / data.totalRevenue) * 100 : 0;
              return (
                <div key={s.source} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium capitalize">{s.source.replace("_", " ")}</span>
                    <span className="font-semibold">{formatCurrency(s.total)}</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all duration-500", SOURCE_COLORS[s.source] ?? "bg-primary")}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">{pct.toFixed(1)}% of total revenue</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bookings by status */}
        <div className="admin-card space-y-4">
          <p className="font-semibold text-sm">Bookings by status</p>
          <div className="space-y-3">
            {data.bookingsByStatus.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data.</p>
            ) : data.bookingsByStatus.map((s) => {
              const pct = data.totalBookings > 0 ? (s.count / data.totalBookings) * 100 : 0;
              return (
                <div key={s.status} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium capitalize">{s.status.replace("_", " ")}</span>
                    <span className="font-semibold">{s.count}</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full", STATUS_COLORS[s.status] ?? "bg-primary")}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Package performance */}
      <div className="admin-card space-y-4">
        <p className="font-semibold text-sm">Package performance</p>
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr><th>Package</th><th>Bookings</th><th>Revenue</th><th>Avg per booking</th></tr>
            </thead>
            <tbody>
              {data.revenueByPackage.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8 text-muted-foreground text-sm">No data for this period.</td></tr>
              ) : data.revenueByPackage.map((p) => (
                <tr key={p.packageId} className="table-row-hover">
                  <td className="font-medium text-sm">{p.name}</td>
                  <td className="text-sm">{p.bookings}</td>
                  <td className="font-semibold text-sm">{formatCurrency(p.total)}</td>
                  <td className="text-sm text-muted-foreground">
                    {p.bookings > 0 ? formatCurrency(p.total / p.bookings) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add-on revenue */}
      {data.revenueByAddOn.length > 0 && (
        <div className="admin-card space-y-4">
          <p className="font-semibold text-sm">Add-on revenue</p>
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead><tr><th>Add-on</th><th>Sold</th><th>Revenue</th></tr></thead>
              <tbody>
                {data.revenueByAddOn.map((a) => (
                  <tr key={a.addOnId} className="table-row-hover">
                    <td className="font-medium text-sm">{a.name}</td>
                    <td className="text-sm">{a.count}</td>
                    <td className="font-semibold text-sm">{formatCurrency(a.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Commission summary */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="admin-card space-y-3">
          <p className="font-semibold text-sm">Agent commission summary</p>
          {data.agentCommissions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No commission records.</p>
          ) : (
            <table className="admin-table">
              <thead><tr><th>Status</th><th>Count</th><th>Amount</th></tr></thead>
              <tbody>
                {data.agentCommissions.map((c) => (
                  <tr key={c.status} className="table-row-hover">
                    <td className="capitalize text-sm">{c.status.toLowerCase()}</td>
                    <td className="text-sm">{c.count}</td>
                    <td className="font-semibold text-sm">{formatCurrency(c.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="admin-card space-y-3">
          <p className="font-semibold text-sm">Affiliate commission summary</p>
          {data.affiliateCommissions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No commission records.</p>
          ) : (
            <table className="admin-table">
              <thead><tr><th>Status</th><th>Count</th><th>Amount</th></tr></thead>
              <tbody>
                {data.affiliateCommissions.map((c) => (
                  <tr key={c.status} className="table-row-hover">
                    <td className="capitalize text-sm">{c.status.toLowerCase()}</td>
                    <td className="text-sm">{c.count}</td>
                    <td className="font-semibold text-sm">{formatCurrency(c.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
