"use server";

import { revalidatePath } from "next/cache";
import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { whatsappNumber } from "@/lib/data";
import { getDb } from "@/lib/db";
import { bookingReference, calculateRideTotal, type CustomerType } from "@/lib/pricing";
import { ensureBookableTimeSlot } from "@/lib/booking-time-slots";
import { getPricingEngineConfig } from "@/lib/pricing-engine";

export type BookingActionState = {
  ok: boolean;
  message: string;
  reference?: string;
  whatsappUrl?: string;
};

const bookingSchema = z.object({
  customerName: z.string().trim().min(2, "Enter the customer name."),
  nationality: z.string().trim().min(2, "Enter the nationality."),
  customerType: z.enum(["tourist", "local", "maafushi"]),
  phone: z.string().trim().min(6, "Enter a valid phone or WhatsApp number."),
  email: z.string().trim().email("Enter a valid email address."),
  preferredDate: z.string().min(1, "Choose a preferred date."),
  timeSlot: z.string().min(1, "Choose a time slot."),
  adults: z.coerce.number().int().min(0),
  children: z.coerce.number().int().min(0),
  paymentMethod: z.string().trim().min(2, "Choose a payment method."),
  coupon: z.string().trim().optional().default(""),
  specialNotes: z.string().trim().optional().default(""),
  acceptedTerms: z.literal("on", {
    errorMap: () => ({ message: "Accept the safety terms and cancellation policy." })
  }),
  addons: z.array(z.string()).default([])
});

type TransactionClient = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

function formValues(formData: FormData) {
  return {
    customerName: formData.get("customerName"),
    nationality: formData.get("nationality"),
    customerType: formData.get("customerType"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    preferredDate: formData.get("preferredDate"),
    timeSlot: formData.get("timeSlot"),
    adults: formData.get("adults"),
    children: formData.get("children"),
    paymentMethod: formData.get("paymentMethod"),
    coupon: formData.get("coupon"),
    specialNotes: formData.get("specialNotes"),
    acceptedTerms: formData.get("acceptedTerms"),
    addons: formData.getAll("addons")
  };
}

export async function createBookingAction(_: BookingActionState, formData: FormData): Promise<BookingActionState> {
  const parsed = bookingSchema.safeParse(formValues(formData));

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Please check the booking details."
    };
  }

  const values = parsed.data;
  const riderCount = values.adults + values.children;

  if (riderCount < 1) {
    return { ok: false, message: "Add at least one rider." };
  }

  const pricingEngine = await getPricingEngineConfig();
  const selectedAddOns = pricingEngine.addOns.filter((item) => item.enabled && values.addons.includes(item.id));
  const addOnUsdTotal = selectedAddOns.reduce((sum, item) => sum + (item.currency === "USD" ? item.price : item.price / pricingEngine.pricing.exchangeRateMvrPerUsd), 0);
  const price = calculateRideTotal(values.customerType as CustomerType, { adults: values.adults, children: values.children }, addOnUsdTotal, Boolean(values.coupon), pricingEngine.pricing);
  const db = getDb();

  try {
    const booking = await db.$transaction(async (tx: TransactionClient) => {
      const timeSlot = await ensureBookableTimeSlot(tx, values.preferredDate, values.timeSlot, riderCount);

      const customer = await tx.customer.create({
        data: {
          name: values.customerName,
          nationality: values.nationality,
          phone: values.phone,
          email: values.email,
          isTourist: values.customerType === "tourist"
        }
      });

      return tx.booking.create({
        data: {
          reference: bookingReference(),
          customerId: customer.id,
          date: timeSlot.startsAt,
          timeSlotId: timeSlot.id,
          riderCount,
          totalAmount: price.total,
          currency: price.currency,
          paymentStatus: "UNPAID",
          bookingStatus: "PENDING",
          internalNotes: values.specialNotes || null,
          commissionAmount: values.coupon ? price.discount : null,
          riders: {
            create: [
              ...Array.from({ length: values.adults }, () => ({ type: "ADULT" })),
              ...Array.from({ length: values.children }, () => ({ type: "CHILD" }))
            ]
          },
          addons: {
            create: selectedAddOns.map((item) => ({
              addonKey: item.id,
              label: item.label,
              price: price.currency === item.currency ? item.price : price.currency === "MVR" ? item.price * pricingEngine.pricing.exchangeRateMvrPerUsd : item.price / pricingEngine.pricing.exchangeRateMvrPerUsd,
              currency: price.currency
            }))
          },
          payments: {
            create: {
              amount: price.total,
              currency: price.currency,
              method: values.paymentMethod,
              status: "UNPAID"
            }
          }
        }
      });
    });

    revalidatePath("/admin/bookings");

    return {
      ok: true,
      message: "Booking request saved. The team can now approve, collect payment, and confirm the ride.",
      reference: booking.reference,
      whatsappUrl: `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Booking reference ${booking.reference}`)}`
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not save this booking right now."
    };
  }
}
