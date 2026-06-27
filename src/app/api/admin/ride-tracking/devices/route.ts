import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireApiPermission, logAudit } from "@/lib/auth/permissions";
import { ScanLocation } from "@prisma/client";
import { parseScanDeviceSettings, serializeScanDeviceSettings } from "@/lib/ride-tracking/scan-device-settings";

export async function GET() {
  const auth = await requireApiPermission("ride_tracking", "view");
  if (!auth.ok) return auth.response;

  const devices = await prisma.scanDevice.findMany({
    orderBy: [{ assignedLocation: "asc" }, { deviceName: "asc" }],
    include: { _count: { select: { scanEvents: true } } },
  });
  return NextResponse.json(devices.map((device) => {
    const settings = parseScanDeviceSettings(device.notes);
    return { ...device, notes: settings.notes, scanMode: settings.scanMode };
  }));
}

export async function POST(req: NextRequest) {
  const auth = await requireApiPermission("ride_tracking", "create");
  if (!auth.ok) return auth.response;

  const { deviceName, deviceCode, devicePin, assignedLocation, notes, scanMode } = await req.json();
  if (!deviceName || !deviceCode || !devicePin || !assignedLocation) {
    return NextResponse.json({ error: "deviceName, deviceCode, devicePin, assignedLocation are required" }, { status: 400 });
  }
  if (!Object.values(ScanLocation).includes(assignedLocation)) {
    return NextResponse.json({ error: "Invalid assignedLocation" }, { status: 400 });
  }
  if (devicePin.length < 4 || devicePin.length > 8) {
    return NextResponse.json({ error: "PIN must be 4–8 digits" }, { status: 400 });
  }

  const device = await prisma.scanDevice.create({
    data: { deviceName, deviceCode, devicePin, assignedLocation, notes: serializeScanDeviceSettings({ scanMode, notes }) },
  });
  await logAudit({ userId: auth.dbUser.id, action: "SCAN_DEVICE_CREATED", module: "ride_tracking", recordId: device.id, newValue: device });
  return NextResponse.json(device, { status: 201 });
}
