"use client";

import { useState, useTransition } from "react";
import {
  CreditCard, Banknote, Building2, Link2,
  Tag, Loader2, AlertCircle, Check,
} from "lucide-react";
import { useBookingStore } from "@/lib/booking/store";
import { StepShell } from "../step-shell";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { BookingOrderSummary } from "../booking-order-summary";

const PAYMENT_METHODS = [
  { id: "card",          label: "Credit / debit card", icon: CreditCard,  desc: "Visa, Mastercard, Amex" },
  { id: "bank_transfer", label: "Bank transfer",        icon: Building2,   desc: "Manual transfer, reference required" },
  { id: "cash",          label: "Pay on arrival",       icon: Banknote,    desc: "Cash at check-in — booking held for 30 min" },
  { id: "payment_link",  label: "Payment link",         icon: Link2,       desc: "We'll send a secure link via WhatsApp" },
];

export function Step9Payment() {
  const store  = useBookingStore();
  const [isPending, startTransition]    = useTransition();
  const [promoInput, setPromoInput]     = useState(store.promoCode);
  const [promoChecking, setPromoChecking] = useState(false);
  const [promoError, setPromoError]     = useState<string | null>(null);
  const [submitError, setSubmitError]   = useState<string | null>(null);

  const { paymentMethod, setField, nextStep } = store;

  async function applyPromo() {
    if (!promoInput.trim()) return;
    setPromoChecking(true);
    setPromoError(null);
    try {
      const res = await fetch("/api/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId: store.packageId,
          addOnIds:  store.addOnIds,
          numRiders: store.numRiders,
          date:      store.date,
          promoCode: promoInput.toUpperCase(),
        }),
      });
      const data = await res.json();
      if (data.promoCodeValid) {
        setField("promoCode",      promoInput.toUpperCase());
        setField("promoDiscount",  data.discountAmount);
        setField("totalAmount",    data.total);
      } else {
        setPromoError("This code is invalid or has expired.");
      }
    } catch {
      setPromoError("Could not verify code. Please try again.");
    } finally {
      setPromoChecking(false);
    }
  }

  async function handleConfirm() {
    if (!paymentMethod) return;
    setSubmitError(null);

    startTransition(async () => {
      try {
        const res = await fetch("/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slotId:               store.slotId,
            packageId:            store.packageId,
            addOnIds:             store.addOnIds,
            date:                 store.date,
            numRiders:            store.numRiders,
            customerName:         store.customerName,
            customerPhone:        store.customerPhone,
            customerPhoneCountry: store.customerPhoneCountry,
            customerEmail:        store.customerEmail,
            customerNationality:  store.customerNationality,
            customerHotel:        store.customerHotel,
            riders:               store.riders,
            promoCode:            store.promoCode,
            affiliateCoupon:      store.affiliateCoupon,
            affiliateLinkId:      store.affiliateLinkId,
            paymentMethod,
          }),
        });

        const data = await res.json();

        if (!res.ok || !data.reference) {
          setSubmitError(data.error ?? "Booking failed. Please try again.");
          return;
        }

        // Save result and advance
        setField("bookingReference", data.reference);
        setField("bookingId",        data.bookingId);
        setField("totalAmount",      data.total);
        if (data.qrCode) setField("qrCode", data.qrCode);
        nextStep();
      } catch (err: any) {
        setSubmitError("Network error. Please check your connection.");
      }
    });
  }

  const promoApplied = store.promoDiscount > 0;

  return (
    <StepShell
      title="Review & confirm"
      subtitle="Choose how you'd like to pay."
      onNext={handleConfirm}
      nextLabel="Confirm booking"
      nextDisabled={!paymentMethod || isPending}
      isLoading={isPending}
    >
      <div className="space-y-6">
        {/* Order summary */}
        <BookingOrderSummary />

        {/* Promo code */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-white/50">Promo / affiliate code</p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
              <input
                value={promoInput}
                onChange={(e) => { setPromoInput(e.target.value.toUpperCase()); setPromoError(null); }}
                placeholder="ENTER CODE"
                className={cn(
                  "w-full pl-9 pr-4 py-3 rounded-xl text-sm bg-white/5 border border-white/10",
                  "text-white placeholder:text-white/25 font-mono tracking-widest",
                  "focus:outline-none focus:ring-2 focus:ring-brand-citrus/40",
                  promoApplied && "border-brand-lime/40"
                )}
              />
            </div>
            <button
              onClick={applyPromo}
              disabled={promoChecking || !promoInput.trim() || promoApplied}
              className={cn(
                "px-4 py-3 rounded-xl text-sm font-semibold border transition-all",
                promoApplied
                  ? "border-brand-lime/40 text-brand-lime bg-brand-lime/10 cursor-default"
                  : "border-white/15 text-white/70 hover:bg-white/8 hover:text-white"
              )}
            >
              {promoChecking ? <Loader2 className="w-4 h-4 animate-spin" /> :
               promoApplied ? <Check className="w-4 h-4" /> : "Apply"}
            </button>
          </div>
          {promoError && <p className="text-brand-coral text-xs">{promoError}</p>}
          {promoApplied && (
            <p className="text-brand-lime text-xs">
              ✓ Code applied — {formatCurrency(store.promoDiscount)} saved
            </p>
          )}
        </div>

        {/* Payment methods */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-white/50 uppercase tracking-wider">Payment method</p>
          <div className="space-y-2">
            {PAYMENT_METHODS.map((m) => {
              const Icon = m.icon;
              const isSelected = paymentMethod === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setField("paymentMethod", m.id)}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all",
                    isSelected
                      ? "border-brand-citrus/50 bg-brand-citrus/8"
                      : "border-white/8 bg-white/3 hover:border-white/20"
                  )}
                >
                  <div className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
                    isSelected ? "bg-brand-citrus/20" : "bg-white/5"
                  )}>
                    <Icon className={cn("w-4 h-4", isSelected ? "text-brand-citrus" : "text-white/40")} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-medium", isSelected ? "text-white" : "text-white/70")}>{m.label}</p>
                    <p className="text-white/30 text-xs">{m.desc}</p>
                  </div>
                  <div className={cn(
                    "w-4 h-4 rounded-full border-2 flex-shrink-0",
                    isSelected ? "border-brand-citrus bg-brand-citrus" : "border-white/20"
                  )}>
                    {isSelected && <div className="w-full h-full rounded-full bg-brand-deep scale-50" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {submitError && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-400 text-sm">{submitError}</p>
          </div>
        )}
      </div>
    </StepShell>
  );
}
