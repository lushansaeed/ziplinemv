"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface BookingProgressBarProps {
  currentStep: number;
  steps: string[];
}

export function BookingProgressBar({ currentStep, steps }: BookingProgressBarProps) {
  return (
    <div className="w-full">
      {/* Desktop: numbered steps */}
      <div className="hidden sm:flex items-center justify-between relative">
        <div className="absolute left-0 right-0 top-4 h-px bg-white/10 z-0" />
        <div
          className="absolute left-0 top-4 h-px bg-brand-citrus z-0 transition-all duration-500"
          style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
        />
        {steps.map((label, i) => {
          const stepNum = i + 1;
          const done    = stepNum < currentStep;
          const active  = stepNum === currentStep;
          return (
            <div key={label} className="relative z-10 flex flex-col items-center gap-2">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300",
                done   ? "bg-brand-lime text-white"       :
                active ? "bg-brand-citrus text-brand-deep ring-4 ring-brand-citrus/25" :
                         "bg-white/8 text-white/30 border border-white/10"
              )}>
                {done ? <Check className="w-3.5 h-3.5" /> : stepNum}
              </div>
              <span className={cn(
                "text-[10px] font-medium hidden lg:block transition-colors",
                active ? "text-brand-citrus" : done ? "text-white/50" : "text-white/25"
              )}>
                {label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Mobile: progress bar + step label */}
      <div className="sm:hidden space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-white/50 text-xs">Step {currentStep} of {steps.length}</span>
          <span className="text-brand-citrus text-xs font-semibold">{steps[currentStep - 1]}</span>
        </div>
        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-citrus rounded-full transition-all duration-500"
            style={{ width: `${(currentStep / steps.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
