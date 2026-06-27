import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireApiPermission } from "@/lib/auth/permissions";

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

  const signedNames = new Set(waivers.map((w) => w.riderName.toLowerCase().trim()));
  const signedRiderIds = new Set(waivers.map((w) => w.riderId).filter(Boolean));

  const result = riders.map((r) => ({
    riderId: r.id,
    name:    r.name,
    signed:
      (r.riderId ? signedRiderIds.has(r.riderId) : false) ||
      signedNames.has(r.name.toLowerCase().trim()),
  }));

  return NextResponse.json(result);
}
