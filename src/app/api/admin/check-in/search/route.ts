import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { logAudit, requireApiPermission } from "@/lib/auth/permissions";
import { ensureBookingRiders } from "@/lib/ride-tracking/check-in-gate";
import { ensureRideTrackingLaunchLineColumn } from "@/lib/ride-tracking/schema-guard";

function normalizeBookingLookup(raw: string) {
  const value = raw.trim();
  try {
    const url = new URL(value);
    const ref = url.searchParams.get("ref") ?? url.searchParams.get("reference") ?? "";
    if (ref.trim()) return ref.trim().toUpperCase();
  } catch {
    // Not a URL; treat as a direct reference, phone, or name search.
  }

  const refMatch = value.match(/\bZL-[A-Z0-9]+\b/i);
  return (refMatch?.[0] ?? value).trim().toUpperCase();
}

export async function GET(req: NextRequest) {
  const auth = await requireApiPermission("bookings", "view");
  if (!auth.ok) return auth.response;
  await ensureRideTrackingLaunchLineColumn();

  const rawQuery = req.nextUrl.searchParams.get("q")?.trim();
  const scanMode = req.nextUrl.searchParams.get("mode") === "qr" ? "qr" : "manual";
  const q = rawQuery ? normalizeBookingLookup(rawQuery) : "";
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

    await logAudit({
      userId: auth.dbUser.id,
      action: scanMode === "qr" ? "BOOKING_QR_SCANNED" : "BOOKING_LOOKUP",
      module: "ride_tracking",
      recordId: existing?.id,
      newValue: {
        mode: scanMode,
        query: scanMode === "qr" ? "[booking_qr]" : q,
        result: existing ? "found" : "not_found",
      },
    }).catch(() => {});

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
