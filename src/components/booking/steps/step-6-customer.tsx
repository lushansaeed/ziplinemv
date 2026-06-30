"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, ChevronDown, Search, X, AlertTriangle, Check } from "lucide-react";
import { useBookingStore } from "@/lib/booking/store";
import { StepShell } from "../step-shell";
import { cn } from "@/lib/utils";
import {
  COUNTRIES, DEFAULT_COUNTRY, searchCountries, searchNationalities,
  type Country,
} from "@/lib/booking/countries";
import {
  validateEmail, getEmailSuggestions, getTypoSuggestion, normalizeEmail,
} from "@/lib/booking/email-utils";

const inputCls = cn(
  "w-full rounded-xl px-4 py-3 text-sm bg-white/5 border border-white/10",
  "text-white placeholder:text-white/25",
  "focus:outline-none focus:ring-2 focus:ring-brand-citrus/40 focus:border-brand-citrus/30",
  "transition-all duration-150"
);

// ─── Searchable country / nationality selector ────────────────────────────────

interface SelectorProps {
  value:       string;
  onChange:    (country: Country) => void;
  mode:        "phone" | "nationality";
  placeholder: string;
  error?:      string;
}

function CountrySelector({ value, onChange, mode, placeholder, error }: SelectorProps) {
  const [open, setOpen]         = useState(false);
  const [query, setQuery]       = useState("");
  const [openUp, setOpenUp]     = useState(false);
  const ref                     = useRef<HTMLDivElement>(null);
  const searchRef               = useRef<HTMLInputElement>(null);

  const results = mode === "phone"
    ? searchCountries(query)
    : searchNationalities(query);

  const displayValue = mode === "phone"
    ? (() => {
        const c = COUNTRIES.find((x) => x.iso === value);
        return c ? `${c.flag} ${c.dialCode}` : placeholder;
      })()
    : (() => {
        const c = COUNTRIES.find((x) => x.iso === value);
        return c ? `${c.flag} ${c.nationality}` : placeholder;
      })();

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50);
  }, [open]);

  function toggleOpen() {
    if (!open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const roomBelow = window.innerHeight - rect.bottom;
      const roomAbove = rect.top;
      setOpenUp(roomBelow < 280 && roomAbove > roomBelow);
    }
    setOpen((current) => !current);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        className={cn(
          "w-full flex items-center justify-between gap-2",
          "rounded-xl px-4 py-3 text-sm bg-white/5 border",
          "focus:outline-none focus:ring-2 focus:ring-brand-citrus/40 transition-all",
          error ? "border-red-500/50" : open ? "border-brand-citrus/40" : "border-white/10",
          value ? "text-white" : "text-white/30"
        )}
      >
        <span>{displayValue}</span>
        <ChevronDown className={cn("w-4 h-4 text-white/30 flex-shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div
          className={cn(
            "absolute left-0 right-0 z-[80] overflow-hidden rounded-xl border border-brand-citrus/25 bg-white text-brand-deep shadow-2xl ring-1 ring-black/5",
            openUp ? "bottom-full mb-1" : "top-full mt-1"
          )}
        >
          {/* Search */}
          <div className="p-2 border-b border-brand-citrus/15">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={mode === "phone" ? "Search country or +code…" : "Search nationality…"}
                className="w-full pl-8 pr-8 py-2 text-sm rounded-lg border border-border bg-white text-brand-deep placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-citrus/30"
              />
              {query && (
                <button onClick={() => setQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2">
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>
          {/* List */}
          <div className="max-h-64 overflow-y-auto no-scrollbar">
            {results.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">No results</p>
            ) : results.map((c) => (
              <button
                key={c.iso}
                type="button"
                onClick={() => { onChange(c); setOpen(false); setQuery(""); }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left text-brand-deep hover:bg-brand-citrus/10 transition-colors",
                  value === c.iso && "bg-brand-citrus/15 text-brand-citrus"
                )}
              >
                <span className="text-lg flex-shrink-0">{c.flag}</span>
                <span className="flex-1 truncate">
                  {mode === "phone" ? c.name : c.nationality}
                </span>
                <span className="text-muted-foreground flex-shrink-0 text-xs font-mono">
                  {mode === "phone" ? c.dialCode : c.iso}
                </span>
                {value === c.iso && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-red-400 text-xs mt-1.5">{error}</p>}
    </div>
  );
}

// ─── Email field with suggestions + typo detection ───────────────────────────

function EmailField({
  value, onChange, error, onError,
}: {
  value: string; onChange: (v: string) => void; error: string | null; onError: (e: string | null) => void;
}) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [typeSuggestion, setTypoSuggestion] = useState<string | null>(null);
  const [touched, setTouched]         = useState(false);

  function handleChange(v: string) {
    onChange(v);
    setSuggestions(getEmailSuggestions(v));
    setTypoSuggestion(null);
    if (touched) onError(validateEmail(v));
  }

  function handleBlur() {
    setTouched(true);
    setSuggestions([]);
    const normalized = normalizeEmail(value);
    onChange(normalized);
    onError(validateEmail(normalized));
    const typo = getTypoSuggestion(normalized);
    setTypoSuggestion(typo);
  }

  function applySuggestion(s: string) {
    onChange(s);
    setSuggestions([]);
    setTypoSuggestion(null);
    onError(validateEmail(s));
  }

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-white/50">Email address *</label>
      <div className="relative">
        <input
          type="email"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          placeholder="you@example.com"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className={cn(inputCls, error && touched && "border-red-500/50 focus:ring-red-500/30")}
        />

        {/* Domain suggestions dropdown */}
        {suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 z-40 bg-brand-deep border border-white/15 rounded-xl shadow-xl overflow-hidden">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); applySuggestion(s); }}
                className="w-full text-left px-4 py-2.5 text-sm text-white/80 hover:bg-white/5 hover:text-white transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Validation error */}
      {error && touched && <p className="text-red-400 text-xs">{error}</p>}

      {/* Typo warning */}
      {typeSuggestion && !error && (
        <div className="flex items-center gap-2 text-xs text-brand-mango">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Did you mean{" "}
            <button
              type="button"
              onClick={() => applySuggestion(typeSuggestion)}
              className="font-semibold underline underline-offset-2 hover:text-white transition-colors"
            >
              {typeSuggestion}
            </button>?
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Main Step 6 component ────────────────────────────────────────────────────

export function Step6Customer() {
  const store = useBookingStore();
  const {
    customerName, customerPhone, customerPhoneCountry, customerPhoneDialCode,
    customerEmail, customerNationality, customerNationalityIso, customerHotel,
    setField, nextStep,
  } = store;

  const [emailError, setEmailError] = useState<string | null>(null);
  const [errors, setErrors]         = useState<Record<string, string>>({});
  const [phoneTouched, setPhoneTouched] = useState(false);

  const selectedCountry = COUNTRIES.find((c) => c.iso === customerPhoneCountry) ?? DEFAULT_COUNTRY ?? COUNTRIES[0];

  function setCountry(c: Country) {
    setField("customerPhoneCountry",  c.iso);
    setField("customerPhoneDialCode", c.dialCode);
    updateFullPhone(c.dialCode, customerPhone);
  }

  function updateFullPhone(dialCode: string, local: string) {
    setField("customerPhoneFull", local ? `${dialCode}${local}` : "");
  }

  function handlePhoneInput(raw: string) {
    const digits = raw.replace(/\D/g, "");  // strip non-digits
    setField("customerPhone", digits);
    updateFullPhone(selectedCountry.dialCode, digits);
    if (phoneTouched) validatePhone(digits);
  }

  function validatePhone(digits = customerPhone): string | null {
    const [min, max] = selectedCountry.phoneDigits;
    if (!digits) return "Phone number is required.";
    if (digits.length < min) return `Phone number must be at least ${min} digits.`;
    if (digits.length > max) return `Phone number must be at most ${max} digits.`;
    return null;
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!customerName.trim())        errs.name        = "Full name is required.";
    if (!customerPhone.trim())       errs.phone       = "Phone number is required.";
    else { const e = validatePhone(); if (e) errs.phone = e; }
    const emailErr = validateEmail(customerEmail);
    if (emailErr)                    errs.email       = emailErr;
    if (!customerNationalityIso)     errs.nationality = "Please select your nationality.";
    if (!customerHotel.trim())       errs.hotel       = "Hotel or guesthouse name is required.";
    setErrors(errs);
    return Object.keys(errs).length === 0 && !emailErr;
  }

  function handleContinue() {
    if (validate()) nextStep();
  }

  const isComplete =
    !!customerName.trim() &&
    !!customerPhone.trim() &&
    !validatePhone() &&
    !validateEmail(customerEmail) &&
    !!customerNationalityIso &&
    !!customerHotel.trim();

  return (
    <StepShell
      title="Your details"
      subtitle="We'll send your booking confirmation to these details."
      onNext={handleContinue}
      nextDisabled={!isComplete}
    >
      <div className="space-y-4">
        {/* Full name */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-white/50">Full name *</label>
          <input
            value={customerName}
            onChange={(e) => setField("customerName", e.target.value)}
            onBlur={() => {
              if (!customerName.trim()) setErrors((p) => ({ ...p, name: "Full name is required." }));
              else setErrors((p) => { const n = { ...p }; delete n.name; return n; });
            }}
            placeholder="As on your ID"
            className={cn(inputCls, errors.name && "border-red-500/50")}
          />
          {errors.name && <p className="text-red-400 text-xs">{errors.name}</p>}
        </div>

        {/* Email */}
        <EmailField
          value={customerEmail}
          onChange={(v) => setField("customerEmail", v)}
          error={emailError}
          onError={setEmailError}
        />

        {/* Phone number */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-white/50">WhatsApp number *</label>
          <div className="flex gap-2">
            {/* Country code picker */}
            <div className="w-36 flex-shrink-0">
              <CountrySelector
                value={customerPhoneCountry}
                onChange={setCountry}
                mode="phone"
                placeholder="Code"
                error={undefined}
              />
            </div>
            {/* Local number */}
            <input
              value={customerPhone}
              onChange={(e) => handlePhoneInput(e.target.value)}
              onBlur={() => {
                setPhoneTouched(true);
                const e = validatePhone();
                if (e) setErrors((p) => ({ ...p, phone: e }));
                else setErrors((p) => { const n = { ...p }; delete n.phone; return n; });
              }}
              placeholder="7777777"
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              className={cn(inputCls, "flex-1", errors.phone && phoneTouched && "border-red-500/50")}
            />
          </div>
          {errors.phone && phoneTouched && <p className="text-red-400 text-xs">{errors.phone}</p>}

          {/* WhatsApp notice */}
          <div className="flex items-start gap-2 mt-1.5 px-3 py-2.5 rounded-xl bg-[#25D366]/8 border border-[#25D366]/20">
            <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#25D366]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
            </svg>
            <p className="text-[#25D366]/90 text-xs leading-relaxed">
              Please enter your correct WhatsApp number. Booking updates and media files will be delivered through WhatsApp.
            </p>
          </div>
        </div>

        {/* Nationality + Hotel in same row */}
        <div className="grid sm:grid-cols-2 gap-4">
          {/* Nationality */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/50">Nationality *</label>
            <CountrySelector
              value={customerNationalityIso}
              onChange={(c) => {
                setField("customerNationality",    c.nationality);
                setField("customerNationalityIso", c.iso);
                setErrors((p) => { const n = { ...p }; delete n.nationality; return n; });
              }}
              mode="nationality"
              placeholder="Select nationality"
              error={errors.nationality}
            />
            <p className="text-white/25 text-[11px]">Maldivians may qualify for local pricing.</p>
          </div>

          {/* Hotel */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/50">Hotel / guesthouse *</label>
            <input
              value={customerHotel}
              onChange={(e) => setField("customerHotel", e.target.value)}
              onBlur={() => {
                if (!customerHotel.trim()) setErrors((p) => ({ ...p, hotel: "Hotel or guesthouse is required." }));
                else setErrors((p) => { const n = { ...p }; delete n.hotel; return n; });
              }}
              placeholder="Where you're staying"
              className={cn(inputCls, errors.hotel && "border-red-500/50")}
            />
            {errors.hotel && <p className="text-red-400 text-xs">{errors.hotel}</p>}
          </div>
        </div>
      </div>
    </StepShell>
  );
}
