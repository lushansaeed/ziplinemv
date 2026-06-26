"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2, Loader2, Plus, Minus,
  Calendar, Clock, Users, Package, Tag,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { formatCurrency, cn } from "@/lib/utils";
import type { Package as PkgType, AddOn } from "@prisma/client";

const inputCls = "w-full rounded-lg px-3 py-2 text-sm bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground";

interface Props {
  packages:           Array<PkgType & { agentCommissionType?: string | null; agentCommissionValue?: any }>;
  addOns:             Array<AddOn & { agentCommissionType?: string | null; agentCommissionValue?: any; agentCommissionEligible?: boolean }>;
  agentId:            string;
  agentBusinessName:  string;
  commissionRate:     number;
  commissionBasis:    string;
  touristCommissionType?: string | null;
  touristCommissionValue?: number | null;
  localCommissionType?: string | null;
  localCommissionValue?: number | null;
  addOnCommissionType?: string | null;
  addOnCommissionValue?: number | null;
  addOnCommissions?: Array<{ addOnId: string; type: string; value: number; localType?: string | null; localValue?: number | null }>;
  canMakeUnpaidBookings: boolean;
}

export function AgentNewBookingForm({
  packages, addOns, agentId, agentBusinessName, commissionRate, commissionBasis,
  touristCommissionType, touristCommissionValue,
  localCommissionType, localCommissionValue,
  addOnCommissionType, addOnCommissionValue, addOnCommissions = [],
  canMakeUnpaidBookings,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult]          = useState<{ reference: string; qrCode?: string; commission: number } | null>(null);
  const [error, setError]            = useState<string | null>(null);

  // Step state
  const [step, setStep]         = useState(1);
  const [date, setDate]         = useState(format(new Date(), "yyyy-MM-dd"));
  const [slots, setSlots]       = useState<any[]>([]);
  const [slotId, setSlotId]     = useState("");
  const [slotTime, setSlotTime] = useState("");
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [packageId, setPackageId]       = useState(packages[0]?.id ?? "");
  const [numRiders, setNumRiders]       = useState(1);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [riders, setRiders]             = useState([{ name: "", age: "", weight: "" }]);

  // Customer
  const [customerName, setCustomerName]   = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerHotel, setCustomerHotel] = useState("");
  const [customerNationality, setCustomerNationality] = useState("");
  const [notes, setNotes]                 = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [sendWaiverLink, setSendWaiverLink] = useState(false);

  async function loadSlots(d: string) {
    setDate(d); setSlotId(""); setSlotsLoading(true);
    try {
      const res = await fetch(`/api/slots?date=${d}&riders=${numRiders}&activity=zipline`);
      const data = await res.json();
      setSlots(data.slots ?? []);
    } catch { setSlots([]); }
    finally { setSlotsLoading(false); }
  }

  function syncRiders(n: number) {
    setNumRiders(n);
    setRiders((prev) => {
      if (n > prev.length) return [...prev, ...Array(n - prev.length).fill({ name: "", age: "", weight: "" })];
      return prev.slice(0, n);
    });
  }

  function updateRider(i: number, field: string, value: string) {
    setRiders((prev) => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  }

  function toggleAddOn(id: string) {
    setSelectedAddOns((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  // Price calculation preview
  const selectedPkg    = packages.find((p) => p.id === packageId);
  const isLocalCustomer = customerNationality.trim().toUpperCase() === "MV";
  const pkgPrice       = isLocalCustomer && (selectedPkg as any)?.localPriceMvr
    ? Number((selectedPkg as any).localPriceMvr)
    : Number(selectedPkg?.touristPrice ?? 0);
  const addOnTotal     = selectedAddOns.reduce((sum, id) => {
    const a = addOns.find((x) => x.id === id);
    const price = isLocalCustomer && (a as any)?.localPriceMvr ? Number((a as any).localPriceMvr) : Number(a?.price ?? 0);
    return sum + (price * numRiders);
  }, 0);
  const subtotal       = pkgPrice * numRiders + addOnTotal;
  const calcCommission = (base: number, qty: number, type?: string | null, value?: number | null) => {
    if (value == null || value <= 0) return null;
    return type === "FIXED" ? value * qty : (base * value) / 100;
  };
  const packageAgentType = isLocalCustomer ? localCommissionType : touristCommissionType;
  const packageAgentValue = isLocalCustomer ? localCommissionValue : touristCommissionValue;
  const packageBase = pkgPrice * numRiders;
  const packageCommission = calcCommission(packageBase, numRiders, packageAgentType, packageAgentValue)
    ?? calcCommission(packageBase, numRiders, selectedPkg?.agentCommissionType, selectedPkg?.agentCommissionValue == null ? null : Number(selectedPkg.agentCommissionValue))
    ?? (packageBase * commissionRate) / 100;
  const addOnCommission = selectedAddOns.reduce((sum, id) => {
    const addon = addOns.find((x) => x.id === id);
    if (!addon || addon.agentCommissionEligible === false) return sum;
    const price = isLocalCustomer && (addon as any).localPriceMvr ? Number((addon as any).localPriceMvr) : Number(addon.price ?? 0);
    const lineTotal = price * numRiders;
    const agentSpecific = addOnCommissions.find((c) => c.addOnId === id);
    const specificAmount = isLocalCustomer && agentSpecific?.localValue != null
      ? calcCommission(lineTotal, numRiders, agentSpecific.localType, agentSpecific.localValue)
      : calcCommission(lineTotal, numRiders, agentSpecific?.type, agentSpecific?.value);
    const amount = specificAmount
      ?? calcCommission(lineTotal, numRiders, addOnCommissionType, addOnCommissionValue)
      ?? calcCommission(lineTotal, numRiders, addon.agentCommissionType, addon.agentCommissionValue == null ? null : Number(addon.agentCommissionValue))
      ?? (commissionBasis === "PACKAGE_AND_ADDONS" ? (lineTotal * commissionRate) / 100 : 0);
    return sum + amount;
  }, 0);
  const commissionAmt  = packageCommission + addOnCommission;

  async function handleSubmit() {
    setError(null);
    if (!slotId || !packageId || !customerName || !customerPhone) {
      setError("Please fill in all required fields."); return;
    }

    startTransition(async () => {
      try {
        // Ensure riders array has required fields even if empty
        const ridersPayload = riders.map((r) => ({
          name:   r.name   || "",
          age:    r.age    || "",
          weight: r.weight || "",
        }));

        const res = await fetch("/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slotId, packageId, addOnIds: selectedAddOns,
            date, numRiders,
            customerName,
            customerPhone: customerPhone.replace(/\s/g, ""),
            customerPhoneCountry: "MV",
            customerEmail:       customerEmail || "",
            customerNationality, customerHotel,
            riders: ridersPayload,
            paymentMethod, notes,
            source:  "AGENT",
            agentId,
          }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error ?? "Failed to create booking"); return; }
        setResult({
          reference:  data.reference,
          qrCode:     data.qrCode,
          commission: commissionAmt,
        });
        toast.success(`Booking ${data.reference} created`);
      } catch (err: any) {
        setError(err.message);
      }
    });
  }

  // ── Success screen ────────────────────────────────────────────────────────
  if (result) {
    return (
      <div className="admin-card text-center space-y-5 py-10">
        <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
        <div>
          <p className="font-display font-bold text-2xl">Booking confirmed!</p>
          <p className="font-mono text-3xl text-primary font-bold mt-1">{result.reference}</p>
        </div>
        {result.qrCode && (
          <div className="flex justify-center">
            <div className="bg-white p-3 rounded-xl inline-block shadow">
              <img src={result.qrCode} alt="QR" className="w-36 h-36" />
            </div>
          </div>
        )}
        <div className="bg-muted/40 rounded-xl p-4 text-sm max-w-xs mx-auto space-y-2">
          <p className="text-muted-foreground">Your commission on this booking</p>
          <p className="font-display font-bold text-xl text-primary">{formatCurrency(result.commission)}</p>
          <p className="text-xs text-muted-foreground">(pending payout)</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href={`/book/confirmation?ref=${result.reference}`}
            target="_blank"
            className="flex items-center gap-2 justify-center px-5 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
          >
            View confirmation
          </a>
          <button
            onClick={() => { setResult(null); setSlotId(""); setStep(1); setCustomerName(""); setCustomerPhone(""); }}
            className="btn-brand text-sm px-5 py-2.5"
          >
            New booking
          </button>
          <button onClick={() => router.push("/agents/bookings")} className="text-sm px-5 py-2.5 text-muted-foreground hover:text-foreground transition-colors">
            Back to bookings
          </button>
        </div>
      </div>
    );
  }

  const STEPS = [
    { n: 1, label: "Date & slot" },
    { n: 2, label: "Package" },
    { n: 3, label: "Customer" },
    { n: 4, label: "Riders" },
    { n: 5, label: "Confirm" },
  ];

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s.n} className="flex items-center gap-2">
            <div className={cn(
              "w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center transition-all",
              step === s.n ? "bg-primary text-primary-foreground ring-4 ring-primary/20" :
              step > s.n  ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
            )}>
              {step > s.n ? "✓" : s.n}
            </div>
            <span className={cn("text-xs font-medium hidden sm:block", step === s.n ? "text-primary" : "text-muted-foreground")}>
              {s.label}
            </span>
            {i < STEPS.length - 1 && <div className="flex-1 h-px bg-border mx-1 hidden sm:block" style={{ minWidth: 16 }} />}
          </div>
        ))}
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">{error}</div>
      )}

      {/* ── STEP 1: Date & Slot ── */}
      {step === 1 && (
        <div className="admin-card space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <p className="font-semibold text-sm">Select date & time</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Date *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => loadSlots(e.target.value)}
                min={format(new Date(), "yyyy-MM-dd")}
                className={inputCls}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Riders *</label>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => { syncRiders(Math.max(1, numRiders - 1)); loadSlots(date); }}
                  className="p-2 rounded-lg border border-border hover:bg-muted">
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="font-bold text-lg w-8 text-center">{numRiders}</span>
                <button type="button" onClick={() => { syncRiders(Math.min(8, numRiders + 1)); loadSlots(date); }}
                  className="p-2 rounded-lg border border-border hover:bg-muted">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {slotsLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading slots…
            </div>
          ) : slots.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Time slot *</label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {slots.map((s) => (
                  <button key={s.id} type="button"
                    onClick={() => { if (s.canBook) { setSlotId(s.id); setSlotTime(s.startTime); } }}
                    disabled={!s.canBook}
                    className={cn(
                      "py-2 rounded-lg text-xs font-medium border transition-all",
                      slotId === s.id ? "bg-primary text-primary-foreground border-primary" :
                      s.canBook ? "border-border hover:border-primary/50" :
                      "border-border/30 text-muted-foreground/40 cursor-not-allowed"
                    )}
                  >
                    {s.startTime}
                    <br />
                    <span className="text-[10px] opacity-60">{s.available} left</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setStep(2)}
              disabled={!slotId}
              className="btn-brand text-sm px-6 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Package + Add-ons ── */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="admin-card space-y-4">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-muted-foreground" />
              <p className="font-semibold text-sm">Select package</p>
            </div>
            <div className="space-y-2">
              {packages.map((pkg) => (
                <button
                  key={pkg.id}
                  onClick={() => setPackageId(pkg.id)}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all",
                    packageId === pkg.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30"
                  )}
                >
                  <div className={cn(
                    "w-4 h-4 rounded-full border-2 flex-shrink-0",
                    packageId === pkg.id ? "border-primary bg-primary" : "border-muted-foreground/40"
                  )} />
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{pkg.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{pkg.description}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-sm">{formatCurrency(Number(pkg.touristPrice) * numRiders)}</p>
                    <p className="text-[10px] text-muted-foreground">{formatCurrency(Number(pkg.touristPrice))} × {numRiders}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {addOns.length > 0 && (
            <div className="admin-card space-y-3">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-muted-foreground" />
                <p className="font-semibold text-sm">Add-ons (optional)</p>
              </div>
              <div className="space-y-2">
                {addOns.map((addon) => (
                  <button
                    key={addon.id}
                    onClick={() => toggleAddOn(addon.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all",
                      selectedAddOns.includes(addon.id)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30"
                    )}
                  >
                    <div className={cn(
                      "w-4 h-4 rounded border-2 flex-shrink-0",
                      selectedAddOns.includes(addon.id) ? "border-primary bg-primary" : "border-muted-foreground/40"
                    )} />
                    <span className="flex-1 text-sm">{addon.name}</span>
                    <span className="text-sm font-semibold text-muted-foreground">+{formatCurrency(Number(addon.price) * numRiders)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Commission preview */}
          <div className="admin-card bg-primary/5 border-primary/20 space-y-1">
            <p className="text-xs text-muted-foreground font-medium">Commission preview</p>
            <p className="font-display font-bold text-xl text-primary">{formatCurrency(commissionAmt)}</p>
            <p className="text-xs text-muted-foreground">based on your package and add-on rules</p>
          </div>

          <div className="flex gap-3 justify-between">
            <button onClick={() => setStep(1)} className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">← Back</button>
            <button onClick={() => setStep(3)} className="btn-brand text-sm px-6 py-2.5">Continue</button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Customer details ── */}
      {step === 3 && (
        <div className="admin-card space-y-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <p className="font-semibold text-sm">Customer details</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Full name *</label>
              <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Customer full name" className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Phone *</label>
              <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="+960 7XX XXXX" className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Email</label>
              <input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="optional" className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Nationality</label>
              <input value={customerNationality} onChange={(e) => setCustomerNationality(e.target.value)} placeholder="e.g. British" className={inputCls} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs text-muted-foreground font-medium">Hotel / guesthouse</label>
              <input value={customerHotel} onChange={(e) => setCustomerHotel(e.target.value)} placeholder="Where they're staying" className={inputCls} />
            </div>
          </div>
          <div className="flex gap-3 justify-between">
            <button onClick={() => setStep(2)} className="text-sm text-muted-foreground hover:text-foreground">← Back</button>
            <button
              onClick={() => setStep(4)}
              disabled={!customerName || !customerPhone}
              className="btn-brand text-sm px-6 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 4: Rider details ── */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="space-y-3">
            {riders.map((r, i) => (
              <div key={i} className="admin-card space-y-3">
                <p className="font-semibold text-sm text-muted-foreground">Rider {i + 1}</p>
                <div className="grid grid-cols-3 gap-3">
                  <input value={r.name} onChange={(e) => updateRider(i, "name", e.target.value)}
                    placeholder="Full name" className={cn(inputCls, "col-span-3 sm:col-span-1")} />
                  <input type="number" value={r.age} onChange={(e) => updateRider(i, "age", e.target.value)}
                    placeholder="Age" min={6} className={inputCls} />
                  <input type="number" value={r.weight} onChange={(e) => updateRider(i, "weight", e.target.value)}
                    placeholder="Weight (kg)" min={35} max={110} className={inputCls} />
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-3 justify-between">
            <button onClick={() => setStep(3)} className="text-sm text-muted-foreground hover:text-foreground">← Back</button>
            <button onClick={() => setStep(5)} className="btn-brand text-sm px-6 py-2.5">Review booking</button>
          </div>
        </div>
      )}

      {/* ── STEP 5: Review & confirm ── */}
      {step === 5 && (
        <div className="space-y-4">
          <div className="admin-card space-y-4">
            <p className="font-semibold text-sm">Booking summary</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="text-muted-foreground">Date</div>
              <div className="font-medium">{date} · {slotTime}</div>
              <div className="text-muted-foreground">Package</div>
              <div className="font-medium">{packages.find((p) => p.id === packageId)?.name}</div>
              <div className="text-muted-foreground">Riders</div>
              <div className="font-medium">{numRiders}</div>
              <div className="text-muted-foreground">Customer</div>
              <div className="font-medium">{customerName}</div>
              {selectedAddOns.length > 0 && (
                <>
                  <div className="text-muted-foreground">Add-ons</div>
                  <div className="font-medium">{selectedAddOns.map((id) => addOns.find((a) => a.id === id)?.name).join(", ")}</div>
                </>
              )}
              <div className="text-muted-foreground">Subtotal</div>
              <div className="font-bold text-base">{formatCurrency(subtotal)}</div>
              <div className="text-muted-foreground">Your commission</div>
              <div className="font-bold text-primary">{formatCurrency(commissionAmt)}</div>
            </div>
          </div>

          {/* Payment method */}
          <div className="admin-card space-y-3">
            <p className="font-semibold text-sm">Payment method</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "cash",          label: "Cash" },
                { value: "card",          label: "Card" },
                { value: "bank_transfer", label: "Bank transfer" },
                ...(canMakeUnpaidBookings ? [{ value: "unpaid", label: "Unpaid / collect later" }] : []),
              ].map((m) => (
                <button key={m.value} onClick={() => setPaymentMethod(m.value)}
                  className={cn(
                    "py-2.5 rounded-lg text-sm font-medium border transition-all",
                    paymentMethod === m.value ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="admin-card space-y-1.5">
            <label className="text-xs text-muted-foreground font-medium">Internal notes (optional)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              placeholder="Any notes…" className={cn(inputCls, "resize-none")} />
          </div>

          <div className="flex gap-3 justify-between">
            <button onClick={() => setStep(4)} className="text-sm text-muted-foreground hover:text-foreground">← Back</button>
            <button
              onClick={handleSubmit}
              disabled={isPending}
              className="btn-brand text-sm px-6 py-2.5 disabled:opacity-50"
            >
              {isPending ? <><Loader2 className="w-4 h-4 animate-spin" />Creating…</> : "Confirm booking"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
