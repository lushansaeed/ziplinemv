import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireApiPermission, logAudit } from "@/lib/auth/permissions";
import { WristbandStatus } from "@prisma/client";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiPermission("ride_tracking", "edit");
  if (!auth.ok) return auth.response;

  const old = await prisma.qRWristband.findUnique({ where: { id: params.id } });
  if (!old) return NextResponse.json({ error: "Wristband not found" }, { status: 404 });

  const body = await req.json();

  // Release action
  if (body.action === "release") {
    const updated = await prisma.$transaction(async (tx) => {
      await tx.rideTracking.updateMany({
        where: { wristbandId: params.id },
        data: { wristbandId: null },
      });

      return tx.qRWristband.update({
        where: { id: params.id },
        data: {
          status: WristbandStatus.AVAILABLE,
          currentBookingId: null,
          currentRiderId: null,
          releasedAt: new Date(),
        },
      });
    });
    await logAudit({
      userId: auth.dbUser.id,
      action: "WRISTBAND_RELEASED",
      module: "ride_tracking",
      recordId: params.id,
      oldValue: old,
      newValue: { action: "released", wristbandQrCode: old.qrCode, oldBookingId: old.currentBookingId, oldRiderId: old.currentRiderId, updated },
    });
    return NextResponse.json(updated);
  }

  const allowed = ["status", "notes"];
  const data = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));
  if (data.status && !Object.values(WristbandStatus).includes(data.status as WristbandStatus)) {
    return NextResponse.json({ error: "Invalid wristband status" }, { status: 400 });
  }
  const updated = await prisma.qRWristband.update({ where: { id: params.id }, data });
  await logAudit({ userId: auth.dbUser.id, action: "WRISTBAND_UPDATED", module: "ride_tracking", recordId: params.id, oldValue: old, newValue: updated });
  return NextResponse.json(updated);
}
