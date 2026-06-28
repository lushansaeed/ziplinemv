"use client";

import { useBookingStore } from "@/lib/booking/store";
import { formatDate } from "@/lib/utils";
import { formatBookingPrice } from "@/lib/booking/currency";
import { Calendar, Clock, Package, Users } from "lucide-react";
import { parseISO } from "date-fns";

export function BookingOrderSummary() {
  const store     = useBookingStore();
  const riderType = store.riderType ?? "tourist";

  // Use per-addon quantities (not numRiders for all)
  const addOnTotal = store.addOnIds.reduce(
    (sum, id) => sum + (store.addOnPrices[id] ?? 0) * (store.addOnQuantities[id] ?? 0),
    0
  );
  const subtotal = store.packagePrice * store.numRiders + addOnTotal;
  const total    = Math.max(0, subtotal - store.promoDiscount);

  return (
    <div className="site-card rounded-2xl p-5 space-y-4">
      <p className="site-text-muted text-xs font-semibold uppercase tracking-wider">Order summary</p>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2.5">
          <Calendar className="w-3.5 h-3.5 text-brand-citrus flex-shrink-0" />
          <div>
            <p className="site-text-muted text-[11px]">Date</p>
            <p className="site-heading text-sm font-medium">
              {store.date ? formatDate(parseISO(store.date), "EEE d MMM") : "—"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <Clock className="w-3.5 h-3.5 text-brand-citrus flex-shrink-0" />
          <div>
            <p className="site-text-muted text-[11px]">Time</p>
            <p className="site-heading text-sm font-medium">{store.slotTime || "—"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <Package className="w-3.5 h-3.5 text-brand-citrus flex-shrink-0" />
          <div>
            <p className="site-text-muted text-[11px]">Package</p>
            <p className="site-heading text-sm font-medium">{store.packageName || "—"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <Users className="w-3.5 h-3.5 text-brand-citrus flex-shrink-0" />
          <div>
            <p className="site-text-muted text-[11px]">Riders</p>
            <p className="site-heading text-sm font-medium">{store.numRiders}</p>
          </div>
        </div>
      </div>

      <div className="border-t site-subtle-border pt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="site-text-muted">{store.packageName} × {store.numRiders}</span>
          <span className="site-heading">{formatBookingPrice(store.packagePrice * store.numRiders, riderType)}</span>
        </div>

        {store.addOnIds.map((id) => {
          const qty = store.addOnQuantities[id] ?? 0;
          if (qty === 0) return null;
          return (
            <div key={id} className="flex justify-between text-sm">
              <span className="site-text-muted">
                {store.addOnNames[id]} × {qty}
                {qty < store.numRiders && (
                  <span className="site-text-muted text-xs ml-1">(not all riders)</span>
                )}
              </span>
              <span className="site-heading">{formatBookingPrice((store.addOnPrices[id] ?? 0) * qty, riderType)}</span>
            </div>
          );
        })}

        {store.promoDiscount > 0 && (
          <div className="flex justify-between text-sm text-brand-lime">
            <span>Discount ({store.promoCode})</span>
            <span>−{formatBookingPrice(store.promoDiscount, riderType)}</span>
          </div>
        )}

        <div className="flex justify-between text-base font-bold border-t site-subtle-border pt-2 mt-2">
          <span className="site-heading">Total</span>
          <span className="text-brand-citrus text-lg">{formatBookingPrice(total, riderType)}</span>
        </div>
      </div>
    </div>
  );
}
