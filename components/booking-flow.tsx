"use client";

import { useMemo, useState } from "react";
import { addOns, timeSlots, whatsappNumber } from "@/lib/data";
import { bookingReference, calculateRideTotal, type CustomerType } from "@/lib/pricing";

export function BookingFlow() {
  const [customerType, setCustomerType] = useState<CustomerType>("tourist");
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [coupon, setCoupon] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [reference, setReference] = useState("");
  const addOnUsdTotal = selectedAddOns.reduce((sum, id) => sum + (addOns.find((item) => item.id === id)?.usd ?? 0), 0);
  const price = useMemo(
    () => calculateRideTotal(customerType, { adults, children }, addOnUsdTotal, coupon.trim().length > 0),
    [customerType, adults, children, addOnUsdTotal, coupon]
  );

  const toggleAddOn = (id: string) => {
    setSelectedAddOns((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const confirm = () => {
    setReference(bookingReference());
    setConfirmed(true);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <form className="rounded-[2rem] bg-white p-5 shadow-sm md:p-8">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Customer name" placeholder="Full name" />
          <Field label="Nationality" placeholder="Country" />
          <Field label="Phone / WhatsApp" placeholder="+960..." />
          <Field label="Email address" placeholder="you@example.com" type="email" />
          <Field label="Preferred date" type="date" />
          <label className="grid gap-2 text-sm font-bold text-ocean-950">
            Preferred time slot
            <select className="rounded-2xl border border-ocean-950/10 bg-white px-4 py-3 font-medium">
              {timeSlots.map((slot, index) => (
                <option key={slot} disabled={index === 2}>
                  {slot} {index === 2 ? "Sold out" : `${8 - index} seats left`}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <Segment label="Tourist" active={customerType === "tourist"} onClick={() => setCustomerType("tourist")} />
          <Segment label="Local" active={customerType === "local"} onClick={() => setCustomerType("local")} />
          <Field label="Payment method" placeholder="Card / Cash / Transfer" />
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
          <Field label="Coupon / affiliate code" placeholder="AFFILIATECODE" value={coupon} onChange={setCoupon} />
          <Field label="Special notes" placeholder="Dietary, timing, group notes" />
        </div>
        <label className="mt-5 flex items-start gap-3 text-sm text-ocean-950/70">
          <input type="checkbox" required className="mt-1" />
          I accept the safety terms, rider requirements, and cancellation policy.
        </label>
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
        <button onClick={confirm} className="mt-5 w-full rounded-full bg-sunset px-6 py-4 font-black text-white">
          Confirm Booking
        </button>
        {confirmed ? (
          <div className="mt-5 rounded-3xl bg-white/10 p-4">
            <p className="font-bold">Reference: {reference}</p>
            <a
              className="mt-3 inline-flex rounded-full bg-green-500 px-4 py-2 text-sm font-bold"
              href={`https://wa.me/${whatsappNumber}?text=Booking%20reference%20${reference}`}
            >
              Send confirmation via WhatsApp
            </a>
          </div>
        ) : null}
      </aside>
    </div>
  );
}

function Field({
  label,
  placeholder,
  type = "text",
  value,
  onChange
}: {
  label: string;
  placeholder?: string;
  type?: string;
  value?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-ocean-950">
      {label}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
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
