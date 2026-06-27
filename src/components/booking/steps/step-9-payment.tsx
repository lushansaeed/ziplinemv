"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  CreditCard, Banknote, Building2, Link2, Upload,
  Tag, Loader2, AlertCircle, Check,
} from "lucide-react";
import { useBookingStore } from "@/lib/booking/store";
import { StepShell } from "../step-shell";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { BookingOrderSummary } from "../booking-order-summary";

const PAYMENT_METHODS = [
  { id: "card", enabledKey: "payment_card_enabled", label: "Credit / debit card", icon: CreditCard, desc: "Visa, Mastercard, Amex" },
  { id: "bank_transfer", enabledKey: "payment_bank_transfer_enabled", label: "Bank transfer", icon: Building2, desc: "Upload your transfer slip" },
  { id: "cash", enabledKey: "payment_cash_enabled", label: "Pay on arrival", icon: Banknote, desc: "Pay at check-in" },
  { id: "payment_link", enabledKey: "payment_link_enabled", label: "Payment link", icon: Link2, desc: "We'll send a secure link via WhatsApp" },
];

type PaymentSettings = Record<string, any>;

export function Step9Payment() {
  const store  = useBookingStore();
  const [isPending, startTransition]    = useTransition();
  const [promoInput, setPromoInput]     = useState(store.promoCode);
  const [promoChecking, setPromoChecking] = useState(false);
  const [promoError, setPromoError]     = useState<string | null>(null);
  const [submitError, setSubmitError]   = useState<string | null>(null);
  const [settings, setSettings]         = useState<PaymentSettings>({
    payment_bank_transfer_enabled: true,
    payment_cash_enabled: true,
    payment_card_enabled: false,
    payment_link_enabled: false,
    payment_bank_account_name: "OSVANA GROUP PVT LTD",
    payment_mvr_account: "7730000840403",
    payment_usd_account: "7730000840404",
  });
  const [uploadingSlip, setUploadingSlip] = useState(false);

  const { paymentMethod, setField, nextStep } = store;
  const isLocalBooking = store.riderType === "local";
  const availablePaymentMethods = useMemo(() => PAYMENT_METHODS.filter((method) => {
    if (!settings[method.enabledKey]) return false;
    if (method.id === "bank_transfer" && !isLocalBooking) return false;
    return true;
  }), [settings, isLocalBooking]);

  useEffect(() => {
    fetch("/api/payments/settings")
      .then((res) => res.json())
      .then((data) => setSettings((prev) => ({ ...prev, ...data })))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (paymentMethod && !availablePaymentMethods.some((method) => method.id === paymentMethod)) {
      setField("paymentMethod", "");
    }
  }, [availablePaymentMethods, paymentMethod, setField]);

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
          riderType: store.riderType,
          promoCode: promoInput.toUpperCase(),
        }),
      });
      const data = await res.json();
      if (data.promoCodeValid) {
        setField("promoCode",      promoInput.toUpperCase());
        setField("promoDiscount",  data.discountAmount);
        setField("totalAmount",    data.total);
        setField("currency",       data.currency);
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
    if (paymentMethod === "bank_transfer" && !store.transferSlipUrl) {
      setSubmitError("Please attach your bank transfer slip before confirming.");
      return;
    }
    setSubmitError(null);

    startTransition(async () => {
      try {
        const completedRiders = store.riders.filter((rider) =>
          rider.name.trim() || rider.age.trim() || rider.weight.trim()
        );

        const res = await fetch("/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slotId:               store.slotId,
            packageId:            store.packageId,
            addOnIds:             store.addOnIds,
            addOnQuantities:      store.addOnQuantities,
            riderType:            store.riderType,
            date:                 store.date,
            numRiders:            store.numRiders,
            customerName:         store.customerName,
            customerPhone:        store.customerPhone,
            customerPhoneCountry: store.customerPhoneCountry,
            customerEmail:        store.customerEmail,
            customerNationality:  store.customerNationality,
            customerHotel:        store.customerHotel,
            riders:               completedRiders,
            promoCode:            store.promoCode,
            affiliateCoupon:      store.affiliateCoupon,
            affiliateLinkId:      store.affiliateLinkId,
            paymentMethod,
            transferSlipUrl:      store.transferSlipUrl,
            transferSlipPath:     store.transferSlipPath,
            transferSlipFileName: store.transferSlipFileName,
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
        setField("currency",         data.currency);
        if (data.qrCode) setField("qrCode", data.qrCode);
        if (data.waiverShare) setField("waiverShare", data.waiverShare);
        nextStep();
      } catch (err: any) {
        setSubmitError("Network error. Please check your connection.");
      }
    });
  }

  async function uploadTransferSlip(file: File) {
    if (file.size > 10 * 1024 * 1024) {
      setSubmitError("Transfer slip must be 10 MB or smaller.");
      return;
    }
    setSubmitError(null);
    setUploadingSlip(true);
    try {
      const urlRes = await fetch("/api/payments/transfer-slip-upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      });
      const urlData = await urlRes.json();
      if (!urlRes.ok || !urlData.uploadUrl) throw new Error(urlData.error ?? "Could not prepare upload.");

      const uploadRes = await fetch(urlData.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadRes.ok) throw new Error("Transfer slip upload failed.");

      setField("transferSlipUrl", urlData.publicUrl);
      setField("transferSlipPath", urlData.storagePath);
      setField("transferSlipFileName", file.name);
    } catch (error: any) {
      setSubmitError(error?.message ?? "Transfer slip upload failed.");
    } finally {
      setUploadingSlip(false);
    }
  }

  const promoApplied = store.promoDiscount > 0;
  const transferSlipRequired = paymentMethod === "bank_transfer" && !store.transferSlipUrl;

  return (
    <StepShell
      title="Review & confirm"
      subtitle="Choose how you'd like to pay."
      onNext={handleConfirm}
      nextLabel="Confirm booking"
      nextDisabled={!paymentMethod || transferSlipRequired || isPending || uploadingSlip}
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
            {availablePaymentMethods.map((m) => {
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
            {availablePaymentMethods.length === 0 && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
                No payment methods are available right now. Please contact Zipline Maldives.
              </div>
            )}
          </div>
        </div>

        {paymentMethod === "bank_transfer" && (
          <div className="space-y-4 rounded-2xl border border-brand-citrus/25 bg-brand-citrus/8 p-4">
            <div>
              <p className="text-sm font-semibold text-white">Bank transfer details</p>
              <p className="mt-1 text-xs text-white/45">Please transfer to the matching account and attach your transfer slip.</p>
            </div>
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2">
                <span className="text-white/45">Account name</span>
                <span className="text-right font-semibold text-white">{settings.payment_bank_account_name}</span>
              </div>
              <div className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2">
                <span className="text-white/45">MVR account</span>
                <span className="font-mono font-semibold text-brand-citrus">{settings.payment_mvr_account}</span>
              </div>
              <div className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2">
                <span className="text-white/45">USD account</span>
                <span className="font-mono font-semibold text-brand-citrus">{settings.payment_usd_account}</span>
              </div>
            </div>
            <label className={cn(
              "flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-4 text-sm transition-colors",
              store.transferSlipUrl ? "border-brand-lime/40 bg-brand-lime/10 text-brand-lime" : "border-white/20 text-white/60 hover:border-brand-citrus/50"
            )}>
              {uploadingSlip ? <Loader2 className="h-4 w-4 animate-spin" /> : store.transferSlipUrl ? <Check className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
              {uploadingSlip ? "Uploading transfer slip..." : store.transferSlipFileName || "Attach transfer slip"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) uploadTransferSlip(file);
                }}
              />
            </label>
          </div>
        )}

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
