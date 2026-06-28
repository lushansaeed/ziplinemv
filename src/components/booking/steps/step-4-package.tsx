"use client";

import { Check } from "lucide-react";
import { useBookingStore } from "@/lib/booking/store";
import { StepShell } from "../step-shell";
import { formatCurrency } from "@/lib/utils";
import { formatBookingPrice } from "@/lib/booking/currency";
import { cn } from "@/lib/utils";
import type { Package } from "@prisma/client";

export function Step4Package({ packages }: { packages: Package[] }) {
  const { packageId, numRiders, riderType, setField, nextStep } = useBookingStore();

  function select(pkg: Package) {
    const isLocal   = riderType === "local";
    const unitPrice = isLocal && (pkg as any).localPriceMvr
      ? Number((pkg as any).localPriceMvr)
      : isLocal && pkg.localPrice
      ? Number(pkg.localPrice)
      : Number(pkg.touristPrice);
    setField("packageId",    pkg.id);
    setField("packageName",  pkg.name);
    setField("packagePrice", unitPrice);
    setField("currency", isLocal ? "MVR" : "USD");
  }

  return (
    <StepShell
      title="Choose your package"
      subtitle="Every package includes the zipline ride and speedboat return."
      onNext={nextStep}
      nextDisabled={!packageId}
    >
      <div className="flex flex-wrap justify-center gap-3">
        {packages.map((pkg) => {
          const isSelected  = packageId === pkg.id;
          const isLocal     = riderType === "local";
          // MVR for locals, USD for tourists
          const unitPrice   = isLocal && (pkg as any).localPriceMvr
            ? Number((pkg as any).localPriceMvr)
            : isLocal && pkg.localPrice
            ? Number(pkg.localPrice)
            : Number(pkg.touristPrice);
          const total       = unitPrice * numRiders;
          const usdTotal    = Number(pkg.touristPrice) * numRiders;
          // Only show savings if MVR price is set and we can compare
          const savedAmount = 0; // savings shown via MVR vs USD label

          return (
            <button
              key={pkg.id}
              onClick={() => select(pkg)}
              className={cn(
                "w-full sm:flex-[0_1_380px] flex items-start gap-4 p-5 rounded-2xl border text-left transition-all duration-200",
                isSelected
                  ? "border-brand-citrus/60 bg-brand-citrus/8 shadow-brand-sm"
                  : "border-white/10 bg-white/3 hover:border-brand-citrus/30 hover:bg-white/5"
              )}
            >
              {/* Selection indicator */}
              <div className={cn(
                "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all",
                isSelected ? "border-brand-citrus bg-brand-citrus" : "border-white/25"
              )}>
                {isSelected && <Check className="w-3 h-3 text-brand-deep" strokeWidth={3} />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-display font-bold text-white text-lg">{pkg.name}</p>
                      {pkg.featured && (
                        <span className="bg-brand-gradient text-brand-deep text-[10px] font-bold px-2 py-0.5 rounded-full">
                          Popular
                        </span>
                      )}
                    </div>
                    {pkg.description && (
                      <p className="text-white/50 text-sm mt-1 line-clamp-2">{pkg.description}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-display font-bold text-xl text-white">
                      {formatBookingPrice(total, riderType)}
                    </p>
                    <p className="text-white/35 text-xs">
                      {formatBookingPrice(unitPrice, riderType)} × {numRiders}
                    </p>
                    {isLocal ? (
                      <span className="text-[10px] font-bold text-brand-lime bg-brand-lime/10 px-1.5 py-0.5 rounded mt-1 inline-block">
                        MVR · Local price
                      </span>
                    ) : (
                      <span className="text-[10px] text-white/30 mt-0.5 inline-block">USD</span>
                    )}
                  </div>
                </div>

                {pkg.included.length > 0 && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
                    {pkg.included.slice(0, 4).map((item, i) => (
                      <span key={i} className={cn("flex items-center gap-1 text-xs", isSelected ? "text-brand-lime/80" : "text-white/35")}>
                        <Check className="w-3 h-3" />
                        {item}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </StepShell>
  );
}
