import { BookingStatus, OdooSyncStatus, PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import { isOdooSyncEnabled, odooExecuteKw } from "./client";

type OdooId = number;
type OdooCreateLineCommand = [0, 0, Record<string, unknown>];

const BLOCKED_BOOKING_STATUSES = new Set<BookingStatus>([
  BookingStatus.CANCELLED,
  BookingStatus.REFUNDED,
]);

function normalizeOdooId(value: unknown, label: string): OdooId {
  if (typeof value === "number") return value;
  if (Array.isArray(value) && typeof value[0] === "number") return value[0];
  if (value && typeof value === "object" && typeof (value as { id?: unknown }).id === "number") {
    return (value as { id: number }).id;
  }
  throw new Error(`Odoo ${label} create did not return a record id.`);
}

function toNumber(value: unknown) {
  return Number(value ?? 0);
}

function parseProductMap() {
  const raw = process.env.ODOO_PRODUCT_MAP;
  if (!raw) return {};

  try {
    return JSON.parse(raw) as Record<string, number>;
  } catch {
    throw new Error("ODOO_PRODUCT_MAP must be valid JSON.");
  }
}

function productIdFor(key: string) {
  const productMap = parseProductMap();
  const id = Number(productMap[key]);
  if (id > 0) return id;

  if (key === "discount") {
    const discountId = Number(process.env.ODOO_DISCOUNT_PRODUCT_ID);
    if (discountId > 0) return discountId;
  }

  const defaultId = Number(process.env.ODOO_DEFAULT_PRODUCT_ID);
  if (defaultId > 0) return defaultId;

  throw new Error(`ODOO_PRODUCT_MAP is missing a product id for "${key}".`);
}

function addOnProductKey(name: string) {
  const normalized = name.toLowerCase();
  if (normalized.includes("360") || normalized.includes("insta")) return "insta360";
  if (normalized.includes("photo")) return "photography";
  if (normalized.includes("drone")) return "drone";
  return null;
}

async function searchRead<T>(
  model: string,
  domain: unknown[],
  fields: string[],
  limit = 1,
) {
  return odooExecuteKw<T[]>(model, "search_read", [domain], { fields, limit });
}

async function findCurrencyId(currency: string) {
  const existing = await searchRead<{ id: OdooId }>("res.currency", [["name", "=", currency]], ["id"], 1);
  return existing[0]?.id ?? null;
}

function getPricelistId(customerType: string) {
  const envKey = customerType === "LOCAL"
    ? "ODOO_LOCAL_PRICELIST_ID"
    : "ODOO_TOURIST_PRICELIST_ID";
  const id = Number(process.env[envKey]);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`${envKey} must be a numeric Odoo pricelist ID.`);
  }

  return id;
}

async function getBookingForOdoo(bookingId: string) {
  return prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      customer: true,
      package: true,
      slot: true,
      riders: true,
      addOns: { include: { addOn: true } },
      agent: true,
      affiliate: true,
      promoCode: true,
      affiliateCoupon: true,
    },
  });
}

async function findOrCreatePartner(booking: NonNullable<Awaited<ReturnType<typeof getBookingForOdoo>>>) {
  const customer = booking.customer;
  const domain = customer.email
    ? ["|", ["email", "=", customer.email], ["phone", "=", customer.phone]]
    : [["phone", "=", customer.phone]];

  const existing = await searchRead<{ id: OdooId }>("res.partner", domain, ["id"], 1);
  if (existing[0]?.id) return existing[0].id;

  const created = await odooExecuteKw<unknown>("res.partner", "create", [{
    name: customer.name,
    email: customer.email || false,
    phone: customer.phone,
    comment: [
      customer.nationality ? `Nationality: ${customer.nationality}` : null,
      customer.hotel ? `Hotel: ${customer.hotel}` : null,
      `Zipline customer source: ${customer.source}`,
    ].filter(Boolean).join("\n"),
  }]);

  return normalizeOdooId(created, "partner");
}

async function markSkipped(bookingId: string, reason: string) {
  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      odooSyncStatus: OdooSyncStatus.SKIPPED,
      odooSyncError: reason,
    },
  });
  return { synced: false, skipped: true, reason };
}

function buildBookingNotes(booking: NonNullable<Awaited<ReturnType<typeof getBookingForOdoo>>>) {
  return [
    `Zipline booking reference: ${booking.reference}`,
    `Ride date: ${booking.bookingDate.toISOString().slice(0, 10)}`,
    `Ride time: ${booking.slotLabel ?? booking.slot.startTime}`,
    `Riders: ${booking.numRiders}`,
    `Booking status: ${booking.bookingStatus}`,
    `Payment status: ${booking.paymentStatus}`,
    `Payment method: ${booking.paymentMethod ?? "Not selected"}`,
    `Source: ${booking.source}`,
    `Customer type: ${booking.customerType}`,
    booking.customer.nationality ? `Nationality: ${booking.customer.nationality}` : null,
    booking.customer.hotel ? `Hotel: ${booking.customer.hotel}` : null,
    booking.agent ? `Agent: ${booking.agent.businessName}` : null,
    booking.affiliate ? `Affiliate: ${booking.affiliate.name}` : null,
    booking.promoCode ? `Promo code: ${booking.promoCode.code}` : null,
    booking.affiliateCoupon ? `Affiliate coupon: ${booking.affiliateCoupon.code}` : null,
    booking.riders.length
      ? `Riders:\n${booking.riders.map((rider, index) => `${index + 1}. ${rider.name || "Unnamed"}${rider.age ? `, age ${rider.age}` : ""}${rider.weight ? `, ${rider.weight}kg` : ""}`).join("\n")}`
      : null,
  ].filter(Boolean).join("\n");
}

export async function syncPaidBookingToOdooSalesOrder(bookingId: string, options: { force?: boolean } = {}) {
  if (!isOdooSyncEnabled()) return { synced: false, skipped: true, reason: "Odoo sync is disabled." };

  const booking = await getBookingForOdoo(bookingId);
  if (!booking) throw new Error("Booking not found.");

  if (booking.odooSaleOrderId) {
    return { synced: false, skipped: true, saleOrderId: booking.odooSaleOrderId, reason: "Booking already has an Odoo sale order." };
  }

  if (booking.paymentStatus !== PaymentStatus.PAID) {
    return markSkipped(booking.id, `Booking is not paid. Current payment status: ${booking.paymentStatus}.`);
  }

  if (BLOCKED_BOOKING_STATUSES.has(booking.bookingStatus)) {
    return markSkipped(booking.id, `Booking status ${booking.bookingStatus} is not eligible for revenue sync.`);
  }

  const claim = await prisma.booking.updateMany({
    where: {
      id: booking.id,
      odooSaleOrderId: null,
      ...(options.force ? {} : { odooSyncStatus: { not: OdooSyncStatus.SYNCING } }),
    },
    data: {
      odooSyncStatus: OdooSyncStatus.SYNCING,
      odooSyncError: null,
    },
  });

  if (claim.count === 0) {
    const latest = await prisma.booking.findUnique({
      where: { id: booking.id },
      select: { odooSaleOrderId: true, odooSyncStatus: true },
    });
    return {
      synced: false,
      skipped: true,
      saleOrderId: latest?.odooSaleOrderId ?? undefined,
      reason: latest?.odooSaleOrderId
        ? "Booking already has an Odoo sale order."
        : "Booking is already syncing to Odoo.",
    };
  }

  try {
    const partnerId = await findOrCreatePartner(booking);
    const currencyId = await findCurrencyId(booking.currency);
    if (!currencyId) throw new Error(`Odoo currency "${booking.currency}" was not found.`);
    const pricelistId = getPricelistId(booking.customerType);
    const addOnsTotal = booking.addOns.reduce((sum, item) => sum + toNumber(item.total), 0);
    const packageTotal = Math.max(0, toNumber(booking.subtotal) - addOnsTotal);
    const orderLines: OdooCreateLineCommand[] = [
      [0, 0, {
        product_id: productIdFor("zipline_ride"),
        name: `${booking.package.name} (${booking.reference})`,
        product_uom_qty: booking.numRiders,
        price_unit: packageTotal / Math.max(booking.numRiders, 1),
      }],
    ];

    for (const item of booking.addOns) {
      const key = addOnProductKey(item.addOn.name);
      if (!key) throw new Error(`No Odoo product mapping key found for add-on "${item.addOn.name}".`);
      orderLines.push([0, 0, {
        product_id: productIdFor(key),
        name: item.addOn.name,
        product_uom_qty: item.quantity,
        price_unit: toNumber(item.pricePerUnit),
      }]);
    }

    if (toNumber(booking.discountAmount) > 0) {
      orderLines.push([0, 0, {
        product_id: productIdFor("discount"),
        name: `Discount (${booking.reference})`,
        product_uom_qty: 1,
        price_unit: -toNumber(booking.discountAmount),
      }]);
    }

    const saleOrder: Record<string, unknown> = {
      partner_id: partnerId,
      pricelist_id: pricelistId,
      client_order_ref: booking.reference,
      origin: "Zipline Booking System",
      note: buildBookingNotes(booking),
      order_line: orderLines,
    };

    const created = await odooExecuteKw<unknown>("sale.order", "create", [saleOrder]);
    const saleOrderId = normalizeOdooId(created, "sales order");

    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        odooSyncStatus: OdooSyncStatus.SYNCED,
        odooSaleOrderId: saleOrderId,
        odooSyncedAt: new Date(),
        odooSyncError: null,
      },
    });

    console.info("[odoo] synced booking to sale.order", { bookingId: booking.id, reference: booking.reference, saleOrderId });
    return { synced: true, saleOrderId };
  } catch (error: any) {
    const message = error?.message ?? "Odoo sync failed.";
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        odooSyncStatus: OdooSyncStatus.FAILED,
        odooSyncError: message,
      },
    });
    console.error("[odoo] booking sync failed", { bookingId: booking.id, reference: booking.reference, error: message });
    throw error;
  }
}
