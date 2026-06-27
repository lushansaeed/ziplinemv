"use client";

import { useEffect, useState } from "react";
import { Loader2, Calendar, Clock, Package, Users, ExternalLink } from "lucide-react";
import { StatusBadge } from "@/components/admin/shared/status-badge";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { WaiverShareCard } from "@/components/waiver/waiver-share-card";
import { AgentCommissionBreakdown } from "@/components/commission/agent-commission-breakdown";

export function AgentBookingDetail({ bookingId }: { bookingId: string }) {
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/agent/bookings/${bookingId}`)
      .then((r) => r.json())
      .then((d) => { setBooking(d.booking); setLoading(false); });
  }, [bookingId]);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );
  if (!booking) return <p className="text-muted-foreground text-sm text-center py-10">Booking not found.</p>;

  return (
    <div className="space-y-6">
      {/* Reference */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="font-mono font-bold text-2xl text-primary">{booking.reference}</p>
          <p className="text-sm text-muted-foreground">{formatDate(booking.createdAt)}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <StatusBadge value={booking.bookingStatus} type="booking" />
          <StatusBadge value={booking.paymentStatus} type="payment" />
        </div>
      </div>

      {/* QR */}
      {booking.qrCode && (
        <div className="flex justify-center">
          <div className="bg-white p-3 rounded-xl">
            <img src={booking.qrCode} alt="QR" className="w-28 h-28" />
          </div>
        </div>
      )}

      {/* Details */}
      <div className="bg-muted/30 rounded-xl px-4 divide-y divide-border/50">
        {[
          { icon: Calendar, label: "Date",    value: formatDate(booking.bookingDate, "EEEE, d MMMM yyyy") },
          { icon: Clock,    label: "Time",    value: booking.slot?.startTime },
          { icon: Package,  label: "Package", value: booking.package?.name },
          { icon: Users,    label: "Riders",  value: String(booking.numRiders) },
        ].map((row) => {
          const Icon = row.icon;
          return (
            <div key={row.label} className="flex items-center gap-3 py-2.5">
              <Icon className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground text-sm min-w-[80px]">{row.label}</span>
              <span className="text-sm font-medium ml-auto">{row.value}</span>
            </div>
          );
        })}
        {booking.addOns?.length > 0 && (
          <div className="py-2.5 text-sm text-muted-foreground">
            Add-ons: {booking.addOns.map((a: any) => a.addOn.name).join(", ")}
          </div>
        )}
      </div>

      {/* Customer */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Customer</p>
        <div className="bg-muted/30 rounded-xl px-4 divide-y divide-border/50">
          <div className="py-2.5 flex justify-between text-sm">
            <span className="text-muted-foreground">Name</span>
            <span className="font-medium">{booking.customer.name}</span>
          </div>
          <div className="py-2.5 flex justify-between text-sm">
            <span className="text-muted-foreground">Phone</span>
            <span>{booking.customer.phone}</span>
          </div>
          {booking.customer.email && (
            <div className="py-2.5 flex justify-between text-sm">
              <span className="text-muted-foreground">Email</span>
              <span>{booking.customer.email}</span>
            </div>
          )}
        </div>
      </div>

      {/* Riders */}
      {booking.riders?.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Riders</p>
          <div className="space-y-1.5">
            {booking.riders.map((r: any, i: number) => (
              <div key={i} className="flex justify-between px-3 py-2 bg-muted/30 rounded-lg text-sm">
                <span className="font-medium">{r.name}</span>
                <span className="text-muted-foreground text-xs">
                  {[r.age && `${r.age} yrs`, r.weight && `${r.weight} kg`].filter(Boolean).join(" · ")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Financials */}
      <div className="bg-muted/30 rounded-xl px-4 divide-y divide-border/50">
        <div className="py-2.5 flex justify-between text-sm">
          <span className="text-muted-foreground">Total</span>
          <span className="font-bold text-base text-primary">{formatCurrency(Number(booking.total), booking.currency)}</span>
        </div>
        {booking.agentCommission && (
          <div className="py-3">
            <AgentCommissionBreakdown commission={booking.agentCommission} currency={booking.currency} />
          </div>
        )}
      </div>

      <WaiverShareCard
        waiverShare={booking.waiverShare}
        onViewStatus={() => document.getElementById("agent-waiver-status")?.scrollIntoView({ behavior: "smooth", block: "start" })}
      />

      {/* Waiver status */}
      <div id="agent-waiver-status" className="space-y-2 scroll-mt-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Waivers</p>
        <div className="space-y-1.5">
          {booking.waivers?.length > 0 ? booking.waivers.map((w: any) => (
            <div key={w.id} className="flex justify-between px-3 py-2 bg-muted/30 rounded-lg text-sm">
              <span>{w.riderName}</span>
              <span className={`text-xs font-medium ${w.status === "SIGNED" ? "text-green-600" : "text-yellow-600"}`}>
                {w.status}
              </span>
            </div>
          )) : (
            <p className="text-sm text-muted-foreground px-3 py-2">No waiver records yet.</p>
          )}
        </div>
      </div>

      {/* Link to confirmation */}
      <a
        href={`/book/confirmation?ref=${booking.reference}`}
        target="_blank"
        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
      >
        <ExternalLink className="w-4 h-4" />
        View confirmation page
      </a>
    </div>
  );
}
