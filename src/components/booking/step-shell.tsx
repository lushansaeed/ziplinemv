"use client";

import { useEffect, useRef } from "react";
import { ArrowLeft } from "lucide-react";
import { useBookingStore } from "@/lib/booking/store";
import { cn } from "@/lib/utils";

interface StepShellProps {
  title:        string;
  subtitle?:    string;
  children:     React.ReactNode;
  onNext?:      () => void;
  nextLabel?:   string;
  nextDisabled?: boolean;
  isLoading?:   boolean;
  hidePrev?:    boolean;
  hideNext?:    boolean;
}

export function StepShell({
  title, subtitle, children, onNext, nextLabel = "Continue",
  nextDisabled, isLoading, hidePrev, hideNext,
}: StepShellProps) {
  const { currentStep, prevStep, registerStepContinue } = useBookingStore();

  // Keep a stable ref to onNext so the stored fn doesn't change reference
  // on every render (which would cause an infinite update loop).
  const onNextRef = useRef(onNext);
  onNextRef.current = onNext;

  useEffect(() => {
    if (!hideNext && onNext) {
      // Wrap in a stable function that always calls the current ref value
      registerStepContinue(
        !!nextDisabled || !!isLoading,
        () => onNextRef.current?.(),
        nextLabel
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextDisabled, isLoading, nextLabel, hideNext]); // onNext intentionally excluded

  return (
    <div className="space-y-4">
      {/* Step header */}
      <div className="space-y-1">
        <h2 className="font-display font-bold text-2xl site-heading">{title}</h2>
        {subtitle && <p className="site-text-muted text-sm">{subtitle}</p>}
      </div>

      {/* Content */}
      <div>{children}</div>

      {/* Mobile navigation — Back button + Continue (hidden on desktop, shown in sidebar) */}
      {(!hidePrev || !hideNext) && (
        <div className={cn(
          "flex items-center justify-between pt-2",
          // On desktop Continue is in sidebar — only show Back on desktop
          "lg:flex"
        )}>
          {/* Back */}
          {!hidePrev && currentStep > 1 ? (
            <button
              onClick={prevStep}
              className="flex items-center gap-2 site-text-muted text-sm font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          ) : (
            <div />
          )}

          {/* Continue — visible on mobile only; desktop uses sidebar */}
          {!hideNext && onNext && (
            <button
              onClick={onNext}
              disabled={nextDisabled || isLoading}
              className={cn(
                "lg:hidden",   // ← hidden on desktop (sidebar has it)
                "flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold",
                "site-button shadow-brand-md",
                "transition-all duration-200 active:scale-[0.98]",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
              )}
            >
              {isLoading ? "Processing…" : nextLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
