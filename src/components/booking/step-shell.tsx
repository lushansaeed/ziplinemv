"use client";

import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { useBookingStore } from "@/lib/booking/store";
import { cn } from "@/lib/utils";

interface StepShellProps {
  title:       string;
  subtitle?:   string;
  children:    React.ReactNode;
  onNext?:     () => void;
  nextLabel?:  string;
  nextDisabled?: boolean;
  isLoading?:  boolean;
  hidePrev?:   boolean;
  hideNext?:   boolean;
}

export function StepShell({
  title, subtitle, children, onNext, nextLabel = "Continue",
  nextDisabled, isLoading, hidePrev, hideNext,
}: StepShellProps) {
  const { currentStep, prevStep } = useBookingStore();

  return (
    <div className="space-y-6">
      {/* Step header */}
      <div className="space-y-1">
        <h2 className="font-display font-bold text-2xl text-white">{title}</h2>
        {subtitle && <p className="text-white/50 text-sm">{subtitle}</p>}
      </div>

      {/* Content */}
      <div>{children}</div>

      {/* Navigation */}
      {(!hidePrev || !hideNext) && (
        <div className="flex items-center justify-between pt-2">
          {!hidePrev && currentStep > 1 ? (
            <button
              onClick={prevStep}
              className="flex items-center gap-2 text-white/50 hover:text-white text-sm font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          ) : (
            <div />
          )}

          {!hideNext && onNext && (
            <button
              onClick={onNext}
              disabled={nextDisabled || isLoading}
              className={cn(
                "flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold",
                "bg-brand-gradient text-white shadow-brand-md hover:shadow-brand-lg",
                "transition-all duration-200 active:scale-[0.98]",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing…
                </>
              ) : (
                <>
                  {nextLabel}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
