"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma/client";
import { BookingStatus, PaymentStatus } from "@prisma/client";
import { requireRole } from "@/lib/auth/actions";
import { BOOKING_ACCESS } from "@/lib/auth/roles";

export async function updateBookingStatus(bookingId: string, status: BookingStatus) {
  const user = await requireRole(BOOKING_ACCESS as any);

  const old = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { bookingStatus: true, reference: true },
  });

  await prisma.booking.update({
    where: { id: bookingId },
    data:  { bookingStatus: status },
  });

  await prisma.auditLog.create({
    data: {
      userId:   user.id,
      action:   "BOOKING_STATUS_UPDATED",
      module:   "bookings",
      recordId: bookingId,
      oldValue: { bookingStatus: old?.bookingStatus },
      newValue: { bookingStatus: status },
    },
  });

  revalidatePath("/admin/bookings");
  return { success: true };
}

export async function updatePaymentStatus(bookingId: string, status: PaymentStatus, method?: string) {
  const user = await requireRole(BOOKING_ACCESS as any);

  const old = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { paymentStatus: true },
  });

  await prisma.booking.update({
    where: { id: bookingId },
    data:  {
      paymentStatus:  status,
      paymentMethod:  method as any ?? undefined,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId:   user.id,
      action:   "PAYMENT_STATUS_UPDATED",
      module:   "bookings",
      recordId: bookingId,
      oldValue: { paymentStatus: old?.paymentStatus },
      newValue: { paymentStatus: status },
    },
  });

  revalidatePath("/admin/bookings");
  return { success: true };
}

export async function cancelBooking(bookingId: string, reason?: string) {
  const user = await requireRole(BOOKING_ACCESS as any);

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { slotId: true, numRiders: true, reference: true, bookingStatus: true },
  });

  if (!booking) return { success: false, error: "Booking not found" };
  if (booking.bookingStatus === "CANCELLED") return { success: false, error: "Already cancelled" };

  await prisma.$transaction([
    prisma.booking.update({
      where: { id: bookingId },
      data:  { bookingStatus: BookingStatus.CANCELLED, notes: reason ? `Cancelled: ${reason}` : undefined },
    }),
    prisma.timeSlot.update({
      where: { id: booking.slotId },
      data:  { bookedCount: { decrement: booking.numRiders } },
    }),
    prisma.auditLog.create({
      data: {
        userId:   user.id,
        action:   "BOOKING_CANCELLED",
        module:   "bookings",
        recordId: bookingId,
        newValue: { reason, reference: booking.reference },
      },
    }),
  ]);

  revalidatePath("/admin/bookings");
  return { success: true };
}

export async function checkInBooking(bookingId: string, notes?: string) {
  const user = await requireRole(BOOKING_ACCESS as any);

  const existing = await prisma.checkIn.findUnique({ where: { bookingId } });
  if (existing) {
    return { success: false, error: "Already checked in" };
  }

  await prisma.$transaction([
    prisma.booking.update({
      where: { id: bookingId },
      data:  { bookingStatus: BookingStatus.CHECKED_IN },
    }),
    prisma.checkIn.create({
      data: {
        bookingId,
        checkedInById: user.id,
        notes,
      },
    }),
    prisma.auditLog.create({
      data: {
        userId:   user.id,
        action:   "BOOKING_CHECKED_IN",
        module:   "bookings",
        recordId: bookingId,
      },
    }),
  ]);

  revalidatePath("/admin/bookings");
  revalidatePath("/admin/check-in");
  return { success: true };
}

export async function completeBooking(bookingId: string) {
  const user = await requireRole(BOOKING_ACCESS as any);

  await prisma.booking.update({
    where: { id: bookingId },
    data:  { bookingStatus: BookingStatus.COMPLETED },
  });

  await prisma.auditLog.create({
    data: {
      userId:   user.id,
      action:   "BOOKING_COMPLETED",
      module:   "bookings",
      recordId: bookingId,
    },
  });

  revalidatePath("/admin/bookings");
  return { success: true };
}

export async function updateBookingNotes(bookingId: string, notes: string) {
  await requireRole(BOOKING_ACCESS as any);
  await prisma.booking.update({ where: { id: bookingId }, data: { notes } });
  revalidatePath("/admin/bookings");
  return { success: true };
}

export async function getBookingDetail(bookingId: string) {
  await requireRole(BOOKING_ACCESS as any);
  return prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      customer:    true,
      package:     true,
      slot:        true,
      riders:      true,
      addOns:      { include: { addOn: true } },
      waivers:     true,
      payments:    true,
      checkIn:     { include: { checkedInBy: { select: { name: true } } } },
      agent:       { select: { businessName: true, contactPerson: true, phone: true } },
      affiliate:   { select: { name: true } },
      agentCommission:     true,
      affiliateCommission: true,
      mediaDelivery:       true,
    },
  });
}
