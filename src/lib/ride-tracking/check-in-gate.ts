import {
  BookingStatus,
  PaymentStatus,
  Prisma,
  RiderTrackingStatus,
  WristbandStatus,
} from "@prisma/client";
import { isWaiverSignedForRider } from "@/lib/ride-tracking/waiver-matching";

export const CHECK_IN_PAYMENT_STATUSES = new Set<PaymentStatus>([
  PaymentStatus.PAID,
  PaymentStatus.COMPLIMENTARY,
]);

const BLOCKED_BOOKING_STATUSES = new Set<BookingStatus>([
  BookingStatus.CANCELLED,
  BookingStatus.COMPLETED,
  BookingStatus.COMPLETED_WITH_REMARKS,
  BookingStatus.NO_SHOW,
  BookingStatus.WEATHER_CANCELLED,
  BookingStatus.RESCHEDULED,
  BookingStatus.REFUNDED,
]);

export type WristbandAssignmentInput = {
  bookingRiderId: string;
  wristbandQrCode: string;
};

export class CheckInGateError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status = 422
  ) {
    super(message);
    this.name = "CheckInGateError";
  }
}

function decimalNumber(value: Prisma.Decimal | number | string | null | undefined) {
  return Number(value ?? 0);
}

export async function ensureBookingRiders(tx: Prisma.TransactionClient, bookingId: string) {
  const booking = await tx.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      numRiders: true,
      riders: { select: { id: true } },
      waivers: {
        where: { status: "SIGNED" },
        orderBy: { signedAt: "asc" },
        select: {
          riderName: true,
          weight: true,
          healthDeclarationAnswers: true,
        },
      },
    },
  });

  if (!booking || booking.riders.length > 0) return;

  const fallbackCount = Math.max(booking.numRiders, booking.waivers.length, 1);
  await tx.bookingRider.createMany({
    data: Array.from({ length: fallbackCount }, (_, index) => {
      const waiver = booking.waivers[index];
      const answers = waiver?.healthDeclarationAnswers && typeof waiver.healthDeclarationAnswers === "object"
        ? waiver.healthDeclarationAnswers as Record<string, unknown>
        : {};
      const parsedAge = answers.age == null ? null : Number(answers.age);

      return {
        bookingId,
        name: waiver?.riderName?.trim() || `Rider ${index + 1}`,
        age: Number.isFinite(parsedAge) ? parsedAge : null,
        weight: waiver?.weight ?? null,
      };
    }),
  });

  await tx.auditLog.create({
    data: {
      action: "BOOKING_RIDERS_BACKFILLED",
      module: "bookings",
      recordId: bookingId,
      newValue: {
        reason: "legacy_booking_missing_rider_rows",
        riderCount: fallbackCount,
      },
    },
  });
}

export async function validateBookingCanCheckIn(
  tx: Prisma.TransactionClient,
  bookingId: string,
  assignments: WristbandAssignmentInput[] = []
) {
  await ensureBookingRiders(tx, bookingId);

  const booking = await tx.booking.findUnique({
    where: { id: bookingId },
    include: {
      riders: true,
      waivers: { select: { riderId: true, riderName: true, status: true } },
      payments: { select: { amount: true, status: true } },
      checkIn: { select: { id: true } },
      rideTrackings: {
        select: {
          bookingRiderId: true,
          wristbandId: true,
          wristband: {
            select: {
              id: true,
              qrCode: true,
              status: true,
              currentBookingId: true,
              currentRiderId: true,
            },
          },
        },
      },
    },
  });

  if (!booking) {
    throw new CheckInGateError("Booking not found", "booking_not_found", 404);
  }

  if (BLOCKED_BOOKING_STATUSES.has(booking.bookingStatus)) {
    throw new CheckInGateError(
      `Check-in blocked. Booking is ${booking.bookingStatus.toLowerCase().replace(/_/g, " ")}.`,
      "booking_not_active"
    );
  }

  if (!CHECK_IN_PAYMENT_STATUSES.has(booking.paymentStatus)) {
    throw new CheckInGateError(
      "Check-in blocked. Payment has not been settled for this booking.",
      "payment_not_settled"
    );
  }

  if (booking.paymentStatus === PaymentStatus.PAID) {
    const paidAmount = booking.payments
      .filter((payment) => payment.status === PaymentStatus.PAID)
      .reduce((sum, payment) => sum + decimalNumber(payment.amount), 0);
    if (paidAmount + 0.001 < decimalNumber(booking.total)) {
      throw new CheckInGateError(
        "Check-in blocked. Payment has not been settled for this booking.",
        "payment_record_missing_or_incomplete"
      );
    }
  }

  if (booking.riders.length === 0) {
    throw new CheckInGateError("Check-in blocked. No riders found for this booking.", "riders_missing");
  }

  const unsignedRiders = booking.riders.filter((rider) => !isWaiverSignedForRider(rider, booking.waivers, booking.riders));
  if (unsignedRiders.length > 0) {
    throw new CheckInGateError(
      `Action blocked. Waiver form is not completed for rider(s): ${unsignedRiders.map((r) => `"${r.name}"`).join(", ")}.`,
      "waiver_not_completed"
    );
  }

  const existingByRider = new Map(
    booking.rideTrackings
      .filter((tracking) => tracking.wristband)
      .map((tracking) => [tracking.bookingRiderId, tracking])
  );
  const assignmentByRider = new Map<string, string>();
  const qrCodes = new Set<string>();

  for (const assignment of assignments) {
    const riderId = String(assignment.bookingRiderId ?? "").trim();
    const qrCode = String(assignment.wristbandQrCode ?? "").trim();
    if (!riderId || !qrCode) {
      throw new CheckInGateError(
        "Check-in blocked. Please assign a wristband QR to each rider before check-in.",
        "wristband_missing"
      );
    }
    if (assignmentByRider.has(riderId)) {
      throw new CheckInGateError("Check-in blocked. Duplicate wristband assignment found.", "duplicate_assignment");
    }
    if (qrCodes.has(qrCode)) {
      throw new CheckInGateError("Check-in blocked. The same wristband QR cannot be assigned to multiple riders.", "duplicate_wristband");
    }
    assignmentByRider.set(riderId, qrCode);
    qrCodes.add(qrCode);
  }

  const missingAssignments = booking.riders.filter((rider) => {
    const existing = existingByRider.get(rider.id)?.wristband;
    const lockedToThisRider = existing
      && existing.currentBookingId === booking.id
      && existing.currentRiderId === rider.id
      && existing.status === WristbandStatus.ACTIVE;
    return !lockedToThisRider && !assignmentByRider.has(rider.id);
  });

  if (missingAssignments.length > 0) {
    throw new CheckInGateError(
      "Check-in blocked. Please assign a wristband QR to each rider before check-in.",
      "wristband_missing"
    );
  }

  const unknownRider = Array.from(assignmentByRider.keys()).find((riderId) => !booking.riders.some((rider) => rider.id === riderId));
  if (unknownRider) {
    throw new CheckInGateError("Check-in blocked. Wristband assignment contains a rider that is not in this booking.", "rider_not_found");
  }

  const wristbands = qrCodes.size
    ? await tx.qRWristband.findMany({ where: { qrCode: { in: Array.from(qrCodes) } } })
    : [];
  const wristbandByQr = new Map(wristbands.map((wristband) => [wristband.qrCode, wristband]));

  for (const [bookingRiderId, qrCode] of Array.from(assignmentByRider.entries())) {
    const wristband = wristbandByQr.get(qrCode);
    if (!wristband) {
      throw new CheckInGateError(`Wristband "${qrCode}" not found in system.`, "wristband_not_found");
    }
    if (wristband.status !== WristbandStatus.AVAILABLE || wristband.currentRiderId || wristband.currentBookingId) {
      throw new CheckInGateError("This wristband is already linked to another active rider.", "wristband_already_active");
    }
    if (!booking.riders.some((rider) => rider.id === bookingRiderId)) {
      throw new CheckInGateError("Check-in blocked. Wristband assignment contains a rider that is not in this booking.", "rider_not_found");
    }
  }

  return {
    booking,
    assignmentByRider,
    wristbandByQr,
  };
}

export async function linkWristbandToRider(
  tx: Prisma.TransactionClient,
  bookingId: string,
  bookingRiderId: string,
  wristbandQrCode: string
) {
  const wristband = await tx.qRWristband.findUnique({ where: { qrCode: wristbandQrCode } });
  if (!wristband || wristband.status !== WristbandStatus.AVAILABLE || wristband.currentRiderId || wristband.currentBookingId) {
    throw new CheckInGateError(
      wristband ? "This wristband is already linked to another active rider." : `Wristband "${wristbandQrCode}" not found in system.`,
      wristband ? "wristband_already_active" : "wristband_not_found"
    );
  }

  const locked = await tx.qRWristband.updateMany({
    where: {
      id: wristband.id,
      status: WristbandStatus.AVAILABLE,
      currentBookingId: null,
      currentRiderId: null,
    },
    data: {
      status: WristbandStatus.ACTIVE,
      currentBookingId: bookingId,
      currentRiderId: bookingRiderId,
      linkedAt: new Date(),
      releasedAt: null,
    },
  });

  if (locked.count !== 1) {
    throw new CheckInGateError("Check-in failed. Wristband QR could not be linked. Please try again.", "wristband_lock_failed");
  }

  return wristband;
}

export async function completeCheckInTransaction(
  tx: Prisma.TransactionClient,
  input: {
    bookingId: string;
    userId: string;
    notes?: string;
    assignments?: WristbandAssignmentInput[];
  }
) {
  const { booking, assignmentByRider } = await validateBookingCanCheckIn(
    tx,
    input.bookingId,
    input.assignments ?? []
  );

  for (const [bookingRiderId, wristbandQrCode] of Array.from(assignmentByRider.entries())) {
    const wristband = await linkWristbandToRider(tx, booking.id, bookingRiderId, wristbandQrCode);
    await tx.rideTracking.upsert({
      where: { bookingRiderId },
      update: { wristbandId: wristband.id, status: RiderTrackingStatus.CHECKED_IN },
      create: {
        bookingId: booking.id,
        bookingRiderId,
        wristbandId: wristband.id,
        rideDate: booking.bookingDate,
        status: RiderTrackingStatus.CHECKED_IN,
      },
    });
  }

  await tx.rideTracking.updateMany({
    where: { bookingId: booking.id, wristbandId: { not: null } },
    data: { status: RiderTrackingStatus.CHECKED_IN },
  });

  await tx.booking.update({
    where: { id: booking.id },
    data: { bookingStatus: BookingStatus.CHECKED_IN },
  });

  await tx.checkIn.upsert({
    where: { bookingId: booking.id },
    update: { notes: input.notes },
    create: { bookingId: booking.id, checkedInById: input.userId, notes: input.notes },
  });

  await tx.auditLog.create({
    data: {
      userId: input.userId,
      action: "BOOKING_CHECKED_IN",
      module: "bookings",
      recordId: booking.id,
      newValue: {
        paymentStatus: booking.paymentStatus,
        requiredRiders: booking.riders.length,
        assignedWristbands: booking.riders.length,
        waiverStatus: "SIGNED",
        gatekeeper: "reception_check_in",
      },
    },
  });

  return { bookingId: booking.id, riderCount: booking.riders.length };
}
