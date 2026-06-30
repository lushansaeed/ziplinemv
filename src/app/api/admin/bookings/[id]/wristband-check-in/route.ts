import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { logAudit, userHasPermission } from "@/lib/auth/permissions";
import { requireApiRole } from "@/lib/auth/api";
import { ADMIN_ROLES } from "@/lib/auth/roles";
import {
  CheckInGateError,
  completeCheckInTransaction,
  type WristbandAssignmentInput,
} from "@/lib/ride-tracking/check-in-gate";
import { ensureRideTrackingLaunchLineColumn } from "@/lib/ride-tracking/schema-guard";

type RequestBody = {
  assignments?: WristbandAssignmentInput[];
};

async function requireWristbandCheckInPermission() {
  const auth = await requireApiRole(ADMIN_ROLES as any);
  if (!auth.ok) return auth;

  const [canCreateCheckIn, canEditCheckIn, canCreateRideTracking, canEditBookings] = await Promise.all([
    userHasPermission(auth.dbUser.id, auth.dbUser.role, "check_in", "create"),
    userHasPermission(auth.dbUser.id, auth.dbUser.role, "check_in", "edit"),
    userHasPermission(auth.dbUser.id, auth.dbUser.role, "ride_tracking", "create"),
    userHasPermission(auth.dbUser.id, auth.dbUser.role, "bookings", "edit"),
  ]);

  const canCheckIn = canCreateCheckIn || canEditCheckIn || canCreateRideTracking || canEditBookings;

  if (!canCheckIn) {
    await logAudit({
      userId: auth.dbUser.id,
      action: "RESTRICTED_API_ACCESS_ATTEMPT",
      module: "ride_tracking",
      newValue: {
        permission: "check_in.create",
        alternativePermissions: ["check_in.edit", "ride_tracking.create", "bookings.edit"],
      },
    }).catch(() => {});

    return {
      ok: false as const,
      response: NextResponse.json({ error: "You do not have permission to perform this action." }, { status: 403 }),
    };
  }

  return auth;
}

async function logFailedAttempt(input: {
  userId: string;
  bookingId: string;
  code: string;
  message: string;
}) {
  const booking = await prisma.booking.findUnique({
    where: { id: input.bookingId },
    select: {
      paymentStatus: true,
      waiverStatus: true,
      bookingStatus: true,
      riders: { select: { id: true } },
      rideTrackings: { select: { bookingRiderId: true, wristbandId: true } },
    },
  });

  await logAudit({
    userId: input.userId,
    action: "CHECK_IN_BLOCKED",
    module: "ride_tracking",
    recordId: input.bookingId,
    newValue: {
      actionAttempted: "wristband_check_in",
      result: "failed",
      reason: input.code,
      errorMessage: input.message,
      paymentStatus: booking?.paymentStatus ?? "missing",
      waiverStatus: booking?.waiverStatus ?? "missing",
      bookingStatus: booking?.bookingStatus ?? "missing",
      riders: booking?.riders.length ?? 0,
      linkedWristbands: booking?.rideTrackings.filter((tracking) => tracking.wristbandId).length ?? 0,
      timestamp: new Date().toISOString(),
    },
  }).catch(() => {});
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireWristbandCheckInPermission();
  if (!auth.ok) return auth.response;
  await ensureRideTrackingLaunchLineColumn();

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const assignments = body.assignments ?? [];
  if (!Array.isArray(assignments)) {
    return NextResponse.json({ error: "assignments array required" }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      return completeCheckInTransaction(tx, {
        bookingId: params.id,
        userId: auth.dbUser.id,
        assignments,
      });
    });

    await logAudit({
      userId: auth.dbUser.id,
      action: "WRISTBAND_CHECK_IN_COMPLETED",
      module: "ride_tracking",
      recordId: params.id,
      newValue: {
        result: "success",
        message: "Check-in completed and wristbands linked successfully.",
        riderCount: result.riderCount,
      },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: "Check-in completed and wristbands linked successfully.",
    });
  } catch (error: any) {
    const gateError = error instanceof CheckInGateError
      ? error
      : new CheckInGateError(
          error?.message ?? "Check-in failed. Wristband QR could not be linked. Please try again.",
          "check_in_failed",
          500
        );

    await logFailedAttempt({
      userId: auth.dbUser.id,
      bookingId: params.id,
      code: gateError.code,
      message: gateError.message,
    });

    return NextResponse.json(
      { success: false, error: gateError.message, errors: [gateError.message] },
      { status: gateError.status }
    );
  }
}
