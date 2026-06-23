import { prisma } from "@/lib/prisma/client";

export interface PriceInput {
  packageId: string;
  addOnIds:  string[];
  numRiders: number;
  date:      string;
  nationality?: string;       // "MV" for local pricing
  agentId?:     string;
  promoCode?:   string;
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
      select: { touristPrice: true, localPrice: true, currency: true, name: true },
    }),
    input.addOnIds.length > 0
      ? prisma.addOn.findMany({ where: { id: { in: input.addOnIds } }, select: { id: true, name: true, price: true } })
      : Promise.resolve([]),
    input.promoCode
      ? prisma.promoCode.findFirst({
          where: { code: input.promoCode.toUpperCase(), active: true },
        })
      : Promise.resolve(null),
    input.affiliateCouponCode
      ? prisma.affiliateCoupon.findFirst({
          where: { code: input.affiliateCouponCode.toUpperCase(), status: "APPROVED", active: true },
        })
      : Promise.resolve(null),
  ]);

  if (!pkg) throw new Error("Package not found");

  const currency = pkg.currency ?? "USD";

  // Determine per-rider price
  const isMaldivian = input.nationality?.toUpperCase() === "MV";
  const unitPrice = (isMaldivian && pkg.localPrice)
    ? Number(pkg.localPrice)
    : Number(pkg.touristPrice);

  const basePrice  = unitPrice * input.numRiders;
  const addOnsTotal = addOns.reduce((sum, a) => sum + Number(a.price) * input.numRiders, 0);
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
    ...addOns.map((a) => ({
      label:  `${a.name} × ${input.numRiders}`,
      amount: Number(a.price) * input.numRiders,
      type:   "addon",
    })),
  ];
  if (discountAmount > 0) {
    lines.push({ label: discountLabel, amount: -discountAmount, type: "discount" });
  }

  return { basePrice, addOnsTotal, subtotal, discountAmount, discountLabel, total, currency, promoCodeValid, lines };
}
