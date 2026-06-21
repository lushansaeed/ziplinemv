"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { addOns } from "@/lib/data";
import { getDb } from "@/lib/db";
import { calculateRideTotal, type CustomerType } from "@/lib/pricing";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function optionalText(formData: FormData, key: string) {
  const value = text(formData, key);
  return value || null;
}

function intValue(formData: FormData, key: string, fallback = 0) {
  const value = Number.parseInt(text(formData, key), 10);
  return Number.isFinite(value) ? value : fallback;
}

function decimalValue(formData: FormData, key: string, fallback = "0") {
  const value = text(formData, key) || fallback;
  return new Prisma.Decimal(value);
}

function boolValue(formData: FormData, key: string) {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

function dateValue(formData: FormData, key: string) {
  const value = text(formData, key);
  return value ? new Date(value) : null;
}

function redirectWith(path: string, message: string) {
  redirect(`${path}?message=${encodeURIComponent(message)}`);
}

export async function createBooking(formData: FormData) {
  const db = getDb();
  const customerName = text(formData, "customerName");
  const phone = text(formData, "phone");
  const timeSlotId = text(formData, "timeSlotId");
  const customerType = (text(formData, "customerType") || "tourist") as CustomerType;
  const adults = intValue(formData, "adults", 1);
  const children = intValue(formData, "children", 0);
  const riderCount = adults + children;

  if (!customerName || !phone || !timeSlotId) {
    redirect("/admin/bookings?error=Customer name, phone, and time slot are required.");
  }

  if (riderCount < 1) {
    redirect("/admin/bookings?error=Add at least one adult or kid rider.");
  }

  const selectedAddOns = addOns.filter((item) => formData.getAll("addons").map(String).includes(item.id));
  const addOnUsdTotal = selectedAddOns.reduce((sum, item) => sum + item.usd, 0);
  const calculated = calculateRideTotal(customerType, { adults, children }, addOnUsdTotal, Boolean(text(formData, "coupon")));
  const hasTotalOverride = Boolean(text(formData, "totalAmount"));
  const totalAmount = hasTotalOverride ? decimalValue(formData, "totalAmount") : new Prisma.Decimal(calculated.total);
  const currency = hasTotalOverride ? text(formData, "currency") || calculated.currency : calculated.currency;
  const paymentStatus = text(formData, "paymentStatus") || "UNPAID";
  const bookingStatus = text(formData, "bookingStatus") || "PENDING";

  const reference = `ZMV-${Date.now().toString().slice(-8)}`;
  await db.$transaction(async (tx) => {
    const customer = await tx.customer.create({
      data: {
        name: customerName,
        phone,
        email: optionalText(formData, "email"),
        nationality: optionalText(formData, "nationality"),
        isTourist: customerType === "tourist"
      }
    });

    await tx.booking.create({
      data: {
        reference,
        customerId: customer.id,
        date: new Date(text(formData, "date")),
        timeSlotId,
        riderCount,
        totalAmount,
        currency,
        bookingStatus: bookingStatus as never,
        paymentStatus: paymentStatus as never,
        internalNotes: optionalText(formData, "internalNotes"),
        riders: {
          create: [
            ...Array.from({ length: adults }, () => ({ type: "ADULT" })),
            ...Array.from({ length: children }, () => ({ type: "CHILD" }))
          ]
        },
        addons: {
          create: selectedAddOns.map((item) => ({
            addonKey: item.id,
            label: item.label,
            price: currency === "USD" ? item.usd : item.usd * 20,
            currency
          }))
        },
        payments: {
          create: {
            amount: totalAmount,
            currency,
            method: text(formData, "paymentMethod") || "Admin/manual",
            status: paymentStatus as never
          }
        }
      }
    });
  });

  revalidatePath("/admin/bookings");
  revalidatePath("/admin");
  redirectWith("/admin/bookings", "Booking created.");
}

export async function updateBooking(formData: FormData) {
  const db = getDb();
  const id = text(formData, "id");

  await db.booking.update({
    where: { id },
    data: {
      bookingStatus: text(formData, "bookingStatus") as never,
      paymentStatus: text(formData, "paymentStatus") as never,
      internalNotes: optionalText(formData, "internalNotes")
    }
  });

  revalidatePath("/admin/bookings");
  revalidatePath("/admin/reports");
  redirectWith("/admin/bookings", "Booking updated.");
}

export async function deleteBooking(formData: FormData) {
  const db = getDb();
  await db.booking.delete({ where: { id: text(formData, "id") } });
  revalidatePath("/admin/bookings");
  revalidatePath("/admin/reports");
  redirectWith("/admin/bookings", "Booking deleted.");
}

export async function savePricingRule(formData: FormData) {
  const db = getDb();
  const id = text(formData, "id");
  const data = {
    name: text(formData, "name"),
    audience: text(formData, "audience") || "tourist",
    adultPrice: decimalValue(formData, "adultPrice"),
    childPrice: decimalValue(formData, "childPrice"),
    currency: text(formData, "currency") || "USD",
    validFrom: dateValue(formData, "validFrom"),
    validTo: dateValue(formData, "validTo"),
    minGroup: text(formData, "minGroup") ? intValue(formData, "minGroup") : null,
    isActive: boolValue(formData, "isActive")
  };

  if (id) {
    await db.pricingRule.update({ where: { id }, data });
  } else {
    await db.pricingRule.create({ data });
  }

  revalidatePath("/admin/pricing");
  redirectWith("/admin/pricing", id ? "Pricing rule updated." : "Pricing rule created.");
}

export async function deletePricingRule(formData: FormData) {
  const db = getDb();
  await db.pricingRule.delete({ where: { id: text(formData, "id") } });
  revalidatePath("/admin/pricing");
  redirectWith("/admin/pricing", "Pricing rule deleted.");
}

export async function saveTimeSlot(formData: FormData) {
  const db = getDb();
  const id = text(formData, "id");
  const data = {
    label: text(formData, "label"),
    startsAt: new Date(text(formData, "startsAt")),
    maxRiders: intValue(formData, "maxRiders", 8),
    isActive: boolValue(formData, "isActive")
  };

  if (id) {
    await db.timeSlot.update({ where: { id }, data });
  } else {
    await db.timeSlot.create({ data });
  }

  revalidatePath("/admin/pricing");
  revalidatePath("/admin/bookings");
  redirectWith("/admin/pricing", id ? "Time slot updated." : "Time slot created.");
}

export async function saveMediaFile(formData: FormData) {
  const db = getDb();
  const id = text(formData, "id");
  const data = {
    type: text(formData, "type") as never,
    url: text(formData, "url"),
    fallbackUrl: optionalText(formData, "fallbackUrl"),
    caption: optionalText(formData, "caption"),
    placement: text(formData, "placement") || "gallery",
    isFeatured: boolValue(formData, "isFeatured"),
    sortOrder: intValue(formData, "sortOrder")
  };

  if (id) {
    await db.mediaFile.update({ where: { id }, data });
  } else {
    await db.mediaFile.create({ data });
  }

  revalidatePath("/admin/media");
  revalidatePath("/gallery");
  redirectWith("/admin/media", id ? "Media updated." : "Media added.");
}

export async function deleteMediaFile(formData: FormData) {
  const db = getDb();
  await db.mediaFile.delete({ where: { id: text(formData, "id") } });
  revalidatePath("/admin/media");
  revalidatePath("/gallery");
  redirectWith("/admin/media", "Media deleted.");
}

export async function updateCommission(formData: FormData) {
  const db = getDb();
  const status = text(formData, "status");

  await db.commission.update({
    where: { id: text(formData, "id") },
    data: {
      amount: decimalValue(formData, "amount"),
      status: status as never,
      notes: optionalText(formData, "notes"),
      paidAt: status === "PAID" ? new Date() : null
    }
  });

  revalidatePath("/admin/commissions");
  revalidatePath("/admin/reports");
  redirectWith("/admin/commissions", "Commission updated.");
}

export async function deleteCommission(formData: FormData) {
  const db = getDb();
  await db.commission.delete({ where: { id: text(formData, "id") } });
  revalidatePath("/admin/commissions");
  redirectWith("/admin/commissions", "Commission deleted.");
}

export async function updateCustomer(formData: FormData) {
  const db = getDb();
  await db.customer.update({
    where: { id: text(formData, "id") },
    data: {
      name: text(formData, "name"),
      phone: text(formData, "phone"),
      email: optionalText(formData, "email"),
      nationality: optionalText(formData, "nationality"),
      isTourist: boolValue(formData, "isTourist")
    }
  });

  revalidatePath("/admin/customers");
  redirectWith("/admin/customers", "Customer updated.");
}

export async function updateAgent(formData: FormData) {
  const db = getDb();
  const userId = text(formData, "userId");

  await db.user.update({
    where: { id: userId },
    data: { name: optionalText(formData, "name"), isActive: boolValue(formData, "isActive") }
  });

  await db.agent.update({
    where: { userId },
    data: {
      agencyName: text(formData, "agencyName"),
      commissionPercent: decimalValue(formData, "commissionPercent", "10"),
      isApproved: boolValue(formData, "isApproved"),
      isSuspended: boolValue(formData, "isSuspended")
    }
  });

  revalidatePath("/admin/agents");
  revalidatePath("/admin/roles");
  redirectWith("/admin/agents", "Agent updated.");
}

export async function updateAffiliate(formData: FormData) {
  const db = getDb();
  const userId = text(formData, "userId");

  await db.user.update({
    where: { id: userId },
    data: { name: optionalText(formData, "name"), isActive: boolValue(formData, "isActive") }
  });

  const affiliate = await db.affiliate.update({
    where: { userId },
    data: {
      displayName: text(formData, "displayName"),
      isApproved: boolValue(formData, "isApproved")
    }
  });

  await db.affiliateCode.updateMany({
    where: { affiliateId: affiliate.id },
    data: { isActive: boolValue(formData, "codesActive") }
  });

  revalidatePath("/admin/affiliates");
  revalidatePath("/admin/roles");
  redirectWith("/admin/affiliates", "Affiliate updated.");
}
