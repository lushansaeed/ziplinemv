"use client";

import { Minus, Plus, Users } from "lucide-react";
import { useBookingStore } from "@/lib/booking/store";
import { StepShell } from "../step-shell";
import { cn } from "@/lib/utils";

const MAX_RIDERS = 8;

export function Step3Riders() {
  const { numRiders, syncRiders, nextStep } = useBookingStore();

  function change(delta: number) {
    const next = Math.max(1, Math.min(MAX_RIDERS, numRiders + delta));
    syncRiders(next);
  }

  return (
    <StepShell
      title="How many riders?"
      subtitle="One ticket per person. Each rider must meet weight and age requirements."
      onNext={nextStep}
      nextDisabled={numRiders < 1}
    >
      {/* Counter */}
      <div className="flex flex-col items-center gap-8 py-8">
        <div className="flex items-center gap-8">
          <button
            onClick={() => change(-1)}
            disabled={numRiders <= 1}
            className={cn(
              "w-14 h-14 rounded-full border text-2xl font-bold transition-all",
              numRiders <= 1
                ? "border-white/10 text-white/20 cursor-not-allowed"
                : "border-brand-citrus/40 text-brand-citrus hover:bg-brand-citrus/10 active:scale-95"
            )}
          >
            <Minus className="w-5 h-5 mx-auto" />
          </button>

          <div className="text-center space-y-1">
            <p className="font-display font-bold text-7xl text-brand-citrus leading-none">
              {numRiders}
            </p>
            <p className="text-white/40 text-sm">{numRiders === 1 ? "rider" : "riders"}</p>
          </div>

          <button
            onClick={() => change(1)}
            disabled={numRiders >= MAX_RIDERS}
            className={cn(
              "w-14 h-14 rounded-full border text-2xl font-bold transition-all",
              numRiders >= MAX_RIDERS
                ? "border-white/10 text-white/20 cursor-not-allowed"
                : "border-brand-citrus/40 text-brand-citrus hover:bg-brand-citrus/10 active:scale-95"
            )}
          >
            <Plus className="w-5 h-5 mx-auto" />
          </button>
        </div>

        {/* Quick buttons */}
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <button
              key={n}
              onClick={() => syncRiders(n)}
              className={cn(
                "w-10 h-10 rounded-xl text-sm font-semibold transition-all",
                numRiders === n
                  ? "bg-brand-citrus text-brand-deep"
                  : "bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
              )}
            >
              {n}
            </button>
          ))}
          <span className="w-10 h-10 flex items-center justify-center text-white/20 text-sm">7+</span>
        </div>
      </div>

      {/* Requirements reminder */}
      <div className="bg-white/3 border border-white/8 rounded-xl p-4 space-y-2">
        <p className="text-white/50 text-xs font-semibold uppercase tracking-wider">Rider requirements</p>
        <div className="grid sm:grid-cols-3 gap-3 text-sm">
          {[
            { label: "Minimum weight", value: "35 kg" },
            { label: "Maximum weight", value: "110 kg" },
            { label: "Minimum age",    value: "6 years" },
          ].map((r) => (
            <div key={r.label} className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-brand-citrus flex-shrink-0" />
              <div>
                <p className="text-white/35 text-[11px]">{r.label}</p>
                <p className="text-white font-medium text-sm">{r.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {numRiders > 4 && (
        <p className="text-brand-mango/80 text-xs text-center">
          For groups larger than 8, please <a href="/contact" className="underline hover:text-brand-citrus">contact us</a> for a custom quote.
        </p>
      )}
    </StepShell>
  );
}
