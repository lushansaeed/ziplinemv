"use client";

import { useBookingStore } from "@/lib/booking/store";
import { formatDate } from "@/lib/utils";
import { parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export function BookingMobileBar() {
  const {
    currentStep, date, slotTime,
    stepContinueDisabled, stepContinueFn, stepContinueLabel,
  } = useBookingStore();

  if (currentStep === 9) return null;

  // Summary line shown above the button
  const summary = (() => {
    if (slotTime && date) return `${formatDate(parseISO(date), "d MMM")} · ${slotTime}`;
    if (date)     return formatDate(parseISO(date), "EEEE, d MMMM yyyy");
    return null;
  })();

  const hint = (() => {
    if (stepContinueDisabled) {
      if (currentStep === 1) return "Select a date to continue";
      if (currentStep === 2) return "Select a time slot to continue";
      if (currentStep === 4) return "Select a package to continue";
      if (currentStep === 6) return "Fill in your details to continue";
      if (currentStep === 8) return "Choose a payment method to continue";
    }
    return null;
  })();

  return (
    // Only visible on mobile/tablet (hidden lg+)
    <div className={cn(
      "lg:hidden fixed bottom-0 left-0 right-0 z-50",
      "bg-brand-deep/95 backdrop-blur-md border-t border-white/10",
      "px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]",
    )}>
      {/* Summary line */}
      {summary && (
        <p className="text-white/60 text-xs text-center mb-2 truncate">{summary}</p>
      )}

      {/* Continue button */}
      <button
        onClick={() => stepContinueFn?.()}
        disabled={stepContinueDisabled || !stepContinueFn}
        className={cn(
          "w-full flex items-center justify-center gap-2",
          "rounded-xl py-3.5 text-sm font-semibold",
          "bg-brand-gradient text-white",
          "transition-all duration-200 active:scale-[0.99]",
          "disabled:opacity-40 disabled:cursor-not-allowed",
        )}
        style={{ minHeight: 52 }}
      >
        {stepContinueLabel}
      </button>

      {/* Hint */}
      {hint && (
        <p className="text-white/30 text-[11px] text-center mt-1.5">{hint}</p>
      )}
    </div>
  );
}
