"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { CheckCircle2, Loader2, RotateCcw } from "lucide-react";
import { COUNTRIES } from "@/lib/booking/countries";
import { cn } from "@/lib/utils";

const inputClass = "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring";

function SignaturePad({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const valueRef = useRef(value);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  function setupCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    const previous = valueRef.current;
    canvas.width = Math.max(1, Math.floor(rect.width * ratio));
    canvas.height = Math.max(1, Math.floor(rect.height * ratio));
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "#111827";

    if (previous) {
      const image = new Image();
      image.onload = () => ctx.drawImage(image, 0, 0, rect.width, rect.height);
      image.src = previous;
    }
  }

  useEffect(() => {
    setupCanvas();
    window.addEventListener("resize", setupCanvas);
    return () => window.removeEventListener("resize", setupCanvas);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pointFromEvent(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function saveSignature() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onChange(canvas.toDataURL("image/png"));
  }

  function startDrawing(event: React.PointerEvent<HTMLCanvasElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    lastPointRef.current = pointFromEvent(event);
  }

  function draw(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current || !lastPointRef.current) return;
    event.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const next = pointFromEvent(event);
    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(next.x, next.y);
    ctx.stroke();
    lastPointRef.current = next;
  }

  function stopDrawing(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    event.preventDefault();
    drawingRef.current = false;
    lastPointRef.current = null;
    saveSignature();
  }

  function clearSignature() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) {
      const rect = canvas.getBoundingClientRect();
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, rect.width, rect.height);
    }
    onChange("");
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-muted-foreground">{label}</span>
        <button
          type="button"
          onClick={clearSignature}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Clear
        </button>
      </div>
      <canvas
        ref={canvasRef}
        onPointerDown={startDrawing}
        onPointerMove={draw}
        onPointerUp={stopDrawing}
        onPointerCancel={stopDrawing}
        onPointerLeave={stopDrawing}
        className="h-44 w-full touch-none rounded-xl border border-border bg-white shadow-inner"
        aria-label={label}
      />
      <p className="text-[11px] text-muted-foreground">Sign inside the box using your finger, stylus, or mouse.</p>
    </div>
  );
}

interface WaiverFormProps {
  token: string;
  minWeight: number;
  maxWeight: number;
  staffAssisted?: boolean;
}

export function WaiverForm({ token, minWeight, maxWeight, staffAssisted = false }: WaiverFormProps) {
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    guestName: "",
    riderType: "adult",
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
    guardianName: "",
    guardianPhone: "",
    guardianRelationship: "",
    guardianDeclarationAccepted: false,
    guardianSignatureData: "",
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
        body: JSON.stringify({
          ...form,
          isMinor: form.riderType === "minor",
          submissionMode: staffAssisted ? "staff_assisted" : "public",
        }),
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
          <span className="text-xs font-semibold text-muted-foreground">Rider full name</span>
          <input value={form.guestName} onChange={(e) => setField("guestName", e.target.value)} className={inputClass} required />
        </label>

        <div className="space-y-2 sm:col-span-2">
          <p className="text-xs font-semibold text-muted-foreground">Rider type</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { value: "adult", label: "Adult rider" },
              { value: "minor", label: "Minor / child rider" },
            ].map((option) => (
              <label
                key={option.value}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium",
                  form.riderType === option.value ? "border-primary bg-primary/10 text-primary" : "border-border bg-background"
                )}
              >
                <input
                  type="radio"
                  name="riderType"
                  checked={form.riderType === option.value}
                  onChange={() => setField("riderType", option.value)}
                  className="h-4 w-4 accent-primary"
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>

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
            <span className="text-xs font-semibold text-muted-foreground">Contact phone used for this waiver</span>
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

      {form.riderType === "minor" && (
        <div className="space-y-4 rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Parent or legal guardian</p>
            <p className="mt-1 text-xs text-muted-foreground">A parent or legal guardian must complete and sign this waiver for a minor rider.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-muted-foreground">Parent/guardian full name</span>
              <input value={form.guardianName} onChange={(e) => setField("guardianName", e.target.value)} className={inputClass} required />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-muted-foreground">Parent/guardian phone number</span>
              <input inputMode="numeric" value={form.guardianPhone} onChange={(e) => setField("guardianPhone", e.target.value.replace(/\D/g, ""))} className={inputClass} required />
            </label>
            <label className="space-y-1.5 sm:col-span-2">
              <span className="text-xs font-semibold text-muted-foreground">Relationship to rider</span>
              <input value={form.guardianRelationship} onChange={(e) => setField("guardianRelationship", e.target.value)} placeholder="Parent, legal guardian, etc." className={inputClass} required />
            </label>
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={form.guardianDeclarationAccepted} onChange={(e) => setField("guardianDeclarationAccepted", e.target.checked)} className="mt-1 h-4 w-4 accent-primary" />
            <span>I confirm that I am the parent or legal guardian of the minor named above and I accept the risks, safety rules, and waiver terms on their behalf.</span>
          </label>
          <SignaturePad
            label="Guardian signature"
            value={form.guardianSignatureData}
            onChange={(value) => setField("guardianSignatureData", value)}
          />
        </div>
      )}

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

      {form.riderType === "adult" && (
        <SignaturePad
          label="Rider signature"
          value={form.signatureData}
          onChange={(value) => setField("signatureData", value)}
        />
      )}

      {staffAssisted && (
        <div className="rounded-xl border border-brand-citrus/30 bg-brand-citrus/10 px-4 py-3 text-xs text-foreground">
          Staff-assisted mode: this waiver will be recorded as completed on a reception or staff device.
        </div>
      )}

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
