import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireApiPermission } from "@/lib/auth/permissions";
import { BookingStatus, RiderTrackingStatus, WristbandStatus } from "@prisma/client";

const ACTIVE_BOOKING_STATUSES: BookingStatus[] = [
  BookingStatus.CHECKED_IN,
  BookingStatus.IN_PROGRESS,
  BookingStatus.PARTIALLY_LAUNCHED,
  BookingStatus.PARTIALLY_LANDED,
];

const FINAL_RIDER_STATUSES: RiderTrackingStatus[] = [
  RiderTrackingStatus.LANDED,
  RiderTrackingStatus.DID_NOT_FLY,
  RiderTrackingStatus.WEATHER_CANCELLED,
  RiderTrackingStatus.RESCHEDULED,
  RiderTrackingStatus.NO_SHOW,
];

export async function GET(req: NextRequest) {
  const auth = await requireApiPermission("ride_tracking", "view");
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get("date") ?? new Date().toISOString().split("T")[0];
  const date    = new Date(dateStr);

  const bookings = await prisma.booking.findMany({
    where: {
      OR: [
        { bookingDate: date },
        { bookingStatus: { in: ACTIVE_BOOKING_STATUSES } },
        { rideTrackings: { some: { status: { notIn: FINAL_RIDER_STATUSES } } } },
        {
          rideTrackings: {
            some: {
              wristband: {
                is: {
                  status: WristbandStatus.ACTIVE,
                  releasedAt: null,
                },
              },
            },
          },
        },
      ],
    },
    include: {
      customer: { select: { name: true, phone: true } },
      package:  { select: { name: true } },
      slot:     { select: { startTime: true } },
      addOns:   {
        select: {
          quantity: true,
          addOn: { select: { name: true } },
        },
        orderBy: { id: "asc" },
      },
      riders:   {
        include: {
          rideTracking: {
            include: {
              wristband: { select: { qrCode: true, status: true, releasedAt: true } },
            },
          },
        },
      },
    },
    orderBy: [{ bookingDate: "asc" }, { slot: { startTime: "asc" } }, { createdAt: "asc" }],
  });

  return NextResponse.json(bookings);
}
