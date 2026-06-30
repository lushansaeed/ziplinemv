import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireApiPermission, logAudit } from "@/lib/auth/permissions";
import { WristbandStatus } from "@prisma/client";
import { ensureRideTrackingLaunchLineColumn } from "@/lib/ride-tracking/schema-guard";

const WRISTBAND_STATUSES = new Set(Object.values(WristbandStatus));

type WristbandImportRow = {
  qrCode?: string;
  qr_code?: string;
  wristbandLabel?: string;
  wristband_label?: string;
  status?: string;
};

type NormalizedWristbandRow = {
  qrCode: string;
  label?: string;
  status: WristbandStatus;
};

function normalizeStatus(value: unknown) {
  const status = String(value ?? "AVAILABLE").trim().toUpperCase();
  return WRISTBAND_STATUSES.has(status as WristbandStatus) ? status as WristbandStatus : WristbandStatus.AVAILABLE;
}

function normalizeRows(body: any): NormalizedWristbandRow[] {
  if (Array.isArray(body.wristbands)) {
    return body.wristbands
      .map((row: WristbandImportRow): NormalizedWristbandRow => ({
        qrCode: String(row.qrCode ?? row.qr_code ?? "").trim(),
        label: String(row.wristbandLabel ?? row.wristband_label ?? "").trim() || undefined,
        status: normalizeStatus(row.status),
      }))
      .filter((row: NormalizedWristbandRow) => row.qrCode);
  }

  return (Array.isArray(body.qrCodes) ? body.qrCodes : [])
    .map((qrCode: string): NormalizedWristbandRow => ({ qrCode: String(qrCode).trim(), label: undefined, status: WristbandStatus.AVAILABLE }))
    .filter((row: NormalizedWristbandRow) => row.qrCode);
}

export async function GET(req: NextRequest) {
  const auth = await requireApiPermission("ride_tracking", "view");
  if (!auth.ok) return auth.response;
  await ensureRideTrackingLaunchLineColumn();

  const { searchParams } = new URL(req.url);
  const status  = searchParams.get("status");
  const search  = searchParams.get("search");
  const page    = parseInt(searchParams.get("page") ?? "1");
  const perPage = 50;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (search) where.qrCode = { contains: search, mode: "insensitive" };

  const [wristbands, total] = await Promise.all([
    prisma.qRWristband.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        rideTracking: {
          include: { bookingRider: true, booking: { select: { reference: true } } },
        },
      },
    }),
    prisma.qRWristband.count({ where }),
  ]);
  return NextResponse.json({ wristbands, total, page, perPage });
}

export async function POST(req: NextRequest) {
  const auth = await requireApiPermission("ride_tracking", "create");
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const rows = normalizeRows(body);
  if (rows.length === 0) {
    return NextResponse.json({ error: "At least one wristband QR code is required" }, { status: 400 });
  }

  const uniqueRows = Array.from(new Map(rows.map((row) => [row.qrCode, row])).values());
  const created = await prisma.$transaction(
    uniqueRows.map((row) =>
      prisma.qRWristband.upsert({
        where:  { qrCode: row.qrCode },
        update: {
          notes: row.label ?? undefined,
          status: row.status,
        },
        create: {
          qrCode: row.qrCode,
          notes: row.label,
          status: row.status,
        },
      })
    )
  );

  await logAudit({
    userId: auth.dbUser.id,
    action: "WRISTBANDS_REGISTERED",
    module: "ride_tracking",
    newValue: { action: "registered_or_imported", count: created.length, source: body.wristbands ? "csv_import" : "bulk_entry" },
  });
  return NextResponse.json({ created: created.length }, { status: 201 });
}
