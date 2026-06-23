"use client";

import { useEffect } from "react";
import { useBookingStore } from "@/lib/booking/store";
import { BookingProgressBar } from "./booking-progress-bar";
import { Step1Date }       from "./steps/step-1-date";
import { Step2Slot }       from "./steps/step-2-slot";
import { Step3Riders }     from "./steps/step-3-riders";
import { Step4Package }    from "./steps/step-4-package";
import { Step5AddOns }     from "./steps/step-5-addons";
import { Step6Customer }   from "./steps/step-6-customer";
import { Step7RiderDetails } from "./steps/step-7-rider-details";
import { Step8Waiver }     from "./steps/step-8-waiver";
import { Step9Payment }    from "./steps/step-9-payment";
import { Step10Confirm }   from "./steps/step-10-confirm";
import type { Package, AddOn } from "@prisma/client";
import { cn } from "@/lib/utils";

interface BookingWizardProps {
  packages:            Package[];
  addOns:              AddOn[];
  preselectedPackageId?: string;
  initialDate?:        string;
  affiliateCoupon?:    string;
}

const STEPS = [
  "Date", "Time", "Riders", "Package",
  "Add-ons", "Your info", "Rider details",
  "Safety & waiver", "Payment", "Confirmed",
];

export function BookingWizard({
  packages, addOns, preselectedPackageId, initialDate, affiliateCoupon,
}: BookingWizardProps) {
  const { currentStep, setField, reset } = useBookingStore();

  // Set initial values from URL params
  useEffect(() => {
    if (preselectedPackageId) {
      const pkg = packages.find((p) => p.id === preselectedPackageId);
      if (pkg) {
        setField("packageId",    pkg.id);
        setField("packageName",  pkg.name);
        setField("packagePrice", Number(pkg.touristPrice));
      }
    }
    if (initialDate) setField("date", initialDate);
    if (affiliateCoupon) setField("affiliateCoupon", affiliateCoupon);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectedPackageId, initialDate, affiliateCoupon]);

  const stepComponent = [
    <Step1Date key={1} />,
    <Step2Slot key={2} />,
    <Step3Riders key={3} />,
    <Step4Package key={4} packages={packages} />,
    <Step5AddOns key={5} addOns={addOns} />,
    <Step6Customer key={6} />,
    <Step7RiderDetails key={7} />,
    <Step8Waiver key={8} />,
    <Step9Payment key={9} />,
    <Step10Confirm key={10} />,
  ];

  return (
    <div className="container-brand max-w-3xl">
      {/* Header */}
      {currentStep < 10 && (
        <div className="text-center mb-10 space-y-2">
          <h1 className="font-display font-bold text-3xl sm:text-4xl text-white">
            Book your flight
          </h1>
          <p className="text-white/50">
            Maafushi → Vahmāfushi · 428m · ~60 seconds
          </p>
        </div>
      )}

      {/* Progress bar */}
      {currentStep < 10 && (
        <BookingProgressBar
          currentStep={currentStep}
          steps={STEPS.slice(0, 9)}
        />
      )}

      {/* Step content */}
      <div
        key={currentStep}
        className={cn(
          "animate-fade-in",
          currentStep === 10 ? "mt-0" : "mt-8"
        )}
      >
        {stepComponent[currentStep - 1]}
      </div>
    </div>
  );
}
