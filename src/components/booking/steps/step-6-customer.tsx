"use client";

import { useBookingStore } from "@/lib/booking/store";
import { StepShell } from "../step-shell";
import { cn } from "@/lib/utils";

const inputCls = cn(
  "w-full rounded-xl px-4 py-3 text-sm bg-white/5 border border-white/10",
  "text-white placeholder:text-white/25",
  "focus:outline-none focus:ring-2 focus:ring-brand-citrus/40 focus:border-brand-citrus/30",
  "transition-all duration-150"
);

const COUNTRY_CODES = [
  { code: "MV", dial: "+960", label: "🇲🇻 +960" },
  { code: "US", dial: "+1",   label: "🇺🇸 +1" },
  { code: "GB", dial: "+44",  label: "🇬🇧 +44" },
  { code: "DE", dial: "+49",  label: "🇩🇪 +49" },
  { code: "FR", dial: "+33",  label: "🇫🇷 +33" },
  { code: "IN", dial: "+91",  label: "🇮🇳 +91" },
  { code: "AU", dial: "+61",  label: "🇦🇺 +61" },
  { code: "CN", dial: "+86",  label: "🇨🇳 +86" },
  { code: "RU", dial: "+7",   label: "🇷🇺 +7" },
];

export function Step6Customer() {
  const store = useBookingStore();
  const { nextStep } = store;

  const canContinue = !!(store.customerName.trim() && store.customerPhone.trim());

  function set(field: keyof typeof store, value: string) {
    (store.setField as any)(field, value);
  }

  return (
    <StepShell
      title="Your details"
      subtitle="We'll send your booking confirmation to these details."
      onNext={nextStep}
      nextDisabled={!canContinue}
    >
      <div className="space-y-4">
        {/* Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-white/50">Full name *</label>
          <input
            value={store.customerName}
            onChange={(e) => set("customerName", e.target.value)}
            placeholder="As on your ID"
            className={inputCls}
          />
        </div>

        {/* Phone */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-white/50">Phone number *</label>
          <div className="flex gap-2">
            <select
              value={store.customerPhoneCountry}
              onChange={(e) => set("customerPhoneCountry", e.target.value)}
              className={cn(inputCls, "w-32 flex-shrink-0 appearance-none")}
            >
              {COUNTRY_CODES.map((c) => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
            <input
              value={store.customerPhone}
              onChange={(e) => set("customerPhone", e.target.value)}
              placeholder="7XX XXXX"
              type="tel"
              className={cn(inputCls, "flex-1")}
            />
          </div>
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-white/50">Email address</label>
          <input
            type="email"
            value={store.customerEmail}
            onChange={(e) => set("customerEmail", e.target.value)}
            placeholder="you@example.com"
            className={inputCls}
          />
          <p className="text-white/25 text-xs">Confirmation will be sent here</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {/* Nationality */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/50">Nationality</label>
            <input
              value={store.customerNationality}
              onChange={(e) => set("customerNationality", e.target.value)}
              placeholder="e.g. British"
              className={inputCls}
            />
            <p className="text-white/25 text-xs">Maldivian residents qualify for local pricing</p>
          </div>

          {/* Hotel */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/50">Hotel / guesthouse</label>
            <input
              value={store.customerHotel}
              onChange={(e) => set("customerHotel", e.target.value)}
              placeholder="Where you're staying"
              className={inputCls}
            />
          </div>
        </div>
      </div>
    </StepShell>
  );
}
