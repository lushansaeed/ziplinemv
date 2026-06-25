"use client";

import { ShieldCheck, AlertTriangle, User, Check } from "lucide-react";
import { useBookingStore } from "@/lib/booking/store";
import { StepShell } from "../step-shell";
import { cn } from "@/lib/utils";

const SAFETY_RULES = [
  "Minimum weight 35 kg · Maximum weight 110 kg.",
  "Minimum age 6 years. No maximum age.",
  "Personal phones and cameras are NOT permitted during the ride.",
  "Weather conditions may result in delay or cancellation for safety reasons.",
  "Staff have the right to refuse participation if they consider it unsafe.",
  "Media add-ons are captured by Zipline Maldives staff only.",
  "Report to check-in at least 15 minutes before your slot.",
];

export function Step8Waiver() {
  const store = useBookingStore();
  const {
    riders, numRiders,
    riderWaivers, termsAccepted, refundAccepted, safetyAccepted,
    setField, nextStep,
  } = store;

  const displayRiders = riders.slice(0, numRiders);

  // Ensure riderWaivers array is long enough
  const waivers: boolean[] = Array.from({ length: numRiders }, (_, i) => riderWaivers[i] ?? false);

  function toggleRiderWaiver(index: number) {
    const updated = [...waivers];
    updated[index] = !updated[index];
    setField("riderWaivers", updated);
  }

  const allRidersAccepted   = waivers.length === numRiders && waivers.every(Boolean);
  const allPoliciesAccepted = termsAccepted && refundAccepted && safetyAccepted;
  const allAccepted         = allRidersAccepted && allPoliciesAccepted;

  const acceptedCount = waivers.filter(Boolean).length;

  // Shared checkbox component
  function Checkbox({
    checked, onChange, children, sublabel,
  }: { checked: boolean; onChange: () => void; children: React.ReactNode; sublabel?: string }) {
    return (
      <label className="flex items-start gap-3 cursor-pointer group">
        <div
          onClick={onChange}
          className={cn(
            "w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all",
            checked
              ? "bg-brand-citrus border-brand-citrus"
              : "border-white/25 group-hover:border-brand-citrus/50"
          )}
        >
          {checked && <Check className="w-3 h-3 text-brand-deep" strokeWidth={3} />}
        </div>
        <div>
          <p className={cn("text-sm leading-snug transition-colors", checked ? "text-white" : "text-white/65")}>
            {children}
          </p>
          {sublabel && <p className="text-white/30 text-xs mt-0.5">{sublabel}</p>}
        </div>
      </label>
    );
  }

  return (
    <StepShell
      title="Safety, waiver & policies"
      subtitle="Each rider must individually accept the waiver before your booking is confirmed."
      onNext={nextStep}
      nextDisabled={!allAccepted}
      nextLabel="Accept & continue"
    >
      <div className="space-y-5">

        {/* Safety rules */}
        <div className="bg-white/3 border border-white/8 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-brand-citrus" />
            <p className="text-white font-semibold text-sm">Safety rules</p>
          </div>
          <ul className="space-y-2.5">
            {SAFETY_RULES.map((rule, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-white/60">
                <span className="text-brand-citrus/50 mt-0.5 flex-shrink-0">•</span>
                {rule}
              </li>
            ))}
          </ul>
        </div>

        {/* ── Per-rider waivers ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-white/50" />
              <p className="text-sm font-semibold text-white">
                Individual rider waivers
              </p>
            </div>
            <span className={cn(
              "text-xs font-semibold px-2 py-1 rounded-full",
              allRidersAccepted
                ? "bg-brand-lime/15 text-brand-lime"
                : "bg-white/8 text-white/40"
            )}>
              {acceptedCount}/{numRiders} accepted
            </span>
          </div>

          <p className="text-xs text-white/40">
            Tick the box next to each rider's name to confirm they accept the activity waiver.
            For riders under 18, a parent or guardian must accept on their behalf.
          </p>

          <div className="space-y-2.5">
            {displayRiders.map((rider, i) => {
              const name    = rider.name?.trim() || `Rider ${i + 1}`;
              const details = [
                rider.age    ? `Age: ${rider.age}` : null,
                rider.weight ? `${rider.weight} kg` : null,
              ].filter(Boolean).join(" · ");
              const isMinor = rider.age ? parseInt(rider.age) < 18 : false;
              const accepted = waivers[i] ?? false;

              return (
                <div
                  key={i}
                  className={cn(
                    "rounded-xl border p-4 transition-all duration-200",
                    accepted
                      ? "border-brand-citrus/30 bg-brand-citrus/5"
                      : "border-white/10 bg-white/3"
                  )}
                >
                  <Checkbox
                    checked={accepted}
                    onChange={() => toggleRiderWaiver(i)}
                    sublabel={isMinor ? "As parent/guardian, I accept this waiver on behalf of this rider." : undefined}
                  >
                    <span className="font-medium text-white">{name}</span>
                    {details && (
                      <span className="text-white/40 font-normal ml-1.5 text-xs">{details}</span>
                    )}
                    <span className="block mt-0.5 text-white/55">
                      I understand and accept the activity waiver, the safety rules above, and the
                      risks associated with this zipline experience.
                    </span>
                  </Checkbox>

                  {/* Minor indicator */}
                  {isMinor && (
                    <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-brand-mango/70">
                      <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                      Minor rider — parent or guardian acceptance required
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Global policy checkboxes ── */}
        <div className="space-y-4 pt-1 border-t border-white/8">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-wider pt-3">Policies</p>

          <Checkbox
            checked={safetyAccepted}
            onChange={() => setField("safetyAccepted", !safetyAccepted)}
          >
            I have read and confirm that all riders above meet the safety requirements.
          </Checkbox>

          <Checkbox
            checked={termsAccepted}
            onChange={() => setField("termsAccepted", !termsAccepted)}
          >
            I have read and accept the{" "}
            <a href="/terms" target="_blank" className="text-brand-citrus underline underline-offset-2 hover:text-brand-mango">
              Terms & Conditions
            </a>
            .
          </Checkbox>

          <Checkbox
            checked={refundAccepted}
            onChange={() => setField("refundAccepted", !refundAccepted)}
          >
            I have read and accept the{" "}
            <a href="/refund-policy" target="_blank" className="text-brand-citrus underline underline-offset-2 hover:text-brand-mango">
              Refund Policy
            </a>
            . Cancellations within 24 hours are non-refundable.
          </Checkbox>
        </div>

        {/* Important info reminder */}
        <div className="flex items-start gap-3 bg-brand-citrus/5 border border-brand-citrus/15 rounded-xl p-4">
          <AlertTriangle className="w-4 h-4 text-brand-citrus flex-shrink-0 mt-0.5" />
          <p className="text-white/65 text-sm">
            Report 15 minutes before your slot. Bring nothing that could fall.{" "}
            <a href="/important-information" target="_blank" className="text-brand-citrus hover:underline">
              Full important information →
            </a>
          </p>
        </div>

        {/* Progress indicator */}
        {!allAccepted && (
          <div className="text-center space-y-1">
            {!allRidersAccepted && (
              <p className="text-white/30 text-xs">
                {numRiders - acceptedCount} rider waiver{numRiders - acceptedCount > 1 ? "s" : ""} still to accept
              </p>
            )}
            {allRidersAccepted && !allPoliciesAccepted && (
              <p className="text-white/30 text-xs">Please accept all policies above to continue</p>
            )}
          </div>
        )}
      </div>
    </StepShell>
  );
}
