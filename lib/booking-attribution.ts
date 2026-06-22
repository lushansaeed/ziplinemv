import { Prisma, type Agent, type AgentRate, type BookingSource, type Customer } from "@prisma/client";
import { calculateRideTotal, type CustomerType, type RidePricingConfig } from "@/lib/pricing";

type DbLike = {
  // Prisma delegates have deeply generic call signatures; these helpers only need the method names.
  agent: { findFirst: (args?: any) => Promise<unknown> };
  customer: {
    findFirst: (args?: any) => Promise<unknown>;
    create: (args: any) => Promise<unknown>;
    update: (args: any) => Promise<unknown>;
  };
  commission: { create: (args: any) => Promise<unknown> };
};

type RiderMix = {
  adults: number;
  children: number;
};

type CustomerInput = {
  name: string;
  phone: string;
  email?: string | null;
  nationality?: string | null;
  isTourist: boolean;
};

export type BookingAttribution = {
  source: BookingSource;
  agentId?: string | null;
  affiliateId?: string | null;
  affiliateCodeId?: string | null;
};

export async function findActiveAgentForUser(db: DbLike, userId: string | null | undefined) {
  if (!userId) return null;

  return db.agent.findFirst({
    where: {
      userId,
      isApproved: true,
      isSuspended: false,
      user: { isActive: true }
    },
    include: { rates: true }
  }) as Promise<(Agent & { rates: AgentRate[] }) | null>;
}

export async function upsertAttributedCustomer(db: DbLike, input: CustomerInput, attribution: BookingAttribution) {
  const existing = await db.customer.findFirst({
    where: {
      OR: [
        { phone: input.phone },
        ...(input.email ? [{ email: input.email }] : [])
      ]
    },
    orderBy: { createdAt: "desc" }
  }) as Customer | null;

  const data = {
    name: input.name,
    phone: input.phone,
    email: input.email || null,
    nationality: input.nationality || null,
    isTourist: input.isTourist,
    source: attribution.source,
    agentId: attribution.agentId ?? null,
    affiliateId: attribution.affiliateId ?? null,
    affiliateCodeId: attribution.affiliateCodeId ?? null
  };

  if (existing) {
    return db.customer.update({
      where: { id: existing.id },
      data
    }) as Promise<Customer>;
  }

  return db.customer.create({ data }) as Promise<Customer>;
}

export function calculateBookingPrice({
  customerType,
  riders,
  addOnUsdTotal,
  hasCoupon,
  pricing,
  agent
}: {
  customerType: CustomerType;
  riders: RiderMix;
  addOnUsdTotal: number;
  hasCoupon: boolean;
  pricing: RidePricingConfig;
  agent?: (Agent & { rates: AgentRate[] }) | null;
}) {
  if (!agent) {
    return calculateRideTotal(customerType, riders, addOnUsdTotal, hasCoupon, pricing);
  }

  const currency = customerType === "tourist" ? "USD" : "MVR";
  const adultRate = findAgentRate(agent.rates, agentRateName(customerType, "adult"));
  const childRate = findAgentRate(agent.rates, agentRateName(customerType, "child"));
  const fallback = calculateRideTotal(customerType, riders, addOnUsdTotal, false, pricing);
  const adultPrice = adultRate && adultRate.currency === currency ? Number(adultRate.price) : fallback.adultPrice;
  const childPrice = childRate && childRate.currency === currency ? Number(childRate.price) : fallback.childPrice;
  const addOnTotal = currency === "USD" ? addOnUsdTotal : addOnUsdTotal * pricing.exchangeRateMvrPerUsd;
  const subtotal = riders.adults * adultPrice + riders.children * childPrice + addOnTotal;

  return {
    currency,
    subtotal,
    adultPrice,
    childPrice,
    exchangeRate: pricing.exchangeRateMvrPerUsd,
    discount: 0,
    total: subtotal
  };
}

export function commissionForAgent(totalAmount: Prisma.Decimal | number, agent: Pick<Agent, "commissionPercent"> | null | undefined) {
  if (!agent) return null;
  const amount = Number(totalAmount);
  const percent = Number(agent.commissionPercent);
  if (!Number.isFinite(amount) || !Number.isFinite(percent) || amount <= 0 || percent <= 0) return null;
  return new Prisma.Decimal((amount * percent) / 100);
}

export async function createAgentCommission(
  db: DbLike,
  booking: { id: string; agentId: string | null; currency: string; totalAmount: Prisma.Decimal | number },
  agent: Pick<Agent, "commissionPercent"> | null | undefined
) {
  if (!booking.agentId) return;
  const amount = commissionForAgent(booking.totalAmount, agent);
  if (!amount) return;

  await db.commission.create({
    data: {
      bookingId: booking.id,
      agentId: booking.agentId,
      amount,
      currency: booking.currency,
      status: "PENDING"
    }
  });
}

export function sourceLabel(source: BookingSource) {
  return {
    DIRECT_BOOKING: "Direct Booking",
    WALK_IN: "Walk-In",
    AGENT: "Agent",
    AFFILIATE: "Affiliate"
  }[source];
}

function findAgentRate(rates: AgentRate[], name: string) {
  return rates.find((rate) => rate.name === name && isRateActive(rate));
}

function agentRateName(customerType: CustomerType, rider: "adult" | "child") {
  if (customerType === "tourist") return rider === "adult" ? "Tourist Adult Agent Rate" : "Tourist Kid Agent Rate";
  if (customerType === "maafushi") return rider === "adult" ? "Maafushi Resident Agent Rate" : "Maafushi Kid Agent Rate";
  return rider === "adult" ? "Local Adult Agent Rate" : "Local Kid Agent Rate";
}

function isRateActive(rate: AgentRate) {
  const now = new Date();
  if (rate.validFrom && rate.validFrom > now) return false;
  if (rate.validTo && rate.validTo < now) return false;
  return true;
}
