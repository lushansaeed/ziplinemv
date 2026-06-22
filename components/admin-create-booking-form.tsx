"use client";

import { useEffect, useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { createBooking } from "@/lib/admin/actions";
import { calculateRideTotal, type CustomerType } from "@/lib/pricing";
import { addOnDisplayPrice, addOnUnitUsd, defaultPricingAddOns, type PricingEngineConfig } from "@/lib/pricing-engine";

type TimeSlotOption = {
  value: string;
  label: string;
  available: number;
  capacity: number;
  disabled: boolean;
};

const bookingStatuses = ["PENDING", "CONFIRMED", "PAID", "CHECKED_IN", "COMPLETED", "CANCELLED", "NO_SHOW", "REFUNDED"];
const paymentStatuses = ["UNPAID", "PARTIALLY_PAID", "PAID", "REFUNDED"];
const paymentMethods = ["Admin/manual", "Card", "Cash on arrival", "Bank transfer", "Agent credit"];
const todayDateValue = getTodayInputValue();

export function AdminCreateBookingForm() {
  const [pricingEngine, setPricingEngine] = useState<PricingEngineConfig | null>(null);
  const [customerType, setCustomerType] = useState<CustomerType>("tourist");
  const [bookingDate, setBookingDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [timeSlots, setTimeSlots] = useState<TimeSlotOption[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [currency, setCurrency] = useState("USD");
  const [coupon, setCoupon] = useState("");
  const [codeStatus, setCodeStatus] = useState<"idle" | "valid" | "invalid">("idle");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState(0);
  const [amountPaid, setAmountPaid] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [addonQuantities, setAddonQuantities] = useState<Record<string, number>>(
    Object.fromEntries(defaultPricingAddOns.map((item) => [item.id, 0]))
  );

  const pricing = pricingEngine?.pricing;
  const availableAddOns = pricingEngine?.addOns.filter((item) => item.enabled) ?? defaultPricingAddOns.filter((item) => item.enabled);
  const riderCount = adults + children;
  const addOnUsdTotal = availableAddOns.reduce((sum, item) => sum + (pricing ? addOnUnitUsd(item, pricing.exchangeRateMvrPerUsd) : item.price) * (addonQuantities[item.id] ?? 0), 0);
  const calculated = useMemo(
    () => calculateRideTotal(customerType, { adults, children }, addOnUsdTotal, coupon.trim().length > 0, pricing),
    [customerType, adults, children, addOnUsdTotal, coupon, pricing]
  );
  const displayCurrency = calculated.currency;
  const currencyRate = displayCurrency === "MVR" ? calculated.exchangeRate : 1;
  const rideTotal = calculated.subtotal - addOnUsdTotal * currencyRate;
  const addOnsTotal = addOnUsdTotal * currencyRate;
  const couponDiscount = calculated.discount;
  const manualDiscount = discountType === "percentage" ? (calculated.subtotal - couponDiscount) * (discountValue / 100) : discountValue;
  const subtotal = Math.max(calculated.subtotal - couponDiscount, 0);
  const calculatedFinal = Math.max(subtotal - manualDiscount, 0);
  const finalTotal = calculatedFinal;
  const balanceDue = Math.max(finalTotal - amountPaid, 0);
  const invalidAddonQuantity = Object.values(addonQuantities).some((quantity) => quantity < 0 || quantity > riderCount);
  const canOpenConfirm = riderCount > 0 && finalTotal >= 0 && !invalidAddonQuantity;

  useEffect(() => {
    fetch("/api/pricing-engine")
      .then((response) => response.json())
      .then((payload: PricingEngineConfig) => setPricingEngine(payload))
      .catch(() => setPricingEngine(null));
  }, []);

  useEffect(() => {
    if (!bookingDate) {
      setTimeSlots([]);
      setSelectedSlot("");
      return;
    }

    let active = true;
    setSlotsLoading(true);
    fetch(`/api/booking-slots?date=${encodeURIComponent(bookingDate)}&guests=${riderCount}`)
      .then((response) => response.json())
      .then((payload: { slots?: TimeSlotOption[] }) => {
        if (!active) return;
        const nextSlots = payload.slots ?? [];
        setTimeSlots(nextSlots);
        if (!nextSlots.some((slot) => slot.value === selectedSlot && !slot.disabled)) {
          setSelectedSlot("");
        }
      })
      .catch(() => {
        if (active) setTimeSlots([]);
      })
      .finally(() => {
        if (active) setSlotsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [bookingDate, riderCount, selectedSlot]);

  const setAddonQuantity = (id: string, next: number) => {
    setAddonQuantities((current) => ({ ...current, [id]: Math.max(0, next) }));
  };

  const applyCode = () => {
    if (!coupon.trim()) {
      setCodeStatus("idle");
      return;
    }
    setCodeStatus(coupon.trim().length >= 4 ? "valid" : "invalid");
  };

  return (
    <section className="mt-6">
      <div className="mb-4">
        <h2 className="text-2xl font-black text-ocean-950">Create Booking</h2>
        <p className="mt-1 text-xs font-bold text-ocean-950/45">Counter, agent-credit, and walk-in bookings.</p>
      </div>

      <form action={createBooking} className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <input type="hidden" name="customerType" value={customerType} />
        <input type="hidden" name="adults" value={adults} />
        <input type="hidden" name="children" value={children} />
        {availableAddOns.map((item) => (
          <input key={item.id} type="hidden" name={`addonQuantity_${item.id}`} value={addonQuantities[item.id] ?? 0} />
        ))}

        <div className="grid gap-5">
          <FormSectionCard title="Customer Details">
            <Field name="customerName" label="Customer Name" required />
            <Field name="phone" label="Phone / WhatsApp" required />
            <Field name="email" label="Email" type="email" />
            <Field name="nationality" label="Nationality" />
            <div className="grid gap-2 text-sm font-bold">
              Customer Type
              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-ocean-50 p-1">
                {(["tourist", "local", "maafushi"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setCustomerType(type);
                      setCurrency(type === "tourist" ? "USD" : "MVR");
                    }}
                    className={`rounded-xl px-4 py-3 font-black capitalize transition ${customerType === type ? "bg-ocean-950 text-white shadow-sm" : "text-ocean-950/60"}`}
                  >
                    {type === "maafushi" ? "Maafushi" : type}
                  </button>
                ))}
              </div>
            </div>
          </FormSectionCard>

          <FormSectionCard title="Booking Details">
            <Field name="date" label="Booking Date" type="date" min={todayDateValue} value={bookingDate} onChange={setBookingDate} required />
            <label className="grid gap-2 text-sm font-bold">
              Time Slot
              <select name="timeSlot" value={selectedSlot} onChange={(event) => setSelectedSlot(event.target.value)} required className="rounded-2xl border border-ocean-950/10 bg-white px-4 py-3 outline-none transition focus:border-ocean-500">
                <option value="">{bookingDate ? slotsLoading ? "Loading slots..." : "Select slot" : "Select booking date first"}</option>
                {timeSlots.map((slot) => (
                  <option key={slot.value} value={slot.value} disabled={slot.disabled}>
                    {slot.label} | {slot.available <= 0 ? "Full" : `${slot.available} spots available`}
                  </option>
                ))}
              </select>
            </label>
            <QuantitySelector label="Adults" value={adults} onChange={setAdults} min={0} />
            <QuantitySelector label="Kids" value={children} onChange={setChildren} min={0} />
            <Select name="currency" label="Currency" value={currency} onChange={setCurrency} options={["USD", "MVR"]} />
            <Select name="bookingStatus" label="Booking Status" options={bookingStatuses} defaultValue="PENDING" />
            <Select name="paymentStatus" label="Payment Status" options={paymentStatuses} defaultValue="UNPAID" />
            <Select name="paymentMethod" label="Payment Method" options={paymentMethods} defaultValue="Admin/manual" />
            <CouponCodeInput coupon={coupon} setCoupon={setCoupon} codeStatus={codeStatus} applyCode={applyCode} />
          </FormSectionCard>

          <FormSectionCard title="Add-Ons" columns="md:grid-cols-3">
            {availableAddOns.map((item) => (
              <AddOnQuantityCard
                key={item.id}
                label={item.label}
                unitPrice={pricing ? addOnDisplayPrice(item, displayCurrency, pricing.exchangeRateMvrPerUsd) : item.price}
                currency={displayCurrency}
                quantity={addonQuantities[item.id] ?? 0}
                riderCount={riderCount}
                onChange={(next) => setAddonQuantity(item.id, next)}
              />
            ))}
          </FormSectionCard>

          <FormSectionCard title="Discount">
            <Select label="Discount Type" name="discountType" value={discountType} onChange={(value) => setDiscountType(value as "percentage" | "fixed")} options={["percentage", "fixed"]} />
            <Field label="Discount Value" name="discountValue" type="number" min="0" step="0.01" value={String(discountValue)} onChange={(value) => setDiscountValue(Math.max(0, Number(value) || 0))} />
          </FormSectionCard>

          <label className="grid gap-2 rounded-3xl bg-white p-5 text-sm font-bold shadow-sm">
            Admin Notes
            <textarea name="internalNotes" className="min-h-24 rounded-2xl border border-ocean-950/10 px-4 py-3 outline-none transition focus:border-ocean-500" />
          </label>
        </div>

        <BookingSummaryCard
          currency={displayCurrency}
          rideTotal={rideTotal}
          addOnsTotal={addOnsTotal}
          couponDiscount={couponDiscount}
          manualDiscount={manualDiscount}
          subtotal={subtotal}
          finalTotal={finalTotal}
          amountPaid={amountPaid}
          balanceDue={balanceDue}
          amountPaidSetter={setAmountPaid}
          canOpenConfirm={canOpenConfirm}
          showConfirm={showConfirm}
          setShowConfirm={setShowConfirm}
          selectedAddOns={availableAddOns.filter((item) => (addonQuantities[item.id] ?? 0) > 0).map((item) => `${item.label} x ${addonQuantities[item.id]}`)}
          riderText={`${adults} adults / ${children} kids`}
          discountText={discountValue ? `${discountType} ${discountValue}` : "None"}
        />
      </form>
    </section>
  );
}

function FormSectionCard({ title, children, columns = "md:grid-cols-2" }: { title: string; children: React.ReactNode; columns?: string }) {
  return (
    <section className="rounded-3xl bg-white p-5 shadow-[0_18px_60px_rgba(8,51,68,0.08)]">
      <h3 className="text-lg font-black text-ocean-950">{title}</h3>
      <div className={`mt-4 grid gap-4 ${columns}`}>{children}</div>
    </section>
  );
}

function getTodayInputValue() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

type FieldProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> & {
  label: string;
  onChange?: (value: string) => void;
};

function Field({ label, onChange, ...props }: FieldProps) {
  return (
    <label className="grid gap-2 text-sm font-bold text-ocean-950">
      {label}
      <input
        {...props}
        onChange={(event) => onChange?.(event.target.value)}
        className="rounded-2xl border border-ocean-950/10 bg-white px-4 py-3 outline-none transition focus:border-ocean-500"
      />
    </label>
  );
}

function Select({ label, name, options, defaultValue, value, onChange }: { label: string; name: string; options: string[]; defaultValue?: string; value?: string; onChange?: (value: string) => void }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-ocean-950">
      {label}
      <select name={name} defaultValue={defaultValue} value={value} onChange={(event) => onChange?.(event.target.value)} className="rounded-2xl border border-ocean-950/10 bg-white px-4 py-3 capitalize outline-none transition focus:border-ocean-500">
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function QuantitySelector({ label, value, onChange, min }: { label: string; value: number; onChange: (value: number) => void; min: number }) {
  return (
    <div className="grid gap-2 text-sm font-bold">
      {label}
      <div className="flex items-center justify-between rounded-2xl border border-ocean-950/10 bg-white p-2">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} className="grid h-10 w-10 place-items-center rounded-xl bg-ocean-50 text-ocean-950"><Minus className="h-4 w-4" /></button>
        <span className="text-lg font-black">{value}</span>
        <button type="button" onClick={() => onChange(value + 1)} className="grid h-10 w-10 place-items-center rounded-xl bg-ocean-950 text-white"><Plus className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

function AddOnQuantityCard({ label, unitPrice, currency, quantity, riderCount, onChange }: { label: string; unitPrice: number; currency: string; quantity: number; riderCount: number; onChange: (value: number) => void }) {
  const unit = unitPrice;
  const exceeds = quantity > riderCount;

  return (
    <article className={`rounded-3xl p-4 shadow-sm ring-1 ${quantity ? "bg-ocean-50 ring-ocean-500/20" : "bg-white ring-ocean-950/10"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-black text-ocean-950">{label}</h4>
          <p className="mt-1 text-xs font-bold text-ocean-950/55">{currency} {unit.toFixed(2)} each</p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-ocean-700">{currency} {(unit * quantity).toFixed(2)}</span>
      </div>
      <div className="mt-4">
        <QuantitySelector label="Quantity" value={quantity} onChange={onChange} min={0} />
      </div>
      {exceeds ? <p className="mt-3 rounded-2xl bg-red-50 p-3 text-xs font-bold text-red-700">Quantity cannot exceed rider count.</p> : null}
    </article>
  );
}

function CouponCodeInput({ coupon, setCoupon, codeStatus, applyCode }: { coupon: string; setCoupon: (value: string) => void; codeStatus: "idle" | "valid" | "invalid"; applyCode: () => void }) {
  return (
    <div className="grid gap-2 text-sm font-bold">
      Coupon / Affiliate Code
      <div className="flex gap-2">
        <input name="coupon" value={coupon} onChange={(event) => setCoupon(event.target.value)} className="min-w-0 flex-1 rounded-2xl border border-ocean-950/10 px-4 py-3 outline-none transition focus:border-ocean-500" />
        <button type="button" onClick={applyCode} className="rounded-2xl bg-ocean-950 px-4 py-3 font-black text-white">Apply</button>
      </div>
      {codeStatus === "valid" ? <p className="text-xs font-black text-emerald-700">Code ready to apply on save.</p> : null}
      {codeStatus === "invalid" ? <p className="text-xs font-black text-red-700">Code looks too short.</p> : null}
    </div>
  );
}

function BookingSummaryCard({
  currency,
  rideTotal,
  addOnsTotal,
  couponDiscount,
  manualDiscount,
  subtotal,
  finalTotal,
  amountPaid,
  balanceDue,
  amountPaidSetter,
  canOpenConfirm,
  showConfirm,
  setShowConfirm,
  selectedAddOns,
  riderText,
  discountText
}: {
  currency: string;
  rideTotal: number;
  addOnsTotal: number;
  couponDiscount: number;
  manualDiscount: number;
  subtotal: number;
  finalTotal: number;
  amountPaid: number;
  balanceDue: number;
  amountPaidSetter: (value: number) => void;
  canOpenConfirm: boolean;
  showConfirm: boolean;
  setShowConfirm: (value: boolean) => void;
  selectedAddOns: string[];
  riderText: string;
  discountText: string;
}) {
  return (
    <aside className="h-fit rounded-3xl bg-ocean-950 p-5 text-white shadow-glow xl:sticky xl:top-32">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-lagoon">Booking Summary</p>
      <h3 className="mt-2 text-2xl font-black">Total Payable</h3>
      <div className="mt-5 grid gap-3 text-sm">
        <SummaryRow label="Ride Total" value={`${currency} ${rideTotal.toFixed(2)}`} />
        <SummaryRow label="Add-Ons Total" value={`${currency} ${addOnsTotal.toFixed(2)}`} />
        <SummaryRow label="Coupon Discount" value={`-${currency} ${couponDiscount.toFixed(2)}`} />
        <SummaryRow label="Manual Discount" value={`-${currency} ${manualDiscount.toFixed(2)}`} />
        <SummaryRow label="Subtotal" value={`${currency} ${subtotal.toFixed(2)}`} />
      </div>
      <div className="mt-5 rounded-3xl bg-white p-5 text-ocean-950">
        <p className="text-sm font-bold text-ocean-950/55">Final Total</p>
        <p className="text-4xl font-black">{currency} {finalTotal.toFixed(2)}</p>
        <div className="mt-4 grid gap-2">
          <Field name="amountPaid" label="Amount Paid" type="number" min="0" step="0.01" value={String(amountPaid)} onChange={(value) => amountPaidSetter(Math.max(0, Number(value) || 0))} />
          <p className="rounded-2xl bg-ocean-50 p-3 text-sm font-black">Balance Due: {currency} {balanceDue.toFixed(2)}</p>
        </div>
      </div>
      {showConfirm ? (
        <div className="mt-5 rounded-3xl bg-white/10 p-4">
          <p className="font-black">Confirm Booking Summary</p>
          <p className="mt-2 text-sm text-white/70">Riders: {riderText}</p>
          <p className="text-sm text-white/70">Add-Ons: {selectedAddOns.length ? selectedAddOns.join(", ") : "None"}</p>
          <p className="text-sm text-white/70">Discount: {discountText}</p>
          <p className="text-sm text-white/70">Final Total: {currency} {finalTotal.toFixed(2)}</p>
          <div className="mt-4 grid gap-2">
            <button type="submit" className="rounded-full bg-lagoon px-5 py-3 font-black text-ocean-950">Confirm and Create Booking</button>
            <button type="button" onClick={() => setShowConfirm(false)} className="rounded-full bg-white/10 px-5 py-3 font-black text-white">Cancel / Go Back</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setShowConfirm(true)} disabled={!canOpenConfirm} className="mt-5 w-full rounded-full bg-lagoon px-5 py-4 font-black text-ocean-950 disabled:cursor-not-allowed disabled:opacity-50">
          Review Booking
        </button>
      )}
    </aside>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
      <span className="text-white/60">{label}</span>
      <span className="font-black">{value}</span>
    </div>
  );
}
