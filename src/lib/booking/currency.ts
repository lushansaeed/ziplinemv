/**
 * Format a price in the correct currency based on rider type.
 * Tourist → USD  |  Local → MVR
 */
export function formatBookingPrice(
  amount: number,
  riderType: "tourist" | "local" = "tourist"
): string {
  if (riderType === "local") {
    return `MVR ${amount.toLocaleString("en-MV", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function getBookingCurrency(riderType: "tourist" | "local"): string {
  return riderType === "local" ? "MVR" : "USD";
}
