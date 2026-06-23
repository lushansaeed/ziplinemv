"use client";

import { useState, useTransition } from "react";
import { Download, Clock, CheckCircle2, XCircle, Loader2, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import type { PayoutRequest } from "@prisma/client";

const STATUS_CONFIG = {
  PENDING:    { icon: Clock,        color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400", label: "Pending review" },
  PROCESSING: { icon: Loader2,      color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",         label: "Processing" },
  PAID:       { icon: CheckCircle2, color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",    label: "Paid" },
  REJECTED:   { icon: XCircle,      color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",            label: "Rejected" },
};

export function AffiliatePayouts({
  payoutRequests: initialRequests,
  pendingAmount,
  userId,
}: {
  payoutRequests: PayoutRequest[];
  pendingAmount:  number;
  userId:         string;
}) {
  const [requests, setRequests]      = useState(initialRequests);
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm]      = useState(false);
  const [notes, setNotes]            = useState("");

  const hasActiveRequest = requests.some((r) => ["PENDING", "PROCESSING"].includes(r.status));
  const totalPaid        = requests.filter((r) => r.status === "PAID").reduce((s, r) => s + Number(r.amount), 0);

  async function requestPayout() {
    if (pendingAmount <= 0) { toast.error("No pending commission to withdraw."); return; }

    startTransition(async () => {
      const res = await fetch("/api/affiliate/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: pendingAmount, notes }),
      });
      const data = await res.json();
      if (res.ok) {
        setRequests((prev) => [data, ...prev]);
        setShowForm(false); setNotes("");
        toast.success("Payout requested! We'll process it shortly.");
      } else toast.error(data.error ?? "Failed to submit payout request");
    });
  }

  return (
    <div className="p-6 space-y-8">
      {/* Balance summary */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="admin-card text-center py-6 border-brand-citrus/30 bg-brand-citrus/5">
          <p className="text-xs text-muted-foreground mb-1">Available to withdraw</p>
          <p className="font-display font-bold text-3xl text-brand-citrus">{formatCurrency(pendingAmount)}</p>
          <p className="text-xs text-muted-foreground mt-1">Pending commission</p>
        </div>
        <div className="admin-card text-center py-6">
          <p className="text-xs text-muted-foreground mb-1">Total paid out</p>
          <p className="font-display font-bold text-3xl text-green-600 dark:text-green-400">{formatCurrency(totalPaid)}</p>
          <p className="text-xs text-muted-foreground mt-1">All time</p>
        </div>
        <div className="admin-card text-center py-6">
          <p className="text-xs text-muted-foreground mb-1">Total requests</p>
          <p className="font-display font-bold text-3xl">{requests.length}</p>
          <p className="text-xs text-muted-foreground mt-1">All time</p>
        </div>
      </div>

      {/* Request payout */}
      <div className="admin-card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold">Request payout</p>
            <p className="text-sm text-muted-foreground">
              {pendingAmount > 0
                ? `You have ${formatCurrency(pendingAmount)} available to withdraw.`
                : "No commission available yet."}
            </p>
          </div>
          {!showForm && pendingAmount > 0 && !hasActiveRequest && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              <DollarSign className="w-4 h-4" /> Request payout
            </button>
          )}
          {hasActiveRequest && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4 text-yellow-500" />
              You have a pending request
            </div>
          )}
        </div>

        {showForm && (
          <div className="space-y-3 pt-3 border-t border-border">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Amount to request</p>
              <p className="font-bold text-lg text-primary">{formatCurrency(pendingAmount)}</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Payment method preference, bank details reference, etc."
                rows={3}
                className="w-full rounded-lg px-3 py-2 text-sm bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={requestPayout}
                disabled={isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
              >
                {isPending ? <><Loader2 className="w-4 h-4 animate-spin" />Submitting…</> : "Submit request"}
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Payout history */}
      <div className="space-y-3">
        <p className="font-semibold text-sm">Payout history</p>
        {requests.length === 0 ? (
          <div className="admin-card text-center py-10 text-muted-foreground text-sm">
            No payout requests yet.
          </div>
        ) : (
          <div className="admin-card p-0 overflow-hidden">
            <table className="admin-table">
              <thead>
                <tr><th>Date</th><th>Amount</th><th>Status</th><th>Notes</th><th>Processed</th></tr>
              </thead>
              <tbody>
                {requests.map((r) => {
                  const conf = STATUS_CONFIG[r.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.PENDING;
                  const Icon = conf.icon;
                  return (
                    <tr key={r.id} className="table-row-hover">
                      <td className="text-sm text-muted-foreground">{formatDate(r.createdAt)}</td>
                      <td className="font-bold text-sm">{formatCurrency(Number(r.amount), r.currency)}</td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <Icon className="w-3.5 h-3.5" />
                          <span className={cn("status-badge text-xs", conf.color)}>{conf.label}</span>
                        </div>
                      </td>
                      <td className="text-sm text-muted-foreground max-w-[200px] truncate">{r.notes ?? "—"}</td>
                      <td className="text-sm text-muted-foreground">
                        {r.processedAt ? formatDate(r.processedAt) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
