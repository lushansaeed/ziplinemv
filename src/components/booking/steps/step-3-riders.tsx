"use client";

import { Minus, Plus, Users, Globe, Anchor } from "lucide-react";
import { useBookingStore } from "@/lib/booking/store";
import { StepShell } from "../step-shell";
import { cn } from "@/lib/utils";

export function Step3Riders() {
  const { numRiders, riderType, slotRemaining, syncRiders, setField, nextStep } = useBookingStore();
  // Cap at slot's remaining capacity (falls back to 35 for walk-ins / fresh state)
  const MAX_RIDERS = Math.max(1, slotRemaining ?? 35);

  function selectRiderType(type: "tourist" | "local") {
    if (type === riderType) return;
    setField("riderType", type);
    setField("currency", type === "local" ? "MVR" : "USD");
    setField("packageId", "");
    setField("packageName", "");
    setField("packagePrice", 0);
    setField("addOnIds", []);
    setField("addOnNames", {});
    setField("addOnPrices", {});
    setField("addOnQuantities", {});
    setField("promoCode", "");
    setField("promoDiscount", 0);
  }

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
      {/* ── Rider type ─────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Rider type</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => selectRiderType("tourist")}
            className={cn(
              "flex flex-col items-start gap-2 p-4 rounded-2xl border transition-all text-left",
              riderType === "tourist"
                ? "border-brand-citrus/60 bg-brand-citrus/8 shadow-brand-sm"
                : "border-white/10 bg-white/3 hover:border-brand-citrus/30 hover:bg-white/5"
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
              riderType === "tourist" ? "bg-brand-citrus/20" : "bg-white/5"
            )}>
              <Globe className={cn("w-4 h-4", riderType === "tourist" ? "text-brand-citrus" : "text-white/40")} />
            </div>
            <div>
              <p className={cn("text-sm font-semibold", riderType === "tourist" ? "text-white" : "text-white/70")}>
                Visitor / Tourist
              </p>
              <p className="text-xs text-white/40 mt-0.5">International visitors</p>
            </div>
            {riderType === "tourist" && (
              <span className="text-[10px] font-bold text-brand-citrus uppercase tracking-wider">✓ Selected</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => selectRiderType("local")}
            className={cn(
              "flex flex-col items-start gap-2 p-4 rounded-2xl border transition-all text-left",
              riderType === "local"
                ? "border-brand-lime/60 bg-brand-lime/8 shadow-ocean-sm"
                : "border-white/10 bg-white/3 hover:border-brand-lime/30 hover:bg-white/5"
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
              riderType === "local" ? "bg-brand-lime/20" : "bg-white/5"
            )}>
              <Anchor className={cn("w-4 h-4", riderType === "local" ? "text-brand-lime" : "text-white/40")} />
            </div>
            <div>
              <p className={cn("text-sm font-semibold", riderType === "local" ? "text-white" : "text-white/70")}>
                Local / Work Permit
              </p>
              <p className="text-xs text-white/40 mt-0.5">Maldivian residents</p>
            </div>
            {riderType === "local" && (
              <span className="text-[10px] font-bold text-brand-lime uppercase tracking-wider">✓ Local price</span>
            )}
          </button>
        </div>

        {riderType === "local" && (
          <p className="text-xs text-brand-lime/80 px-1">
            Local pricing applies. You may be asked to show proof of residency at check-in.
          </p>
        )}
      </div>

      {/* ── Rider count ─────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-6 py-6">
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

        {/* Quick buttons — show up to 8 shortcuts, capped by MAX_RIDERS */}
        <div className="flex gap-2 flex-wrap justify-center">
          {Array.from({ length: Math.min(MAX_RIDERS, 8) }, (_, i) => i + 1).map((n) => (
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
        </div>
      </div>

      {/* ── Requirements ─────────────────────────────────────────────────── */}
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

      {numRiders === MAX_RIDERS && MAX_RIDERS > 1 && (
        <p className="text-brand-mango/80 text-xs text-center">
          Maximum {MAX_RIDERS} riders available for this slot.
        </p>
      )}
    </StepShell>
  );
}
