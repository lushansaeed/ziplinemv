import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireApiPermission, logAudit } from "@/lib/auth/permissions";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiPermission("ride_tracking", "edit");
  if (!auth.ok) return auth.response;

  const old = await prisma.scanDevice.findUnique({ where: { id: params.id } });
  if (!old) return NextResponse.json({ error: "Device not found" }, { status: 404 });

  const body = await req.json();
  const allowed = ["deviceName", "deviceCode", "devicePin", "assignedLocation", "status", "notes"];
  const data = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));

  const updated = await prisma.scanDevice.update({ where: { id: params.id }, data });
  await logAudit({ userId: auth.dbUser.id, action: "SCAN_DEVICE_UPDATED", module: "ride_tracking", recordId: params.id, oldValue: old, newValue: updated });
  return NextResponse.json(updated);
}

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiPermission("ride_tracking", "view");
  if (!auth.ok) return auth.response;

  const device = await prisma.scanDevice.findUnique({
    where: { id: params.id },
    include: {
      scanEvents: {
        orderBy: { scanTime: "desc" },
        take: 50,
        include: { device: true },
      },
    },
  });
  if (!device) return NextResponse.json({ error: "Device not found" }, { status: 404 });
  return NextResponse.json(device);
}
