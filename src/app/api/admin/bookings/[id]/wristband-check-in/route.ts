import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireApiPermission, logAudit } from "@/lib/auth/permissions";
import { checkRiderWaiver } from "@/lib/ride-tracking/waiver-check";

// POST: link wristbands to riders — waiver must be SIGNED before any link is made
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiPermission("ride_tracking", "create");
  if (!auth.ok) return auth.response;

  const bookingId = params.id;
  const { assignments } = await req.json();
  // assignments: [{ bookingRiderId, wristbandQrCode }]

  if (!Array.isArray(assignments) || assignments.length === 0) {
    return NextResponse.json({ error: "assignments array required" }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { riders: true },
  });
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  // Reject if booking is not in a linkable state
  const notLinkable = ["CANCELLED", "COMPLETED", "NO_SHOW", "WEATHER_CANCELLED", "RESCHEDULED", "REFUNDED"];
  if (notLinkable.includes(booking.bookingStatus)) {
    return NextResponse.json(
      { error: `Cannot link wristbands — booking is ${booking.bookingStatus.toLowerCase().replace(/_/g, " ")}` },
      { status: 422 }
    );
  }

  const errors: string[] = [];
  const auditRows: object[] = [];

  await prisma.$transaction(async (tx) => {
    for (const { bookingRiderId, wristbandQrCode } of assignments) {
      const rider = booking.riders.find((r) => r.id === bookingRiderId);
      if (!rider) {
        errors.push(`Rider ${bookingRiderId} not found in this booking`);
        continue;
      }

      // ── WAIVER CHECK — hard gate, no bypass ───────────────────────────────
      const waiverResult = await checkRiderWaiver(bookingId, rider);
      if (!waiverResult.signed) {
        errors.push(waiverResult.error);
        auditRows.push({
          action:        "WRISTBAND_LINK_BLOCKED_NO_WAIVER",
          bookingId,
          bookingRiderId,
          wristbandQrCode,
          waiverStatus:  "NOT_SIGNED",
          success:       false,
          reason:        waiverResult.error,
          performedById: auth.dbUser.id,
          at:            new Date().toISOString(),
        });
        continue;
      }

      // ── Wristband availability check ──────────────────────────────────────
      const wristband = await tx.qRWristband.findUnique({ where: { qrCode: wristbandQrCode } });
      if (!wristband) {
        errors.push(`Wristband "${wristbandQrCode}" not found in system`);
        auditRows.push({ action: "WRISTBAND_LINK_FAILED", bookingId, bookingRiderId, wristbandQrCode, reason: "wristband_not_found", success: false, performedById: auth.dbUser.id, at: new Date().toISOString() });
        continue;
      }
      if (wristband.status === "ACTIVE") {
        errors.push(`Wristband "${wristbandQrCode}" is already linked to another active rider`);
        auditRows.push({ action: "WRISTBAND_LINK_FAILED", bookingId, bookingRiderId, wristbandQrCode, reason: "wristband_already_active", success: false, performedById: auth.dbUser.id, at: new Date().toISOString() });
        continue;
      }
      if (wristband.status === "DAMAGED" || wristband.status === "LOST") {
        errors.push(`Wristband "${wristbandQrCode}" is ${wristband.status.toLowerCase()} and cannot be used`);
        auditRows.push({ action: "WRISTBAND_LINK_FAILED", bookingId, bookingRiderId, wristbandQrCode, reason: `wristband_${wristband.status.toLowerCase()}`, success: false, performedById: auth.dbUser.id, at: new Date().toISOString() });
        continue;
      }

      // ── Link wristband ─────────────────────────────────────────────────────
      await tx.qRWristband.update({
        where: { id: wristband.id },
        data: {
          status:           "ACTIVE",
          currentBookingId: bookingId,
          currentRiderId:   bookingRiderId,
          linkedAt:         new Date(),
          releasedAt:       null,
        },
      });

      // ── Create / update RideTracking ───────────────────────────────────────
      await tx.rideTracking.upsert({
        where:  { bookingRiderId },
        update: { wristbandId: wristband.id, status: "CHECKED_IN" },
        create: {
          bookingId,
          bookingRiderId,
          wristbandId: wristband.id,
          rideDate:    booking.bookingDate,
          status:      "CHECKED_IN",
        },
      });

      auditRows.push({
        action:        "WRISTBAND_LINKED",
        bookingId,
        bookingRiderId,
        wristbandQrCode,
        wristbandId:   wristband.id,
        waiverStatus:  "SIGNED",
        success:       true,
        performedById: auth.dbUser.id,
        at:            new Date().toISOString(),
      });
    }

    // Only advance booking to CHECKED_IN if every rider linked successfully
    if (errors.length === 0) {
      await tx.booking.update({
        where: { id: bookingId },
        data:  { bookingStatus: "CHECKED_IN" },
      });
    }
  });

  // Save audit entries (outside transaction so they always persist)
  for (const entry of auditRows) {
    await logAudit({
      userId:   auth.dbUser.id,
      action:   (entry as { action: string }).action,
      module:   "ride_tracking",
      recordId: bookingId,
      newValue: entry,
    }).catch(() => {});
  }

  if (errors.length > 0) {
    return NextResponse.json({ success: false, errors }, { status: 422 });
  }

  return NextResponse.json({ success: true });
}
