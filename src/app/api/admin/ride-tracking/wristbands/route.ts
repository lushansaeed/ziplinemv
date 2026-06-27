import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireApiPermission, logAudit } from "@/lib/auth/permissions";

export async function GET(req: NextRequest) {
  const auth = await requireApiPermission("ride_tracking", "view");
  if (!auth.ok) return auth.response;

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

  const { qrCodes, notes } = await req.json();
  if (!qrCodes || !Array.isArray(qrCodes) || qrCodes.length === 0) {
    return NextResponse.json({ error: "qrCodes array is required" }, { status: 400 });
  }

  const created = await prisma.$transaction(
    qrCodes.map((qrCode: string) =>
      prisma.qRWristband.upsert({
        where:  { qrCode },
        update: {},
        create: { qrCode, notes },
      })
    )
  );

  await logAudit({ userId: auth.dbUser.id, action: "WRISTBANDS_ADDED", module: "ride_tracking", newValue: { count: created.length } });
  return NextResponse.json({ created: created.length }, { status: 201 });
}
