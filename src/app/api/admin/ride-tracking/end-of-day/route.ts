import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireApiPermission, logAudit } from "@/lib/auth/permissions";
import { checkRiderWaiver } from "@/lib/ride-tracking/waiver-check";
import { ensureRideTrackingLaunchLineColumn } from "@/lib/ride-tracking/schema-guard";

const OPEN_STATUSES = ["CONFIRMED", "CHECKED_IN", "IN_PROGRESS", "PARTIALLY_LAUNCHED", "PARTIALLY_LANDED"] as const;

export async function GET(req: NextRequest) {
  const auth = await requireApiPermission("ride_tracking", "edit");
  if (!auth.ok) return auth.response;
  await ensureRideTrackingLaunchLineColumn();

  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get("date") ?? new Date().toISOString().split("T")[0];
  const date    = new Date(dateStr);

  const openBookings = await prisma.booking.findMany({
    where: { bookingDate: date, bookingStatus: { in: [...OPEN_STATUSES] } },
    include: {
      customer: { select: { name: true, phone: true } },
      riders: { include: { rideTracking: true } },
    },
  });

  return NextResponse.json({ date: dateStr, count: openBookings.length, bookings: openBookings });
}

export async function POST(req: NextRequest) {
  const auth = await requireApiPermission("ride_tracking", "edit");
  if (!auth.ok) return auth.response;
  await ensureRideTrackingLaunchLineColumn();

  const { date, actions } = await req.json();
  // actions: [{ bookingId, action: "no_show"|"weather_cancelled"|"completed_with_remarks", remarks }]
  if (!Array.isArray(actions)) return NextResponse.json({ error: "actions array required" }, { status: 400 });

  const results: { bookingId: string; result: string }[] = [];

  for (const { bookingId, action, remarks } of actions) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { riders: { include: { rideTracking: true } } },
    });
    if (!booking) { results.push({ bookingId, result: "not_found" }); continue; }

    let bookingStatus: string;
    let riderStatus:   string;

    if (action === "no_show")              { bookingStatus = "NO_SHOW";             riderStatus = "NO_SHOW"; }
    else if (action === "weather_cancelled") { bookingStatus = "WEATHER_CANCELLED"; riderStatus = "WEATHER_CANCELLED"; }
    else                                   { bookingStatus = "COMPLETED_WITH_REMARKS"; riderStatus = "NO_SHOW"; }

    await prisma.$transaction(async (tx) => {
      await tx.booking.update({ where: { id: bookingId }, data: { bookingStatus: bookingStatus as any } });

      for (const br of booking.riders) {
        // Waiver gate: never mark a rider as COMPLETED via EOD if waiver not signed
        // Only NO_SHOW and WEATHER_CANCELLED are allowed without a signed waiver
        const allowedWithoutWaiver = ["NO_SHOW", "WEATHER_CANCELLED"];
        if (!allowedWithoutWaiver.includes(riderStatus)) {
          const waiverResult = await checkRiderWaiver(bookingId, br);
          if (!waiverResult.signed) {
            // Force to NO_SHOW instead of the requested close status
            await logAudit({
              userId: auth.dbUser.id, action: "EOD_WAIVER_GATE_ENFORCED", module: "ride_tracking",
              recordId: bookingId,
              newValue: { bookingRiderId: br.id, riderName: br.name, requestedStatus: riderStatus, forcedStatus: "NO_SHOW", reason: waiverResult.error },
            });
            if (!br.rideTracking) {
              await tx.rideTracking.create({
                data: { bookingId, bookingRiderId: br.id, rideDate: booking.bookingDate, status: "NO_SHOW", remarks: "EOD: waiver not completed — cannot close as COMPLETED_WITH_REMARKS" },
              });
            } else if (!["LANDED", "DID_NOT_FLY"].includes(br.rideTracking.status)) {
              await tx.rideTracking.update({ where: { id: br.rideTracking.id }, data: { status: "NO_SHOW", remarks: "EOD: waiver not completed" } });
            }
            continue;
          }
        }

        if (!br.rideTracking) {
          await tx.rideTracking.create({
            data: {
              bookingId, bookingRiderId: br.id,
              rideDate: booking.bookingDate,
              status: riderStatus as any, remarks: remarks ?? "End-of-day closure",
            },
          });
        } else if (!["LANDED", "DID_NOT_FLY"].includes(br.rideTracking.status)) {
          if (br.rideTracking.status === "LAUNCHED") {
            await tx.rideTracking.update({
              where: { id: br.rideTracking.id },
              data:  { remarks: (remarks ?? "") + " [EOD: landing scan missing — flagged for review]" },
            });
          } else {
            await tx.rideTracking.update({
              where: { id: br.rideTracking.id },
              data:  { status: riderStatus as any, remarks },
            });
          }
        }
      }
    });

    await logAudit({
      userId: auth.dbUser.id, action: "EOD_CLOSURE", module: "ride_tracking",
      recordId: bookingId, newValue: { bookingStatus, remarks, date },
    });

    results.push({ bookingId, result: "closed" });
  }

  return NextResponse.json({ results });
}
