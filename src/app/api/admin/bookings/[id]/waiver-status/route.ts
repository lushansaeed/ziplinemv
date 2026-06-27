import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireApiPermission } from "@/lib/auth/permissions";
import { isWaiverSignedForRider } from "@/lib/ride-tracking/waiver-matching";

// Returns waiver signed status for each BookingRider in the booking.
// Used by the wristband check-in modal to surface waiver state before linking.
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiPermission("ride_tracking", "view");
  if (!auth.ok) return auth.response;

  const bookingId = params.id;

  const [riders, waivers] = await Promise.all([
    prisma.bookingRider.findMany({ where: { bookingId } }),
    prisma.waiver.findMany({
      where:  { bookingId, status: "SIGNED" },
      select: { riderId: true, riderName: true },
    }),
  ]);

  const result = riders.map((r) => ({
    riderId: r.id,
    name:    r.name,
    signed: isWaiverSignedForRider(r, waivers, riders),
  }));

  return NextResponse.json(result);
}
