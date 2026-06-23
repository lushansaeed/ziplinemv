"use client";

import { User, AlertTriangle } from "lucide-react";
import { useBookingStore } from "@/lib/booking/store";
import { StepShell } from "../step-shell";
import { isWeightEligible, isAgeEligible } from "@/lib/utils";
import { cn } from "@/lib/utils";

const inputCls = cn(
  "w-full rounded-xl px-3 py-2.5 text-sm bg-white/5 border border-white/10",
  "text-white placeholder:text-white/25",
  "focus:outline-none focus:ring-2 focus:ring-brand-citrus/40 focus:border-brand-citrus/30",
  "transition-all duration-150"
);

export function Step7RiderDetails() {
  const { riders, numRiders, setField, nextStep } = useBookingStore();

  function updateRider(index: number, field: keyof typeof riders[0], value: string) {
    const updated = riders.map((r, i) => i === index ? { ...r, [field]: value } : r);
    setField("riders", updated);
  }

  const allNamed     = riders.slice(0, numRiders).every((r) => r.name.trim().length > 0);
  const weightErrors = riders.slice(0, numRiders).flatMap((r, i) => {
    const w = parseFloat(r.weight);
    if (!r.weight || isNaN(w)) return [];
    const check = isWeightEligible(w);
    return check.eligible ? [] : [{ i, msg: check.reason! }];
  });
  const ageErrors = riders.slice(0, numRiders).flatMap((r, i) => {
    const a = parseInt(r.age);
    if (!r.age || isNaN(a)) return [];
    const check = isAgeEligible(a);
    return check.eligible ? [] : [{ i, msg: check.reason! }];
  });

  const hasErrors = weightErrors.length > 0 || ageErrors.length > 0;

  return (
    <StepShell
      title="Rider details"
      subtitle="We need details for each rider for safety and waiver purposes."
      onNext={nextStep}
      nextDisabled={!allNamed || hasErrors}
    >
      <div className="space-y-5">
        {riders.slice(0, numRiders).map((rider, i) => {
          const wErr = weightErrors.find((e) => e.i === i);
          const aErr = ageErrors.find((e) => e.i === i);

          return (
            <div
              key={i}
              className={cn(
                "bg-white/3 border rounded-2xl p-5 space-y-4",
                (wErr || aErr) ? "border-brand-coral/40" : "border-white/8"
              )}
            >
              {/* Rider header */}
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-brand-citrus/10 flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-brand-citrus" />
                </div>
                <p className="font-semibold text-white text-sm">Rider {i + 1}</p>
                {i === 0 && (
                  <span className="text-[10px] text-white/25 border border-white/10 rounded px-1.5 py-0.5">Lead rider</span>
                )}
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                {/* Name */}
                <div className="sm:col-span-3 space-y-1">
                  <label className="text-[11px] text-white/40 font-medium">Full name *</label>
                  <input
                    value={rider.name}
                    onChange={(e) => updateRider(i, "name", e.target.value)}
                    placeholder="Full name"
                    className={inputCls}
                  />
                </div>

                {/* Age */}
                <div className="space-y-1">
                  <label className="text-[11px] text-white/40 font-medium">Age</label>
                  <input
                    type="number"
                    min={6}
                    max={120}
                    value={rider.age}
                    onChange={(e) => updateRider(i, "age", e.target.value)}
                    placeholder="Years"
                    className={cn(inputCls, aErr && "border-brand-coral/50")}
                  />
                  {aErr && <p className="text-brand-coral text-[11px]">{aErr.msg}</p>}
                </div>

                {/* Weight */}
                <div className="space-y-1">
                  <label className="text-[11px] text-white/40 font-medium">Weight (kg)</label>
                  <input
                    type="number"
                    min={35}
                    max={110}
                    step={0.5}
                    value={rider.weight}
                    onChange={(e) => updateRider(i, "weight", e.target.value)}
                    placeholder="kg"
                    className={cn(inputCls, wErr && "border-brand-coral/50")}
                  />
                  {wErr && <p className="text-brand-coral text-[11px]">{wErr.msg}</p>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {hasErrors && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-brand-coral/10 border border-brand-coral/20">
          <AlertTriangle className="w-4 h-4 text-brand-coral flex-shrink-0 mt-0.5" />
          <p className="text-brand-coral text-sm">
            One or more riders do not meet the safety requirements.
            Weight must be 35–110 kg. Age must be 6 or older.
          </p>
        </div>
      )}

      <p className="text-white/25 text-xs">
        Weight and age are required for safety purposes. Riders outside limits cannot participate.
      </p>
    </StepShell>
  );
}
