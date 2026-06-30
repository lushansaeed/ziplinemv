import { BookingStatus, OdooSyncStatus, PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import { create, isOdooSyncEnabled, searchRead } from "@/lib/odoo-client";

type OdooId = number;
type OdooCreateLineCommand = [0, 0, Record<string, unknown>];

const FALLBACK_PRODUCT_MAP: Record<string, number> = {
  zipline_ride: 2272,
  insta360: 2293,
  photography: 2294,
  drone: 2295,
  discount: 2296,
};

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
  if (!raw) return FALLBACK_PRODUCT_MAP;

  try {
    return { ...FALLBACK_PRODUCT_MAP, ...(JSON.parse(raw) as Record<string, number>) };
  } catch {
    throw new Error("ODOO_PRODUCT_MAP must be valid JSON.");
  }
}

function productIdFor(key: string) {
  const productMap = parseProductMap();

  if (key === "discount") {
    const discountId = Number(process.env.ODOO_DISCOUNT_PRODUCT_ID);
    if (discountId > 0) return discountId;
  }

  const id = Number(productMap[key]);
  if (id > 0) return id;

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

  if (customer.email) {
    const byEmail = await searchRead<{ id: OdooId }>("res.partner", [["email", "=", customer.email]], ["id"], 1);
    if (byEmail[0]?.id) return byEmail[0].id;
  }

  if (customer.phone) {
    const byPhone = await searchRead<{ id: OdooId }>("res.partner", [["phone", "=", customer.phone]], ["id"], 1);
    if (byPhone[0]?.id) return byPhone[0].id;
  }

  const created = await create<unknown>("res.partner", {
    name: customer.name,
    email: customer.email || false,
    phone: customer.phone,
    customer_rank: 1,
  });

  return normalizeOdooId(created, "partner");
}

async function markSkippedUnpaid(bookingId: string, reason: string) {
  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      odooSyncStatus: OdooSyncStatus.SKIPPED_UNPAID,
      odooSyncError: reason,
    },
  });
  return { synced: false, skipped: true, reason };
}

function buildBookingNotes(booking: NonNullable<Awaited<ReturnType<typeof getBookingForOdoo>>>) {
  return [
    `Booking reference: ${booking.reference}`,
    `Source: ${booking.source}`,
    `Ride date: ${booking.bookingDate.toISOString().slice(0, 10)}`,
    `Ride time: ${booking.slotLabel ?? booking.slot.startTime}`,
    `Riders: ${booking.numRiders}`,
    `Payment status: ${booking.paymentStatus}`,
    `Customer type: ${booking.customerType}`,
  ].join("\n");
}

function buildOrderLines(booking: NonNullable<Awaited<ReturnType<typeof getBookingForOdoo>>>) {
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

  return orderLines;
}

export async function syncPaidBookingToOdooSalesOrder(bookingId: string, options: { force?: boolean } = {}) {
  if (!isOdooSyncEnabled()) return { synced: false, skipped: true, reason: "Odoo sync is disabled." };

  const booking = await getBookingForOdoo(bookingId);
  if (!booking) throw new Error("Booking not found.");

  if (booking.odooSaleOrderId || booking.odooInvoiceId) {
    return {
      synced: false,
      skipped: true,
      saleOrderId: booking.odooSaleOrderId ?? undefined,
      invoiceId: booking.odooInvoiceId ?? undefined,
      reason: "Booking already has an Odoo record.",
    };
  }

  if (booking.paymentStatus !== PaymentStatus.PAID || BLOCKED_BOOKING_STATUSES.has(booking.bookingStatus)) {
    return markSkippedUnpaid(booking.id, `Booking is not eligible for Odoo revenue sync. Payment: ${booking.paymentStatus}. Status: ${booking.bookingStatus}.`);
  }

  const claim = await prisma.booking.updateMany({
    where: {
      id: booking.id,
      odooSaleOrderId: null,
      odooInvoiceId: null,
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
      select: { odooSaleOrderId: true, odooInvoiceId: true },
    });
    return {
      synced: false,
      skipped: true,
      saleOrderId: latest?.odooSaleOrderId ?? undefined,
      invoiceId: latest?.odooInvoiceId ?? undefined,
      reason: latest?.odooSaleOrderId || latest?.odooInvoiceId
        ? "Booking already has an Odoo record."
        : "Booking is already syncing to Odoo.",
    };
  }

  try {
    const partnerId = await findOrCreatePartner(booking);
    const saleOrderId = normalizeOdooId(await create<unknown>("sale.order", {
      partner_id: partnerId,
      pricelist_id: getPricelistId(booking.customerType),
      client_order_ref: booking.reference,
      origin: "Zipline Booking System",
      note: buildBookingNotes(booking),
      order_line: buildOrderLines(booking),
    }), "sales order");

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
