"use client";

import { Camera, Video, Tv2, Check, Star } from "lucide-react";
import { useBookingStore } from "@/lib/booking/store";
import { StepShell } from "../step-shell";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { AddOn } from "@prisma/client";

const ICONS = [Camera, Video, Tv2];
const RECOMMENDED_INDEX = 1; // 360° video

export function Step5AddOns({ addOns }: { addOns: AddOn[] }) {
  const { addOnIds, numRiders, toggleAddOn, nextStep } = useBookingStore();

  return (
    <StepShell
      title="Add media to your booking"
      subtitle="No personal cameras allowed on the ride. Capture it professionally instead."
      onNext={nextStep}
      nextLabel={addOnIds.length > 0 ? "Continue with add-ons" : "Skip — no add-ons"}
    >
      <div className="space-y-3">
        {addOns.map((addon, i) => {
          const isSelected    = addOnIds.includes(addon.id);
          const isRecommended = i === RECOMMENDED_INDEX;
          const Icon = ICONS[i] ?? Camera;
          const total = Number(addon.price) * numRiders;

          return (
            <button
              key={addon.id}
              onClick={() => toggleAddOn(addon.id, addon.name, Number(addon.price))}
              className={cn(
                "w-full flex items-start gap-4 p-5 rounded-2xl border text-left transition-all duration-200",
                isSelected
                  ? "border-brand-citrus/60 bg-brand-citrus/8 shadow-brand-sm"
                  : "border-white/10 bg-white/3 hover:border-brand-citrus/30 hover:bg-white/5"
              )}
            >
              <div className={cn(
                "w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all",
                isSelected ? "border-brand-citrus bg-brand-citrus rounded-md" : "border-white/25 rounded-md"
              )}>
                {isSelected && <Check className="w-3 h-3 text-brand-deep" strokeWidth={3} />}
              </div>

              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                isSelected ? "bg-brand-citrus/20" : "bg-white/5"
              )}>
                <Icon className={cn("w-4 h-4", isSelected ? "text-brand-citrus" : "text-white/40")} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-white">{addon.name}</p>
                      {isRecommended && (
                        <span className="inline-flex items-center gap-1 bg-brand-citrus/15 border border-brand-citrus/30 text-brand-citrus text-[10px] font-bold px-2 py-0.5 rounded-full">
                          <Star className="w-2.5 h-2.5" />
                          Recommended
                        </span>
                      )}
                    </div>
                    {addon.description && (
                      <p className="text-white/50 text-sm mt-1 line-clamp-2">{addon.description}</p>
                    )}
                    {addon.bestFor && (
                      <p className="text-white/30 text-xs mt-1">Best for: {addon.bestFor}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-display font-bold text-lg text-white">
                      +{formatCurrency(total)}
                    </p>
                    <p className="text-white/35 text-xs">
                      {formatCurrency(Number(addon.price))} × {numRiders}
                    </p>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {addOnIds.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-brand-citrus">
          <Check className="w-4 h-4" />
          <span>{addOnIds.length} add-on{addOnIds.length > 1 ? "s" : ""} selected</span>
        </div>
      )}
    </StepShell>
  );
}
