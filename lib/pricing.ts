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
  exchangeRateMvrPerUsd: 20,
  affiliateDiscountPercent: 10
};

export function calculateRideTotal(customerType: CustomerType, riders: RiderMix, addOnUsdTotal: number, hasCoupon: boolean) {
  const base =
    customerType === "tourist"
      ? riders.adults * defaultPricing.touristAdultUsd + riders.children * defaultPricing.touristChildUsd + addOnUsdTotal
      : riders.adults * defaultPricing.localAdultMvr +
        riders.children * defaultPricing.localChildMvr +
        addOnUsdTotal * defaultPricing.exchangeRateMvrPerUsd;

  const discount = hasCoupon ? base * (defaultPricing.affiliateDiscountPercent / 100) : 0;
  return {
    currency: customerType === "tourist" ? "USD" : "MVR",
    subtotal: base,
    discount,
    total: Math.max(base - discount, 0)
  };
}

export function bookingReference() {
  const date = new Date();
  const stamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  return `ZMV-${stamp}-${Math.floor(1000 + Math.random() * 9000)}`;
}
