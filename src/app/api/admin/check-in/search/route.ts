import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireApiPermission } from "@/lib/auth/permissions";
import { ensureBookingRiders } from "@/lib/ride-tracking/check-in-gate";

export async function GET(req: NextRequest) {
  const auth = await requireApiPermission("bookings", "view");
  if (!auth.ok) return auth.response;

  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ error: "query required" }, { status: 400 });

  try {
    const existing = await prisma.booking.findFirst({
      where: {
        OR: [
          { reference:          { equals: q.toUpperCase() } },
          { customer: { phone:  { contains: q } } },
          { customer: { name:   { contains: q, mode: "insensitive" } } },
        ],
      },
      select: { id: true },
      orderBy: { createdAt: "desc" },
    });

    if (existing) {
      await prisma.$transaction((tx) => ensureBookingRiders(tx, existing.id));
    }

    const booking = await prisma.booking.findFirst({
      where: {
        OR: [
          { reference:          { equals: q.toUpperCase() } },
          { customer: { phone:  { contains: q } } },
          { customer: { name:   { contains: q, mode: "insensitive" } } },
        ],
      },
      include: {
        customer: { select: { name: true, phone: true } },
        package:  { select: { name: true } },
        slot:     { select: { startTime: true } },
        riders:   { select: { id: true, name: true, age: true, weight: true } },
        waivers:  { select: { status: true, riderName: true, riderId: true } },
        checkIn:  { select: { checkedInAt: true } },
        rideTrackings: {
          select: {
            bookingRiderId: true,
            status: true,
            wristband: { select: { qrCode: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ booking: booking ?? null });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
