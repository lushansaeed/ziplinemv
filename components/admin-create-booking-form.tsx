"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Minus, Plus } from "lucide-react";
import { createBooking } from "@/lib/admin/actions";
import { addOns } from "@/lib/data";
import { calculateRideTotal, defaultPricing, type CustomerType } from "@/lib/pricing";

type TimeSlotOption = {
  id: string;
  label: string;
};

const bookingStatuses = ["PENDING", "CONFIRMED", "PAID", "CHECKED_IN", "COMPLETED", "CANCELLED", "NO_SHOW", "REFUNDED"];
const paymentStatuses = ["UNPAID", "PARTIALLY_PAID", "PAID", "REFUNDED"];
const paymentMethods = ["Admin/manual", "Card", "Cash on arrival", "Bank transfer", "Agent credit"];

export function AdminCreateBookingForm({ timeSlots }: { timeSlots: TimeSlotOption[] }) {
  const [customerType, setCustomerType] = useState<CustomerType>("tourist");
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [currency, setCurrency] = useState("USD");
  const [coupon, setCoupon] = useState("");
  const [codeStatus, setCodeStatus] = useState<"idle" | "valid" | "invalid">("idle");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState(0);
  const [discountReason, setDiscountReason] = useState("");
  const [amountPaid, setAmountPaid] = useState(0);
  const [totalOverride, setTotalOverride] = useState("");
  const [totalOverrideReason, setTotalOverrideReason] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [addonQuantities, setAddonQuantities] = useState<Record<string, number>>(
    Object.fromEntries(addOns.map((item) => [item.id, 0]))
  );

  const riderCount = adults + children;
  const addOnUsdTotal = addOns.reduce((sum, item) => sum + item.usd * (addonQuantities[item.id] ?? 0), 0);
  const calculated = useMemo(
    () => calculateRideTotal(customerType, { adults, children }, addOnUsdTotal, coupon.trim().length > 0),
    [customerType, adults, children, addOnUsdTotal, coupon]
  );
  const displayCurrency = totalOverride ? currency : calculated.currency;
  const currencyRate = displayCurrency === "MVR" ? defaultPricing.exchangeRateMvrPerUsd : 1;
  const rideTotal = calculated.subtotal - addOnUsdTotal * currencyRate;
  const addOnsTotal = addOnUsdTotal * currencyRate;
  const couponDiscount = calculated.discount;
  const manualDiscount = discountType === "percentage" ? (calculated.subtotal - couponDiscount) * (discountValue / 100) : discountValue;
  const subtotal = Math.max(calculated.subtotal - couponDiscount, 0);
  const calculatedFinal = Math.max(subtotal - manualDiscount, 0);
  const finalTotal = totalOverride ? Number(totalOverride) || 0 : calculatedFinal;
  const balanceDue = Math.max(finalTotal - amountPaid, 0);
  const discountLimitExceeded =
    (discountType === "percentage" && discountValue > 10) ||
    (discountType === "fixed" && discountValue > (displayCurrency === "MVR" ? 500 : 25));
  const requiresDiscountReason = discountValue > 0 && !discountReason.trim();
  const requiresOverrideReason = Boolean(totalOverride) && !totalOverrideReason.trim();
  const invalidAddonQuantity = Object.values(addonQuantities).some((quantity) => quantity < 0 || quantity > riderCount);
  const canOpenConfirm = riderCount > 0 && finalTotal >= 0 && !discountLimitExceeded && !requiresDiscountReason && !requiresOverrideReason && !invalidAddonQuantity;

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
        <h2 className="text-2xl font-black text-ocean-950">Create booking</h2>
        <p className="mt-1 text-sm font-bold text-ocean-950/55">Use the counter form for direct, admin, agent-credit, and walk-in bookings.</p>
      </div>

      <form action={createBooking} className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <input type="hidden" name="customerType" value={customerType} />
        <input type="hidden" name="adults" value={adults} />
        <input type="hidden" name="children" value={children} />
        {addOns.map((item) => (
          <input key={item.id} type="hidden" name={`addonQuantity_${item.id}`} value={addonQuantities[item.id] ?? 0} />
        ))}

        <div className="grid gap-5">
          <FormSectionCard title="Customer details">
            <Field name="customerName" label="Customer name" required />
            <Field name="phone" label="Phone / WhatsApp" required />
            <Field name="email" label="Email" type="email" />
            <Field name="nationality" label="Nationality" />
            <div className="grid gap-2 text-sm font-bold">
              Customer type
              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-ocean-50 p-1">
                {(["tourist", "local"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setCustomerType(type);
                      setCurrency(type === "tourist" ? "USD" : "MVR");
                    }}
                    className={`rounded-xl px-4 py-3 font-black capitalize transition ${customerType === type ? "bg-ocean-950 text-white shadow-sm" : "text-ocean-950/60"}`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </FormSectionCard>

          <FormSectionCard title="Booking details">
            <Field name="date" label="Booking date" type="date" required />
            <label className="grid gap-2 text-sm font-bold">
              Time slot
              <select name="timeSlotId" required className="rounded-2xl border border-ocean-950/10 bg-white px-4 py-3 outline-none transition focus:border-ocean-500">
                <option value="">Select slot</option>
                {timeSlots.map((slot) => <option key={slot.id} value={slot.id}>{slot.label}</option>)}
              </select>
            </label>
            <QuantitySelector label="Adults" value={adults} onChange={setAdults} min={0} />
            <QuantitySelector label="Kids" value={children} onChange={setChildren} min={0} />
            <Select name="currency" label="Currency" value={currency} onChange={setCurrency} options={["USD", "MVR"]} />
            <Select name="bookingStatus" label="Booking status" options={bookingStatuses} defaultValue="PENDING" />
            <Select name="paymentStatus" label="Payment status" options={paymentStatuses} defaultValue="UNPAID" />
            <Select name="paymentMethod" label="Payment method" options={paymentMethods} defaultValue="Admin/manual" />
            <CouponCodeInput coupon={coupon} setCoupon={setCoupon} codeStatus={codeStatus} applyCode={applyCode} />
          </FormSectionCard>

          <FormSectionCard title="Add-ons" columns="md:grid-cols-3">
            {addOns.map((item) => (
              <AddOnQuantityCard
                key={item.id}
                label={item.label}
                unitPriceUsd={item.usd}
                currency={displayCurrency}
                quantity={addonQuantities[item.id] ?? 0}
                riderCount={riderCount}
                onChange={(next) => setAddonQuantity(item.id, next)}
              />
            ))}
          </FormSectionCard>

          <FormSectionCard title="Discount and override">
            <Select label="Discount type" name="discountType" value={discountType} onChange={(value) => setDiscountType(value as "percentage" | "fixed")} options={["percentage", "fixed"]} />
            <Field label="Discount value" name="discountValue" type="number" min="0" step="0.01" value={String(discountValue)} onChange={(value) => setDiscountValue(Math.max(0, Number(value) || 0))} />
            <Field label="Discount reason" name="discountReason" placeholder="Required when discount is applied" value={discountReason} onChange={setDiscountReason} />
            <Field label="Applied by" name="discountAppliedBy" placeholder="Counter staff name" />
            <Select label="Approval status" name="discountApprovalStatus" options={["Not required", "Pending approval", "Approved"]} defaultValue="Not required" />
            <Field label="Total override" name="totalAmount" type="number" step="0.01" placeholder="Use only when manually overriding the calculated total" value={totalOverride} onChange={setTotalOverride} />
            <Field label="Override reason" name="totalOverrideReason" placeholder="Required when override is used" value={totalOverrideReason} onChange={setTotalOverrideReason} />
            {discountLimitExceeded ? <SoftError text="Discount exceeds the maximum allowed limit. Admin approval is required." /> : null}
            {requiresDiscountReason ? <SoftError text="Discount reason is required when a discount is applied." /> : null}
            {requiresOverrideReason ? <SoftError text="Override reason is required when total override is used." /> : null}
            {totalOverride ? <SoftWarning text="This booking total has been manually overridden." /> : null}
          </FormSectionCard>

          <label className="grid gap-2 rounded-3xl bg-white p-5 text-sm font-bold shadow-sm">
            Admin notes
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
          selectedAddOns={addOns.filter((item) => (addonQuantities[item.id] ?? 0) > 0).map((item) => `${item.label} x ${addonQuantities[item.id]}`)}
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

function AddOnQuantityCard({ label, unitPriceUsd, currency, quantity, riderCount, onChange }: { label: string; unitPriceUsd: number; currency: string; quantity: number; riderCount: number; onChange: (value: number) => void }) {
  const unit = currency === "MVR" ? unitPriceUsd * defaultPricing.exchangeRateMvrPerUsd : unitPriceUsd;
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
      Coupon / affiliate code
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
      <p className="text-xs font-black uppercase tracking-[0.2em] text-lagoon">Booking summary</p>
      <h3 className="mt-2 text-2xl font-black">Total payable</h3>
      <div className="mt-5 grid gap-3 text-sm">
        <SummaryRow label="Ride total" value={`${currency} ${rideTotal.toFixed(2)}`} />
        <SummaryRow label="Add-ons total" value={`${currency} ${addOnsTotal.toFixed(2)}`} />
        <SummaryRow label="Coupon discount" value={`-${currency} ${couponDiscount.toFixed(2)}`} />
        <SummaryRow label="Manual discount" value={`-${currency} ${manualDiscount.toFixed(2)}`} />
        <SummaryRow label="Subtotal" value={`${currency} ${subtotal.toFixed(2)}`} />
      </div>
      <div className="mt-5 rounded-3xl bg-white p-5 text-ocean-950">
        <p className="text-sm font-bold text-ocean-950/55">Final total</p>
        <p className="text-4xl font-black">{currency} {finalTotal.toFixed(2)}</p>
        <div className="mt-4 grid gap-2">
          <Field name="amountPaid" label="Amount paid" type="number" min="0" step="0.01" value={String(amountPaid)} onChange={(value) => amountPaidSetter(Math.max(0, Number(value) || 0))} />
          <p className="rounded-2xl bg-ocean-50 p-3 text-sm font-black">Balance due: {currency} {balanceDue.toFixed(2)}</p>
        </div>
      </div>
      {showConfirm ? (
        <div className="mt-5 rounded-3xl bg-white/10 p-4">
          <p className="font-black">Confirm booking summary</p>
          <p className="mt-2 text-sm text-white/70">Riders: {riderText}</p>
          <p className="text-sm text-white/70">Add-ons: {selectedAddOns.length ? selectedAddOns.join(", ") : "None"}</p>
          <p className="text-sm text-white/70">Discount: {discountText}</p>
          <p className="text-sm text-white/70">Final total: {currency} {finalTotal.toFixed(2)}</p>
          <div className="mt-4 grid gap-2">
            <button type="submit" className="rounded-full bg-lagoon px-5 py-3 font-black text-ocean-950">Confirm and Create Booking</button>
            <button type="button" onClick={() => setShowConfirm(false)} className="rounded-full bg-white/10 px-5 py-3 font-black text-white">Cancel / Go Back</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setShowConfirm(true)} disabled={!canOpenConfirm} className="mt-5 w-full rounded-full bg-lagoon px-5 py-4 font-black text-ocean-950 disabled:cursor-not-allowed disabled:opacity-50">
          Review booking
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

function SoftError({ text }: { text: string }) {
  return <p className="flex items-center gap-2 rounded-2xl bg-red-50 p-3 text-sm font-black text-red-700 md:col-span-2"><AlertTriangle className="h-4 w-4" />{text}</p>;
}

function SoftWarning({ text }: { text: string }) {
  return <p className="flex items-center gap-2 rounded-2xl bg-sunset/15 p-3 text-sm font-black text-orange-700 md:col-span-2"><CheckCircle2 className="h-4 w-4" />{text}</p>;
}
