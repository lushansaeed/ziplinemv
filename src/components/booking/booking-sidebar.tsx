"use client";

import { useBookingStore } from "@/lib/booking/store";
import { formatDate } from "@/lib/utils";
import { formatBookingPrice } from "@/lib/booking/currency";
import { Calendar, Clock, Package, Users, Tag, ArrowRight, Loader2 } from "lucide-react";
import { parseISO } from "date-fns";
import { cn } from "@/lib/utils";

const STEP_LABELS = [
  "", "Date", "Time", "Riders", "Package",
  "Add-ons", "Your info", "Payment",
];

export function BookingSidebar() {
  const store = useBookingStore();
  const {
    currentStep, date, slotTime, numRiders,
    packageName, packagePrice, addOnIds, addOnNames, addOnPrices, addOnQuantities,
    promoDiscount, riderType,
    stepContinueDisabled, stepContinueFn, stepContinueLabel,
  } = store;

  if (currentStep === 8) return null;

  const addOnTotal = addOnIds.reduce(
    (sum, id) => sum + (addOnPrices[id] ?? 0) * (addOnQuantities[id] ?? 0),
    0
  );
  const subtotal = packagePrice * numRiders + addOnTotal;
  const total    = Math.max(0, subtotal - promoDiscount);

  const nextStepName = STEP_LABELS[currentStep + 1] ?? "";

  const summaryItems = [
    date && { icon: Calendar, label: "Date",    value: formatDate(parseISO(date), "EEE, d MMM yyyy") },
    slotTime && { icon: Clock, label: "Time",   value: slotTime },
    { icon: Users,   label: "Riders",  value: `${numRiders} ${numRiders === 1 ? "rider" : "riders"}` },
    packageName && { icon: Package, label: "Package", value: packageName },
    addOnIds.length > 0 && {
      icon: Tag,
      label: "Add-ons",
      value: addOnIds.map((id) => `${addOnQuantities[id] ?? 0}× ${addOnNames[id]}`).join(", "),
    },
  ].filter(Boolean) as Array<{ icon: any; label: string; value: string }>;

  return (
    <div className="hidden lg:flex flex-col gap-4 w-[300px] xl:w-[320px] flex-shrink-0">
      <div className="sticky top-6 space-y-3">
        {/* Summary card */}
        <div className="site-card rounded-2xl p-4 space-y-3">
          <p className="text-xs font-semibold site-text-muted uppercase tracking-wider">Your booking</p>

          <div className="space-y-2.5">
            {summaryItems.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-2.5">
                <Icon className="w-3.5 h-3.5 text-brand-citrus flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-[11px] site-text-muted">{label}</p>
                  <p className="text-sm site-heading font-medium leading-tight truncate">{value}</p>
                </div>
              </div>
            ))}

            {summaryItems.length === 0 && (
              <p className="site-text-muted text-sm">Select options to see your summary</p>
            )}
          </div>

          {total > 0 && (
            <div className="border-t site-subtle-border pt-3 flex justify-between items-center">
              <span className="site-text-muted text-sm">Total</span>
              <span className="text-brand-citrus font-bold text-lg">{formatBookingPrice(total, riderType)}</span>
            </div>
          )}
        </div>

        {/* Continue button */}
        {currentStep < 8 && (
          <button
            onClick={() => stepContinueFn?.()}
            disabled={stepContinueDisabled || !stepContinueFn}
            className={cn(
              "w-full flex items-center justify-center gap-2",
              "rounded-xl py-3.5 px-6 text-sm font-semibold",
              "site-button",
              "shadow-brand-md hover:shadow-brand-lg",
              "transition-all duration-200 active:scale-[0.98]",
              "disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100",
            )}
          >
            {stepContinueLabel}
            {nextStepName && !stepContinueDisabled && (
              <ArrowRight className="w-4 h-4" />
            )}
          </button>
        )}

        {stepContinueDisabled && currentStep < 8 && (
          <p className="text-center site-text-muted text-xs">
            {currentStep === 1 && "Select a date to continue"}
            {currentStep === 2 && "Select a time slot to continue"}
            {currentStep === 4 && "Select a package to continue"}
            {currentStep === 6 && "Fill in your details to continue"}
            {currentStep === 7 && "Choose a payment method to continue"}
          </p>
        )}
      </div>
    </div>
  );
}
