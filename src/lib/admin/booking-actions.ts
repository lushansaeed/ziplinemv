"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma/client";
import { BookingStatus, PaymentStatus } from "@prisma/client";
import { requirePermission } from "@/lib/auth/permissions";
import { buildWaiverSharePayload, regenerateBookingWaiverLink } from "@/lib/waivers/links";
import { sendBookingWaiverLink } from "@/lib/notifications/email";
import { sendBookingWaiverLinkWhatsApp } from "@/lib/notifications/whatsapp";
import { formatDate } from "@/lib/utils";

export async function updateBookingStatus(bookingId: string, status: BookingStatus) {
  const user = await requirePermission("bookings", "edit");

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
  const user = await requirePermission("payments", "edit");

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
      module:   "payments",
      recordId: bookingId,
      oldValue: { paymentStatus: old?.paymentStatus },
      newValue: { paymentStatus: status },
    },
  });

  revalidatePath("/admin/bookings");
  return { success: true };
}

export async function cancelBooking(bookingId: string, reason?: string) {
  const user = await requirePermission("bookings", "delete");

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

export async function checkInBooking(bookingId: string, notes?: string, overrideIncompleteWaivers = false) {
  try {
    const user = await requirePermission("bookings", "edit");

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        bookingStatus: true,
        numRiders: true,
        waivers: { select: { status: true } },
      },
    });
    if (!booking) return { success: false, error: "Booking not found" };

    const signedWaivers = booking.waivers.filter((waiver) => waiver.status === "SIGNED").length;
    if (signedWaivers < booking.numRiders && !overrideIncompleteWaivers) {
      return {
        success: false,
        error: `Waivers incomplete: ${signedWaivers} of ${booking.numRiders} signed. Admin override is required before check-in.`,
      };
    }

    const existing = await prisma.checkIn.findUnique({ where: { bookingId } });
    if (existing || booking.bookingStatus === BookingStatus.CHECKED_IN) {
      return { success: true };
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
          newValue: { overrideIncompleteWaivers, signedWaivers, requiredWaivers: booking.numRiders },
        },
      }),
    ]);

    revalidatePath("/admin/bookings");
    revalidatePath("/admin/check-in");
    return { success: true };
  } catch (error: any) {
    console.error("[checkInBooking]", error);
    return {
      success: false,
      error: error?.message ?? "Could not check in this booking. Please try again.",
    };
  }
}

export async function completeBooking(bookingId: string) {
  const user = await requirePermission("bookings", "edit");

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
  const user = await requirePermission("bookings", "edit");
  await prisma.booking.update({ where: { id: bookingId }, data: { notes } });
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "BOOKING_NOTES_UPDATED",
      module: "bookings",
      recordId: bookingId,
      newValue: { notes },
    },
  });
  revalidatePath("/admin/bookings");
  return { success: true };
}

export async function getBookingDetail(bookingId: string) {
  await requirePermission("bookings", "view");
  const booking = await prisma.booking.findUnique({
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
  if (!booking) return null;
  const waiverShare = await buildWaiverSharePayload(booking.id);
  return { ...booking, waiverShare };
}

export async function regenerateWaiverLink(bookingId: string) {
  const user = await requirePermission("bookings", "edit");
  const link = await regenerateBookingWaiverLink(bookingId);
  if (!link) return { success: false, error: "Booking not found" };

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "WAIVER_LINK_REGENERATED",
      module: "waivers",
      recordId: bookingId,
      newValue: { token: link.token },
    },
  });

  revalidatePath("/admin/bookings");
  return { success: true };
}

export async function resendWaiverEmail(bookingId: string) {
  const user = await requirePermission("bookings", "edit");
  const result = await sendBookingWaiverLink(bookingId);
  if (!result.sent) return { success: false, error: result.reason ?? result.error ?? "Could not send waiver email" };

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "WAIVER_LINK_EMAIL_RESENT",
      module: "waivers",
      recordId: bookingId,
    },
  });

  return { success: true };
}

export async function resendWaiverWhatsApp(bookingId: string) {
  const user = await requirePermission("bookings", "edit");
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { customer: true, slot: true },
  });
  if (!booking) return { success: false, error: "Booking not found" };

  const waiverShare = await buildWaiverSharePayload(booking.id);
  if (!waiverShare) return { success: false, error: "Waiver link not found" };

  const sent = await sendBookingWaiverLinkWhatsApp({
    phone: booking.customer.phone,
    reference: booking.reference,
    rideDate: formatDate(booking.bookingDate, "EEEE, d MMMM yyyy"),
    rideTime: booking.slot.startTime,
    numberOfRiders: booking.numRiders,
    waiverUrl: waiverShare.url,
  });
  if (!sent) return { success: false, error: "Could not send WhatsApp message" };

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "WAIVER_LINK_WHATSAPP_RESENT",
      module: "waivers",
      recordId: bookingId,
    },
  });

  return { success: true };
}
