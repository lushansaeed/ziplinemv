"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma/client";
import { BookingStatus, PaymentMethod, PaymentStatus, WaiverStatus, WristbandStatus } from "@prisma/client";
import {
  logAudit,
  requirePermission,
  userHasPermission,
  type PermissionAction,
  type PermissionModule,
} from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/actions";
import { ADMIN_ROLES } from "@/lib/auth/roles";
import { buildWaiverSharePayload, generateWaiverToken, regenerateBookingWaiverLink } from "@/lib/waivers/links";
import { sendBookingConfirmation, sendBookingWaiverLink } from "@/lib/notifications/email";
import { sendBookingWaiverLinkWhatsApp } from "@/lib/notifications/whatsapp";
import { formatDate } from "@/lib/utils";
import { syncPaidBookingToOdooSalesOrder } from "@/lib/odoo/bookings";
import { CheckInGateError, completeCheckInTransaction, ensureBookingRiders } from "@/lib/ride-tracking/check-in-gate";
import { isWaiverSignedForRider } from "@/lib/ride-tracking/waiver-matching";
import { ensureRideTrackingLaunchLineColumn } from "@/lib/ride-tracking/schema-guard";
import { createBooking } from "@/lib/booking/create";

function testAddOnKey(name: string) {
  const normalized = name.toLowerCase();
  if (normalized.includes("360") || normalized.includes("insta")) return "insta360";
  if (normalized.includes("photo")) return "photography";
  if (normalized.includes("drone")) return "drone";
  return null;
}

async function createTestBookingInternal({ complimentary = false }: { complimentary?: boolean } = {}) {
  const user = await requirePermission("bookings", "create");
  const packageRecord = await prisma.package.findFirst({
    where: { active: true, activity: { slug: "zipline" } },
    orderBy: [{ featured: "desc" }, { displayOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });

  if (!packageRecord) {
    return { success: false, error: "No active zipline package is configured." };
  }

  const addOns = await prisma.addOn.findMany({
    where: { active: true, activity: { slug: "zipline" } },
    orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, name: true },
  });
  const addOnQuantities: Record<string, number> = {};

  for (const addOn of addOns) {
    const key = testAddOnKey(addOn.name);
    if (key === "insta360") addOnQuantities[addOn.id] = 2;
    if (key === "photography") addOnQuantities[addOn.id] = 1;
    if (key === "drone") addOnQuantities[addOn.id] = 2;
  }

  const timestamp = Date.now();
  const result = await createBooking({
    packageId: packageRecord.id,
    addOnIds: Object.keys(addOnQuantities),
    addOnQuantities,
    riderType: "tourist",
    date: new Date().toISOString().slice(0, 10),
    numRiders: 2,
    customerName: complimentary ? "Complimentary Test Customer" : "Test Booking Customer",
    customerPhone: `+9607${String(timestamp).slice(-6)}`,
    customerPhoneCountry: "MV",
    customerEmail: `${complimentary ? "comp-test-customer" : "test-booking"}-${timestamp}@example.com`,
    customerNationality: "United States",
    customerHotel: complimentary ? "Complimentary Test Hotel" : "Test Hotel",
    riders: [
      { name: "Test Rider 1", age: "30", weight: "70" },
      { name: "Test Rider 2", age: "28", weight: "65" },
    ],
    paymentMethod: "cash",
    source: "WALK_IN",
  });

  if (!result.success || !result.bookingId) {
    return { success: false, error: result.error ?? "Could not create test booking." };
  }

  await prisma.$transaction([
    prisma.booking.update({
      where: { id: result.bookingId },
      data: {
        createdById: user.id,
        paymentStatus: complimentary ? PaymentStatus.COMPLIMENTARY : PaymentStatus.UNPAID,
        paymentMethod: complimentary ? PaymentMethod.COMPLIMENTARY : PaymentMethod.CASH,
        notes: complimentary
          ? "COMPLIMENTARY TEST CUSTOMER - no paid revenue and no Odoo sync."
          : "TEST BOOKING - unpaid by default. Mark paid only when intentionally testing paid/Odoo flow.",
      },
    }),
    ...(complimentary
      ? [
          prisma.payment.create({
            data: {
              bookingId: result.bookingId,
              amount: 0,
              currency: result.currency ?? "USD",
              method: PaymentMethod.COMPLIMENTARY,
              status: PaymentStatus.COMPLIMENTARY,
              reference: "Complimentary test customer",
              metadata: {
                testCustomer: true,
                complimentary: true,
              },
            },
          }),
        ]
      : []),
    prisma.auditLog.create({
      data: {
        userId: user.id,
        action: complimentary ? "COMPLIMENTARY_TEST_CUSTOMER_CREATED" : "TEST_BOOKING_CREATED",
        module: "bookings",
        recordId: result.bookingId,
        newValue: {
          reference: result.reference,
          total: result.total,
          currency: result.currency,
          paymentStatus: complimentary ? "COMPLIMENTARY" : "UNPAID",
        },
      },
    }),
  ]);

  revalidatePath("/admin/bookings");
  return {
    success: true,
    bookingId: result.bookingId,
    reference: result.reference,
    total: result.total,
    currency: result.currency,
  };
}

export async function createTestBooking() {
  return createTestBookingInternal();
}

export async function createComplimentaryTestCustomer() {
  return createTestBookingInternal({ complimentary: true });
}

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
    const paymentMethod = normalizePaymentMethod(method);

    const old = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { paymentStatus: true, total: true, currency: true },
    });

    await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: bookingId },
        data:  {
          paymentStatus:  status,
          paymentMethod,
        },
      });

      if (status === PaymentStatus.PAID) {
        const paidPayment = await tx.payment.findFirst({
          where: { bookingId, status: PaymentStatus.PAID },
          select: { id: true },
        });
        if (!paidPayment && old) {
          await tx.payment.create({
            data: {
              bookingId,
              amount: old.total,
              currency: old.currency,
              method: paymentMethod ?? PaymentMethod.CASH,
              status: PaymentStatus.PAID,
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
          oldValue: { paymentStatus: old?.paymentStatus },
          newValue: { status, paymentMethod },
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

export async function createTestSignedWaivers(bookingId: string) {
  const user = await requirePermission("bookings", "edit");
  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    await ensureBookingRiders(tx, bookingId);

    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: {
        customer: true,
        riders: { orderBy: { id: "asc" } },
        waivers: { orderBy: { createdAt: "asc" } },
        waiverLinks: { where: { isActive: true }, orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
    if (!booking) return { success: false as const, error: "Booking not found" };
    if (booking.riders.length === 0) return { success: false as const, error: "No riders found for this booking." };

    const waiverLink = booking.waiverLinks[0] ?? await tx.bookingWaiverLink.create({
      data: {
        bookingId,
        token: generateWaiverToken(),
        maxSubmissions: booking.numRiders,
      },
    });

    let signedCount = 0;
    const usedWaiverIds = new Set<string>();

    for (let index = 0; index < booking.riders.length; index += 1) {
      const rider = booking.riders[index];
      const existing = booking.waivers.find((waiver) => {
        if (usedWaiverIds.has(waiver.id)) return false;
        return waiver.riderName.trim().toLowerCase() === rider.name.trim().toLowerCase()
          || waiver.status === "PENDING";
      });

      const waiverData = {
        waiverLinkId: waiverLink.id,
        riderName: rider.name || `Rider ${index + 1}`,
        nationality: booking.customer.nationality ?? "Test",
        phoneCountryCode: booking.customer.phoneCountry,
        phoneNumber: booking.customer.phone,
        emergencyContactName: "Test Emergency Contact",
        emergencyContactPhone: booking.customer.phone,
        weight: rider.weight,
        healthDeclarationAnswers: {
          testWaiver: true,
          generatedBy: "admin_test_helper",
          age: rider.age,
          bookingReference: booking.reference,
        },
        riskAcknowledged: true,
        safetyRulesAcknowledged: true,
        mediaConsent: true,
        signatureData: "TEST_WAIVER_SIGNATURE",
        signedAt: now,
        ipAddress: "admin-test-helper",
        userAgent: "admin-test-helper",
        deviceInfo: "Admin generated test waiver",
        submissionMode: "TEST_ADMIN",
        staffAssisted: true,
        status: WaiverStatus.SIGNED,
      };

      if (existing) {
        usedWaiverIds.add(existing.id);
        await tx.waiver.update({
          where: { id: existing.id },
          data: waiverData,
        });
      } else {
        const created = await tx.waiver.create({
          data: {
            bookingId,
            ...waiverData,
          },
        });
        usedWaiverIds.add(created.id);
      }
      signedCount += 1;
    }

    await tx.booking.update({
      where: { id: bookingId },
      data: { waiverStatus: WaiverStatus.SIGNED },
    });

    await tx.bookingWaiverLink.update({
      where: { id: waiverLink.id },
      data: {
        currentSubmissions: Math.max(waiverLink.currentSubmissions, signedCount),
        maxSubmissions: Math.max(waiverLink.maxSubmissions, booking.numRiders),
      },
    });

    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: "TEST_WAIVERS_COMPLETED",
        module: "waivers",
        recordId: bookingId,
        newValue: {
          reference: booking.reference,
          signedCount,
          mode: "admin_test_helper",
        },
      },
    });

    return { success: true as const, signedCount, reference: booking.reference };
  });

  if (!result.success) return result;

  revalidatePath("/admin/bookings");
  revalidatePath("/admin/check-in");
  return result;
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
