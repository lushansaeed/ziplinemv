"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma/client";
import { BookingStatus, MediaFolderStatus, PaymentMethod, PaymentStatus, WristbandStatus } from "@prisma/client";
import {
  logAudit,
  requirePermission,
  userHasPermission,
  type PermissionAction,
  type PermissionModule,
} from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/actions";
import { ADMIN_ROLES } from "@/lib/auth/roles";
import { buildWaiverSharePayload, regenerateBookingWaiverLink } from "@/lib/waivers/links";
import { sendBookingConfirmation, sendBookingWaiverLink } from "@/lib/notifications/email";
import { sendBookingWaiverLinkWhatsApp } from "@/lib/notifications/whatsapp";
import { formatDate } from "@/lib/utils";
import { syncPaidBookingToOdooSalesOrder } from "@/lib/odoo/bookings";
import { CheckInGateError, completeCheckInTransaction, ensureBookingRiders } from "@/lib/ride-tracking/check-in-gate";
import { isWaiverSignedForRider } from "@/lib/ride-tracking/waiver-matching";
import { ensureRideTrackingLaunchLineColumn } from "@/lib/ride-tracking/schema-guard";
import { ensureBookingMediaColumns } from "@/lib/booking/media-schema-guard";
import { ensureMediaFolderForBooking, markMediaFolderStatus, sendMediaFolderEmail } from "@/lib/booking/media-folder";
import { ensureDayEndReportingSchema } from "@/lib/reports/day-end-schema-guard";

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
  if (status === BookingStatus.CHECKED_IN) {
    ensureMediaFolderForBooking(bookingId).catch((error) => {
      console.error("[updateBookingStatus:googleDrive]", error?.message ?? error);
    });
  }
  if (status === BookingStatus.COMPLETED || status === BookingStatus.COMPLETED_WITH_REMARKS) {
    sendMediaFolderEmail(bookingId, { userId: user.id }).then((result) => {
      if (result.skipped) console.info("[updateBookingStatus:mediaFolderEmailSkipped]", result.reason);
    }).catch((error) => {
      console.error("[updateBookingStatus:mediaFolderEmail]", error?.message ?? error);
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

async function requireActionPermission(module: PermissionModule, action: PermissionAction) {
  const user = await getCurrentUser();
  if (!user || user.status !== "ACTIVE" || !ADMIN_ROLES.includes(user.role as any)) {
    return { ok: false as const, error: "You do not have permission to perform this action." };
  }

  const allowed = await userHasPermission(user.id, user.role, module, action);
  if (!allowed) {
    await logAudit({
      userId: user.id,
      action: "RESTRICTED_ACTION_ATTEMPT",
      module,
      newValue: { permission: `${module}.${action}` },
    }).catch((error) => {
      console.error("[requireActionPermission:audit]", error?.message ?? error);
    });

    return { ok: false as const, error: "You do not have permission to update payments." };
  }

  return { ok: true as const, user };
}

export async function updatePaymentStatus(bookingId: string, status: PaymentStatus, method?: string) {
  try {
    const auth = await requireActionPermission("payments", "edit");
    if (!auth.ok) return { success: false, error: auth.error };

    const user = auth.user;
    await ensureDayEndReportingSchema();
    const paymentMethod = normalizePaymentMethod(method);

    const old = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { paymentStatus: true, paymentMethod: true, total: true, currency: true },
    });
    const nextPaymentMethod = status === PaymentStatus.COMPLIMENTARY
      ? PaymentMethod.COMPLIMENTARY
      : paymentMethod ?? old?.paymentMethod ?? undefined;

    await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: bookingId },
        data:  {
          paymentStatus:  status,
          ...(nextPaymentMethod ? { paymentMethod: nextPaymentMethod } : {}),
        },
      });

      if (old?.paymentStatus !== status || old?.paymentMethod !== nextPaymentMethod) {
        await tx.paymentMethodChange.create({
          data: {
            bookingId,
            previousStatus: old?.paymentStatus,
            newStatus: status,
            previousMethod: old?.paymentMethod,
            newMethod: nextPaymentMethod,
            changedByUserId: user.id,
            note: "Updated from admin booking details.",
          },
        });
      }

      if (status === PaymentStatus.PAID || status === PaymentStatus.COMPLIMENTARY) {
        const paidPayment = await tx.payment.findFirst({
          where: { bookingId, status: { in: [PaymentStatus.PAID, PaymentStatus.COMPLIMENTARY] } },
          select: { id: true },
        });
        if (!paidPayment && old) {
          await tx.payment.create({
            data: {
              bookingId,
              amount: old.total,
              currency: old.currency,
              method: status === PaymentStatus.COMPLIMENTARY ? PaymentMethod.COMPLIMENTARY : nextPaymentMethod ?? PaymentMethod.CASH,
              collectedAmount: status === PaymentStatus.COMPLIMENTARY ? null : old.total,
              collectedCurrency: status === PaymentStatus.COMPLIMENTARY ? null : old.currency,
              receivedByUserId: user.id,
              approvedByUserId: status === PaymentStatus.COMPLIMENTARY ? user.id : null,
              status,
              reference: "Marked paid from admin",
            },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          userId:   user.id,
          action:   "PAYMENT_STATUS_UPDATED",
          module:   "payments",
          recordId: bookingId,
          oldValue: { paymentStatus: old?.paymentStatus, paymentMethod: old?.paymentMethod },
          newValue: { status, paymentMethod: nextPaymentMethod },
        },
      });
    });

    revalidatePath("/admin/bookings");
    revalidatePath("/admin/check-in");

    if (status === PaymentStatus.PAID) {
      await syncPaidBookingToOdooSalesOrder(bookingId).catch((error) => {
        console.error("[updatePaymentStatus:odooSync]", error?.message ?? error);
      });
      revalidatePath("/admin/bookings");
    }

    return { success: true };
  } catch (error: any) {
    console.error("[updatePaymentStatus]", error);
    return {
      success: false,
      error: error?.message ?? "Could not update payment status. Please try again.",
    };
  }
}

export async function retryOdooSync(bookingId: string) {
  const user = await requirePermission("bookings", "edit");

  try {
    const result = await syncPaidBookingToOdooSalesOrder(bookingId, { force: true });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "ODOO_SYNC_RETRIED",
        module: "bookings",
        recordId: bookingId,
        newValue: result,
      },
    });

    revalidatePath("/admin/bookings");
    return { success: true, result };
  } catch (error: any) {
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "ODOO_SYNC_RETRY_FAILED",
        module: "bookings",
        recordId: bookingId,
        newValue: { error: error?.message ?? "Odoo sync failed." },
      },
    }).catch(() => {});

    revalidatePath("/admin/bookings");
    return { success: false, error: error?.message ?? "Odoo sync failed." };
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
  const unsigned = riders.filter((r) => !isWaiverSignedForRider(r, waivers, riders));

  if (unsigned.length === 0) return null;
  const names = unsigned.map((r) => `"${r.name}"`).join(", ");
  return `Action blocked. Waiver form is not completed for rider(s): ${names}. No role can override this requirement.`;
}

export async function checkInBooking(bookingId: string, notes?: string) {
  let user: Awaited<ReturnType<typeof requirePermission>> | null = null;
  try {
    user = await requirePermission("bookings", "edit");
    const userId = user.id;
    await ensureRideTrackingLaunchLineColumn();

    await prisma.$transaction(async (tx) => {
      await completeCheckInTransaction(tx, { bookingId, userId, notes });
    });

    await ensureMediaFolderForBooking(bookingId).catch((error) => {
      console.error("[checkInBooking:googleDrive]", error?.message ?? error);
    });

    revalidatePath("/admin/bookings");
    revalidatePath("/admin/check-in");
    return { success: true };
  } catch (error: any) {
    console.error("[checkInBooking]", error);
    if (error instanceof CheckInGateError) {
      await prisma.auditLog.create({
        data: {
          userId: user?.id,
          action: "CHECK_IN_BLOCKED",
          module: "bookings",
          recordId: bookingId,
          newValue: {
            result: "failed",
            reason: error.code,
            errorMessage: error.message,
          },
        },
      }).catch(() => {});
      return { success: false, error: error.message };
    }
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

  const now = new Date();
  const releasedWristbands = await prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: bookingId },
      data:  { bookingStatus: BookingStatus.COMPLETED },
    });

    const wristbandIds = (await tx.rideTracking.findMany({
      where: { bookingId, wristbandId: { not: null } },
      select: { wristbandId: true },
    }))
      .map((tracking) => tracking.wristbandId)
      .filter((id): id is string => Boolean(id));

    if (wristbandIds.length > 0) {
      await tx.qRWristband.updateMany({
        where: {
          id: { in: wristbandIds },
          currentBookingId: bookingId,
        },
        data: {
          status: WristbandStatus.AVAILABLE,
          currentBookingId: null,
          currentRiderId: null,
          releasedAt: now,
        },
      });
    }

    return wristbandIds.length;
  });

  await prisma.auditLog.create({
    data: {
      userId:   user.id,
      action:   "BOOKING_COMPLETED",
      module:   "bookings",
      recordId: bookingId,
      newValue: { releasedWristbands },
    },
  });

  const mediaEmailResult = await sendMediaFolderEmail(bookingId, { userId: user.id }).catch(async (error) => {
    console.error("[completeBooking:mediaFolderEmail]", error?.message ?? error);
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "MEDIA_FOLDER_EMAIL_FAILED",
        module: "media",
        recordId: bookingId,
        newValue: { error: error?.message ?? "Media folder email failed." },
      },
    }).catch(() => {});
    return { sent: false, skipped: false, error: error?.message ?? "Media folder email failed." };
  });
  if (mediaEmailResult.skipped) {
    console.info("[completeBooking:mediaFolderEmailSkipped]", "reason" in mediaEmailResult ? mediaEmailResult.reason : "Unknown reason");
  }

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
  await ensureBookingMediaColumns();
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
      paymentMethodChanges: { orderBy: { createdAt: "desc" }, take: 10 },
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

export async function resendMediaFolderEmail(bookingId: string) {
  const user = await requirePermission("media", "send");
  try {
    const result = await sendMediaFolderEmail(bookingId, { force: true, userId: user.id });
    revalidatePath("/admin/bookings");
    return result.sent
      ? { success: true }
      : { success: false, error: result.reason ?? result.error ?? "Media folder email was not sent." };
  } catch (error: any) {
    console.error("[resendMediaFolderEmail]", error?.message ?? error);
    return { success: false, error: error?.message ?? "Could not resend media folder email." };
  }
}

export async function createMediaFolderForBooking(bookingId: string) {
  await requirePermission("media", "edit");
  try {
    const result = await ensureMediaFolderForBooking(bookingId);
    revalidatePath("/admin/bookings");
    revalidatePath("/admin/dashboard");
    return { success: true, folderUrl: result.folderUrl, created: result.created };
  } catch (error: any) {
    console.error("[createMediaFolderForBooking]", error?.message ?? error);
    return { success: false, error: error?.message ?? "Could not create Google Drive media folder." };
  }
}

export async function recreateMediaFolderForBooking(bookingId: string) {
  await requirePermission("media", "edit");
  try {
    const result = await ensureMediaFolderForBooking(bookingId, { force: true });
    revalidatePath("/admin/bookings");
    revalidatePath("/admin/dashboard");
    return { success: true, folderUrl: result.folderUrl, created: result.created };
  } catch (error: any) {
    console.error("[recreateMediaFolderForBooking]", error?.message ?? error);
    return { success: false, error: error?.message ?? "Could not recreate Google Drive media folder." };
  }
}

export async function updateMediaFolderStatus(bookingId: string, status: MediaFolderStatus) {
  const user = await requirePermission("media", "edit");
  try {
    await markMediaFolderStatus(bookingId, status, user.id);
    revalidatePath("/admin/bookings");
    revalidatePath("/admin/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("[updateMediaFolderStatus]", error?.message ?? error);
    return { success: false, error: error?.message ?? "Could not update media status." };
  }
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
