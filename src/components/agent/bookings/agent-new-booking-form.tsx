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
import { COUNTRIES_SORTED, DEFAULT_COUNTRY, NATIONALITIES_SORTED } from "@/lib/booking/countries";
import type { Package as PkgType, AddOn } from "@prisma/client";

const inputCls = "w-full rounded-lg px-3 py-2 text-sm bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground";
const whatsappNotice = "Please enter your correct WhatsApp number. Booking updates and media files will be delivered through WhatsApp.";

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
  const [result, setResult]          = useState<{ reference: string; qrCode?: string; commission: number; currency: string } | null>(null);
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
  const [addOnQuantities, setAddOnQuantities] = useState<Record<string, number>>({});
  const [customerType, setCustomerType] = useState<"local" | "tourist" | "">("");

  // Customer
  const [customerName, setCustomerName]   = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerPhoneCountry, setCustomerPhoneCountry] = useState(DEFAULT_COUNTRY.iso);
  const [customerPhoneDialCode, setCustomerPhoneDialCode] = useState(DEFAULT_COUNTRY.dialCode);
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerHotel, setCustomerHotel] = useState("");
  const [customerNationality, setCustomerNationality] = useState("");
  const [customerNationalityIso, setCustomerNationalityIso] = useState("");
  const [notes, setNotes]                 = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const selectedAddOns = Object.entries(addOnQuantities).filter(([, qty]) => qty > 0).map(([id]) => id);
  const selectedPhoneCountry = COUNTRIES_SORTED.find((c) => c.iso === customerPhoneCountry) ?? DEFAULT_COUNTRY;
  const cleanCustomerPhone = customerPhone.replace(/\D/g, "");
  const fullCustomerPhone = cleanCustomerPhone ? `${customerPhoneDialCode}${cleanCustomerPhone}` : "";
  const phonePlaceholder = selectedPhoneCountry.phoneDigits[0] === selectedPhoneCountry.phoneDigits[1]
    ? `${selectedPhoneCountry.phoneDigits[0]} digit WhatsApp number`
    : `${selectedPhoneCountry.phoneDigits[0]}-${selectedPhoneCountry.phoneDigits[1]} digit WhatsApp number`;

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

  function applyCustomerType(type: "local" | "tourist") {
    setCustomerType(type);
    if (type === "local") {
      setCustomerPhoneCountry(DEFAULT_COUNTRY.iso);
      setCustomerPhoneDialCode(DEFAULT_COUNTRY.dialCode);
      setCustomerNationalityIso(DEFAULT_COUNTRY.iso);
      setCustomerNationality(DEFAULT_COUNTRY.nationality);
    }
  }

  function handlePhoneCountryChange(iso: string) {
    const country = COUNTRIES_SORTED.find((c) => c.iso === iso) ?? DEFAULT_COUNTRY;
    setCustomerPhoneCountry(country.iso);
    setCustomerPhoneDialCode(country.dialCode);
  }

  function handleNationalityChange(iso: string) {
    const country = NATIONALITIES_SORTED.find((c) => c.iso === iso);
    setCustomerNationalityIso(country?.iso ?? "");
    setCustomerNationality(country?.nationality ?? "");
    if (country && (!cleanCustomerPhone || customerPhoneCountry === DEFAULT_COUNTRY.iso)) {
      setCustomerPhoneCountry(country.iso);
      setCustomerPhoneDialCode(country.dialCode);
    }
  }

  // Price calculation preview
  const selectedPkg    = packages.find((p) => p.id === packageId);
  const isLocalCustomer = customerType === "local";
  const displayCurrency = isLocalCustomer ? "MVR" : "USD";
  const pkgPrice       = isLocalCustomer && (selectedPkg as any)?.localPriceMvr
    ? Number((selectedPkg as any).localPriceMvr)
    : Number(selectedPkg?.touristPrice ?? 0);
  const addOnTotal     = selectedAddOns.reduce((sum, id) => {
    const a = addOns.find((x) => x.id === id);
    const price = isLocalCustomer && (a as any)?.localPriceMvr ? Number((a as any).localPriceMvr) : Number(a?.price ?? 0);
    return sum + (price * (addOnQuantities[id] ?? 0));
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
    const qty = addOnQuantities[id] ?? 0;
    const lineTotal = price * qty;
    const agentSpecific = addOnCommissions.find((c) => c.addOnId === id);
    const specificAmount = isLocalCustomer && agentSpecific?.localValue != null
      ? calcCommission(lineTotal, qty, agentSpecific.localType, agentSpecific.localValue)
      : calcCommission(lineTotal, qty, agentSpecific?.type, agentSpecific?.value);
    const amount = specificAmount
      ?? calcCommission(lineTotal, qty, addOnCommissionType, addOnCommissionValue)
      ?? calcCommission(lineTotal, qty, addon.agentCommissionType, addon.agentCommissionValue == null ? null : Number(addon.agentCommissionValue))
      ?? (commissionBasis === "PACKAGE_AND_ADDONS" ? (lineTotal * commissionRate) / 100 : 0);
    return sum + amount;
  }, 0);
  const commissionAmt  = packageCommission + addOnCommission;

  async function handleSubmit() {
    setError(null);
    if (!customerType || !slotId || !packageId || !customerName || !cleanCustomerPhone || !customerNationality) {
      setError("Please fill in all required fields."); return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slotId, packageId, addOnIds: selectedAddOns, addOnQuantities,
            riderType: customerType,
            date, numRiders,
            customerName,
            customerPhone: fullCustomerPhone,
            customerPhoneCountry,
            customerEmail:       customerEmail || "",
            customerNationality,
            customerHotel,
            riders: [],
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
          currency:   data.currency ?? displayCurrency,
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
          <p className="font-display font-bold text-xl text-primary">{formatCurrency(result.commission, result.currency)}</p>
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
    { n: 4, label: "Confirm" },
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
                    onClick={() => applyCustomerType(option.value)}
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
              disabled={!customerType || !slotId}
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
            <div className="flex flex-wrap justify-center gap-2">
              {packages.map((pkg) => (
                <button
                  key={pkg.id}
                  onClick={() => setPackageId(pkg.id)}
                  className={cn(
                    "w-full sm:flex-[0_1_340px] flex items-center gap-4 p-4 rounded-xl border text-left transition-all",
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
                    <p className="font-bold text-sm">{formatCurrency((isLocalCustomer && (pkg as any).localPriceMvr ? Number((pkg as any).localPriceMvr) : Number(pkg.touristPrice)) * numRiders, displayCurrency)}</p>
                    <p className="text-[10px] text-muted-foreground">{formatCurrency(isLocalCustomer && (pkg as any).localPriceMvr ? Number((pkg as any).localPriceMvr) : Number(pkg.touristPrice), displayCurrency)} × {numRiders}</p>
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
              <div className="flex flex-wrap justify-center gap-2">
                {addOns.map((addon) => {
                  const qty = addOnQuantities[addon.id] ?? 0;
                  return (
                    <div
                      key={addon.id}
                      className={cn(
                        "w-full sm:flex-[0_1_320px] flex items-center gap-3 p-3 rounded-xl border transition-all",
                        qty > 0 ? "border-primary bg-primary/5" : "border-border"
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{addon.name}</p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(isLocalCustomer && (addon as any).localPriceMvr ? Number((addon as any).localPriceMvr) : Number(addon.price), displayCurrency)} per rider</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setAddOnQty(addon.id, qty - 1)} className="p-1.5 rounded-lg border border-border hover:bg-muted">
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-6 text-center text-sm font-bold">{qty}</span>
                        <button type="button" onClick={() => setAddOnQty(addon.id, qty + 1)} disabled={qty >= numRiders} className="p-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-40">
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Commission preview */}
          <div className="admin-card bg-primary/5 border-primary/20 space-y-1">
            <p className="text-xs text-muted-foreground font-medium">Commission preview</p>
            <p className="font-display font-bold text-xl text-primary">{formatCurrency(commissionAmt, displayCurrency)}</p>
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
              <div className="grid grid-cols-[132px_minmax(0,1fr)] gap-2">
                <select
                  value={customerPhoneCountry}
                  onChange={(e) => handlePhoneCountryChange(e.target.value)}
                  className={inputCls}
                  aria-label="Phone country code"
                >
                  {COUNTRIES_SORTED.map((country, index) => (
                    <option key={`${country.iso}-${index}`} value={country.iso}>
                      {country.flag} {country.dialCode}
                    </option>
                  ))}
                </select>
                <input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value.replace(/[^\d\s-]/g, ""))}
                  inputMode="tel"
                  placeholder={phonePlaceholder}
                  className={inputCls}
                />
              </div>
              <p className="rounded-lg border border-primary/15 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">{whatsappNotice}</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Email</label>
              <input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="optional" className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Nationality *</label>
              <select
                value={customerNationalityIso}
                onChange={(e) => handleNationalityChange(e.target.value)}
                className={inputCls}
              >
                <option value="">Select nationality</option>
                {NATIONALITIES_SORTED.map((country, index) => (
                  <option key={`${country.iso}-${index}`} value={country.iso}>
                    {country.flag} {country.nationality}
                  </option>
                ))}
              </select>
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
              disabled={!customerName || !cleanCustomerPhone || !customerNationality}
              className="btn-brand text-sm px-6 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 4: Review & confirm ── */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="admin-card space-y-4">
            <p className="font-semibold text-sm">Booking summary</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="text-muted-foreground">Date</div>
              <div className="font-medium">{date} · {slotTime}</div>
              <div className="text-muted-foreground">Package</div>
              <div className="font-medium">{packages.find((p) => p.id === packageId)?.name}</div>
              <div className="text-muted-foreground">Customer type</div>
              <div className="font-medium capitalize">{customerType}</div>
              <div className="text-muted-foreground">Riders</div>
              <div className="font-medium">{numRiders}</div>
              <div className="text-muted-foreground">Customer</div>
              <div className="font-medium">{customerName}</div>
              {selectedAddOns.length > 0 && (
                <>
                  <div className="text-muted-foreground">Add-ons</div>
                  <div className="font-medium">{selectedAddOns.map((id) => `${addOnQuantities[id]}× ${addOns.find((a) => a.id === id)?.name}`).join(", ")}</div>
                </>
              )}
              <div className="text-muted-foreground">Subtotal</div>
              <div className="font-bold text-base">{formatCurrency(subtotal, displayCurrency)}</div>
              <div className="text-muted-foreground">Your commission</div>
              <div className="font-bold text-primary">{formatCurrency(commissionAmt, displayCurrency)}</div>
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
            <button onClick={() => setStep(3)} className="text-sm text-muted-foreground hover:text-foreground">← Back</button>
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
