"use client";

import { ShieldCheck, AlertTriangle, Check } from "lucide-react";
import { useBookingStore } from "@/lib/booking/store";
import { StepShell } from "../step-shell";
import { cn } from "@/lib/utils";

const SAFETY_RULES = [
  "I confirm all riders meet the minimum weight requirement of 35 kg and maximum of 110 kg.",
  "I confirm all riders are aged 6 years or older.",
  "I understand that personal phones, cameras, and electronic devices are NOT permitted during the ride.",
  "I understand that weather conditions may result in delay or cancellation for safety reasons.",
  "I acknowledge that Zipline Maldives staff have the right to refuse participation if they consider it unsafe.",
  "I understand media add-ons are captured by Zipline Maldives staff only.",
];

export function Step8Waiver() {
  const { waiverAccepted, termsAccepted, refundAccepted, safetyAccepted, setField, nextStep } = useBookingStore();

  const allAccepted = waiverAccepted && termsAccepted && refundAccepted && safetyAccepted;

  function Checkbox({
    checked, onChange, label, sublabel,
  }: { checked: boolean; onChange: (v: boolean) => void; label: React.ReactNode; sublabel?: string }) {
    return (
      <label className="flex items-start gap-3 cursor-pointer group">
        <div
          onClick={() => onChange(!checked)}
          className={cn(
            "w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all",
            checked ? "bg-brand-citrus border-brand-citrus" : "border-white/25 group-hover:border-brand-citrus/50"
          )}
        >
          {checked && <Check className="w-3 h-3 text-brand-deep" strokeWidth={3} />}
        </div>
        <div>
          <p className={cn("text-sm leading-snug transition-colors", checked ? "text-white" : "text-white/60")}>{label}</p>
          {sublabel && <p className="text-white/30 text-xs mt-0.5">{sublabel}</p>}
        </div>
      </label>
    );
  }

  return (
    <StepShell
      title="Safety, waiver & policies"
      subtitle="Please read and accept before confirming your booking."
      onNext={nextStep}
      nextDisabled={!allAccepted}
      nextLabel="Accept & continue"
    >
      <div className="space-y-6">
        {/* Safety rules */}
        <div className="bg-white/3 border border-white/8 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-brand-citrus" />
            <p className="text-white font-semibold text-sm">Safety declaration</p>
          </div>
          <ul className="space-y-3">
            {SAFETY_RULES.map((rule, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-white/60">
                <span className="text-brand-citrus/50 mt-0.5 flex-shrink-0">•</span>
                {rule}
              </li>
            ))}
          </ul>
        </div>

        {/* Checkboxes */}
        <div className="space-y-4">
          <Checkbox
            checked={safetyAccepted}
            onChange={(v) => setField("safetyAccepted", v)}
            label="I have read and accept all safety rules above."
          />
          <Checkbox
            checked={waiverAccepted}
            onChange={(v) => setField("waiverAccepted", v)}
            label="I accept the activity waiver and understand the inherent risks of zipline activities."
            sublabel="A full digital waiver will be signed at check-in for each rider."
          />
          <Checkbox
            checked={termsAccepted}
            onChange={(v) => setField("termsAccepted", v)}
            label={
              <>
                I have read and accept the{" "}
                <a href="/terms" target="_blank" className="text-brand-citrus underline underline-offset-2 hover:text-brand-mango">
                  Terms & Conditions
                </a>
                .
              </>
            }
          />
          <Checkbox
            checked={refundAccepted}
            onChange={(v) => setField("refundAccepted", v)}
            label={
              <>
                I have read and accept the{" "}
                <a href="/refund-policy" target="_blank" className="text-brand-citrus underline underline-offset-2 hover:text-brand-mango">
                  Refund Policy
                </a>
                . Cancellations within 24 hours are non-refundable.
              </>
            }
          />
        </div>

        {/* Important information reminder */}
        <div className="flex items-start gap-3 bg-brand-citrus/5 border border-brand-citrus/15 rounded-xl p-4">
          <AlertTriangle className="w-4 h-4 text-brand-citrus flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-white/80 text-sm font-medium">Remember to check important information</p>
            <p className="text-white/45 text-xs">
              Report 15 minutes before your slot. Bring nothing that could fall.{" "}
              <a href="/important-information" target="_blank" className="text-brand-citrus hover:underline">
                Full details →
              </a>
            </p>
          </div>
        </div>
      </div>
    </StepShell>
  );
}
