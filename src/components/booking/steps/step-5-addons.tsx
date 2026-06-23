"use client";

import { Camera, Video, Tv2, Minus, Plus, Star } from "lucide-react";
import { useBookingStore } from "@/lib/booking/store";
import { StepShell } from "../step-shell";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { AddOn } from "@prisma/client";

const ICONS = [Camera, Video, Tv2];
const RECOMMENDED_INDEX = 1; // 360° video

export function Step5AddOns({ addOns }: { addOns: AddOn[] }) {
  const { addOnQuantities, numRiders, setAddOnQty, addOnNames, addOnPrices, nextStep } = useBookingStore();

  const totalAddOnCost = addOns.reduce((sum, a) => {
    const qty = addOnQuantities[a.id] ?? 0;
    return sum + Number(a.price) * qty;
  }, 0);

  const anySelected = Object.values(addOnQuantities).some((q) => q > 0);

  return (
    <StepShell
      title="Add media to your ride"
      subtitle="No personal cameras allowed during the ride. Choose how many of each you'd like — up to your group size."
      onNext={nextStep}
      nextLabel={anySelected ? "Continue with media" : "Skip — no media"}
    >
      <div className="space-y-4">
        {addOns.map((addon, i) => {
          const qty          = addOnQuantities[addon.id] ?? 0;
          const isRecommended = i === RECOMMENDED_INDEX;
          const Icon          = ICONS[i] ?? Camera;
          const unitPrice     = Number(addon.price);
          const lineTotal     = unitPrice * qty;

          return (
            <div
              key={addon.id}
              className={cn(
                "rounded-2xl border p-5 transition-all duration-200",
                qty > 0
                  ? "border-brand-citrus/50 bg-brand-citrus/6 shadow-brand-sm"
                  : "border-white/10 bg-white/3"
              )}
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all",
                  qty > 0 ? "bg-brand-citrus/20" : "bg-white/5"
                )}>
                  <Icon className={cn("w-4 h-4", qty > 0 ? "text-brand-citrus" : "text-white/40")} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-white text-sm">{addon.name}</p>
                    {isRecommended && (
                      <span className="inline-flex items-center gap-1 bg-brand-citrus/15 border border-brand-citrus/30 text-brand-citrus text-[10px] font-bold px-2 py-0.5 rounded-full">
                        <Star className="w-2.5 h-2.5" /> Recommended
                      </span>
                    )}
                  </div>
                  {addon.description && (
                    <p className="text-white/50 text-xs mt-0.5 line-clamp-2">{addon.description}</p>
                  )}
                  {addon.bestFor && (
                    <p className="text-white/30 text-xs mt-1">Best for: {addon.bestFor}</p>
                  )}
                </div>

                {/* Price + quantity */}
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-white font-bold text-sm">
                      {qty > 0 ? `+${formatCurrency(lineTotal)}` : formatCurrency(unitPrice)}
                    </p>
                    <p className="text-white/30 text-[10px]">
                      {qty > 0 ? `${formatCurrency(unitPrice)} × ${qty}` : "per person"}
                    </p>
                  </div>

                  {/* Qty stepper */}
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => setAddOnQty(addon.id, addon.name, unitPrice, qty - 1)}
                      disabled={qty <= 0}
                      aria-label={`Remove one ${addon.name}`}
                      className={cn(
                        "w-8 h-8 rounded-lg border flex items-center justify-center transition-all",
                        qty > 0
                          ? "border-brand-citrus/40 text-brand-citrus hover:bg-brand-citrus/15 active:scale-95"
                          : "border-white/10 text-white/20 cursor-not-allowed"
                      )}
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>

                    <div className={cn(
                      "w-9 text-center text-sm font-bold tabular-nums transition-colors",
                      qty > 0 ? "text-brand-citrus" : "text-white/30"
                    )}>
                      {qty}
                    </div>

                    <button
                      onClick={() => setAddOnQty(addon.id, addon.name, unitPrice, qty + 1)}
                      disabled={qty >= numRiders}
                      aria-label={`Add one ${addon.name}`}
                      className={cn(
                        "w-8 h-8 rounded-lg border flex items-center justify-center transition-all",
                        qty < numRiders
                          ? "border-brand-citrus/40 text-brand-citrus hover:bg-brand-citrus/15 active:scale-95"
                          : "border-white/10 text-white/20 cursor-not-allowed"
                      )}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Quick-set buttons */}
                  <div className="flex gap-1">
                    {qty !== 0 && (
                      <button
                        onClick={() => setAddOnQty(addon.id, addon.name, unitPrice, 0)}
                        className="text-[10px] text-white/30 hover:text-white/60 transition-colors underline underline-offset-2"
                      >
                        None
                      </button>
                    )}
                    {qty !== numRiders && numRiders > 1 && (
                      <button
                        onClick={() => setAddOnQty(addon.id, addon.name, unitPrice, numRiders)}
                        className="text-[10px] text-brand-citrus/60 hover:text-brand-citrus transition-colors underline underline-offset-2"
                      >
                        All {numRiders}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Capacity bar */}
              {numRiders > 1 && (
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1 flex gap-0.5">
                    {Array.from({ length: numRiders }).map((_, j) => (
                      <div
                        key={j}
                        className={cn(
                          "flex-1 h-1 rounded-full transition-all duration-200",
                          j < qty ? "bg-brand-citrus" : "bg-white/10"
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] text-white/30 flex-shrink-0">
                    {qty}/{numRiders} riders
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      {anySelected && (
        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-brand-citrus/8 border border-brand-citrus/20">
          <div>
            <p className="text-white text-sm font-medium">
              {Object.values(addOnQuantities).filter(Boolean).length} media type{Object.values(addOnQuantities).filter(Boolean).length > 1 ? "s" : ""} selected
            </p>
            <p className="text-white/40 text-xs">
              {addOns.filter((a) => (addOnQuantities[a.id] ?? 0) > 0)
                .map((a) => `${addOnQuantities[a.id]}× ${a.name}`).join(" · ")}
            </p>
          </div>
          <p className="text-brand-citrus font-bold text-lg">+{formatCurrency(totalAddOnCost)}</p>
        </div>
      )}

      <p className="text-[11px] text-white/25 text-center">
        Max {numRiders} per add-on · matches your group size · default is zero
      </p>
    </StepShell>
  );
}
