import { prisma } from "@/lib/prisma/client";

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
  const orClauses: object[] = [{ riderName: bookingRider.name }];
  if (bookingRider.riderId) orClauses.unshift({ riderId: bookingRider.riderId });

  const signed = await prisma.waiver.findFirst({
    where: {
      bookingId,
      status: "SIGNED",
      OR: orClauses,
    },
    select: { id: true },
  });

  if (!signed) {
    return {
      signed: false,
      error: `Waiver form is not completed for rider "${bookingRider.name}". Wristband cannot be linked and ride flow cannot start.`,
    };
  }

  return { signed: true };
}
