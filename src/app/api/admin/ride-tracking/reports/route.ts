import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireApiPermission } from "@/lib/auth/permissions";
import { withRideTrackingLaunchLineGuard } from "@/lib/ride-tracking/schema-guard";

function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape  = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");
}

export async function GET(req: NextRequest) {
  const auth = await requireApiPermission("ride_tracking", "view");
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const dateFrom  = searchParams.get("dateFrom");
  const dateTo    = searchParams.get("dateTo");
  const status    = searchParams.get("status");
  const csv       = searchParams.get("csv") === "1";

  const where: Record<string, unknown> = {};
  if (dateFrom || dateTo) {
    where.rideDate = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo   ? { lte: new Date(dateTo)   } : {}),
    };
  }
  if (status) where.status = status;

  const trackings = await withRideTrackingLaunchLineGuard(() => prisma.rideTracking.findMany({
    where,
    include: {
      booking:     { select: { reference: true, bookingStatus: true } },
      bookingRider: true,
      wristband:   { select: { qrCode: true } },
    },
    orderBy: [{ rideDate: "desc" }, { createdAt: "asc" }],
    take: csv ? 10000 : 200,
  }));

  if (csv) {
    const rows = trackings.map((t) => ({
      "Booking Reference": t.booking.reference,
      "Rider Name":        t.bookingRider.name,
      "Ride Date":         t.rideDate.toISOString().split("T")[0],
      "Wristband QR":      t.wristband?.qrCode ?? "",
      "First Floor Time":  t.firstFloorTime?.toISOString() ?? "",
      "Third Floor Time":  t.thirdFloorTime?.toISOString() ?? "",
      "Fifth Floor Time":  t.fifthFloorTime?.toISOString() ?? "",
      "Launch Line":       t.launchLineNumber ? `Line ${t.launchLineNumber}` : "",
      "Landing Time":      t.landingTime?.toISOString() ?? "",
      "Ride Duration (s)": t.rideDurationSeconds ?? "",
      "Speed (m/s)":       t.rideSpeedMps?.toString() ?? "",
      "Speed (km/h)":      t.rideSpeedKmph?.toString() ?? "",
      "Wind Speed (m/s)":  t.windSpeedMs?.toString() ?? "",
      "Wind Speed (km/h)": t.windSpeedKmh?.toString() ?? "",
      "Wind Direction °":  t.windDirectionDegrees ?? "",
      "Wind Direction":    t.windDirectionCompass ?? "",
      "Rider Status":      t.status,
      "Booking Status":    t.booking.bookingStatus,
      "Did Not Fly Reason": t.didNotFlyReason ?? "",
      "Remarks":           t.remarks ?? "",
    }));
    return new NextResponse(toCSV(rows), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="ride-report-${Date.now()}.csv"`,
      },
    });
  }

  return NextResponse.json(trackings);
}
