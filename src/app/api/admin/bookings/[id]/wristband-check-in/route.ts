import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireApiPermission, logAudit } from "@/lib/auth/permissions";

// POST: link wristbands to riders and create RideTracking records
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

  const errors: string[] = [];

  await prisma.$transaction(async (tx) => {
    for (const { bookingRiderId, wristbandQrCode } of assignments) {
      const rider = booking.riders.find((r) => r.id === bookingRiderId);
      if (!rider) { errors.push(`Rider ${bookingRiderId} not in this booking`); continue; }

      const wristband = await tx.qRWristband.findUnique({ where: { qrCode: wristbandQrCode } });
      if (!wristband) { errors.push(`Wristband ${wristbandQrCode} not found`); continue; }
      if (wristband.status === "ACTIVE") {
        errors.push(`Wristband ${wristbandQrCode} is already linked to another active rider`);
        continue;
      }
      if (wristband.status === "DAMAGED" || wristband.status === "LOST") {
        errors.push(`Wristband ${wristbandQrCode} is ${wristband.status.toLowerCase()}`);
        continue;
      }

      // Link wristband
      await tx.qRWristband.update({
        where: { id: wristband.id },
        data: {
          status: "ACTIVE",
          currentBookingId: bookingId,
          currentRiderId: bookingRiderId,
          linkedAt: new Date(),
          releasedAt: null,
        },
      });

      // Create or update RideTracking
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
    }

    if (errors.length === 0) {
      await tx.booking.update({
        where: { id: bookingId },
        data:  { bookingStatus: "CHECKED_IN" },
      });
    }
  });

  if (errors.length > 0) {
    return NextResponse.json({ success: false, errors }, { status: 422 });
  }

  await logAudit({
    userId: auth.dbUser.id, action: "WRISTBANDS_ASSIGNED", module: "ride_tracking",
    recordId: bookingId, newValue: { assignments },
  });

  return NextResponse.json({ success: true });
}
