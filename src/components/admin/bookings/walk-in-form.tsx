"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, Plus, Minus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Package, AddOn } from "@prisma/client";

const inputCls = cn(
  "w-full rounded-lg px-3 py-2 text-sm bg-background border border-border",
  "focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
);

interface WalkInBookingFormProps {
  packages: Package[];
  addOns:   AddOn[];
}

export function WalkInBookingForm({ packages, addOns }: WalkInBookingFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult]          = useState<{ reference: string; qrCode?: string } | null>(null);
  const [error, setError]            = useState<string | null>(null);

  // Form state
  const [date, setDate]               = useState(format(new Date(), "yyyy-MM-dd"));
  const [slots, setSlots]             = useState<any[]>([]);
  const [slotId, setSlotId]           = useState("");
  const [packageId, setPackageId]     = useState(packages[0]?.id ?? "");
  const [numRiders, setNumRiders]     = useState(1);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod]   = useState("cash");
  const [slotsLoading, setSlotsLoading]     = useState(false);
  const [riders, setRiders]           = useState([{ name: "", age: "", weight: "" }]);

  // Customer
  const [customerName, setCustomerName]   = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerHotel, setCustomerHotel] = useState("");
  const [notes, setNotes]                 = useState("");

  async function loadSlots(d: string) {
    setDate(d); setSlotId(""); setSlotsLoading(true);
    try {
      const res = await fetch(`/api/slots?date=${d}&riders=${numRiders}&activity=zipline`);
      const data = await res.json();
      setSlots(data.slots ?? []);
    } catch { setSlots([]); } finally { setSlotsLoading(false); }
  }

  function syncRiders(n: number) {
    setNumRiders(n);
    setRiders((prev) => {
      if (n > prev.length) return [...prev, ...Array(n - prev.length).fill({ name: "", age: "", weight: "" })];
      return prev.slice(0, n);
    });
  }

  function toggleAddOn(id: string) {
    setSelectedAddOns((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function updateRider(i: number, field: string, value: string) {
    setRiders((prev) => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!slotId || !packageId || !customerName || !customerPhone) {
      setError("Please fill in all required fields.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slotId, packageId, addOnIds: selectedAddOns,
            date, numRiders,
            customerName, customerPhone,
            customerPhoneCountry: "MV",
            customerEmail, customerNationality: "", customerHotel,
            riders, paymentMethod,
            source: "WALK_IN",
          }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error ?? "Failed to create booking"); return; }
        setResult({ reference: data.reference, qrCode: data.qrCode });
        toast.success(`Walk-in booking created: ${data.reference}`);
      } catch (err: any) {
        setError(err.message);
      }
    });
  }

  if (result) {
    return (
      <div className="admin-card text-center space-y-4 py-10">
        <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
        <h3 className="font-display font-bold text-xl">Booking created!</h3>
        <p className="font-mono text-2xl text-primary font-bold">{result.reference}</p>
        {result.qrCode && (
          <div className="flex justify-center">
            <div className="bg-white p-3 rounded-xl inline-block">
              <img src={result.qrCode} alt="QR" className="w-32 h-32" />
            </div>
          </div>
        )}
        <div className="flex gap-3 justify-center">
          <button onClick={() => setResult(null)} className="btn-brand text-sm px-5 py-2">
            New walk-in booking
          </button>
          <button onClick={() => router.push("/admin/bookings")} className="text-sm px-5 py-2 border border-border rounded-lg hover:bg-muted transition-colors">
            Back to bookings
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">{error}</div>
      )}

      {/* Date + Slot */}
      <div className="admin-card space-y-4">
        <h3 className="font-semibold text-sm">Date & time</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-medium">Date *</label>
            <input type="date" value={date} onChange={(e) => loadSlots(e.target.value)} min={format(new Date(), "yyyy-MM-dd")} className={inputCls} required />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-medium">Number of riders *</label>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => syncRiders(Math.max(1, numRiders - 1))} className="p-2 rounded-lg border border-border hover:bg-muted transition-colors"><Minus className="w-3.5 h-3.5" /></button>
              <span className="font-bold text-lg w-8 text-center">{numRiders}</span>
              <button type="button" onClick={() => syncRiders(Math.min(8, numRiders + 1))} className="p-2 rounded-lg border border-border hover:bg-muted transition-colors"><Plus className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        </div>
        {/* Slot picker */}
        {slotsLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" />Loading slots…</div>
        ) : slots.length > 0 ? (
          <div>
            <label className="text-xs text-muted-foreground font-medium block mb-2">Time slot *</label>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {slots.map((s) => (
                <button
                  key={s.id} type="button"
                  onClick={() => s.canBook && setSlotId(s.id)}
                  disabled={!s.canBook}
                  className={cn(
                    "py-2 rounded-lg text-xs font-medium border transition-all",
                    slotId === s.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : s.canBook
                      ? "border-border hover:border-primary/50 hover:bg-muted"
                      : "border-border/50 text-muted-foreground opacity-40 cursor-not-allowed"
                  )}
                >
                  {s.startTime}
                  <br />
                  <span className="text-[10px] opacity-70">{s.available} left</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* Package + Add-ons */}
      <div className="admin-card space-y-4">
        <h3 className="font-semibold text-sm">Package & add-ons</h3>
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground font-medium">Package *</label>
          <select value={packageId} onChange={(e) => setPackageId(e.target.value)} className={inputCls} required>
            {packages.map((p) => (
              <option key={p.id} value={p.id}>{p.name} — ${Number(p.touristPrice)}</option>
            ))}
          </select>
        </div>
        {addOns.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-medium">Add-ons (optional)</label>
            <div className="flex flex-wrap gap-2">
              {addOns.map((a) => (
                <button
                  key={a.id} type="button"
                  onClick={() => toggleAddOn(a.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                    selectedAddOns.includes(a.id)
                      ? "bg-primary/10 border-primary text-primary"
                      : "border-border hover:bg-muted"
                  )}
                >
                  {a.name} +${Number(a.price)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Customer */}
      <div className="admin-card space-y-4">
        <h3 className="font-semibold text-sm">Customer details</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-medium">Full name *</label>
            <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Customer name" className={inputCls} required />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-medium">Phone *</label>
            <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="+960 7XX XXXX" className={inputCls} required />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-medium">Email</label>
            <input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="optional" className={inputCls} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-medium">Hotel / guesthouse</label>
            <input value={customerHotel} onChange={(e) => setCustomerHotel(e.target.value)} placeholder="Where they're staying" className={inputCls} />
          </div>
        </div>
      </div>

      {/* Riders */}
      <div className="admin-card space-y-3">
        <h3 className="font-semibold text-sm">Rider details</h3>
        {riders.map((r, i) => (
          <div key={i} className="grid grid-cols-3 gap-3 p-3 bg-muted/40 rounded-xl">
            <input value={r.name} onChange={(e) => updateRider(i, "name", e.target.value)} placeholder={`Rider ${i + 1} name`} className={cn(inputCls, "col-span-3 sm:col-span-1")} />
            <input type="number" value={r.age} onChange={(e) => updateRider(i, "age", e.target.value)} placeholder="Age" min={6} className={inputCls} />
            <input type="number" value={r.weight} onChange={(e) => updateRider(i, "weight", e.target.value)} placeholder="Weight (kg)" min={35} max={110} className={inputCls} />
          </div>
        ))}
      </div>

      {/* Payment */}
      <div className="admin-card space-y-3">
        <h3 className="font-semibold text-sm">Payment method</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { value: "cash",          label: "Cash" },
            { value: "card",          label: "Card" },
            { value: "bank_transfer", label: "Bank transfer" },
            { value: "complimentary", label: "Complimentary" },
          ].map((m) => (
            <button
              key={m.value} type="button"
              onClick={() => setPaymentMethod(m.value)}
              className={cn(
                "py-2.5 rounded-lg text-sm font-medium border transition-all",
                paymentMethod === m.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border hover:bg-muted"
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="admin-card space-y-1.5">
        <label className="text-xs text-muted-foreground font-medium">Notes (optional)</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Any notes for this booking…" className={cn(inputCls, "resize-none")} />
      </div>

      <button type="submit" disabled={isPending || !slotId || !packageId || !customerName || !customerPhone} className={cn(
        "w-full flex items-center justify-center gap-2 rounded-xl py-3.5 font-semibold",
        "bg-primary text-primary-foreground hover:bg-primary/90",
        "transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      )}>
        {isPending ? <><Loader2 className="w-4 h-4 animate-spin" />Creating booking…</> : "Create walk-in booking"}
      </button>
    </form>
  );
}
