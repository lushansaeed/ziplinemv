"use client";

import { useState, useTransition } from "react";
import {
  Search, QrCode, CheckCircle2, XCircle, AlertTriangle,
  Loader2, User, Calendar, Clock, Package, Weight,
  ShieldCheck, ShieldAlert, Link2,
} from "lucide-react";
import { toast } from "sonner";
import { checkInBooking, completeBooking, updatePaymentStatus } from "@/lib/admin/booking-actions";
import { StatusBadge } from "../shared/status-badge";
import { formatCurrency, formatDate, isWeightEligible } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface RideTracking {
  bookingRiderId: string;
  status: string;
  wristband: { qrCode: string } | null;
}

interface BookingRider {
  id: string;
  name: string;
  age: number | null;
  weight: number | null;
}

interface BookingResult {
  id: string; reference: string; bookingDate: Date; bookingStatus: string;
  paymentStatus: string; waiverStatus: string; numRiders: number;
  source: string; total: number; currency: string;
  customer: { name: string; phone: string };
  package: { name: string };
  slot: { startTime: string };
  riders: BookingRider[];
  waivers?: Array<{ status: string; riderName: string; riderId: string | null }>;
  checkIn: { checkedInAt: Date } | null;
  rideTrackings?: RideTracking[];
}

function riderWaiverSigned(
  rider: BookingRider,
  waivers: BookingResult["waivers"]
): boolean {
  if (!waivers) return false;
  return waivers.some(
    (w) =>
      w.status === "SIGNED" &&
      (w.riderId === rider.id || w.riderName.toLowerCase().trim() === rider.name.toLowerCase().trim())
  );
}

export function CheckInModule() {
  const [query, setQuery]           = useState("");
  const [result, setResult]         = useState<BookingResult | null>(null);
  const [notFound, setNotFound]     = useState(false);
  const [searching, setSearching]   = useState(false);

  // Wristband QR inputs per rider id
  const [qrInputs, setQrInputs] = useState<Record<string, string>>({});
  const [linking, setLinking]   = useState(false);

  const [isCheckingIn, startCheckInTransition] = useTransition();
  const [isCompleting, startCompleteTransition] = useTransition();
  const [isMarkingPaid, startMarkPaidTransition] = useTransition();

  async function search() {
    if (!query.trim()) return;
    setSearching(true);
    setResult(null);
    setNotFound(false);
    setQrInputs({});
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

  async function handleWristbandCheckIn() {
    if (!result) return;

    const missingWristbands = result.riders.filter((rider) => !riderWristbands(rider)?.wristband);
    const assignments = result.riders
      .filter((r) => {
        const hasWristband = result.rideTrackings?.find((t) => t.bookingRiderId === r.id)?.wristband;
        return !hasWristband && qrInputs[r.id]?.trim();
      })
      .map((r) => ({ bookingRiderId: r.id, wristbandQrCode: qrInputs[r.id].trim() }));

    if (!isPaymentSettled) {
      toast.error("Check-in blocked. Payment has not been settled for this booking.");
      return;
    }

    if (assignments.length !== missingWristbands.length) {
      toast.error("Check-in blocked. Please assign a wristband QR to each rider before check-in.");
      return;
    }

    setLinking(true);
    try {
      const res = await fetch(`/api/admin/bookings/${result.id}/wristband-check-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignments }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        const errs: string[] = data.errors ?? [data.error ?? "Failed"];
        errs.forEach((e) => toast.error(e, { duration: 8000 }));
      } else {
        toast.success(data.message ?? "Check-in completed and wristbands linked successfully.");
        // Refresh result
        const fresh = await fetch(`/api/admin/check-in/search?q=${encodeURIComponent(result.reference)}`);
        const freshData = await fresh.json();
        if (freshData.booking) setResult(freshData.booking);
        setQrInputs({});
      }
    } finally {
      setLinking(false);
    }
  }

  const weightIssues   = result?.riders.filter((r) => r.weight && !isWeightEligible(r.weight).eligible) ?? [];
  const signedWaivers  = result?.waivers?.filter((w) => w.status === "SIGNED").length ?? 0;
  const allWaiversDone = result ? signedWaivers >= result.numRiders : false;
  const isPaymentSettled = result ? ["PAID", "COMPLIMENTARY"].includes(result.paymentStatus) : false;

  // Per-rider wristband state
  const riderWristbands = (rider: BookingRider) =>
    result?.rideTrackings?.find((t) => t.bookingRiderId === rider.id);

  const allWristbandsLinked = result?.riders.every((r) => !!riderWristbands(r)?.wristband) ?? false;
  const missingWristbandRiders = result?.riders.filter((r) => !riderWristbands(r)?.wristband) ?? [];
  const allMissingWristbandsEntered = missingWristbandRiders.every((r) => Boolean(qrInputs[r.id]?.trim()));
  const canLinkWristbands   = isPaymentSettled && allWaiversDone && !allWristbandsLinked;
  const isReadyForCheckIn = isPaymentSettled && allWaiversDone && allWristbandsLinked && weightIssues.length === 0;

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
        </p>
      </div>

      {notFound && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20">
          <XCircle className="w-5 h-5 text-destructive flex-shrink-0" />
          <p className="text-destructive text-sm">No booking found for "{query}".</p>
        </div>
      )}

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

          {/* ── Per-rider panel ─────────────────────────────────────────── */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Riders</p>
            <div className="space-y-3">
              {result.riders.map((rider) => {
                const wCheck      = rider.weight ? isWeightEligible(rider.weight) : null;
                const waiversOk   = riderWaiverSigned(rider, result.waivers);
                const tracking    = riderWristbands(rider);
                const wristband   = tracking?.wristband;
                const weightBad   = wCheck?.eligible === false;

                return (
                  <div
                    key={rider.id}
                    className={cn(
                      "rounded-xl border p-4 space-y-3",
                      weightBad
                        ? "border-destructive/40 bg-destructive/5"
                        : "border-border bg-muted/20"
                    )}
                  >
                    {/* Rider info row */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="font-semibold text-sm">{rider.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {[rider.age && `${rider.age} yrs`, rider.weight && `${rider.weight} kg`].filter(Boolean).join(" · ")}
                        </span>
                        {weightBad && (
                          <span className="text-xs text-destructive font-medium">{wCheck?.reason}</span>
                        )}
                      </div>
                      {/* Waiver badge */}
                      <span className={cn(
                        "flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
                        waiversOk
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      )}>
                        {waiversOk
                          ? <><ShieldCheck className="w-3 h-3" /> Waiver signed</>
                          : <><ShieldAlert className="w-3 h-3" /> Waiver missing</>
                        }
                      </span>
                    </div>

                    {/* Wristband section */}
                    {wristband ? (
                      <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2">
                        <Link2 className="w-4 h-4 flex-shrink-0" />
                        <span className="font-mono font-semibold">{wristband.qrCode}</span>
                        <span className="text-green-600/70 dark:text-green-500/70 text-xs ml-1">linked</span>
                      </div>
                    ) : waiversOk ? (
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                          <QrCode className="w-3 h-3" /> Wristband QR
                        </label>
                        <input
                          type="text"
                          value={qrInputs[rider.id] ?? ""}
                          onChange={(e) => setQrInputs((p) => ({ ...p, [rider.id]: e.target.value }))}
                          placeholder="Scan or type wristband QR code…"
                          autoComplete="off"
                          className="w-full border border-border rounded-lg px-3 py-2 text-sm font-mono bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    ) : (
                      <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3" />
                        Wristband linking blocked — rider must sign waiver first
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Payment notice */}
          {!isPaymentSettled && (
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

          {/* Waiver summary — only show if any missing */}
          {!allWaiversDone && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-800">
              <ShieldAlert className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-800 dark:text-red-400">Waivers not completed</p>
                <p className="text-red-700 dark:text-red-500 text-sm mt-0.5">
                  {signedWaivers} of {result.numRiders} waivers signed. All riders must sign before wristbands can be linked or check-in can proceed.
                </p>
              </div>
            </div>
          )}

          {/* Wristband summary */}
          {isPaymentSettled && allWaiversDone && !allWristbandsLinked && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
              <QrCode className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-orange-800 dark:text-orange-400">Wristbands required</p>
                <p className="text-orange-700 dark:text-orange-500 text-sm mt-0.5">
                  Reception check-in is blocked until every rider has a wristband QR assigned and locked.
                </p>
              </div>
            </div>
          )}

          {/* Already checked in banner */}
          {result.checkIn && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
              <p className="text-sm text-green-800 dark:text-green-400 font-medium">
                Checked in at {new Date(result.checkIn.checkedInAt).toLocaleTimeString()}
                {allWristbandsLinked ? " · All wristbands linked" : ""}
              </p>
            </div>
          )}

          {/* ── Action bar ──────────────────────────────────────────────── */}
          <div className="flex flex-wrap gap-3 pt-2 border-t border-border">

            {/* Primary: link wristbands + check in */}
            {canLinkWristbands && !result.checkIn && weightIssues.length === 0 && (
              <button
                onClick={handleWristbandCheckIn}
                disabled={linking || !allMissingWristbandsEntered}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {linking ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                Link Wristbands & Check In
              </button>
            )}

            {/* Fallback check-in without wristbands (if all wristbands already linked) */}
            {isReadyForCheckIn && result.bookingStatus === "CONFIRMED" && !result.checkIn && (
              <button
                onClick={() => startCheckInTransition(async () => {
                  const r = await checkInBooking(result.id);
                  if (r.success) {
                    toast.success("Check-in completed and wristbands linked successfully.");
                    setResult((p) => p ? { ...p, bookingStatus: "CHECKED_IN", checkIn: { checkedInAt: new Date() } } : p);
                  } else toast.error((r as any).error ?? "Action failed");
                })}
                disabled={isCheckingIn}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-600 text-white font-semibold text-sm hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {isCheckingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Check in
              </button>
            )}

            {result.bookingStatus === "CHECKED_IN" && (
              <button
                onClick={() => startCompleteTransition(async () => {
                  const r = await completeBooking(result.id);
                  if (r.success) {
                    toast.success("Booking completed!");
                    setResult((p) => p ? { ...p, bookingStatus: "COMPLETED" } : p);
                  } else toast.error((r as any).error ?? "Action failed");
                })}
                disabled={isCompleting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {isCompleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Mark completed
              </button>
            )}

            {result.paymentStatus === "UNPAID" && (
              <button
                onClick={() => startMarkPaidTransition(async () => {
                  const r = await updatePaymentStatus(result.id, "PAID" as any, "cash");
                  if (r.success) {
                    toast.success("Marked as paid");
                    setResult((p) => p ? { ...p, paymentStatus: "PAID" } : p);
                  } else toast.error((r as any).error ?? "Could not mark payment as paid");
                })}
                disabled={isMarkingPaid}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors"
              >
                {isMarkingPaid && <Loader2 className="w-4 h-4 animate-spin" />}
                Mark paid (cash)
              </button>
            )}

            <button
              onClick={() => { setResult(null); setQuery(""); setNotFound(false); setQrInputs({}); }}
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
