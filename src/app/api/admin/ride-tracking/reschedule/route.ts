import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireApiPermission, logAudit } from "@/lib/auth/permissions";

export async function POST(req: NextRequest) {
  const auth = await requireApiPermission("ride_tracking", "edit");
  if (!auth.ok) return auth.response;

  const { bookingId, newRideDate, newSlotId, reason, remarks } = await req.json();
  if (!bookingId || !newRideDate || !reason) {
    return NextResponse.json({ error: "bookingId, newRideDate and reason are required" }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { riders: { include: { rideTracking: true } }, slot: true },
  });
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  const newDate = new Date(newRideDate);

  await prisma.$transaction(async (tx) => {
    // Save reschedule history
    await tx.rescheduleHistory.create({
      data: {
        bookingId,
        originalRideDate:  booking.bookingDate,
        newRideDate:       newDate,
        originalSlotId:    booking.slotId,
        newSlotId:         newSlotId ?? null,
        originalSlotLabel: booking.slotLabel,
        newSlotLabel:      null,
        reason,
        remarks,
        rescheduledByUserId: auth.dbUser.id,
      },
    });

    // Release wristbands
    await tx.qRWristband.updateMany({
      where: { currentBookingId: bookingId },
      data:  { status: "AVAILABLE", currentBookingId: null, currentRiderId: null, releasedAt: new Date() },
    });

    // Update rider tracking statuses to RESCHEDULED
    await tx.rideTracking.updateMany({
      where: {
        bookingId,
        status: { notIn: ["LANDED", "DID_NOT_FLY"] },
      },
      data: { status: "RESCHEDULED", remarks: remarks ?? reason },
    });

    // Update booking
    const updateData: Record<string, unknown> = {
      bookingStatus: "RESCHEDULED",
      bookingDate: newDate,
    };
    if (newSlotId) updateData.slotId = newSlotId;

    await tx.booking.update({ where: { id: bookingId }, data: updateData });
  });

  await logAudit({
    userId: auth.dbUser.id, action: "BOOKING_RESCHEDULED", module: "ride_tracking",
    recordId: bookingId, newValue: { newRideDate, newSlotId, reason, remarks },
  });

  return NextResponse.json({ success: true });
}
