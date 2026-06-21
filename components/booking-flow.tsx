"use client";

import { useActionState, useMemo, useState } from "react";
import { createBookingAction, type BookingActionState } from "@/app/book/actions";
import { addOns, timeSlots } from "@/lib/data";
import { calculateRideTotal, type CustomerType } from "@/lib/pricing";

const initialState: BookingActionState = {
  ok: false,
  message: ""
};

export function BookingFlow() {
  const [state, formAction, pending] = useActionState(createBookingAction, initialState);
  const [customerType, setCustomerType] = useState<CustomerType>("tourist");
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [coupon, setCoupon] = useState("");
  const addOnUsdTotal = selectedAddOns.reduce((sum, id) => sum + (addOns.find((item) => item.id === id)?.usd ?? 0), 0);
  const price = useMemo(
    () => calculateRideTotal(customerType, { adults, children }, addOnUsdTotal, coupon.trim().length > 0),
    [customerType, adults, children, addOnUsdTotal, coupon]
  );

  const toggleAddOn = (id: string) => {
    setSelectedAddOns((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <form id="zipline-booking-form" action={formAction} className="rounded-[2rem] bg-white p-5 shadow-sm md:p-8">
        <input type="hidden" name="customerType" value={customerType} />
        <input type="hidden" name="adults" value={adults} />
        <input type="hidden" name="children" value={children} />
        {selectedAddOns.map((id) => (
          <input key={id} type="hidden" name="addons" value={id} />
        ))}
        <div className="grid gap-4 md:grid-cols-2">
          <Field name="customerName" label="Customer name" placeholder="Full name" required />
          <Field name="nationality" label="Nationality" placeholder="Country" required />
          <Field name="phone" label="Phone / WhatsApp" placeholder="+960..." required />
          <Field name="email" label="Email address" placeholder="you@example.com" type="email" required />
          <Field name="preferredDate" label="Preferred date" type="date" required />
          <label className="grid gap-2 text-sm font-bold text-ocean-950">
            Preferred time slot
            <select name="timeSlot" className="rounded-2xl border border-ocean-950/10 bg-white px-4 py-3 font-medium">
              {timeSlots.map((slot, index) => (
                <option key={slot} value={slot} disabled={index === 2}>
                  {slot} {index === 2 ? "Sold out" : `${8 - index} seats left`}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <Segment label="Tourist" active={customerType === "tourist"} onClick={() => setCustomerType("tourist")} />
          <Segment label="Local" active={customerType === "local"} onClick={() => setCustomerType("local")} />
          <label className="grid gap-2 text-sm font-bold text-ocean-950">
            Payment method
            <select name="paymentMethod" className="rounded-2xl border border-ocean-950/10 bg-white px-4 py-3 font-medium">
              <option>Card</option>
              <option>Cash on arrival</option>
              <option>Bank transfer</option>
              <option>Agent credit</option>
            </select>
          </label>
        </div>
        <div className="mt-5 grid gap-4 rounded-3xl bg-ocean-50 p-4 md:grid-cols-2">
          <Stepper label="Adults" value={adults} setValue={setAdults} min={0} />
          <Stepper label="Kids" value={children} setValue={setChildren} min={0} />
        </div>
        <div className="mt-5">
          <p className="text-sm font-bold text-ocean-950">Add-ons</p>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {addOns.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => toggleAddOn(item.id)}
                  className={`rounded-3xl border p-4 text-left transition ${
                    selectedAddOns.includes(item.id) ? "border-ocean-500 bg-ocean-50" : "border-ocean-950/10 bg-white"
                  }`}
                >
                  <Icon size={20} className="text-ocean-700" />
                  <span className="mt-3 block font-bold">{item.label}</span>
                  <span className="text-sm text-ocean-950/60">USD {item.usd}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field name="coupon" label="Coupon / affiliate code" placeholder="AFFILIATECODE" value={coupon} onChange={setCoupon} />
          <Field name="specialNotes" label="Special notes" placeholder="Dietary, timing, group notes" />
        </div>
        <label className="mt-5 flex items-start gap-3 text-sm text-ocean-950/70">
          <input name="acceptedTerms" type="checkbox" required className="mt-1" />
          I accept the safety terms, rider requirements, and cancellation policy.
        </label>
        <button disabled={pending} className="mt-6 w-full rounded-full bg-sunset px-6 py-4 font-black text-white disabled:cursor-not-allowed disabled:opacity-60 lg:hidden">
          {pending ? "Saving booking..." : "Confirm Booking"}
        </button>
      </form>
      <aside className="h-fit rounded-[2rem] bg-ocean-950 p-6 text-white shadow-glow md:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.22em] text-lagoon">Booking summary</p>
        <h2 className="mt-3 text-3xl font-black">Reserve your flight</h2>
        <div className="mt-6 grid gap-3 text-sm">
          <Summary label="Riders" value={`${adults} adult, ${children} kid`} />
          <Summary label="Customer type" value={customerType} />
          <Summary label="Add-ons" value={selectedAddOns.length ? selectedAddOns.join(", ") : "None"} />
          <Summary label="Subtotal" value={`${price.currency} ${price.subtotal.toFixed(2)}`} />
          <Summary label="Discount" value={`${price.currency} ${price.discount.toFixed(2)}`} />
        </div>
        <div className="mt-6 rounded-3xl bg-white p-5 text-ocean-950">
          <p className="text-sm font-bold text-ocean-950/60">Final total</p>
          <p className="text-4xl font-black">
            {price.currency} {price.total.toFixed(2)}
          </p>
        </div>
        <button form="zipline-booking-form" type="submit" disabled={pending} className="mt-5 hidden w-full rounded-full bg-sunset px-6 py-4 font-black text-white disabled:cursor-not-allowed disabled:opacity-60 lg:block">
          {pending ? "Saving booking..." : "Confirm Booking"}
        </button>
        {state.message ? (
          <div className={`mt-5 rounded-3xl p-4 ${state.ok ? "bg-white/10" : "bg-sunset/20"}`}>
            <p className="font-bold">{state.message}</p>
            {state.reference ? <p className="mt-2 font-bold">Reference: {state.reference}</p> : null}
            {state.whatsappUrl ? (
              <a className="mt-3 inline-flex rounded-full bg-green-500 px-4 py-2 text-sm font-bold" href={state.whatsappUrl}>
                Send confirmation via WhatsApp
              </a>
            ) : null}
          </div>
        ) : null}
      </aside>
    </div>
  );
}

function Field({
  name,
  label,
  placeholder,
  type = "text",
  value,
  onChange,
  required = false
}: {
  name: string;
  label: string;
  placeholder?: string;
  type?: string;
  value?: string;
  onChange?: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-ocean-950">
      {label}
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        required={required}
        className="rounded-2xl border border-ocean-950/10 px-4 py-3 font-medium outline-none transition focus:border-ocean-500"
      />
    </label>
  );
}

function Segment({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl px-4 py-3 text-sm font-black ${active ? "bg-ocean-950 text-white" : "bg-ocean-50 text-ocean-950"}`}
    >
      {label}
    </button>
  );
}

function Stepper({ label, value, setValue, min }: { label: string; value: number; setValue: (value: number) => void; min: number }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white p-4">
      <span className="font-bold">{label}</span>
      <div className="flex items-center gap-3">
        <button type="button" className="h-9 w-9 rounded-full bg-ocean-50 font-black" onClick={() => setValue(Math.max(min, value - 1))}>
          -
        </button>
        <span className="w-6 text-center font-black">{value}</span>
        <button type="button" className="h-9 w-9 rounded-full bg-ocean-950 font-black text-white" onClick={() => setValue(value + 1)}>
          +
        </button>
      </div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-white/10 pb-3">
      <span className="text-white/60">{label}</span>
      <span className="font-bold capitalize">{value}</span>
    </div>
  );
}
