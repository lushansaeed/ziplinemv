"use client";

import { useState, useTransition } from "react";
import {
  Search, QrCode, CheckCircle2, XCircle, AlertTriangle,
  Loader2, User, Calendar, Clock, Package, Weight,
} from "lucide-react";
import { toast } from "sonner";
import { checkInBooking, completeBooking, updatePaymentStatus } from "@/lib/admin/booking-actions";
import { StatusBadge } from "../shared/status-badge";
import { formatCurrency, formatDate, isWeightEligible } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface BookingResult {
  id: string; reference: string; bookingDate: Date; bookingStatus: string;
  paymentStatus: string; waiverStatus: string; numRiders: number;
  source: string; total: number; currency: string;
  customer: { name: string; phone: string };
  package: { name: string };
  slot: { startTime: string };
  riders: Array<{ id: string; name: string; age: number | null; weight: number | null }>;
  checkIn: { checkedInAt: Date } | null;
}

export function CheckInModule() {
  const [query, setQuery]         = useState("");
  const [result, setResult]       = useState<BookingResult | null>(null);
  const [notFound, setNotFound]   = useState(false);
  const [searching, setSearching] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function search() {
    if (!query.trim()) return;
    setSearching(true);
    setResult(null);
    setNotFound(false);
    try {
      const res  = await fetch(`/api/admin/check-in/search?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      if (data.booking) setResult(data.booking);
      else setNotFound(true);
    } catch {
      toast.error("Search failed");
    } finally {
      setSearching(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") search();
  }

  const weightIssues = result?.riders.filter((r) => {
    if (!r.weight) return false;
    return !isWeightEligible(r.weight).eligible;
  }) ?? [];

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="admin-card space-y-3">
        <p className="text-sm font-semibold">Find booking</p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Reference number, phone, or name…"
              className={cn(
                "w-full pl-9 pr-4 py-3 rounded-xl border border-border bg-background",
                "text-sm focus:outline-none focus:ring-2 focus:ring-ring",
                "placeholder:text-muted-foreground"
              )}
              autoFocus
            />
          </div>
          <button
            onClick={search}
            disabled={searching || !query.trim()}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Search
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Enter a booking reference (e.g. ZL-ABC123), phone number, or customer name.
          Scan a QR code from a booking confirmation to auto-fill.
        </p>
      </div>

      {/* Not found */}
      {notFound && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20">
          <XCircle className="w-5 h-5 text-destructive flex-shrink-0" />
          <p className="text-destructive text-sm">No booking found for "{query}". Please check the reference or try another search.</p>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="admin-card space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="font-mono font-bold text-2xl text-primary">{result.reference}</p>
              <p className="text-muted-foreground text-sm mt-0.5">{result.customer.name} · {result.customer.phone}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge value={result.bookingStatus} type="booking" />
              <StatusBadge value={result.paymentStatus} type="payment" />
            </div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: Calendar, label: "Date",    value: formatDate(result.bookingDate) },
              { icon: Clock,    label: "Time",    value: result.slot.startTime },
              { icon: Package,  label: "Package", value: result.package.name },
              { icon: User,     label: "Riders",  value: `${result.numRiders}` },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="bg-muted/40 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                    <Icon className="w-3.5 h-3.5" />
                    <span className="text-xs">{item.label}</span>
                  </div>
                  <p className="font-semibold text-sm">{item.value}</p>
                </div>
              );
            })}
          </div>

          {/* Riders weight check */}
          {result.riders.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Rider eligibility</p>
              <div className="space-y-2">
                {result.riders.map((r) => {
                  const wCheck = r.weight ? isWeightEligible(r.weight) : null;
                  return (
                    <div
                      key={r.id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-xl text-sm",
                        wCheck?.eligible === false
                          ? "bg-destructive/10 border border-destructive/20"
                          : "bg-muted/40"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {wCheck?.eligible === false ? (
                          <XCircle className="w-4 h-4 text-destructive" />
                        ) : wCheck?.eligible === true ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-yellow-500" />
                        )}
                        <span className="font-medium">{r.name}</span>
                      </div>
                      <span className="text-muted-foreground text-xs">
                        {[r.age && `${r.age} yrs`, r.weight && `${r.weight} kg`].filter(Boolean).join(" · ")}
                        {wCheck?.eligible === false && (
                          <span className="text-destructive ml-2 font-medium">{wCheck.reason}</span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Payment check */}
          {result.paymentStatus !== "PAID" && result.paymentStatus !== "COMPLIMENTARY" && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-400">Payment outstanding</p>
                <p className="text-yellow-700 dark:text-yellow-500 text-sm">
                  {formatCurrency(Number(result.total), result.currency)} — not yet paid.
                </p>
              </div>
            </div>
          )}

          {/* Weight blocker */}
          {weightIssues.length > 0 && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20">
              <XCircle className="w-5 h-5 text-destructive flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-destructive">Cannot proceed</p>
                <p className="text-destructive/80 text-sm">
                  {weightIssues.map((r) => r.name).join(", ")} {weightIssues.length === 1 ? "does" : "do"} not meet weight requirements.
                </p>
              </div>
            </div>
          )}

          {/* Already checked in */}
          {result.checkIn && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
              <p className="text-sm text-green-800 dark:text-green-400 font-medium">
                Already checked in at {new Date(result.checkIn.checkedInAt).toLocaleTimeString()}
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3 pt-2 border-t border-border">
            {result.bookingStatus === "CONFIRMED" && !result.checkIn && weightIssues.length === 0 && (
              <button
                onClick={() => startTransition(async () => {
                  const r = await checkInBooking(result.id);
                  if (r.success) {
                    toast.success("Checked in successfully!");
                    setResult((prev) => prev ? { ...prev, bookingStatus: "CHECKED_IN", checkIn: { checkedInAt: new Date() } } : prev);
                  } else toast.error((r as any).error ?? "Action failed");
                })}
                disabled={isPending}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-600 text-white font-semibold text-sm hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Check in now
              </button>
            )}
            {result.bookingStatus === "CHECKED_IN" && (
              <button
                onClick={() => startTransition(async () => {
                  const r = await completeBooking(result.id);
                  if (r.success) {
                    toast.success("Booking completed!");
                    setResult((prev) => prev ? { ...prev, bookingStatus: "COMPLETED" } : prev);
                  } else toast.error((r as any).error ?? "Action failed");
                })}
                disabled={isPending}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Mark completed
              </button>
            )}
            {result.paymentStatus === "UNPAID" && (
              <button
                onClick={() => startTransition(async () => {
                  const r = await updatePaymentStatus(result.id, "PAID" as any, "cash");
                  if (r.success) {
                    toast.success("Marked as paid");
                    setResult((prev) => prev ? { ...prev, paymentStatus: "PAID" } : prev);
                  }
                })}
                disabled={isPending}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors"
              >
                Mark paid (cash)
              </button>
            )}
            <button
              onClick={() => { setResult(null); setQuery(""); setNotFound(false); }}
              className="ml-auto px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground border border-border rounded-xl hover:bg-muted transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
