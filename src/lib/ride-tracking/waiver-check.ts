import { prisma } from "@/lib/prisma/client";
import { isWaiverSignedForRider } from "@/lib/ride-tracking/waiver-matching";

/**
 * Hard-checks whether a specific rider in a booking has a SIGNED waiver.
 *
 * This is a strict server-side gate — no role, permission, or admin action
 * can bypass it. Returns { signed: true } or { signed: false, error: string }.
 *
 * Matching strategy:
 *   1. Prefer riderId if the BookingRider has one.
 *   2. Fall back to riderName match within the same booking.
 */
export async function checkRiderWaiver(
  bookingId: string,
  bookingRider: { id: string; riderId?: string | null; name: string }
): Promise<{ signed: true } | { signed: false; error: string }> {
  const [riders, waivers] = await Promise.all([
    prisma.bookingRider.findMany({
      where: { bookingId },
      select: { id: true, riderId: true, name: true },
    }),
    prisma.waiver.findMany({
      where: { bookingId, status: "SIGNED" },
      select: { riderId: true, riderName: true, status: true },
    }),
  ]);

  if (!isWaiverSignedForRider(bookingRider, waivers, riders)) {
    return {
      signed: false,
      error: `Waiver form is not completed for rider "${bookingRider.name}". Wristband cannot be linked and ride flow cannot start.`,
    };
  }

  return { signed: true };
}
