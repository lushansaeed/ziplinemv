import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { ScanLocation } from "@prisma/client";
import { fetchWindData, calculateRideMetrics } from "@/lib/ride-tracking/wind";
import { updateBookingStatusFromTracking } from "@/lib/ride-tracking/status";

// Sequence enforcement
const REQUIRED_PREVIOUS: Record<ScanLocation, keyof {
  firstFloorTime: unknown; thirdFloorTime: unknown; fifthFloorTime: unknown; landingTime: unknown;
} | null> = {
  FIRST_FLOOR:   null,
  THIRD_FLOOR:   "firstFloorTime",
  FIFTH_FLOOR:   "thirdFloorTime",
  LANDING_TOWER: "fifthFloorTime",
} as const;

const NEXT_RIDER_STATUS: Record<ScanLocation, string> = {
  FIRST_FLOOR:   "FIRST_FLOOR",
  THIRD_FLOOR:   "THIRD_FLOOR",
  FIFTH_FLOOR:   "LAUNCHED",
  LANDING_TOWER: "LANDED",
};

const LOCATION_LABEL: Record<ScanLocation, string> = {
  FIRST_FLOOR:   "First Floor",
  THIRD_FLOOR:   "Third Floor",
  FIFTH_FLOOR:   "Fifth Floor",
  LANDING_TOWER: "Landing Tower",
};

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { qrCode, deviceCode, devicePin } = body;

  if (!qrCode || !deviceCode || !devicePin) {
    return NextResponse.json({ success: false, error: "qrCode, deviceCode and devicePin are required" }, { status: 400 });
  }

  // Authenticate device
  const device = await prisma.scanDevice.findUnique({ where: { deviceCode } });
  if (!device)                            return scanError("Device not found", null, null, null);
  if (device.devicePin !== devicePin)     return scanError("Invalid device PIN", null, null, device.id);
  if (device.status !== "ACTIVE")         return scanError("This device is inactive", null, null, device.id);

  const location = device.assignedLocation;

  // Find wristband
  const wristband = await prisma.qRWristband.findUnique({ where: { qrCode } });
  if (!wristband) {
    await logScanEvent({ deviceId: device.id, wristbandQrId: qrCode, scanLocation: location, result: "error", error: "Wristband not registered in system" });
    return scanError("This wristband is not registered in the system.", null, null, device.id);
  }

  if (wristband.status !== "ACTIVE" || !wristband.currentRiderId) {
    await logScanEvent({ deviceId: device.id, wristbandQrId: qrCode, scanLocation: location, result: "error", error: "Wristband not linked to an active rider" });
    return scanError("This wristband is not linked to an active rider.", null, null, device.id);
  }

  const bookingRiderId = wristband.currentRiderId;
  const bookingId      = wristband.currentBookingId!;

  // Load ride tracking + booking
  const tracking = await prisma.rideTracking.findUnique({
    where: { bookingRiderId },
    include: { bookingRider: true, booking: true },
  });

  if (!tracking) {
    await logScanEvent({ deviceId: device.id, wristbandQrId: qrCode, scanLocation: location, bookingRiderId, bookingId, result: "error", error: "No ride tracking record found" });
    return scanError("No ride tracking record found for this rider.", bookingRiderId, bookingId, device.id);
  }

  // Don't allow scans on finalized riders
  const finalStatuses = ["LANDED", "DID_NOT_FLY", "WEATHER_CANCELLED", "RESCHEDULED", "NO_SHOW"];
  if (finalStatuses.includes(tracking.status)) {
    await logScanEvent({ deviceId: device.id, wristbandQrId: qrCode, scanLocation: location, bookingRiderId, bookingId, result: "error", error: `Rider already in final status: ${tracking.status}` });
    return scanError(`This rider's ride is already ${tracking.status.toLowerCase().replace(/_/g, " ")}.`, bookingRiderId, bookingId, device.id);
  }

  // Duplicate scan check
  const alreadyScannedField: Record<ScanLocation, string | null> = {
    FIRST_FLOOR:   tracking.firstFloorTime ? "firstFloorTime" : null,
    THIRD_FLOOR:   tracking.thirdFloorTime ? "thirdFloorTime" : null,
    FIFTH_FLOOR:   tracking.fifthFloorTime ? "fifthFloorTime" : null,
    LANDING_TOWER: tracking.landingTime    ? "landingTime"    : null,
  };
  if (alreadyScannedField[location]) {
    await logScanEvent({ deviceId: device.id, wristbandQrId: qrCode, scanLocation: location, bookingRiderId, bookingId, result: "duplicate", error: `Already scanned at ${LOCATION_LABEL[location]}` });
    return scanError(`Already scanned at ${LOCATION_LABEL[location]}.`, bookingRiderId, bookingId, device.id);
  }

  // Sequence check
  const required = REQUIRED_PREVIOUS[location];
  if (required && !tracking[required as keyof typeof tracking]) {
    const msg = `Previous stage scan is required before ${LOCATION_LABEL[location]}.`;
    await logScanEvent({ deviceId: device.id, wristbandQrId: qrCode, scanLocation: location, bookingRiderId, bookingId, result: "sequence_error", error: msg });
    return scanError(msg, bookingRiderId, bookingId, device.id);
  }

  // Process scan
  const now = new Date();
  const updateData: Record<string, unknown> = {
    status: NEXT_RIDER_STATUS[location],
  };

  if (location === "FIRST_FLOOR")   updateData.firstFloorTime = now;
  if (location === "THIRD_FLOOR")   updateData.thirdFloorTime = now;
  if (location === "FIFTH_FLOOR")   updateData.fifthFloorTime = now;
  if (location === "LANDING_TOWER") updateData.landingTime    = now;

  // Wind data at 5th floor
  if (location === "FIFTH_FLOOR") {
    const wind = await fetchWindData();
    Object.assign(updateData, {
      windSpeedMs:          wind.windSpeedMs,
      windSpeedKmh:         wind.windSpeedKmh,
      windDirectionDegrees: wind.windDirectionDegrees,
      windDirectionCompass: wind.windDirectionCompass,
      windModel:            wind.windModel,
      windApiTimestamp:     wind.windApiTimestamp,
      windFetchedAt:        wind.windFetchedAt,
      windApiStatus:        wind.windApiStatus,
      windRawResponse:      wind.windRawResponse as object,
    });
  }

  // Ride metrics at landing
  if (location === "LANDING_TOWER" && tracking.fifthFloorTime) {
    const metrics = calculateRideMetrics(tracking.fifthFloorTime, now);
    if (metrics) Object.assign(updateData, metrics);
  }

  const updated = await prisma.rideTracking.update({
    where: { id: tracking.id },
    data:  updateData,
    include: { bookingRider: true },
  });

  // Update device last scan
  await prisma.scanDevice.update({ where: { id: device.id }, data: { lastScanAt: now } });

  // Release wristband on landing
  if (location === "LANDING_TOWER") {
    await prisma.qRWristband.update({
      where: { id: wristband.id },
      data:  { status: "COMPLETED", releasedAt: now },
    });
  }

  // Recompute booking status
  await updateBookingStatusFromTracking(bookingId);

  await logScanEvent({ deviceId: device.id, wristbandQrId: qrCode, scanLocation: location, bookingRiderId, bookingId, result: "success" });

  return NextResponse.json({
    success: true,
    location,
    locationLabel: LOCATION_LABEL[location],
    riderName:     updated.bookingRider.name,
    bookingId,
    rideDurationSeconds: updated.rideDurationSeconds,
    rideSpeedKmph:       updated.rideSpeedKmph,
    windSpeedKmh:        updated.windSpeedKmh,
    windDirectionCompass: updated.windDirectionCompass,
    status:        updated.status,
  });
}

// Did-not-fly action
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { qrCode, deviceCode, devicePin, reason, remarks } = body;

  if (!qrCode || !deviceCode || !devicePin || !reason || !remarks) {
    return NextResponse.json({ success: false, error: "qrCode, deviceCode, devicePin, reason and remarks are required" }, { status: 400 });
  }

  const device = await prisma.scanDevice.findUnique({ where: { deviceCode } });
  if (!device || device.devicePin !== devicePin || device.status !== "ACTIVE") {
    return NextResponse.json({ success: false, error: "Device authentication failed" }, { status: 401 });
  }
  if (device.assignedLocation !== "FIFTH_FLOOR") {
    return NextResponse.json({ success: false, error: "Did Not Fly can only be recorded at the Fifth Floor" }, { status: 403 });
  }

  const wristband = await prisma.qRWristband.findUnique({ where: { qrCode } });
  if (!wristband?.currentRiderId) {
    return NextResponse.json({ success: false, error: "Wristband not linked to an active rider" }, { status: 404 });
  }

  const tracking = await prisma.rideTracking.findUnique({ where: { bookingRiderId: wristband.currentRiderId } });
  if (!tracking) return NextResponse.json({ success: false, error: "No ride tracking record found" }, { status: 404 });

  const now = new Date();
  await prisma.rideTracking.update({
    where: { id: tracking.id },
    data:  {
      status:          "DID_NOT_FLY",
      didNotFlyReason: reason,
      didNotFlyAt:     now,
      remarks,
    },
  });

  await prisma.qRWristband.update({
    where: { id: wristband.id },
    data:  { status: "COMPLETED", releasedAt: now },
  });

  await updateBookingStatusFromTracking(tracking.bookingId);

  return NextResponse.json({ success: true });
}

// Helper: scan device info (for kiosk init)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const deviceCode = searchParams.get("deviceCode");
  const devicePin  = searchParams.get("devicePin");

  if (!deviceCode || !devicePin) {
    return NextResponse.json({ error: "deviceCode and devicePin required" }, { status: 400 });
  }

  const device = await prisma.scanDevice.findUnique({ where: { deviceCode } });
  if (!device || device.devicePin !== devicePin) {
    return NextResponse.json({ error: "Invalid device credentials" }, { status: 401 });
  }

  return NextResponse.json({
    id:               device.id,
    deviceName:       device.deviceName,
    assignedLocation: device.assignedLocation,
    status:           device.status,
  });
}

function scanError(error: string, bookingRiderId: string | null, bookingId: string | null, deviceId: string | null) {
  return NextResponse.json({ success: false, error }, { status: 200 });
}

async function logScanEvent(opts: {
  deviceId: string | null;
  wristbandQrId: string;
  scanLocation: ScanLocation;
  bookingRiderId?: string;
  bookingId?: string;
  result: string;
  error?: string;
}) {
  await prisma.scanEvent.create({
    data: {
      deviceId:      opts.deviceId,
      wristbandQrId: opts.wristbandQrId,
      scanLocation:  opts.scanLocation,
      bookingRiderId: opts.bookingRiderId,
      bookingId:     opts.bookingId,
      scanResult:    opts.result,
      errorMessage:  opts.error,
    },
  }).catch(() => {}); // never fail the main scan flow
}
