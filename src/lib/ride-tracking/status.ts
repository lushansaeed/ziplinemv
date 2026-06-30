import { prisma } from "@/lib/prisma/client";
import { BookingStatus, RiderTrackingStatus } from "@prisma/client";
import { ensureRideTrackingLaunchLineColumn } from "@/lib/ride-tracking/schema-guard";

const FINAL_STATUSES: RiderTrackingStatus[] = [
  "LANDED", "DID_NOT_FLY", "WEATHER_CANCELLED", "RESCHEDULED", "NO_SHOW",
];

const LAUNCHED_STATUSES: RiderTrackingStatus[] = ["LAUNCHED", "LANDED"];

export async function recomputeBookingStatus(bookingId: string): Promise<BookingStatus> {
  await ensureRideTrackingLaunchLineColumn();
  const trackings = await prisma.rideTracking.findMany({ where: { bookingId } });

  if (trackings.length === 0) return "CHECKED_IN";

  const total      = trackings.length;
  const finalized  = trackings.filter((t) => FINAL_STATUSES.includes(t.status));
  const launched   = trackings.filter((t) => LAUNCHED_STATUSES.includes(t.status));
  const landed     = trackings.filter((t) => t.status === "LANDED");
  const didNotFly  = trackings.filter((t) => t.status === "DID_NOT_FLY");

  // All finalized
  if (finalized.length === total) {
    if (landed.length === total)                    return "COMPLETED";
    if (landed.length + didNotFly.length === total) return "COMPLETED_WITH_REMARKS";
    const weatherCancelled = trackings.every((t) =>
      t.status === "WEATHER_CANCELLED" || t.status === "LANDED"
    );
    if (weatherCancelled) return "WEATHER_CANCELLED";
    if (trackings.every((t) => t.status === "RESCHEDULED")) return "RESCHEDULED";
    if (trackings.every((t) => t.status === "NO_SHOW"))     return "NO_SHOW";
    return "COMPLETED_WITH_REMARKS";
  }

  // Some launched/landed but not all final
  if (landed.length > 0 && landed.length < total)  return "PARTIALLY_LANDED";
  if (launched.length > 0)                          return "PARTIALLY_LAUNCHED";
  return "IN_PROGRESS";
}

export async function updateBookingStatusFromTracking(bookingId: string) {
  const newStatus = await recomputeBookingStatus(bookingId);
  await prisma.booking.update({
    where: { id: bookingId },
    data:  { bookingStatus: newStatus },
  });
  return newStatus;
}
