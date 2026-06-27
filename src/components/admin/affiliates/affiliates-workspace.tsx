"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, X, Link2, Tag, TrendingUp, Edit2 } from "lucide-react";
import { approveAffiliate, rejectAffiliate, approveCoupon, updateAffiliateCommission } from "@/lib/admin/affiliate-actions";
import { StatusBadge } from "../shared/status-badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function AffiliatesWorkspace({ affiliates, applications, pendingCoupons, salesMap, commissionMap }: any) {
  const [currentTab, setCurrentTab] = useState<"affiliates" | "applications" | "coupons">(
    applications.length > 0 ? "applications" : "affiliates"
  );
  const [isPending, startTransition] = useTransition();
  const [editCommission, setEditCommission] = useState<string | null>(null);
  const [commissionRate, setCommissionRate] = useState("");
  const [commissionBasis, setCommissionBasis] = useState<"PACKAGE_ONLY" | "PACKAGE_AND_ADDONS">("PACKAGE_ONLY");

  const TABS = [
    { key: "affiliates",   label: `Affiliates (${affiliates.length})` },
    { key: "applications", label: `Pending (${applications.length})` },
    { key: "coupons",      label: `Coupons (${pendingCoupons.length})` },
  ];

  function doApprove(id: string) {
    startTransition(async () => {
      const r = await approveAffiliate(id);
      if (r.success) toast.success("Affiliate approved + referral link created");
      else toast.error((r as any).error ?? "Action failed");
    });
  }

  function doApproveCoupon(id: string) {
    startTransition(async () => {
      const r = await approveCoupon(id);
      if (r.success) toast.success("Coupon approved");
      else toast.error("Failed to approve coupon");
    });
  }

  function doUpdateCommission(affiliateId: string) {
    const rate = parseFloat(commissionRate);
    if (isNaN(rate) || rate < 0 || rate > 100) { toast.error("Invalid rate (0–100)"); return; }
    startTransition(async () => {
      const r = await updateAffiliateCommission(affiliateId, rate, commissionBasis);
      if (r.success) { toast.success("Commission updated"); setEditCommission(null); }
      else toast.error((r as any).error ?? "Action failed");
    });
  }

  const totalClicks = (aff: any) => aff.links.reduce((s: number, l: any) => s + l.clickCount, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setCurrentTab(t.key as any)}
            className={cn("px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              currentTab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >{t.label}</button>
        ))}
      </div>

      {/* Applications */}
      {currentTab === "applications" && (
        <div className="admin-card p-0 overflow-hidden">
          {applications.length === 0 ? (
            <p className="text-center py-10 text-sm text-muted-foreground">No pending applications.</p>
          ) : (
            <table className="admin-table">
              <thead><tr><th>Name</th><th>Contact</th><th>Channel</th><th>Coupon</th><th>Applied</th><th>Actions</th></tr></thead>
              <tbody>
                {applications.map((app: any) => (
                  <tr key={app.id} className="table-row-hover">
                    <td><p className="font-medium text-sm">{app.name}</p><p className="text-xs text-muted-foreground">{app.email}</p></td>
                    <td><p className="text-sm">{app.contactPerson}</p><p className="text-xs text-muted-foreground">{app.phone}</p></td>
                    <td className="text-sm text-muted-foreground">{app.promotionChannel ?? "—"}</td>
                    <td><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{app.preferredCoupon ?? "—"}</code></td>
                    <td className="text-sm text-muted-foreground">{formatDate(app.submittedAt)}</td>
                    <td>
                      <div className="flex gap-2">
                        <button onClick={() => doApprove(app.id)} disabled={isPending}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-xs font-semibold hover:bg-green-200 transition-colors disabled:opacity-50">
                          <Check className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button onClick={() => startTransition(async () => {
                            const r = await rejectAffiliate(app.id);
                            r.success ? toast.success("Rejected") : toast.error((r as any).error ?? "Action failed");
                          })}
                          disabled={isPending}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-100 text-red-700 dark:bg-red-900/30 text-xs font-semibold hover:bg-red-200 transition-colors disabled:opacity-50">
                          <X className="w-3.5 h-3.5" /> Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Coupons awaiting approval */}
      {currentTab === "coupons" && (
        <div className="admin-card p-0 overflow-hidden">
          {pendingCoupons.length === 0 ? (
            <p className="text-center py-10 text-sm text-muted-foreground">No coupons awaiting approval.</p>
          ) : (
            <table className="admin-table">
              <thead><tr><th>Code</th><th>Affiliate</th><th>Discount</th><th>Actions</th></tr></thead>
              <tbody>
                {pendingCoupons.map((c: any) => (
                  <tr key={c.id} className="table-row-hover">
                    <td><code className="font-mono font-bold text-brand-citrus">{c.code}</code></td>
                    <td className="text-sm">{c.affiliate?.name}</td>
                    <td className="text-sm text-muted-foreground">
                      {c.discountType === "PERCENTAGE" ? `${c.discountValue}%` : `$${c.discountValue}`}
                    </td>
                    <td>
                      <button onClick={() => doApproveCoupon(c.id)} disabled={isPending}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-xs font-semibold hover:bg-green-200 transition-colors disabled:opacity-50">
                        <Check className="w-3.5 h-3.5" /> Approve
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Affiliates table */}
      {currentTab === "affiliates" && (
        <div className="admin-card p-0 overflow-hidden">
          {affiliates.length === 0 ? (
            <p className="text-center py-10 text-sm text-muted-foreground">No affiliates yet.</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Affiliate</th><th>Status</th><th>Commission</th>
                  <th>Clicks</th><th>Bookings</th><th>Sales</th><th>Payable</th>
                </tr>
              </thead>
              <tbody>
                {affiliates.map((aff: any) => (
                  <tr key={aff.id} className="table-row-hover">
                    <td>
                      <p className="font-medium text-sm">{aff.name}</p>
                      <p className="text-xs text-muted-foreground">{aff.email}</p>
                      <p className="text-xs text-muted-foreground">{aff.channel ?? ""}</p>
                    </td>
                    <td><StatusBadge value={aff.status} type="application" /></td>
                    <td>
                      {editCommission === aff.id ? (
                        <div className="flex flex-wrap items-center gap-1.5 min-w-[260px]">
                          <input type="number" value={commissionRate} onChange={(e) => setCommissionRate(e.target.value)}
                            className="w-14 px-2 py-1 text-xs rounded border border-border bg-background focus:outline-none"
                            min={0} max={100} />
                          <select
                            value={commissionBasis}
                            onChange={(e) => setCommissionBasis(e.target.value as "PACKAGE_ONLY" | "PACKAGE_AND_ADDONS")}
                            className="w-36 px-2 py-1 text-xs rounded border border-border bg-background focus:outline-none"
                          >
                            <option value="PACKAGE_ONLY">Package only</option>
                            <option value="PACKAGE_AND_ADDONS">Package + add-ons</option>
                          </select>
                          <button onClick={() => doUpdateCommission(aff.id)} className="p-1 rounded bg-primary text-primary-foreground"><Check className="w-3 h-3" /></button>
                          <button onClick={() => setEditCommission(null)} className="p-1 rounded hover:bg-muted"><X className="w-3 h-3" /></button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditCommission(aff.id);
                            setCommissionRate(String(aff.commissionRate));
                            setCommissionBasis(aff.commissionBasis === "PACKAGE_AND_ADDONS" ? "PACKAGE_AND_ADDONS" : "PACKAGE_ONLY");
                          }}
                          className="text-left text-sm font-semibold text-primary hover:underline"
                        >
                          <span className="inline-flex items-center gap-1.5">
                            {aff.commissionRate}% <Edit2 className="w-3 h-3 opacity-50" />
                          </span>
                          <span className="block text-[11px] font-normal text-muted-foreground">
                            {aff.commissionBasis === "PACKAGE_AND_ADDONS" ? "Package + add-ons" : "Package only"}
                          </span>
                        </button>
                      )}
                    </td>
                    <td className="text-sm">{totalClicks(aff)}</td>
                    <td className="text-sm font-semibold">{aff._count.bookings}</td>
                    <td className="text-sm">{formatCurrency(salesMap[aff.id] ?? 0)}</td>
                    <td className="text-sm font-semibold text-brand-citrus">{formatCurrency(commissionMap[aff.id] ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
