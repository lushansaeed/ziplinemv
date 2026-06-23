"use client";

import { useState, useTransition } from "react";
import { Plus, Copy, Check, Tag, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { AffiliateCoupon } from "@prisma/client";

interface Props {
  coupons:         AffiliateCoupon[];
  affiliateId:     string;
  approvalRequired: boolean;
}

const STATUS_CONFIG = {
  PENDING:   { icon: Clock,        color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400", label: "Pending approval" },
  APPROVED:  { icon: CheckCircle2, color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",  label: "Active" },
  REJECTED:  { icon: AlertCircle,  color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",          label: "Rejected" },
  SUSPENDED: { icon: AlertCircle,  color: "bg-muted text-muted-foreground",                                          label: "Suspended" },
};

export function AffiliateCouponsManager({ coupons: initialCoupons, affiliateId, approvalRequired }: Props) {
  const [coupons, setCoupons]        = useState(initialCoupons);
  const [isPending, startTransition] = useTransition();
  const [showCreate, setShowCreate]  = useState(false);
  const [copiedCode, setCopiedCode]  = useState<string | null>(null);
  const [formError, setFormError]    = useState<string | null>(null);
  const [newCoupon, setNewCoupon]    = useState({
    code: "", discountType: "PERCENTAGE", discountValue: "",
  });

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success("Coupon code copied");
    setTimeout(() => setCopiedCode(null), 2000);
  }

  async function createCoupon() {
    setFormError(null);
    if (!newCoupon.code || !newCoupon.discountValue) {
      setFormError("Code and discount value are required."); return;
    }
    if (!/^[A-Z0-9_-]{3,20}$/.test(newCoupon.code.toUpperCase())) {
      setFormError("Code must be 3–20 characters: letters, numbers, hyphens only."); return;
    }

    startTransition(async () => {
      const res = await fetch("/api/affiliate/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newCoupon, code: newCoupon.code.toUpperCase() }),
      });
      const data = await res.json();
      if (res.ok) {
        setCoupons((prev) => [data, ...prev]);
        setNewCoupon({ code: "", discountType: "PERCENTAGE", discountValue: "" });
        setShowCreate(false);
        toast.success(approvalRequired ? "Coupon submitted for approval" : "Coupon created");
      } else {
        setFormError(data.error ?? "Failed to create coupon");
      }
    });
  }

  const activeCoupons = coupons.filter((c) => c.status === "APPROVED");

  return (
    <div className="p-6 space-y-6">
      {/* Info banner */}
      <div className="admin-card bg-brand-citrus/5 border-brand-citrus/20 space-y-2">
        <div className="flex items-start gap-2">
          <Tag className="w-4 h-4 text-brand-citrus flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-sm">How coupons work</p>
            <p className="text-sm text-muted-foreground">
              Share a coupon code with your audience. When they apply it at checkout,
              the booking is attributed to you and you earn commission.
              {approvalRequired ? " New coupon requests require approval from Zipline MV." : " Coupons are active immediately."}
            </p>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Active",  value: activeCoupons.length, color: "text-green-600 dark:text-green-400" },
          { label: "Total uses", value: coupons.reduce((s, c) => s + c.usedCount, 0), color: "text-brand-citrus" },
          { label: "Pending",  value: coupons.filter((c) => c.status === "PENDING").length, color: "text-yellow-600" },
        ].map((s) => (
          <div key={s.label} className="admin-card text-center py-4">
            <p className={`font-display font-bold text-xl ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Create new */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{coupons.length} coupon{coupons.length !== 1 ? "s" : ""}</p>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {approvalRequired ? "Request coupon" : "Create coupon"}
        </button>
      </div>

      {showCreate && (
        <div className="admin-card space-y-4">
          <p className="font-semibold text-sm">
            {approvalRequired ? "Request a new coupon code" : "Create a new coupon code"}
          </p>
          {formError && (
            <p className="text-destructive text-xs">{formError}</p>
          )}
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">
                Coupon code * <span className="text-[10px]">(letters + numbers only)</span>
              </label>
              <input
                value={newCoupon.code}
                onChange={(e) => setNewCoupon((p) => ({ ...p, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "") }))}
                placeholder="YOURNAME20"
                maxLength={20}
                className="w-full rounded-lg px-3 py-2 text-sm font-mono tracking-widest bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Discount type</label>
              <select
                value={newCoupon.discountType}
                onChange={(e) => setNewCoupon((p) => ({ ...p, discountType: e.target.value }))}
                className="w-full rounded-lg px-3 py-2 text-sm bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FIXED">Fixed ($)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Discount value *</label>
              <input
                type="number"
                value={newCoupon.discountValue}
                onChange={(e) => setNewCoupon((p) => ({ ...p, discountValue: e.target.value }))}
                placeholder={newCoupon.discountType === "PERCENTAGE" ? "10" : "15"}
                min={0}
                className="w-full rounded-lg px-3 py-2 text-sm bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          {approvalRequired && (
            <p className="text-xs text-muted-foreground">
              Your coupon request will be reviewed by Zipline MV. You'll be notified once it's approved.
            </p>
          )}
          <div className="flex gap-2">
            <button onClick={createCoupon} disabled={isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50">
              {approvalRequired ? "Submit request" : "Create coupon"}
            </button>
            <button onClick={() => { setShowCreate(false); setFormError(null); }}
              className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Coupons list */}
      {coupons.length === 0 ? (
        <div className="admin-card text-center py-14 space-y-3">
          <Tag className="w-10 h-10 text-muted-foreground mx-auto" />
          <p className="font-semibold">No coupons yet</p>
          <p className="text-sm text-muted-foreground">
            {approvalRequired ? "Request a coupon code to share with your audience." : "Create your first coupon code."}
          </p>
        </div>
      ) : (
        <div className="admin-card p-0 overflow-hidden">
          <table className="admin-table">
            <thead>
              <tr><th>Code</th><th>Discount</th><th>Used</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {coupons.map((c) => {
                const conf = STATUS_CONFIG[c.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.PENDING;
                const Icon = conf.icon;
                return (
                  <tr key={c.id} className="table-row-hover">
                    <td>
                      <code className="font-mono font-bold text-brand-citrus text-sm">{c.code}</code>
                    </td>
                    <td className="text-sm">
                      {c.discountType === "PERCENTAGE"
                        ? `${c.discountValue}% off`
                        : `$${c.discountValue} off`}
                    </td>
                    <td>
                      <span className="text-sm font-semibold">{c.usedCount}</span>
                      {c.maxUses && (
                        <span className="text-xs text-muted-foreground"> / {c.maxUses}</span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <Icon className="w-3.5 h-3.5" />
                        <span className={cn("status-badge text-xs", conf.color)}>{conf.label}</span>
                      </div>
                    </td>
                    <td>
                      {c.status === "APPROVED" && (
                        <button
                          onClick={() => copyCode(c.code)}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors font-medium"
                        >
                          {copiedCode === c.code
                            ? <><Check className="w-3 h-3 text-green-500" /> Copied!</>
                            : <><Copy className="w-3 h-3" /> Copy code</>
                          }
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
