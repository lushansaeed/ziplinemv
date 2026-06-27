import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface RiderInput {
  name: string;
  age: string;
  weight: string;
}

export interface BookingState {
  // Step 1
  date: string;
  // Step 2
  slotId: string;
  slotTime: string;
  // Step 3
  numRiders: number;
  riderType: "tourist" | "local";
  // Step 4
  packageId: string;
  packageName: string;
  packagePrice: number;
  // Step 5 — quantities keyed by addOnId (0 = not selected)
  addOnIds: string[];               // selected addOnIds (qty > 0)
  addOnNames: Record<string, string>;
  addOnPrices: Record<string, number>;
  addOnQuantities: Record<string, number>; // addOnId → qty (0..numRiders)
  // Step 6 — customer
  customerName:            string;
  customerPhone:           string;   // local digits only e.g. "7777777"
  customerPhoneCountry:    string;   // ISO e.g. "MV"
  customerPhoneDialCode:   string;   // e.g. "+960"
  customerPhoneFull:       string;   // full number e.g. "+9607777777"
  customerEmail:           string;
  customerNationality:     string;   // "Maldivian"
  customerNationalityIso:  string;   // "MV"
  customerHotel:           string;
  // Step 7 — riders
  riders: RiderInput[];
  // Step 8 — waiver (individual per rider + global policies)
  riderWaivers: boolean[];      // one entry per rider — each must be true
  termsAccepted: boolean;
  refundAccepted: boolean;
  safetyAccepted: boolean;
  waiverAccepted: boolean;      // kept for legacy compatibility
  // Step 9 — payment
  paymentMethod: string;
  transferSlipUrl: string;
  transferSlipPath: string;
  transferSlipFileName: string;
  promoCode: string;
  promoDiscount: number;
  // Tracking
  affiliateCoupon: string;
  affiliateLinkId: string;
  // Result
  bookingReference: string;
  bookingId: string;
  totalAmount: number;
  currency: string;
  qrCode: string;
  waiverShare: {
    url: string;
    qrCode: string;
    maxSubmissions: number;
    currentSubmissions: number;
    status: string;
  } | null;
  // UI
  currentStep: number;
  // Registered by StepShell so sidebar/sticky bar can mirror the Continue button
  stepContinueDisabled: boolean;
  stepContinueFn: (() => void) | null;
  stepContinueLabel: string;
}

const INITIAL: BookingState = {
  date: "", slotId: "", slotTime: "", numRiders: 1, riderType: "tourist",
  packageId: "", packageName: "", packagePrice: 0,
  addOnIds: [], addOnNames: {}, addOnPrices: {}, addOnQuantities: {},
  customerName: "", customerPhone: "", customerPhoneCountry: "MV",
  customerPhoneDialCode: "+960", customerPhoneFull: "",
  customerEmail: "", customerNationality: "", customerNationalityIso: "", customerHotel: "",
  riders: [{ name: "", age: "", weight: "" }],
  riderWaivers: [], waiverAccepted: false, termsAccepted: false, refundAccepted: false, safetyAccepted: false,
  paymentMethod: "", transferSlipUrl: "", transferSlipPath: "", transferSlipFileName: "", promoCode: "", promoDiscount: 0,
  affiliateCoupon: "", affiliateLinkId: "",
  bookingReference: "", bookingId: "", totalAmount: 0, currency: "USD", qrCode: "", waiverShare: null,
  currentStep: 1,
  stepContinueDisabled: true,
  stepContinueFn: null,
  stepContinueLabel: "Continue",
};

interface BookingActions {
  setField: <K extends keyof BookingState>(key: K, value: BookingState[K]) => void;
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  reset: () => void;
  syncRiders: (count: number) => void;
  toggleAddOn: (id: string, name: string, price: number) => void;
  setAddOnQty: (id: string, name: string, price: number, qty: number) => void;
  registerStepContinue: (disabled: boolean, fn: () => void, label?: string) => void;
}

export const useBookingStore = create<BookingState & BookingActions>()(
  persist(
    (set, get) => ({
      ...INITIAL,

      setField: (key, value) => set({ [key]: value } as any),

      setStep: (step) => set({ currentStep: step }),

      nextStep: () => set((s) => ({ currentStep: Math.min(s.currentStep + 1, 8) })),

      prevStep: () => set((s) => ({ currentStep: Math.max(s.currentStep - 1, 1) })),

      reset: () => set(INITIAL),

      syncRiders: (count) =>
        set((s) => {
          const current = s.riders;
          const waivers = s.riderWaivers;
          if (count > current.length) {
            const extra        = Array(count - current.length).fill({ name: "", age: "", weight: "" });
            const extraWaivers = Array(count - waivers.length).fill(false);
            return { riders: [...current, ...extra], numRiders: count, riderWaivers: [...waivers, ...extraWaivers] };
          }
          return { riders: current.slice(0, count), numRiders: count, riderWaivers: waivers.slice(0, count) };
        }),

      toggleAddOn: (id, name, price) =>
        set((s) => {
          const has = s.addOnIds.includes(id);
          const ids   = has ? s.addOnIds.filter((x) => x !== id) : [...s.addOnIds, id];
          const names = { ...s.addOnNames };
          const prices = { ...s.addOnPrices };
          const quantities = { ...s.addOnQuantities };
          if (has) { delete names[id]; delete prices[id]; delete quantities[id]; }
          else { names[id] = name; prices[id] = price; quantities[id] = s.numRiders; }
          return { addOnIds: ids, addOnNames: names, addOnPrices: prices, addOnQuantities: quantities };
        }),

      setAddOnQty: (id, name, price, qty) =>
        set((s) => {
          const names      = { ...s.addOnNames };
          const prices     = { ...s.addOnPrices };
          const quantities = { ...s.addOnQuantities };
          if (qty <= 0) {
            // Remove from selection
            delete names[id]; delete prices[id]; delete quantities[id];
            return { addOnIds: s.addOnIds.filter((x) => x !== id), addOnNames: names, addOnPrices: prices, addOnQuantities: quantities };
          }
          // Add/update
          const capped = Math.min(qty, s.numRiders);
          names[id] = name; prices[id] = price; quantities[id] = capped;
          const ids = s.addOnIds.includes(id) ? s.addOnIds : [...s.addOnIds, id];
          return { addOnIds: ids, addOnNames: names, addOnPrices: prices, addOnQuantities: quantities };
        }),

      registerStepContinue: (disabled, fn, label = "Continue") =>
        set({ stepContinueDisabled: disabled, stepContinueFn: fn, stepContinueLabel: label }),
    }),
    {
      name: "zipline-booking",
      version: 4, // bump when store shape changes to clear stale persisted state
      partialize: (state) => ({
        date: state.date, slotId: state.slotId, slotTime: state.slotTime,
        numRiders: state.numRiders, packageId: state.packageId,
        packageName: state.packageName, packagePrice: state.packagePrice,
        addOnIds: state.addOnIds, addOnNames: state.addOnNames,
        addOnPrices: state.addOnPrices, addOnQuantities: state.addOnQuantities,
        affiliateCoupon: state.affiliateCoupon, affiliateLinkId: state.affiliateLinkId,
        currentStep: state.currentStep,
      }),
    }
  )
);
