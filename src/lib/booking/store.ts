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
  // Step 5
  addOnIds: string[];
  addOnNames: Record<string, string>;
  addOnPrices: Record<string, number>;
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
}

const INITIAL: BookingState = {
  date: "", slotId: "", slotTime: "", numRiders: 1,
  packageId: "", packageName: "", packagePrice: 0,
  addOnIds: [], addOnNames: {}, addOnPrices: {},
  customerName: "", customerPhone: "", customerPhoneCountry: "MV",
  customerEmail: "", customerNationality: "", customerHotel: "",
  riders: [{ name: "", age: "", weight: "" }],
  waiverAccepted: false, termsAccepted: false, refundAccepted: false, safetyAccepted: false,
  paymentMethod: "", promoCode: "", promoDiscount: 0,
  affiliateCoupon: "", affiliateLinkId: "",
  bookingReference: "", bookingId: "", totalAmount: 0, currency: "USD", qrCode: "",
  currentStep: 1,
};

interface BookingActions {
  setField: <K extends keyof BookingState>(key: K, value: BookingState[K]) => void;
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  reset: () => void;
  syncRiders: (count: number) => void;
  toggleAddOn: (id: string, name: string, price: number) => void;
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
          if (has) { delete names[id]; delete prices[id]; }
          else { names[id] = name; prices[id] = price; }
          return { addOnIds: ids, addOnNames: names, addOnPrices: prices };
        }),
    }),
    {
      name: "zipline-booking",
      partialize: (state) => ({
        // Only persist non-sensitive fields across page refreshes
        date: state.date, slotId: state.slotId, slotTime: state.slotTime,
        numRiders: state.numRiders, packageId: state.packageId,
        packageName: state.packageName, packagePrice: state.packagePrice,
        addOnIds: state.addOnIds, addOnNames: state.addOnNames, addOnPrices: state.addOnPrices,
        affiliateCoupon: state.affiliateCoupon, affiliateLinkId: state.affiliateLinkId,
        currentStep: state.currentStep,
      }),
    }
  )
);
