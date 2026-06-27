"use client";

import { useMemo, useState, useTransition } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { COUNTRIES } from "@/lib/booking/countries";
import { cn } from "@/lib/utils";

const inputClass = "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring";

interface WaiverFormProps {
  token: string;
  minWeight: number;
  maxWeight: number;
}

export function WaiverForm({ token, minWeight, maxWeight }: WaiverFormProps) {
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    guestName: "",
    nationality: "",
    dateOfBirth: "",
    age: "",
    phoneCountryCode: "+960",
    phoneNumber: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    weight: "",
    medicalConditions: "",
    medication: "",
    pregnancyOrHeartCondition: false,
    riskAcknowledged: false,
    safetyRulesAcknowledged: false,
    mediaConsent: false,
    signatureData: "",
  });

  const nationalities = useMemo(
    () => Array.from(new Set(COUNTRIES.map((country) => country.nationality))).sort(),
    []
  );

  function setField(key: keyof typeof form, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit() {
    setError("");
    startTransition(async () => {
      const res = await fetch(`/api/waivers/${token}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
      } else {
        setError(data.error ?? "Could not submit waiver.");
      }
    });
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-6 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-green-500" />
        <h2 className="mt-3 font-display text-2xl font-bold text-foreground">Thank you</h2>
        <p className="mt-2 text-sm text-muted-foreground">Your waiver form has been submitted successfully.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1.5 sm:col-span-2">
          <span className="text-xs font-semibold text-muted-foreground">Guest full name</span>
          <input value={form.guestName} onChange={(e) => setField("guestName", e.target.value)} className={inputClass} required />
        </label>

        <label className="space-y-1.5">
          <span className="text-xs font-semibold text-muted-foreground">Nationality</span>
          <select value={form.nationality} onChange={(e) => setField("nationality", e.target.value)} className={inputClass} required>
            <option value="">Select nationality</option>
            {nationalities.map((nationality) => <option key={nationality} value={nationality}>{nationality}</option>)}
          </select>
        </label>

        <label className="space-y-1.5">
          <span className="text-xs font-semibold text-muted-foreground">Date of birth</span>
          <input type="date" value={form.dateOfBirth} onChange={(e) => setField("dateOfBirth", e.target.value)} className={inputClass} />
        </label>

        <label className="space-y-1.5">
          <span className="text-xs font-semibold text-muted-foreground">Age, if date of birth is unknown</span>
          <input inputMode="numeric" value={form.age} onChange={(e) => setField("age", e.target.value.replace(/\D/g, ""))} className={inputClass} />
        </label>

        <label className="space-y-1.5">
          <span className="text-xs font-semibold text-muted-foreground">Weight, kg</span>
          <input inputMode="decimal" value={form.weight} onChange={(e) => setField("weight", e.target.value.replace(/[^\d.]/g, ""))} placeholder={`${minWeight}-${maxWeight}`} className={inputClass} required />
        </label>

        <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-2 sm:col-span-2">
          <label className="space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground">Code</span>
            <select value={form.phoneCountryCode} onChange={(e) => setField("phoneCountryCode", e.target.value)} className={inputClass}>
              {COUNTRIES.map((country) => <option key={`${country.iso}-${country.dialCode}`} value={country.dialCode}>{country.dialCode}</option>)}
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground">Phone number</span>
            <input inputMode="numeric" value={form.phoneNumber} onChange={(e) => setField("phoneNumber", e.target.value.replace(/\D/g, ""))} className={inputClass} required />
          </label>
        </div>

        <label className="space-y-1.5">
          <span className="text-xs font-semibold text-muted-foreground">Emergency contact name</span>
          <input value={form.emergencyContactName} onChange={(e) => setField("emergencyContactName", e.target.value)} className={inputClass} required />
        </label>

        <label className="space-y-1.5">
          <span className="text-xs font-semibold text-muted-foreground">Emergency contact phone</span>
          <input inputMode="numeric" value={form.emergencyContactPhone} onChange={(e) => setField("emergencyContactPhone", e.target.value.replace(/\D/g, ""))} className={inputClass} required />
        </label>
      </div>

      <div className="space-y-3 rounded-2xl border border-border bg-muted/20 p-4">
        <p className="text-sm font-semibold">Health declaration</p>
        <label className="space-y-1.5 block">
          <span className="text-xs font-semibold text-muted-foreground">Medical conditions, injuries, or allergies</span>
          <textarea value={form.medicalConditions} onChange={(e) => setField("medicalConditions", e.target.value)} rows={3} className={cn(inputClass, "resize-none")} />
        </label>
        <label className="space-y-1.5 block">
          <span className="text-xs font-semibold text-muted-foreground">Current medication</span>
          <textarea value={form.medication} onChange={(e) => setField("medication", e.target.value)} rows={2} className={cn(inputClass, "resize-none")} />
        </label>
        <label className="flex items-start gap-2 text-sm text-muted-foreground">
          <input type="checkbox" checked={form.pregnancyOrHeartCondition} onChange={(e) => setField("pregnancyOrHeartCondition", e.target.checked)} className="mt-1 h-4 w-4 accent-primary" />
          I have pregnancy, heart condition, serious back/neck issues, or another condition staff should know about.
        </label>
      </div>

      <div className="space-y-3 rounded-2xl border border-border bg-muted/20 p-4">
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={form.riskAcknowledged} onChange={(e) => setField("riskAcknowledged", e.target.checked)} className="mt-1 h-4 w-4 accent-primary" />
          <span>I understand and acknowledge the inherent risks of zipline activity.</span>
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={form.safetyRulesAcknowledged} onChange={(e) => setField("safetyRulesAcknowledged", e.target.checked)} className="mt-1 h-4 w-4 accent-primary" />
          <span>I agree to follow all safety rules and staff instructions.</span>
        </label>
        <label className="flex items-start gap-2 text-sm text-muted-foreground">
          <input type="checkbox" checked={form.mediaConsent} onChange={(e) => setField("mediaConsent", e.target.checked)} className="mt-1 h-4 w-4 accent-primary" />
          <span>I consent to media captured during the activity being used by Zipline Maldives.</span>
        </label>
      </div>

      <label className="space-y-1.5 block">
        <span className="text-xs font-semibold text-muted-foreground">Digital signature</span>
        <input value={form.signatureData} onChange={(e) => setField("signatureData", e.target.value)} placeholder="Type your full name" className={inputClass} required />
      </label>

      <button
        onClick={submit}
        disabled={isPending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        Submit waiver
      </button>
    </div>
  );
}
