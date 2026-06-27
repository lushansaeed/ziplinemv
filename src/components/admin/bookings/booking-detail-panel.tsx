"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Calendar, Clock, Users, Package, DollarSign,
  ShieldCheck, Image, User, Building2, Link2,
  CheckCircle2, Loader2, Edit2,
} from "lucide-react";
import { getBookingDetail, updateBookingStatus, updatePaymentStatus, checkInBooking, completeBooking, regenerateWaiverLink } from "@/lib/admin/booking-actions";
import { StatusBadge } from "../shared/status-badge";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { WaiverShareCard } from "@/components/waiver/waiver-share-card";

interface DetailRow {
  label: string;
  value: React.ReactNode;
  icon?: React.ElementType;
}

function Row({ label, value, icon: Icon }: DetailRow) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border/50 last:border-0">
      {Icon && <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />}
      <span className="text-muted-foreground text-sm min-w-[110px] flex-shrink-0">{label}</span>
      <span className="text-sm text-foreground font-medium flex-1 text-right">{value}</span>
    </div>
  );
}

export function BookingDetailPanel({ bookingId, onClose }: { bookingId: string; onClose: () => void }) {
  const [booking, setBooking] = useState<Awaited<ReturnType<typeof getBookingDetail>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  async function load() {
    setLoading(true);
    const data = await getBookingDetail(bookingId);
    setBooking(data);
    setLoading(false);
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [bookingId]);

  async function doAction(fn: () => Promise<any>, msg: string) {
    const res = await fn();
    if (res.success) { toast.success(msg); load(); }
    else toast.error(res.error ?? "Failed");
  }

  function exportWaiversCsv() {
    if (!booking) return;
    const rows = booking.waivers.map((waiver: any) => ({
      riderName: waiver.riderName,
      status: waiver.status,
      nationality: waiver.nationality ?? "",
      phone: [waiver.phoneCountryCode, waiver.phoneNumber].filter(Boolean).join(" "),
      emergencyContactName: waiver.emergencyContactName ?? "",
      emergencyContactPhone: waiver.emergencyContactPhone ?? "",
      weight: waiver.weight ?? "",
      mediaConsent: waiver.mediaConsent ? "Yes" : "No",
      signedAt: waiver.signedAt ? new Date(waiver.signedAt).toISOString() : "",
    }));
    const headers = Object.keys(rows[0] ?? { riderName: "", status: "" });
    const csv = [
      headers.join(","),
      ...rows.map((row) => headers.map((header) => `"${String((row as any)[header] ?? "").replace(/"/g, '""')}"`).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${booking.reference}-waivers.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!booking) {
    return <p className="text-muted-foreground text-sm text-center py-10">Booking not found.</p>;
  }

  const addOnsTotal = booking.addOns.reduce((s, a) => s + Number(a.total), 0);

  return (
    <div className="space-y-6">
      {/* Reference + status row */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="font-mono font-bold text-2xl text-primary">{booking.reference}</p>
          <p className="text-sm text-muted-foreground mt-0.5">
            Created {formatDate(booking.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge value={booking.bookingStatus} type="booking" />
          <StatusBadge value={booking.paymentStatus} type="payment" />
          <StatusBadge value={booking.source} type="source" />
        </div>
      </div>

      {/* QR code */}
      {booking.qrCode && (
        <div className="flex justify-center">
          <div className="bg-white p-3 rounded-xl">
            <img src={booking.qrCode} alt="QR" className="w-32 h-32" />
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        {booking.bookingStatus === "CONFIRMED" && (
          <button
            onClick={() => startTransition(() => doAction(() => checkInBooking(booking.id), "Checked in!"))}
            disabled={isPending}
            className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-purple-100 text-purple-800 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400 transition-colors font-medium"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Check in
          </button>
        )}
        {["CONFIRMED","CHECKED_IN"].includes(booking.bookingStatus) && (
          <button
            onClick={() => startTransition(() => doAction(() => completeBooking(booking.id), "Completed!"))}
            disabled={isPending}
            className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 transition-colors font-medium"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Complete
          </button>
        )}
        {booking.paymentStatus !== "PAID" && (
          <button
            onClick={() => startTransition(() => doAction(() => updatePaymentStatus(booking.id, "PAID" as any), "Marked paid!"))}
            disabled={isPending}
            className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-brand-citrus/10 text-brand-citrus hover:bg-brand-citrus/20 transition-colors font-medium"
          >
            <DollarSign className="w-3.5 h-3.5" />
            Mark paid
          </button>
        )}
        <a
          href={`/book/confirmation?ref=${booking.reference}`}
          target="_blank"
          className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg border border-border hover:bg-muted transition-colors font-medium text-muted-foreground"
        >
          View confirmation
        </a>
      </div>

      {/* Booking info */}
      <section>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Booking info</p>
        <div className="bg-muted/30 rounded-xl px-4 divide-y divide-border/50">
          <Row icon={Calendar} label="Date"    value={formatDate(booking.bookingDate, "EEEE, d MMMM yyyy")} />
          <Row icon={Clock}    label="Time"    value={`${booking.slot.startTime} – ${booking.slot.endTime}`} />
          <Row icon={Package}  label="Package" value={booking.package.name} />
          <Row icon={Users}    label="Riders"  value={`${booking.numRiders}`} />
          {booking.addOns.length > 0 && (
            <Row icon={Image} label="Add-ons" value={booking.addOns.map((a) => a.addOn.name).join(", ")} />
          )}
        </div>
      </section>

      {/* Customer */}
      <section>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Customer</p>
        <div className="bg-muted/30 rounded-xl px-4 divide-y divide-border/50">
          <Row icon={User}     label="Name"        value={booking.customer.name} />
          <Row label="WhatsApp" value={
            <a
              href={`https://wa.me/${booking.customer.phone.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#25D366] hover:underline font-medium"
            >
              {booking.customer.phone}
            </a>
          } />
          {booking.customer.email && <Row label="Email" value={booking.customer.email} />}
          {booking.customer.nationality && <Row label="Nationality" value={booking.customer.nationality} />}
          {booking.customer.hotel && <Row label="Hotel / guesthouse" value={booking.customer.hotel} />}
        </div>
      </section>

      {/* Riders */}
      {booking.riders.length > 0 && (
        <section>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Riders</p>
          <div className="space-y-2">
            {booking.riders.map((r, i) => (
              <div key={r.id} className="flex items-center justify-between px-4 py-2.5 bg-muted/30 rounded-xl text-sm">
                <span className="font-medium">{r.name}</span>
                <span className="text-muted-foreground text-xs">
                  {[r.age && `${r.age} yrs`, r.weight && `${r.weight} kg`].filter(Boolean).join(" · ")}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Financial */}
      <section>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Financial</p>
        <div className="bg-muted/30 rounded-xl px-4 divide-y divide-border/50">
          <Row label="Package total" value={formatCurrency(Number(booking.subtotal) - addOnsTotal)} />
          {addOnsTotal > 0 && <Row label="Add-ons" value={formatCurrency(addOnsTotal)} />}
          {Number(booking.discountAmount) > 0 && (
            <Row label="Discount" value={`−${formatCurrency(Number(booking.discountAmount))}`} />
          )}
          <Row label="Total" value={
            <span className="font-bold text-base text-primary">
              {formatCurrency(Number(booking.total), booking.currency)}
            </span>
          } />
          <Row label="Payment status" value={<StatusBadge value={booking.paymentStatus} type="payment" />} />
          {booking.paymentMethod && <Row label="Payment method" value={booking.paymentMethod.replace("_"," ")} />}
        </div>
      </section>

      {/* Attribution */}
      {(booking.agent || booking.affiliate) && (
        <section>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Attribution</p>
          <div className="bg-muted/30 rounded-xl px-4 divide-y divide-border/50">
            {booking.agent && (
              <Row icon={Building2} label="Agent" value={booking.agent.businessName} />
            )}
            {booking.affiliate && (
              <Row icon={Link2} label="Affiliate" value={booking.affiliate.name} />
            )}
            {booking.agentCommission && (
              <Row icon={DollarSign} label="Agent commission" value={formatCurrency(Number(booking.agentCommission.amount))} />
            )}
            {booking.affiliateCommission && (
              <Row icon={DollarSign} label="Affiliate commission" value={formatCurrency(Number(booking.affiliateCommission.amount))} />
            )}
          </div>
        </section>
      )}

      <WaiverShareCard
        waiverShare={(booking as any).waiverShare}
        canRegenerate
        onViewStatus={() => document.getElementById("admin-waiver-status")?.scrollIntoView({ behavior: "smooth", block: "start" })}
        onRegenerate={() => {
          if (!window.confirm("Regenerate this waiver link? The old link will stop working.")) return;
          startTransition(() => doAction(() => regenerateWaiverLink(booking.id), "Waiver link regenerated"));
        }}
      />

      {/* Waivers */}
      {booking.waivers.length > 0 && (
        <section id="admin-waiver-status" className="scroll-mt-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Waivers</p>
            <button onClick={exportWaiversCsv} className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted">
              Export CSV
            </button>
          </div>
          <div className="space-y-2">
            {booking.waivers.map((w: any) => (
              <div key={w.id} className="flex items-center justify-between px-4 py-2.5 bg-muted/30 rounded-xl text-sm">
                <div className="min-w-0">
                  <p className="font-medium">{w.riderName}</p>
                  {w.status === "SIGNED" && (
                    <p className="text-xs text-muted-foreground">
                      {[w.nationality, w.phoneNumber && `${w.phoneCountryCode ?? ""} ${w.phoneNumber}`, w.weight && `${w.weight} kg`].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <StatusBadge
                    value={w.status}
                    type="application"
                    className={cn(
                      w.status === "SIGNED" && "!bg-green-100 !text-green-800 dark:!bg-green-900/30 dark:!text-green-400",
                      w.status === "PENDING" && "!bg-yellow-100 !text-yellow-800"
                    )}
                  />
                  {w.signedAt && <p className="mt-1 text-[10px] text-muted-foreground">{formatDateTime(w.signedAt)}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Check-in info */}
      {booking.checkIn && (
        <section>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Check-in</p>
          <div className="bg-muted/30 rounded-xl px-4 divide-y divide-border/50">
            <Row label="Checked in at" value={formatDateTime(booking.checkIn.checkedInAt)} />
            {booking.checkIn.checkedInBy && (
              <Row label="By" value={booking.checkIn.checkedInBy.name} />
            )}
          </div>
        </section>
      )}

      {/* Notes */}
      {booking.notes && (
        <section>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Notes</p>
          <p className="text-sm text-muted-foreground bg-muted/30 rounded-xl px-4 py-3">{booking.notes}</p>
        </section>
      )}
    </div>
  );
}
