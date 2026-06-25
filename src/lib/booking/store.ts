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
  customerName: string;
  customerPhone: string;
  customerPhoneCountry: string;
  customerEmail: string;
  customerNationality: string;
  customerHotel: string;
  // Step 7 — riders
  riders: RiderInput[];
  // Step 8 — waiver
  waiverAccepted: boolean;
  termsAccepted: boolean;
  refundAccepted: boolean;
  safetyAccepted: boolean;
  // Step 9 — payment
  paymentMethod: string;
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
  // UI
  currentStep: number;
  // Registered by StepShell so sidebar/sticky bar can mirror the Continue button
  stepContinueDisabled: boolean;
  stepContinueFn: (() => void) | null;
  stepContinueLabel: string;
}

const INITIAL: BookingState = {
  date: "", slotId: "", slotTime: "", numRiders: 1,
  packageId: "", packageName: "", packagePrice: 0,
  addOnIds: [], addOnNames: {}, addOnPrices: {}, addOnQuantities: {},
  customerName: "", customerPhone: "", customerPhoneCountry: "MV",
  customerEmail: "", customerNationality: "", customerHotel: "",
  riders: [{ name: "", age: "", weight: "" }],
  waiverAccepted: false, termsAccepted: false, refundAccepted: false, safetyAccepted: false,
  paymentMethod: "", promoCode: "", promoDiscount: 0,
  affiliateCoupon: "", affiliateLinkId: "",
  bookingReference: "", bookingId: "", totalAmount: 0, currency: "USD", qrCode: "",
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

      nextStep: () => set((s) => ({ currentStep: Math.min(s.currentStep + 1, 10) })),

      prevStep: () => set((s) => ({ currentStep: Math.max(s.currentStep - 1, 1) })),

      reset: () => set(INITIAL),

      syncRiders: (count) =>
        set((s) => {
          const current = s.riders;
          if (count > current.length) {
            const extra = Array(count - current.length).fill({ name: "", age: "", weight: "" });
            return { riders: [...current, ...extra], numRiders: count };
          }
          return { riders: current.slice(0, count), numRiders: count };
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
      partialize: (state) => ({
        // Only persist non-sensitive fields across page refreshes
        date: state.date, slotId: state.slotId, slotTime: state.slotTime,
        numRiders: state.numRiders, packageId: state.packageId,
        packageName: state.packageName, packagePrice: state.packagePrice,
        addOnIds: state.addOnIds, addOnNames: state.addOnNames, addOnPrices: state.addOnPrices, addOnQuantities: state.addOnQuantities,
        affiliateCoupon: state.affiliateCoupon, affiliateLinkId: state.affiliateLinkId,
        currentStep: state.currentStep,
      }),
    }
  )
);
