export type CustomerType = "tourist" | "local";
export type RiderMix = {
  adults: number;
  children: number;
};

export const defaultPricing = {
  touristAdultUsd: 50,
  touristChildUsd: 30,
  localAdultMvr: 600,
  localChildMvr: 400,
  defaultCurrency: "USD",
  exchangeRateMvrPerUsd: 20,
  affiliateDiscountPercent: 10
};

export type RidePricingConfig = typeof defaultPricing;

export function calculateRideTotal(customerType: CustomerType, riders: RiderMix, addOnUsdTotal: number, hasCoupon: boolean, pricing: RidePricingConfig = defaultPricing) {
  const base =
    customerType === "tourist"
      ? riders.adults * pricing.touristAdultUsd + riders.children * pricing.touristChildUsd + addOnUsdTotal
      : riders.adults * pricing.localAdultMvr +
        riders.children * pricing.localChildMvr +
        addOnUsdTotal * pricing.exchangeRateMvrPerUsd;

  const discount = hasCoupon ? base * (pricing.affiliateDiscountPercent / 100) : 0;
  return {
    currency: customerType === "tourist" ? "USD" : "MVR",
    subtotal: base,
    adultPrice: customerType === "tourist" ? pricing.touristAdultUsd : pricing.localAdultMvr,
    childPrice: customerType === "tourist" ? pricing.touristChildUsd : pricing.localChildMvr,
    exchangeRate: pricing.exchangeRateMvrPerUsd,
    discount,
    total: Math.max(base - discount, 0)
  };
}

export function bookingReference() {
  const date = new Date();
  const stamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  return `ZMV-${stamp}-${Math.floor(1000 + Math.random() * 9000)}`;
}
