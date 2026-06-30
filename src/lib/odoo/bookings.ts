import { BookingStatus, OdooSyncStatus, PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import { action, callOdoo, create, isOdooSyncEnabled, searchRead } from "@/lib/odoo-client";

type OdooId = number;
type OdooCreateLineCommand = [0, 0, Record<string, unknown>];
type OdooMany2One = false | [number, string];

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

const resolvedProductIds = new Map<string, OdooId>();

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

async function saleOrderProductIdFor(key: string) {
  const configuredId = productIdFor(key);
  const cacheKey = `${key}:${configuredId}`;
  const cached = resolvedProductIds.get(cacheKey);
  if (cached) return cached;

  const directProduct = await searchRead<{ id: OdooId }>(
    "product.product",
    [["id", "=", configuredId]],
    ["id"],
    1,
  );

  if (directProduct[0]?.id) {
    resolvedProductIds.set(cacheKey, configuredId);
    return configuredId;
  }

  const productTemplate = await searchRead<{ id: OdooId; name?: string; default_code?: string | false; product_variant_id?: OdooMany2One }>(
    "product.template",
    [["id", "=", configuredId]],
    ["id", "name", "default_code", "product_variant_id"],
    1,
  );
  const variantId = Array.isArray(productTemplate[0]?.product_variant_id)
    ? productTemplate[0].product_variant_id[0]
    : null;

  if (variantId) {
    console.info("[odoo] resolved product template to sale-order product variant", {
      key,
      configuredId,
      templateName: productTemplate[0]?.name,
      templateReference: productTemplate[0]?.default_code || null,
      productId: variantId,
    });
    resolvedProductIds.set(cacheKey, variantId);
    return variantId;
  }

  throw new Error(
    `Odoo product mapping "${key}" points to ${configuredId}, but no matching product.product record or template variant was found.`,
  );
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

async function buildOrderLines(booking: NonNullable<Awaited<ReturnType<typeof getBookingForOdoo>>>) {
  const addOnsTotal = booking.addOns.reduce((sum, item) => sum + toNumber(item.total), 0);
  const packageTotal = Math.max(0, toNumber(booking.subtotal) - addOnsTotal);
  const orderLines: OdooCreateLineCommand[] = [
    [0, 0, {
      product_id: await saleOrderProductIdFor("zipline_ride"),
      name: `${booking.package.name} (${booking.reference})`,
      product_uom_qty: booking.numRiders,
      price_unit: packageTotal / Math.max(booking.numRiders, 1),
    }],
  ];

  for (const item of booking.addOns) {
    const key = addOnProductKey(item.addOn.name);
    if (!key) throw new Error(`No Odoo product mapping key found for add-on "${item.addOn.name}".`);
    orderLines.push([0, 0, {
      product_id: await saleOrderProductIdFor(key),
      name: item.addOn.name,
      product_uom_qty: item.quantity,
      price_unit: toNumber(item.pricePerUnit),
    }]);
  }

  if (toNumber(booking.discountAmount) > 0) {
    orderLines.push([0, 0, {
      product_id: await saleOrderProductIdFor("discount"),
      name: `Discount (${booking.reference})`,
      product_uom_qty: 1,
      price_unit: -toNumber(booking.discountAmount),
    }]);
  }

  return orderLines;
}

async function confirmSaleOrder(saleOrderId: OdooId) {
  const existing = await searchRead<{ id: OdooId; state?: string }>(
    "sale.order",
    [["id", "=", saleOrderId]],
    ["id", "state"],
    1,
  );
  const state = existing[0]?.state;
  if (state === "sale" || state === "done") {
    console.info("[odoo] sale.order already confirmed", { saleOrderId, state });
    return;
  }

  await action("sale.order", "action_confirm", [saleOrderId]);
  console.info("[odoo] confirmed sale.order", { saleOrderId });
}

async function createInvoiceForSaleOrder(saleOrderId: OdooId) {
  const existingInvoice = await searchRead<{ invoice_ids?: number[] }>(
    "sale.order",
    [["id", "=", saleOrderId]],
    ["invoice_ids"],
    1,
  );
  if (existingInvoice[0]?.invoice_ids?.[0]) {
    return existingInvoice[0].invoice_ids[0];
  }

  try {
    const invoiceIds = await callOdoo<unknown>("sale.order", "_create_invoices", {
      ids: [saleOrderId],
      final: true,
    });
    const invoiceId = normalizeOdooId(invoiceIds, "invoice");
    console.info("[odoo] created invoice from sale.order", { saleOrderId, invoiceId });
    return invoiceId;
  } catch (error: any) {
    console.warn("[odoo] direct sale.order invoice creation failed; trying advance payment wizard", {
      saleOrderId,
      error: error?.message ?? error,
    });
  }

  const wizardId = normalizeOdooId(await create<unknown>("sale.advance.payment.inv", {
    advance_payment_method: "delivered",
  }), "invoice wizard");

  const result = await callOdoo<unknown>("sale.advance.payment.inv", "create_invoices", {
    ids: [wizardId],
    context: {
      active_model: "sale.order",
      active_id: saleOrderId,
      active_ids: [saleOrderId],
    },
  });

  const invoiceIds = await searchRead<{ invoice_ids?: number[] }>(
    "sale.order",
    [["id", "=", saleOrderId]],
    ["invoice_ids"],
    1,
  );
  const invoiceId = invoiceIds[0]?.invoice_ids?.[0] ?? normalizeOdooId(result, "invoice");
  console.info("[odoo] created invoice from sale.order wizard", { saleOrderId, invoiceId });
  return invoiceId;
}

export async function syncPaidBookingToOdooSalesOrder(bookingId: string, options: { force?: boolean } = {}) {
  if (!isOdooSyncEnabled()) return { synced: false, skipped: true, reason: "Odoo sync is disabled." };

  const booking = await getBookingForOdoo(bookingId);
  if (!booking) throw new Error("Booking not found.");

  if (booking.odooInvoiceId) {
    return {
      synced: false,
      skipped: true,
      saleOrderId: booking.odooSaleOrderId ?? undefined,
      invoiceId: booking.odooInvoiceId ?? undefined,
      reason: "Booking already has an Odoo invoice.",
    };
  }

  if (booking.paymentStatus !== PaymentStatus.PAID || BLOCKED_BOOKING_STATUSES.has(booking.bookingStatus)) {
    return markSkippedUnpaid(booking.id, `Booking is not eligible for Odoo revenue sync. Payment: ${booking.paymentStatus}. Status: ${booking.bookingStatus}.`);
  }

  if (booking.odooSaleOrderId) {
    try {
      await confirmSaleOrder(booking.odooSaleOrderId);
      const invoiceId = await createInvoiceForSaleOrder(booking.odooSaleOrderId);

      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          odooSyncStatus: OdooSyncStatus.SYNCED,
          odooInvoiceId: invoiceId,
          odooSyncedAt: new Date(),
          odooSyncError: null,
        },
      });

      console.info("[odoo] synced existing sale.order to invoice", {
        bookingId: booking.id,
        reference: booking.reference,
        saleOrderId: booking.odooSaleOrderId,
        invoiceId,
      });
      return { synced: true, saleOrderId: booking.odooSaleOrderId, invoiceId };
    } catch (error: any) {
      const message = error?.message ?? "Odoo invoice sync failed.";
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          odooSyncStatus: OdooSyncStatus.FAILED,
          odooSyncError: message,
        },
      });
      console.error("[odoo] existing sale.order invoice sync failed", {
        bookingId: booking.id,
        reference: booking.reference,
        saleOrderId: booking.odooSaleOrderId,
        error: message,
      });
      throw error;
    }
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
      order_line: await buildOrderLines(booking),
    }), "sales order");
    await confirmSaleOrder(saleOrderId);
    const invoiceId = await createInvoiceForSaleOrder(saleOrderId);

    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        odooSyncStatus: OdooSyncStatus.SYNCED,
        odooSaleOrderId: saleOrderId,
        odooInvoiceId: invoiceId,
        odooSyncedAt: new Date(),
        odooSyncError: null,
      },
    });

    console.info("[odoo] synced booking to sale.order and invoice", { bookingId: booking.id, reference: booking.reference, saleOrderId, invoiceId });
    return { synced: true, saleOrderId, invoiceId };
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
