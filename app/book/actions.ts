"use server";

import { revalidatePath } from "next/cache";
import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { addOns, whatsappNumber } from "@/lib/data";
import { getDb } from "@/lib/db";
import { bookingReference, calculateRideTotal, type CustomerType } from "@/lib/pricing";

export type BookingActionState = {
  ok: boolean;
  message: string;
  reference?: string;
  whatsappUrl?: string;
};

const bookingSchema = z.object({
  customerName: z.string().trim().min(2, "Enter the customer name."),
  nationality: z.string().trim().min(2, "Enter the nationality."),
  customerType: z.enum(["tourist", "local"]),
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

function slotStart(preferredDate: string, timeSlot: string) {
  const [hours = "0", minutes = "0"] = timeSlot.split(":");
  const date = new Date(`${preferredDate}T00:00:00.000`);
  date.setHours(Number(hours), Number(minutes), 0, 0);
  return date;
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

  const selectedAddOns = addOns.filter((item) => values.addons.includes(item.id));
  const addOnUsdTotal = selectedAddOns.reduce((sum, item) => sum + item.usd, 0);
  const price = calculateRideTotal(values.customerType as CustomerType, { adults: values.adults, children: values.children }, addOnUsdTotal, Boolean(values.coupon));
  const startsAt = slotStart(values.preferredDate, values.timeSlot);
  const db = getDb();

  try {
    const booking = await db.$transaction(async (tx: TransactionClient) => {
      let timeSlot = await tx.timeSlot.findFirst({
        where: {
          label: values.timeSlot,
          startsAt
        }
      });

      if (!timeSlot) {
        timeSlot = await tx.timeSlot.create({
          data: {
            label: values.timeSlot,
            startsAt,
            maxRiders: 8,
            isActive: true
          }
        });
      }

      if (!timeSlot.isActive) {
        throw new Error("This time slot is not available.");
      }

      const booked = await tx.booking.aggregate({
        _sum: { riderCount: true },
        where: {
          timeSlotId: timeSlot.id,
          bookingStatus: {
            notIn: ["CANCELLED", "NO_SHOW", "REFUNDED"]
          }
        }
      });

      const bookedRiders = booked._sum.riderCount ?? 0;

      if (bookedRiders + riderCount > timeSlot.maxRiders) {
        throw new Error(`Only ${Math.max(timeSlot.maxRiders - bookedRiders, 0)} seats are left for ${values.timeSlot}.`);
      }

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
          date: startsAt,
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
              price: values.customerType === "tourist" ? item.usd : item.usd * 20,
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
