import { prisma } from "@/lib/prisma/client";

export interface PriceInput {
  packageId:        string;
  addOnIds:         string[];
  addOnQuantities?: Record<string, number>; // addOnId → qty; defaults to numRiders if not set
  numRiders:        number;
  date:             string;
  riderType?:       "tourist" | "local";   // explicit — takes priority over nationality
  nationality?:     string;               // fallback: "MV" → local price
  agentId?:         string;
  promoCode?:       string;
  affiliateCouponCode?: string;
}

export interface PriceResult {
  basePrice:      number;   // package price × riders
  addOnsTotal:    number;
  subtotal:       number;
  discountAmount: number;
  discountLabel:  string;
  total:          number;
  currency:       string;
  promoCodeValid: boolean;
  lines: Array<{ label: string; amount: number; type: string }>;
}

export async function calculatePrice(input: PriceInput): Promise<PriceResult> {
  const [pkg, addOns, promoRecord, affiliateCoupon] = await Promise.all([
    prisma.package.findUnique({
      where: { id: input.packageId },
      select: { touristPrice: true, localPrice: true, localPriceMvr: true, currency: true, name: true },
    }),
    input.addOnIds.length > 0
      ? prisma.addOn.findMany({ where: { id: { in: input.addOnIds } }, select: { id: true, name: true, price: true, localPriceMvr: true } })
      : Promise.resolve([]),
    input.promoCode
      ? prisma.promoCode.findFirst({
          where: { code: input.promoCode.toUpperCase(), active: true },
        })
      : Promise.resolve(null),
    input.affiliateCouponCode
      ? prisma.affiliateCoupon.findFirst({
          where: { code: input.affiliateCouponCode.toUpperCase(), status: "APPROVED" },
        })
      : Promise.resolve(null),
  ]);

  if (!pkg) throw new Error("Package not found");

  // Local pricing: explicit riderType takes priority; fallback to nationality === MV
  const isLocal    = input.riderType === "local" || (input.riderType === undefined && input.nationality?.toUpperCase() === "MV");
  const currency   = isLocal ? "MVR" : (pkg.currency ?? "USD");

  // Package unit price
  const unitPrice = isLocal && pkg.localPriceMvr
    ? Number(pkg.localPriceMvr)
    : isLocal && pkg.localPrice
    ? Number(pkg.localPrice)       // legacy fallback
    : Number(pkg.touristPrice);

  const basePrice  = unitPrice * input.numRiders;
  const addOnsTotal = addOns.reduce((sum, a) => {
    const qty = input.addOnQuantities?.[a.id] ?? input.numRiders;
    // Use MVR add-on price for locals if available, otherwise USD
    const addonPrice = isLocal && (a as any).localPriceMvr
      ? Number((a as any).localPriceMvr)
      : Number(a.price);
    return sum + addonPrice * qty;
  }, 0);
  const subtotal    = basePrice + addOnsTotal;

  // Discount resolution: promo > affiliate coupon
  let discountAmount = 0;
  let discountLabel  = "";
  let promoCodeValid = false;

  const activePromo = promoRecord ?? affiliateCoupon;
  if (activePromo) {
    const isExpired = activePromo.validTo && new Date(activePromo.validTo) < new Date();
    const maxReached = activePromo.maxUses != null && activePromo.usedCount >= activePromo.maxUses;

    if (!isExpired && !maxReached) {
      if (activePromo.discountType === "PERCENTAGE") {
        discountAmount = (subtotal * Number(activePromo.discountValue)) / 100;
        discountLabel  = `${activePromo.discountValue}% off`;
      } else {
        discountAmount = Math.min(Number(activePromo.discountValue), subtotal);
        discountLabel  = `$${activePromo.discountValue} off`;
      }
      promoCodeValid = true;
    }
  }

  const total = Math.max(0, subtotal - discountAmount);

  // Line items
  const lines: PriceResult["lines"] = [
    { label: `${pkg.name} × ${input.numRiders}`, amount: basePrice, type: "base" },
    ...addOns.map((a) => {
      const qty = input.addOnQuantities?.[a.id] ?? input.numRiders;
      const addonPrice = isLocal && (a as any).localPriceMvr
        ? Number((a as any).localPriceMvr)
        : Number(a.price);
      return {
        label:  `${a.name} × ${qty}`,
        amount: addonPrice * qty,
        type:   "addon" as const,
      };
    }),
  ];
  if (discountAmount > 0) {
    lines.push({ label: discountLabel, amount: -discountAmount, type: "discount" });
  }

  return { basePrice, addOnsTotal, subtotal, discountAmount, discountLabel, total, currency, promoCodeValid, lines };
}
