"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { addOns } from "@/lib/data";
import { getDb } from "@/lib/db";
import { calculateRideTotal, type CustomerType } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";
import { ensureBookableTimeSlot, saveBookingTimeSlotSettings, type BookingTimeSlotSettings } from "@/lib/booking-time-slots";

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
  const bookingDate = text(formData, "date");
  const timeSlotLabel = text(formData, "timeSlot");
  const customerType = (text(formData, "customerType") || "tourist") as CustomerType;
  const adults = intValue(formData, "adults", 1);
  const children = intValue(formData, "children", 0);
  const riderCount = adults + children;

  if (!customerName || !phone || !bookingDate || !timeSlotLabel) {
    redirect("/admin/bookings?error=Customer name, phone, booking date, and time slot are required.");
  }

  if (riderCount < 1) {
    redirect("/admin/bookings?error=Add at least one adult or kid rider.");
  }

  const settings = await getBookingSettings();
  const addOnSelections = addOns.map((item) => ({
    ...item,
    quantity: intValue(formData, `addonQuantity_${item.id}`)
  })).filter((item) => item.quantity > 0);

  if (addOnSelections.some((item) => item.quantity < 0)) {
    redirect("/admin/bookings?error=Add-on quantity cannot be negative.");
  }

  if (!settings.allowAddonQuantityAboveRiderCount && addOnSelections.some((item) => item.quantity > riderCount)) {
    redirect("/admin/bookings?error=Add-on quantity cannot exceed total riders.");
  }

  const addOnUsdTotal = addOnSelections.reduce((sum, item) => sum + item.usd * item.quantity, 0);
  const couponCode = text(formData, "coupon");
  const affiliateCode = couponCode
    ? await db.affiliateCode.findUnique({
        where: { code: couponCode },
        include: { affiliate: true }
      })
    : null;

  if (couponCode && couponCode.length < 4) {
    redirect("/admin/bookings?error=Coupon or affiliate code is invalid.");
  }

  const calculated = calculateRideTotal(customerType, { adults, children }, addOnUsdTotal, Boolean(text(formData, "coupon")));
  const discountType = text(formData, "discountType") || "percentage";
  const discountValue = Number(text(formData, "discountValue") || 0);
  const currency = calculated.currency;
  const manualDiscount = discountType === "percentage" ? (calculated.total * discountValue) / 100 : discountValue;

  if (discountValue < 0) {
    redirect("/admin/bookings?error=Discount cannot be negative.");
  }

  const calculatedFinalTotal = Math.max(calculated.total - manualDiscount, 0);
  const totalAmount = new Prisma.Decimal(calculatedFinalTotal);
  const amountPaidInput = Number(text(formData, "amountPaid") || 0);
  const paymentStatus = text(formData, "paymentStatus") || "UNPAID";
  const bookingStatus = text(formData, "bookingStatus") || "PENDING";
  const amountPaid = amountPaidInput > 0 ? new Prisma.Decimal(amountPaidInput) : paymentStatus === "PAID" ? totalAmount : new Prisma.Decimal(0);
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const currentUser = authData.user
    ? await db.user.findUnique({
        where: { id: authData.user.id },
        select: { id: true, name: true, email: true }
      })
    : null;
  const currentUserId = currentUser?.id ?? null;
  const createdById = currentUser?.id ?? authData.user?.id ?? null;
  const discountAppliedBy = discountValue
    ? currentUser?.name ?? currentUser?.email ?? authData.user?.email ?? createdById
    : null;

  if (Number(totalAmount) < 0) {
    redirect("/admin/bookings?error=Final total cannot be negative.");
  }

  const pricingNotes = [
    optionalText(formData, "internalNotes"),
    `Customer type: ${customerType}`,
    `Adults: ${adults}`,
    `Kids: ${children}`,
    addOnSelections.length ? `Add-ons: ${addOnSelections.map((item) => `${item.label} x ${item.quantity}`).join(", ")}` : "Add-ons: None",
    couponCode ? `Coupon / affiliate code: ${couponCode}${affiliateCode ? " (affiliate)" : ""}` : null,
    calculated.discount ? `Coupon discount: ${currency} ${calculated.discount.toFixed(2)}` : null,
    discountValue ? `Manual discount: ${discountType} ${discountValue} (${currency} ${manualDiscount.toFixed(2)})` : null,
    discountAppliedBy ? `Discount applied by: ${discountAppliedBy}` : null
  ].filter(Boolean).join("\n");

  const reference = `ZMV-${Date.now().toString().slice(-8)}`;
  await db.$transaction(async (tx) => {
    const timeSlot = await ensureBookableTimeSlot(tx, bookingDate, timeSlotLabel, riderCount);
    const customer = await tx.customer.create({
      data: {
        name: customerName,
        phone,
        email: optionalText(formData, "email"),
        nationality: optionalText(formData, "nationality"),
        isTourist: customerType === "tourist"
      }
    });

    const booking = await tx.booking.create({
      data: {
        reference,
        customerId: customer.id,
        date: new Date(bookingDate),
        timeSlotId: timeSlot.id,
        riderCount,
        totalAmount,
        currency,
        affiliateId: affiliateCode?.affiliateId,
        affiliateCodeId: affiliateCode?.id,
        createdById,
        bookingStatus: bookingStatus as never,
        paymentStatus: paymentStatus as never,
        internalNotes: pricingNotes,
        commissionAmount: calculated.discount || manualDiscount ? new Prisma.Decimal(calculated.discount + manualDiscount) : null,
        riders: {
          create: [
            ...Array.from({ length: adults }, () => ({ type: "ADULT" })),
            ...Array.from({ length: children }, () => ({ type: "CHILD" }))
          ]
        },
        addons: {
          create: addOnSelections.flatMap((item) =>
            Array.from({ length: item.quantity }, () => ({
              addonKey: item.id,
              label: item.label,
              price: currency === "USD" ? item.usd : item.usd * 20,
              currency
            }))
          )
        },
        payments: {
          create: {
            amount: amountPaid,
            currency,
            method: text(formData, "paymentMethod") || "Admin/manual",
            status: paymentStatus as never
          }
        }
      }
    });

    if (discountValue || addOnSelections.length) {
      await tx.auditLog.create({
        data: {
          action: "CREATE_BOOKING_PRICING_DETAILS",
          entity: "Booking",
          entityId: booking.id,
          userId: currentUserId,
          after: {
            couponCode,
            addonQuantities: Object.fromEntries(addOnSelections.map((item) => [item.id, item.quantity])),
            couponDiscount: calculated.discount,
            manualDiscountType: discountType,
            manualDiscountValue: discountValue,
            manualDiscountAmount: manualDiscount,
            discountAppliedBy,
            finalTotal: totalAmount.toString(),
            currency
          }
        }
      });
    }
  });

  revalidatePath("/admin/bookings");
  revalidatePath("/admin");
  redirectWith("/admin/bookings", "Booking created.");
}

async function getBookingSettings() {
  const db = getDb();
  const settings = await db.setting.findMany({
    where: {
      key: {
        in: [
          "allowAddonQuantityAboveRiderCount",
          "maxCounterDiscountPercent",
          "maxCounterFixedDiscountMvr"
        ]
      }
    }
  });
  const values = Object.fromEntries(settings.map((setting) => [setting.key, setting.value]));

  return {
    allowAddonQuantityAboveRiderCount: values.allowAddonQuantityAboveRiderCount === true,
    maxDiscountPercent: typeof values.maxCounterDiscountPercent === "number" ? values.maxCounterDiscountPercent : 10,
    maxFixedDiscountMvr: typeof values.maxCounterFixedDiscountMvr === "number" ? values.maxCounterFixedDiscountMvr : 500
  };
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

export async function saveBookingTimeSlotSettingsAction(formData: FormData) {
  const settings: BookingTimeSlotSettings = {
    startTime: text(formData, "startTime"),
    endTime: text(formData, "endTime"),
    slotDuration: intValue(formData, "slotDuration", 30) as BookingTimeSlotSettings["slotDuration"],
    guestsPerSlot: intValue(formData, "guestsPerSlot", 10),
    breakEnabled: boolValue(formData, "breakEnabled"),
    breakStartTime: text(formData, "breakStartTime"),
    breakEndTime: text(formData, "breakEndTime")
  };

  try {
    await saveBookingTimeSlotSettings(settings);
  } catch (error) {
    redirectWith("/admin/settings", error instanceof Error ? error.message : "Booking time slot settings could not be saved.");
  }

  revalidatePath("/admin/settings");
  revalidatePath("/admin/bookings");
  revalidatePath("/book");
  redirectWith("/admin/settings", "Booking time slot settings saved.");
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
