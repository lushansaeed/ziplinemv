"use client";

import { useBookingStore } from "@/lib/booking/store";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Calendar, Clock, Package, Users } from "lucide-react";
import { parseISO } from "date-fns";

export function BookingOrderSummary() {
  const store = useBookingStore();

  const addOnTotal = store.addOnIds.reduce(
    (sum, id) => sum + (store.addOnPrices[id] ?? 0) * store.numRiders,
    0
  );
  const subtotal      = store.packagePrice * store.numRiders + addOnTotal;
  const total         = Math.max(0, subtotal - store.promoDiscount);

  return (
    <div className="bg-white/3 border border-white/8 rounded-2xl p-5 space-y-4">
      <p className="text-white/50 text-xs font-semibold uppercase tracking-wider">Order summary</p>

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2.5">
          <Calendar className="w-3.5 h-3.5 text-brand-citrus flex-shrink-0" />
          <div>
            <p className="text-white/35 text-[11px]">Date</p>
            <p className="text-white text-sm font-medium">
              {store.date ? formatDate(parseISO(store.date), "EEE d MMM") : "—"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <Clock className="w-3.5 h-3.5 text-brand-citrus flex-shrink-0" />
          <div>
            <p className="text-white/35 text-[11px]">Time</p>
            <p className="text-white text-sm font-medium">{store.slotTime || "—"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <Package className="w-3.5 h-3.5 text-brand-citrus flex-shrink-0" />
          <div>
            <p className="text-white/35 text-[11px]">Package</p>
            <p className="text-white text-sm font-medium">{store.packageName || "—"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <Users className="w-3.5 h-3.5 text-brand-citrus flex-shrink-0" />
          <div>
            <p className="text-white/35 text-[11px]">Riders</p>
            <p className="text-white text-sm font-medium">{store.numRiders}</p>
          </div>
        </div>
      </div>

      {/* Line items */}
      <div className="border-t border-white/6 pt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-white/60">{store.packageName} × {store.numRiders}</span>
          <span className="text-white">{formatCurrency(store.packagePrice * store.numRiders)}</span>
        </div>
        {store.addOnIds.map((id) => (
          <div key={id} className="flex justify-between text-sm">
            <span className="text-white/60">{store.addOnNames[id]} × {store.numRiders}</span>
            <span className="text-white">{formatCurrency((store.addOnPrices[id] ?? 0) * store.numRiders)}</span>
          </div>
        ))}
        {store.promoDiscount > 0 && (
          <div className="flex justify-between text-sm text-brand-lime">
            <span>Discount ({store.promoCode})</span>
            <span>−{formatCurrency(store.promoDiscount)}</span>
          </div>
        )}
        <div className="flex justify-between text-base font-bold border-t border-white/8 pt-2 mt-2">
          <span className="text-white">Total</span>
          <span className="text-brand-citrus text-lg">{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );
}
