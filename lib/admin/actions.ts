"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { getDb } from "@/lib/db";
import { calculateRideTotal, type CustomerType } from "@/lib/pricing";
import { defaultPricingAddOns, getPricingEngineConfig, saveAddOnSettings, saveDefaultPricingSettings, saveExchangeRateSetting, type PricingAddOn } from "@/lib/pricing-engine";
import { createClient } from "@/lib/supabase/server";
import { ensureBookableTimeSlot, saveBookingTimeSlotSettings, type BookingTimeSlotSettings } from "@/lib/booking-time-slots";
import { upsertAttributedCustomer } from "@/lib/booking-attribution";

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
  const pricingEngine = await getPricingEngineConfig();
  const availableAddOns = pricingEngine.addOns.filter((item) => item.enabled);
  const addOnSelections = availableAddOns.map((item) => ({
    ...item,
    quantity: intValue(formData, `addonQuantity_${item.id}`)
  })).filter((item) => item.quantity > 0);

  if (addOnSelections.some((item) => item.quantity < 0)) {
    redirect("/admin/bookings?error=Add-on quantity cannot be negative.");
  }

  if (!settings.allowAddonQuantityAboveRiderCount && addOnSelections.some((item) => item.quantity > riderCount)) {
    redirect("/admin/bookings?error=Add-on quantity cannot exceed total riders.");
  }

  const addOnUsdTotal = addOnSelections.reduce((sum, item) => sum + (item.currency === "USD" ? item.price : item.price / pricingEngine.pricing.exchangeRateMvrPerUsd) * item.quantity, 0);
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

  const calculated = calculateRideTotal(customerType, { adults, children }, addOnUsdTotal, Boolean(text(formData, "coupon")), pricingEngine.pricing);
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
  try {
    await db.$transaction(async (tx) => {
      const timeSlot = await ensureBookableTimeSlot(tx, bookingDate, timeSlotLabel, riderCount);
      const source = affiliateCode ? "AFFILIATE" as const : "WALK_IN" as const;
      const attribution = affiliateCode
        ? { source, affiliateId: affiliateCode.affiliateId, affiliateCodeId: affiliateCode.id }
        : { source };
      const customer = await upsertAttributedCustomer(tx, {
        name: customerName,
        phone,
        email: optionalText(formData, "email"),
        nationality: optionalText(formData, "nationality"),
        isTourist: customerType === "tourist"
      }, attribution);

      const booking = await tx.booking.create({
        data: {
          reference,
          customerId: customer.id,
          date: timeSlot.startsAt,
          timeSlotId: timeSlot.id,
          riderCount,
          totalAmount,
          currency,
          source,
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
                price: currency === item.currency ? item.price : currency === "MVR" ? item.price * pricingEngine.pricing.exchangeRateMvrPerUsd : item.price / pricingEngine.pricing.exchangeRateMvrPerUsd,
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
  } catch (error) {
    redirect(`/admin/bookings?error=${encodeURIComponent(error instanceof Error ? error.message : "This time slot is not available.")}`);
  }

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
  await savePricingRuleData(formData);
  redirectWith("/admin/pricing", text(formData, "id") ? "Pricing rule updated." : "Pricing rule created.");
}

export async function savePricingRuleInline(formData: FormData) {
  const id = text(formData, "id");
  await savePricingRuleData(formData);
  return { ok: true, message: id ? "Pricing rule saved." : "Pricing rule created." };
}

async function savePricingRuleData(formData: FormData) {
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
}

export async function deletePricingRule(formData: FormData) {
  const db = getDb();
  await db.pricingRule.delete({ where: { id: text(formData, "id") } });
  revalidatePath("/admin/pricing");
  redirectWith("/admin/pricing", "Pricing rule deleted.");
}

export async function savePricingEngineDefaults(formData: FormData) {
  await savePricingEngineDefaultsData(formData);
  redirectWith("/admin/pricing", "Default prices saved.");
}

export async function savePricingEngineDefaultsInline(formData: FormData) {
  await savePricingEngineDefaultsData(formData);
  return { ok: true, message: "Default pricing saved." };
}

async function savePricingEngineDefaultsData(formData: FormData) {
  await saveDefaultPricingSettings({
    touristAdultUsd: Number(text(formData, "touristAdultUsd") || 50),
    touristChildUsd: Number(text(formData, "touristChildUsd") || 30),
    localAdultMvr: Number(text(formData, "localAdultMvr") || 600),
    localChildMvr: Number(text(formData, "localChildMvr") || 400),
    maafushiAdultMvr: Number(text(formData, "maafushiAdultMvr") || 450),
    maafushiChildMvr: Number(text(formData, "maafushiChildMvr") || 300),
    defaultCurrency: text(formData, "defaultCurrency") || "USD",
    exchangeRateMvrPerUsd: Number(text(formData, "exchangeRateMvrPerUsd") || 20),
    affiliateDiscountPercent: Number(text(formData, "affiliateDiscountPercent") || 10)
  });

  revalidatePath("/admin/pricing");
  revalidatePath("/book");
  revalidatePath("/admin/bookings");
}

export async function savePricingEngineExchangeRate(formData: FormData) {
  await savePricingEngineExchangeRateData(formData);
  redirectWith("/admin/pricing", "Exchange rate saved.");
}

export async function savePricingEngineExchangeRateInline(formData: FormData) {
  await savePricingEngineExchangeRateData(formData);
  return { ok: true, message: "Exchange rate saved." };
}

async function savePricingEngineExchangeRateData(formData: FormData) {
  await saveExchangeRateSetting(Number(text(formData, "exchangeRateMvrPerUsd") || 20), text(formData, "effectiveFrom"), boolValue(formData, "isActive"));

  revalidatePath("/admin/pricing");
  revalidatePath("/book");
  revalidatePath("/admin/bookings");
}

export async function savePricingEngineAddOns(formData: FormData) {
  await savePricingEngineAddOnsData(formData);
  redirectWith("/admin/pricing", "Add-ons saved.");
}

export async function savePricingEngineAddOnsInline(formData: FormData) {
  await savePricingEngineAddOnsData(formData);
  return { ok: true, message: "Add-ons saved." };
}

async function savePricingEngineAddOnsData(formData: FormData) {
  const ids = formData.getAll("addonId").map((value) => String(value).trim()).filter(Boolean);
  const addOnsToSave: PricingAddOn[] = ids.map((id) => {
    const fallback = defaultPricingAddOns.find((item) => item.id === id);
    return {
      id,
      label: text(formData, `${id}_label`) || fallback?.label || "Add-On",
      price: Number(text(formData, `${id}_price`) || fallback?.price || 0),
      currency: text(formData, `${id}_currency`) === "MVR" ? "MVR" : "USD",
      enabled: boolValue(formData, `${id}_enabled`),
      description: text(formData, `${id}_description`)
    };
  });

  await saveAddOnSettings(addOnsToSave);
  revalidatePath("/admin/pricing");
  revalidatePath("/book");
  revalidatePath("/admin/bookings");
}

export async function saveAgentRate(formData: FormData) {
  await saveAgentRateData(formData);
  redirectWith("/admin/pricing", text(formData, "id") ? "Agent rate saved." : "Agent rate created.");
}

export async function saveAgentRateInline(formData: FormData) {
  const id = text(formData, "id");
  await saveAgentRateData(formData);
  return { ok: true, message: id ? "Agent rate saved." : "Agent rate created." };
}

async function saveAgentRateData(formData: FormData) {
  const db = getDb();
  const id = text(formData, "id");
  const data = {
    agentId: text(formData, "agentId"),
    name: text(formData, "name") || "Agent Rate",
    price: decimalValue(formData, "price"),
    currency: text(formData, "currency") || "USD",
    validFrom: dateValue(formData, "validFrom"),
    validTo: dateValue(formData, "validTo")
  };

  if (id) {
    await db.agentRate.update({ where: { id }, data });
  } else {
    await db.agentRate.create({ data });
  }

  await db.agent.update({
    where: { id: data.agentId },
    data: { commissionPercent: decimalValue(formData, "commissionPercent", "10") }
  });

  revalidatePath("/admin/pricing");
  revalidatePath("/admin/agents");
}

export async function saveAgentRateMatrix(formData: FormData) {
  await saveAgentRateMatrixData(formData);
  redirectWith("/admin/pricing", "Agent rates saved.");
}

export async function saveAgentRateMatrixInline(formData: FormData) {
  await saveAgentRateMatrixData(formData);
  return { ok: true, message: "Agent rates saved." };
}

async function saveAgentRateMatrixData(formData: FormData) {
  const db = getDb();
  const agentId = text(formData, "agentId");
  const rates = [
    ["Tourist Adult Agent Rate", "touristAdultAgentRate", "USD"],
    ["Tourist Kid Agent Rate", "touristKidAgentRate", "USD"],
    ["Local Adult Agent Rate", "localAdultAgentRate", "MVR"],
    ["Local Kid Agent Rate", "localKidAgentRate", "MVR"],
    ["Maafushi Resident Agent Rate", "maafushiResidentAgentRate", "MVR"],
    ["Maafushi Kid Agent Rate", "maafushiKidAgentRate", "MVR"]
  ] as const;

  await db.agent.update({
    where: { id: agentId },
    data: { commissionPercent: decimalValue(formData, "commissionPercent", "10") }
  });

  for (const [name, key, currency] of rates) {
    const value = text(formData, key);
    if (!value) continue;
    const existing = await db.agentRate.findFirst({ where: { agentId, name } });
    const data = { agentId, name, price: decimalValue(formData, key), currency };
    if (existing) {
      await db.agentRate.update({ where: { id: existing.id }, data });
    } else {
      await db.agentRate.create({ data });
    }
  }

  revalidatePath("/admin/pricing");
  revalidatePath("/admin/agents");
}

export async function deleteAgentRate(formData: FormData) {
  await getDb().agentRate.delete({ where: { id: text(formData, "id") } });
  revalidatePath("/admin/pricing");
  revalidatePath("/admin/agents");
  redirectWith("/admin/pricing", "Agent rate deleted.");
}

export async function saveBookingTimeSlotSettingsAction(formData: FormData) {
  const redirectPath = text(formData, "redirectPath") || "/admin/settings";
  try {
    await saveBookingTimeSlotSettingsData(formData);
  } catch (error) {
    redirectWith(redirectPath, error instanceof Error ? error.message : "Booking time slot settings could not be saved.");
  }

  redirectWith(redirectPath, "Booking time slot settings saved.");
}

export async function saveBookingTimeSlotSettingsInline(formData: FormData) {
  try {
    await saveBookingTimeSlotSettingsData(formData);
    return { ok: true, message: "Slot capacity saved." };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Booking time slot settings could not be saved." };
  }
}

async function saveBookingTimeSlotSettingsData(formData: FormData) {
  const settings: BookingTimeSlotSettings = {
    startTime: text(formData, "startTime"),
    endTime: text(formData, "endTime"),
    slotDuration: intValue(formData, "slotDuration", 30) as BookingTimeSlotSettings["slotDuration"],
    guestsPerSlot: intValue(formData, "guestsPerSlot", 10),
    breakEnabled: boolValue(formData, "breakEnabled"),
    breakStartTime: text(formData, "breakStartTime"),
    breakEndTime: text(formData, "breakEndTime")
  };

  await saveBookingTimeSlotSettings(settings);

  revalidatePath("/admin/settings");
  revalidatePath("/admin/pricing");
  revalidatePath("/admin/bookings");
  revalidatePath("/book");
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

export async function updateAgentStatus(userId: string, status: "active" | "inactive" | "suspended") {
  const db = getDb();

  if (!userId || !["active", "inactive", "suspended"].includes(status)) {
    throw new Error("Agent status could not be saved.");
  }

  if (status === "active") {
    await db.$transaction([
      db.user.update({ where: { id: userId }, data: { isActive: true } }),
      db.agent.update({ where: { userId }, data: { isApproved: true, isSuspended: false } })
    ]);
  }

  if (status === "inactive") {
    await db.$transaction([
      db.user.update({ where: { id: userId }, data: { isActive: false } }),
      db.agent.update({ where: { userId }, data: { isSuspended: false } })
    ]);
  }

  if (status === "suspended") {
    await db.$transaction([
      db.user.update({ where: { id: userId }, data: { isActive: false } }),
      db.agent.update({ where: { userId }, data: { isApproved: false, isSuspended: true } })
    ]);
  }

  revalidatePath("/admin/agents");
  revalidatePath("/admin/roles");
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
