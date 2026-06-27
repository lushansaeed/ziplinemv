"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma/client";
import { BookingStatus, PaymentMethod, PaymentStatus } from "@prisma/client";
import { requirePermission } from "@/lib/auth/permissions";
import { buildWaiverSharePayload, regenerateBookingWaiverLink } from "@/lib/waivers/links";
import { sendBookingConfirmation, sendBookingWaiverLink } from "@/lib/notifications/email";
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

  if (status === BookingStatus.CONFIRMED) {
    sendBookingConfirmation(bookingId).catch((error) => {
      console.error("[updateBookingStatus:sendBookingConfirmation]", error?.message ?? error);
    });
  }

  revalidatePath("/admin/bookings");
  return { success: true };
}

function normalizePaymentMethod(method?: string): PaymentMethod | undefined {
  const normalized = String(method ?? "").trim().toUpperCase();
  if (!normalized) return undefined;
  if (normalized in PaymentMethod) return PaymentMethod[normalized as keyof typeof PaymentMethod];
  return undefined;
}

export async function updatePaymentStatus(bookingId: string, status: PaymentStatus, method?: string) {
  try {
    const user = await requirePermission("payments", "edit");
    const paymentMethod = normalizePaymentMethod(method);

    const old = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { paymentStatus: true },
    });

    await prisma.booking.update({
      where: { id: bookingId },
      data:  {
        paymentStatus:  status,
        paymentMethod,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId:   user.id,
        action:   "PAYMENT_STATUS_UPDATED",
        module:   "payments",
        recordId: bookingId,
        oldValue: { paymentStatus: old?.paymentStatus },
        newValue: { paymentStatus: status, paymentMethod },
      },
    });

    revalidatePath("/admin/bookings");
    revalidatePath("/admin/check-in");
    return { success: true };
  } catch (error: any) {
    console.error("[updatePaymentStatus]", error);
    return {
      success: false,
      error: error?.message ?? "Could not update payment status. Please try again.",
    };
  }
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

// ── Hard waiver gate — no role can bypass this ────────────────────────────────
// Checks that every rider in the booking has a SIGNED waiver.
// Returns null if all signed, or an error string listing unsigned riders.
async function assertAllWaiversSigned(bookingId: string): Promise<string | null> {
  const riders  = await prisma.bookingRider.findMany({ where: { bookingId } });
  const waivers = await prisma.waiver.findMany({
    where:  { bookingId, status: "SIGNED" },
    select: { riderId: true, riderName: true },
  });
  const signedNames     = new Set(waivers.map((w) => w.riderName.toLowerCase().trim()));
  const signedRiderIds  = new Set(waivers.map((w) => w.riderId).filter(Boolean));

  const unsigned = riders.filter(
    (r) =>
      !(r.riderId ? signedRiderIds.has(r.riderId) : false) &&
      !signedNames.has(r.name.toLowerCase().trim())
  );

  if (unsigned.length === 0) return null;
  const names = unsigned.map((r) => `"${r.name}"`).join(", ");
  return `Action blocked. Waiver form is not completed for rider(s): ${names}. No role can override this requirement.`;
}

export async function checkInBooking(bookingId: string, notes?: string) {
  try {
    const user = await requirePermission("bookings", "edit");

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { bookingStatus: true, numRiders: true, waivers: { select: { status: true } } },
    });
    if (!booking) return { success: false, error: "Booking not found" };

    // Hard waiver gate — unconditional, no override parameter accepted
    const waiverError = await assertAllWaiversSigned(bookingId);
    if (waiverError) {
      await prisma.auditLog.create({
        data: {
          userId:   user.id,
          action:   "CHECK_IN_BLOCKED_WAIVER_INCOMPLETE",
          module:   "bookings",
          recordId: bookingId,
          newValue: {
            reason:          "waiver_not_completed",
            signedWaivers:   booking.waivers.filter((w) => w.status === "SIGNED").length,
            requiredWaivers: booking.numRiders,
            errorMessage:    waiverError,
          },
        },
      });
      return { success: false, error: waiverError };
    }

    const existing = await prisma.checkIn.findUnique({ where: { bookingId } });
    if (existing || booking.bookingStatus === BookingStatus.CHECKED_IN) {
      return { success: true };
    }

    const signedWaivers = booking.waivers.filter((w) => w.status === "SIGNED").length;
    await prisma.$transaction([
      prisma.booking.update({
        where: { id: bookingId },
        data:  { bookingStatus: BookingStatus.CHECKED_IN },
      }),
      prisma.checkIn.create({
        data: { bookingId, checkedInById: user.id, notes },
      }),
      prisma.auditLog.create({
        data: {
          userId:   user.id,
          action:   "BOOKING_CHECKED_IN",
          module:   "bookings",
          recordId: bookingId,
          newValue: { signedWaivers, requiredWaivers: booking.numRiders, waiverOverride: false },
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

  // Hard waiver gate — no role can complete a booking without all waivers signed
  const waiverError = await assertAllWaiversSigned(bookingId);
  if (waiverError) {
    await prisma.auditLog.create({
      data: {
        userId:   user.id,
        action:   "COMPLETE_BLOCKED_WAIVER_INCOMPLETE",
        module:   "bookings",
        recordId: bookingId,
        newValue: { reason: "waiver_not_completed", errorMessage: waiverError },
      },
    });
    return { success: false, error: waiverError };
  }

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

export async function resendBookingConfirmationEmail(bookingId: string) {
  const user = await requirePermission("bookings", "edit");
  const result = await sendBookingConfirmation(bookingId);

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "BOOKING_CONFIRMATION_EMAIL_RESENT",
      module: "bookings",
      recordId: bookingId,
      newValue: result,
    },
  });

  revalidatePath("/admin/bookings");
  return result.sent
    ? { success: true }
    : { success: false, error: result.error ?? result.reason ?? "Confirmation email was not sent." };
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
