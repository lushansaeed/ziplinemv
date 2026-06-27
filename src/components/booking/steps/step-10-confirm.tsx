"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  CheckCircle2, Calendar, Clock, Users, Package,
  Copy, MessageCircle, ArrowRight,
} from "lucide-react";
import { useBookingStore } from "@/lib/booking/store";
import { formatDate } from "@/lib/utils";
import { formatBookingPrice } from "@/lib/booking/currency";
import { parseISO } from "date-fns";
import { cn } from "@/lib/utils";

export function Step10Confirm() {
  const store = useBookingStore();
  const { bookingReference, waiverShare } = store;

  // Reset store after showing confirmation (delayed so user can see it)
  useEffect(() => {
    return () => {
      // Don't reset immediately — user may want to screenshot
    };
  }, []);

  if (!bookingReference) return null;

  const addOnTotal = store.addOnIds.reduce(
    (sum, id) => sum + (store.addOnPrices[id] ?? 0) * store.numRiders,
    0
  );
  const total = Math.max(0, store.packagePrice * store.numRiders + addOnTotal - store.promoDiscount);

  return (
    <div className="text-center animate-fade-in">
      {/* Success icon */}
      <div className="flex justify-center mb-6">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-brand-lime/10 border border-brand-lime/20 flex items-center justify-center animate-pulse-glow">
            <CheckCircle2 className="w-10 h-10 text-brand-lime" />
          </div>
          <div className="absolute inset-0 rounded-full bg-brand-lime/5 animate-ping" />
        </div>
      </div>

      <h1 className="font-display font-bold text-4xl sm:text-5xl text-white mb-3">
        You're booked!
      </h1>
      <p className="text-white/50 text-lg mb-8">
        Your booking is confirmed. The waiver form link has been sent to your WhatsApp and Email.
      </p>

      {/* Reference */}
      <div className="inline-flex items-center gap-3 bg-brand-citrus/10 border border-brand-citrus/30 rounded-2xl px-6 py-3 mb-8">
        <span className="text-white/50 text-sm">Booking reference</span>
        <span className="font-mono font-bold text-brand-citrus text-xl tracking-widest">
          {bookingReference}
        </span>
      </div>

      {waiverShare && (
        <div className="bg-brand-citrus/8 border border-brand-citrus/25 rounded-2xl p-6 max-w-2xl mx-auto mb-8 text-left space-y-4">
          <div>
            <p className="text-white font-semibold">Rider waiver forms</p>
            <p className="mt-1 text-sm text-white/55">
              Please ensure each rider completes the waiver before the ride. One phone or device can be used for multiple riders.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-[132px_minmax(0,1fr)]">
            <div className="rounded-xl bg-white p-3">
              <img src={waiverShare.qrCode} alt="Waiver QR code" className="h-28 w-28" />
            </div>
            <div className="min-w-0 space-y-3">
              <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/55 break-all">
                {waiverShare.url}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => navigator.clipboard.writeText(waiverShare.url)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/12 px-3 py-2 text-xs font-semibold text-white/75 hover:bg-white/8"
                >
                  <Copy className="h-3.5 w-3.5" /> Copy link
                </button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Hi,\n\nPlease complete the zipline waiver form using the link below before your ride:\n\n${waiverShare.url}\n\nBooking Reference: ${bookingReference}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/12 px-3 py-2 text-xs font-semibold text-white/75 hover:bg-white/8"
                >
                  <MessageCircle className="h-3.5 w-3.5" /> Share
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR + details */}
      <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto mb-8 text-left">
        {/* QR code */}
        <div className="bg-white/3 border border-white/8 rounded-2xl p-6 flex flex-col items-center gap-3">
          {store.qrCode ? (
            <img
              src={store.qrCode}
              alt="Booking QR code"
              className="w-40 h-40 rounded-xl"
            />
          ) : (
            <div className="w-40 h-40 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center">
              <p className="text-white/25 text-xs text-center">QR code loading…</p>
            </div>
          )}
          <p className="text-white/40 text-xs text-center">
            Show this QR at check-in. Screenshot or download to save.
          </p>
        </div>

        {/* Booking details */}
        <div className="bg-white/3 border border-white/8 rounded-2xl p-6 space-y-4">
          <p className="text-white font-semibold">Booking summary</p>
          <div className="space-y-3">
            {[
              { icon: Calendar, label: "Date",    value: store.date ? formatDate(parseISO(store.date), "EEE, d MMM yyyy") : "—" },
              { icon: Clock,    label: "Time",    value: store.slotTime || "—" },
              { icon: Package,  label: "Package", value: store.packageName },
              { icon: Users,    label: "Riders",  value: `${store.numRiders} ${store.numRiders === 1 ? "person" : "people"}` },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-center gap-3">
                  <Icon className="w-4 h-4 text-brand-citrus flex-shrink-0" />
                  <div className="flex-1 flex items-center justify-between">
                    <span className="text-white/45 text-sm">{item.label}</span>
                    <span className="text-white text-sm font-medium">{item.value}</span>
                  </div>
                </div>
              );
            })}
            {store.addOnIds.length > 0 && (
              <div className="text-xs text-white/35 pt-1 border-t border-white/8">
                Add-ons: {store.addOnIds.map((id) => store.addOnNames[id]).join(", ")}
              </div>
            )}
          </div>
          <div className="border-t border-white/8 pt-3 flex justify-between">
            <span className="text-white/50 text-sm">Total</span>
            <span className="text-brand-citrus font-bold">{formatBookingPrice(total, store.riderType)}</span>
          </div>
        </div>
      </div>

      {/* What's next */}
      <div className="bg-white/3 border border-white/8 rounded-2xl p-6 max-w-2xl mx-auto mb-8 text-left space-y-3">
        <p className="text-white font-semibold text-sm">What happens next?</p>
        <ol className="space-y-2">
          {[
            "You'll receive a confirmation on WhatsApp / email shortly.",
            "Ask each rider to complete the waiver link sent to your WhatsApp and email.",
            "Report to the Zipline Maldives check-in point at least 15 minutes before your slot.",
            "Fly 428 metres across the Indian Ocean.",
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-white/60">
              <span className="w-5 h-5 rounded-full bg-brand-citrus/15 text-brand-citrus text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
        <Link
          href="/contact"
          className="flex items-center gap-2 btn-ghost-white text-sm w-full sm:w-auto justify-center"
        >
          <MessageCircle className="w-4 h-4" />
          WhatsApp us
        </Link>
        <button
          onClick={() => {
            // Reset store and go back to home
            store.reset();
            window.location.href = "/";
          }}
          className="flex items-center gap-2 btn-brand text-sm w-full sm:w-auto justify-center"
        >
          Back to home
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
