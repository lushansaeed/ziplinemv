"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface BookingProgressBarProps {
  currentStep: number;
  steps:       string[];
}

export function BookingProgressBar({ currentStep, steps }: BookingProgressBarProps) {
  const total = steps.length;

  return (
    <>
      {/* ── Mobile: compact progress bar + step label ── */}
      <div className="lg:hidden space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-white/40">Step {currentStep} of {total}</span>
          <span className="text-brand-citrus font-semibold">{steps[currentStep - 1] ?? ""}</span>
        </div>
        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-citrus rounded-full transition-all duration-500"
            style={{ width: `${(currentStep / total) * 100}%` }}
          />
        </div>
      </div>

      {/* ── Desktop: numbered step circles (compact) ── */}
      <div className="hidden lg:flex items-center justify-between relative">
        <div className="absolute left-0 right-0 top-3.5 h-px bg-white/10 z-0" />
        <div
          className="absolute left-0 top-3.5 h-px bg-brand-citrus z-0 transition-all duration-500"
          style={{ width: `${((currentStep - 1) / (total - 1)) * 100}%` }}
        />
        {steps.map((label, i) => {
          const stepNum = i + 1;
          const done    = stepNum < currentStep;
          const active  = stepNum === currentStep;
          return (
            <div key={label} className="relative z-10 flex flex-col items-center gap-1.5">
              <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                done   ? "bg-brand-lime text-white" :
                active ? "bg-brand-citrus text-brand-deep ring-4 ring-brand-citrus/20" :
                         "bg-white/8 text-white/30 border border-white/10"
              )}>
                {done ? <Check className="w-3 h-3" /> : stepNum}
              </div>
              <span className={cn(
                "text-[10px] font-medium hidden xl:block whitespace-nowrap",
                active ? "text-brand-citrus" : done ? "text-white/40" : "text-white/20"
              )}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}
