import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireApiPermission } from "@/lib/auth/permissions";

export async function GET(req: NextRequest) {
  const auth = await requireApiPermission("ride_tracking", "view");
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get("date") ?? new Date().toISOString().split("T")[0];
  const date    = new Date(dateStr);

  const bookings = await prisma.booking.findMany({
    where: {
      bookingDate: date,
      bookingStatus: {
        in: ["CONFIRMED", "CHECKED_IN", "IN_PROGRESS", "PARTIALLY_LAUNCHED", "PARTIALLY_LANDED",
             "COMPLETED", "COMPLETED_WITH_REMARKS", "NO_SHOW", "WEATHER_CANCELLED", "RESCHEDULED"],
      },
    },
    include: {
      customer: { select: { name: true, phone: true } },
      package:  { select: { name: true } },
      slot:     { select: { startTime: true } },
      riders:   {
        include: {
          rideTracking: {
            include: {
              wristband: { select: { qrCode: true } },
            },
          },
        },
      },
    },
    orderBy: [{ slot: { startTime: "asc" } }, { createdAt: "asc" }],
  });

  return NextResponse.json(bookings);
}
