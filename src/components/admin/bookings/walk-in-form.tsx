"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, Plus, Minus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn, formatCurrency } from "@/lib/utils";
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
  const [packageId, setPackageId]     = useState(packages[0]?.id ?? "");
  const [numRiders, setNumRiders]     = useState(1);
  const [addOnQuantities, setAddOnQuantities] = useState<Record<string, number>>({});
  const [paymentMethod, setPaymentMethod]   = useState("cash");
  const [customerType, setCustomerType] = useState<"local" | "tourist" | "">("");

  // Customer
  const [customerName, setCustomerName]   = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerHotel, setCustomerHotel] = useState("");
  const [notes, setNotes]                 = useState("");
  const selectedAddOns = Object.entries(addOnQuantities).filter(([, qty]) => qty > 0).map(([id]) => id);
  const isLocalCustomer = customerType === "local";
  const displayCurrency = isLocalCustomer ? "MVR" : "USD";

  function syncRiders(n: number) {
    setNumRiders(n);
    setAddOnQuantities((prev) => Object.fromEntries(
      Object.entries(prev).map(([id, qty]) => [id, Math.min(qty, n)])
    ));
  }

  function setAddOnQty(id: string, qty: number) {
    setAddOnQuantities((prev) => {
      const next = { ...prev };
      const capped = Math.max(0, Math.min(numRiders, qty));
      if (capped <= 0) delete next[id];
      else next[id] = capped;
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!customerType || !packageId || !customerName || !customerPhone) {
      setError("Please fill in all required fields.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            packageId, addOnIds: selectedAddOns, addOnQuantities,
            riderType: customerType,
            date, numRiders,
            customerName, customerPhone,
            customerPhoneCountry: "MV",
            customerEmail, customerNationality: customerType === "local" ? "MV" : "", customerHotel,
            riders: [], paymentMethod,
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

      {/* Date + riders */}
      <div className="admin-card space-y-4">
        <h3 className="font-semibold text-sm">Date & riders</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2 sm:col-span-2">
            <label className="text-xs text-muted-foreground font-medium">Customer type *</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "local" as const, label: "Local", note: "Charged in MVR" },
                { value: "tourist" as const, label: "Tourist", note: "Tourist pricing" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setCustomerType(option.value)}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-all",
                    customerType === option.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                  )}
                >
                  <p className="text-sm font-semibold">{option.label}</p>
                  <p className="text-xs text-muted-foreground">{option.note}</p>
                </button>
              ))}
            </div>
            {customerType === "local" && <p className="text-xs text-muted-foreground">Local bookings are charged in MVR.</p>}
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-medium">Date *</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} min={format(new Date(), "yyyy-MM-dd")} className={inputCls} required />
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
        <p className="text-xs text-muted-foreground">Walk-in bookings do not require a time slot. The system records this as a walk-in booking automatically.</p>
      </div>

      {/* Package + Add-ons */}
      <div className="admin-card space-y-4">
        <h3 className="font-semibold text-sm">Package & add-ons</h3>
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground font-medium">Package *</label>
          <select value={packageId} onChange={(e) => setPackageId(e.target.value)} className={inputCls} required>
            {packages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {formatCurrency(isLocalCustomer && (p as any).localPriceMvr ? Number((p as any).localPriceMvr) : Number(p.touristPrice), displayCurrency)}
              </option>
            ))}
          </select>
        </div>
        {addOns.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-medium">Add-ons (optional)</label>
            <div className="space-y-2">
              {addOns.map((a) => {
                const qty = addOnQuantities[a.id] ?? 0;
                return (
                  <div key={a.id} className={cn(
                    "flex items-center gap-3 rounded-xl border p-3",
                    qty > 0 ? "border-primary bg-primary/5" : "border-border"
                  )}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{a.name}</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(isLocalCustomer && (a as any).localPriceMvr ? Number((a as any).localPriceMvr) : Number(a.price), displayCurrency)} per rider</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setAddOnQty(a.id, qty - 1)} className="p-1.5 rounded-lg border border-border hover:bg-muted">
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-6 text-center text-sm font-bold">{qty}</span>
                      <button type="button" onClick={() => setAddOnQty(a.id, qty + 1)} disabled={qty >= numRiders} className="p-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-40">
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
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

      <button type="submit" disabled={isPending || !customerType || !packageId || !customerName || !customerPhone} className={cn(
        "w-full flex items-center justify-center gap-2 rounded-xl py-3.5 font-semibold",
        "bg-primary text-primary-foreground hover:bg-primary/90",
        "transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      )}>
        {isPending ? <><Loader2 className="w-4 h-4 animate-spin" />Creating booking…</> : "Create walk-in booking"}
      </button>
    </form>
  );
}
