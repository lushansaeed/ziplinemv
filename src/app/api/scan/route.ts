import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { ScanLocation } from "@prisma/client";
import { fetchWindData, calculateRideMetrics } from "@/lib/ride-tracking/wind";
import { updateBookingStatusFromTracking } from "@/lib/ride-tracking/status";
import { checkRiderWaiver } from "@/lib/ride-tracking/waiver-check";
import { parseScanDeviceSettings } from "@/lib/ride-tracking/scan-device-settings";
import { ensureRideTrackingLaunchLineColumn } from "@/lib/ride-tracking/schema-guard";

// ── Scan sequence: what field must exist before this location ────────────────
const REQUIRED_PREVIOUS: Record<ScanLocation, keyof Pick<{
  firstFloorTime: unknown; thirdFloorTime: unknown; fifthFloorTime: unknown; landingTime: unknown;
}, "firstFloorTime" | "thirdFloorTime" | "fifthFloorTime" | "landingTime"> | null> = {
  FIRST_FLOOR:   null,
  THIRD_FLOOR:   "firstFloorTime",
  FIFTH_FLOOR:   "thirdFloorTime",
  LANDING_TOWER: "fifthFloorTime",
};

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

const FINAL_STATUSES = ["LANDED", "DID_NOT_FLY", "WEATHER_CANCELLED", "RESCHEDULED", "NO_SHOW"];
const BLOCKED_BOOKING_STATUSES = ["CANCELLED", "COMPLETED", "NO_SHOW", "WEATHER_CANCELLED", "RESCHEDULED", "REFUNDED"];

// ── POST: process a QR wristband scan ───────────────────────────────────────
export async function POST(req: NextRequest) {
  await ensureRideTrackingLaunchLineColumn();
  const body = await req.json();
  const { qrCode, deviceCode, devicePin } = body;

  if (!qrCode || !deviceCode || !devicePin) {
    return NextResponse.json({ success: false, error: "qrCode, deviceCode and devicePin are required" }, { status: 400 });
  }

  // 1. Authenticate device
  const device = await prisma.scanDevice.findUnique({ where: { deviceCode } });
  if (!device)                         return scanError("Device not found.", null, null, null, null);
  if (device.devicePin !== devicePin)  return scanError("Invalid device PIN.", null, null, null, device.id);
  if (device.status !== "ACTIVE")      return scanError("This device is inactive. Contact your supervisor.", null, null, null, device.id);

  const location = device.assignedLocation;
  const launchLineNumber = normalizeLaunchLineNumber(body.launchLineNumber);
  if (location === "FIFTH_FLOOR" && !launchLineNumber) {
    return scanError("Select launch line 1 or 2 before scanning.", null, null, qrCode, device.id);
  }

  // 2. Find wristband
  const wristband = await prisma.qRWristband.findUnique({ where: { qrCode } });
  if (!wristband) {
    await logScan({ deviceId: device.id, qrCode, location, result: "error", error: "Wristband not registered in system" });
    return scanError("This wristband is not registered in the system.", null, null, qrCode, device.id);
  }

  // 3. Wristband must be linked to an active rider
  if (wristband.status !== "ACTIVE" || !wristband.currentRiderId || !wristband.currentBookingId) {
    await logScan({ deviceId: device.id, qrCode, location, result: "error", error: "Wristband not linked to an active rider" });
    return scanError("This wristband is not linked to an active rider.", null, null, qrCode, device.id);
  }

  const bookingRiderId = wristband.currentRiderId;
  const bookingId      = wristband.currentBookingId;

  // 4. Load booking + rider
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) {
    await logScan({ deviceId: device.id, qrCode, location, bookingId, bookingRiderId, result: "error", error: "Booking not found" });
    return scanError("Booking not found.", bookingRiderId, bookingId, qrCode, device.id);
  }

  // 5. Booking must be active
  if (BLOCKED_BOOKING_STATUSES.includes(booking.bookingStatus)) {
    const msg = `Booking is ${booking.bookingStatus.toLowerCase().replace(/_/g, " ")}. Scan not allowed.`;
    await logScan({ deviceId: device.id, qrCode, location, bookingId, bookingRiderId, result: "error", error: msg });
    return scanError(msg, bookingRiderId, bookingId, qrCode, device.id);
  }

  // 6. Load booking rider
  const bookingRider = await prisma.bookingRider.findUnique({ where: { id: bookingRiderId } });
  if (!bookingRider) {
    await logScan({ deviceId: device.id, qrCode, location, bookingId, bookingRiderId, result: "error", error: "Rider record not found" });
    return scanError("Rider record not found.", bookingRiderId, bookingId, qrCode, device.id);
  }

  // 7. ── WAIVER CHECK — hard gate, no bypass for any role ──────────────────
  const waiverResult = await checkRiderWaiver(bookingId, bookingRider);
  if (!waiverResult.signed) {
    const msg = `Scan blocked. Waiver form is not completed for rider "${bookingRider.name}".`;
    await logScan({ deviceId: device.id, qrCode, location, bookingId, bookingRiderId, result: "waiver_missing", error: msg });
    return scanError(msg, bookingRiderId, bookingId, qrCode, device.id);
  }

  // 8. Load ride tracking
  const tracking = await prisma.rideTracking.findUnique({
    where: { bookingRiderId },
    include: { bookingRider: true },
  });
  if (!tracking) {
    await logScan({ deviceId: device.id, qrCode, location, bookingId, bookingRiderId, result: "error", error: "No ride tracking record — wristband may not have been checked in at reception" });
    return scanError("No ride tracking record found. Please check the rider in at reception first.", bookingRiderId, bookingId, qrCode, device.id);
  }

  // 9. Rider must not already be in a final status
  if (FINAL_STATUSES.includes(tracking.status)) {
    const msg = `Rider is already ${tracking.status.toLowerCase().replace(/_/g, " ")}.`;
    await logScan({ deviceId: device.id, qrCode, location, bookingId, bookingRiderId, result: "error", error: msg });
    return scanError(msg, bookingRiderId, bookingId, qrCode, device.id);
  }

  // 10. Duplicate scan check
  const alreadyScanned: Partial<Record<ScanLocation, boolean>> = {
    FIRST_FLOOR:   !!tracking.firstFloorTime,
    THIRD_FLOOR:   !!tracking.thirdFloorTime,
    FIFTH_FLOOR:   !!tracking.fifthFloorTime,
    LANDING_TOWER: !!tracking.landingTime,
  };
  if (alreadyScanned[location]) {
    const msg = `Already scanned at ${LOCATION_LABEL[location]}.`;
    await logScan({ deviceId: device.id, qrCode, location, bookingId, bookingRiderId, result: "duplicate", error: msg });
    return scanError(msg, bookingRiderId, bookingId, qrCode, device.id);
  }

  // 11. Sequence check
  const required = REQUIRED_PREVIOUS[location];
  if (required && !tracking[required as keyof typeof tracking]) {
    const msg = `Previous stage scan is required before ${LOCATION_LABEL[location]}.`;
    await logScan({ deviceId: device.id, qrCode, location, bookingId, bookingRiderId, result: "sequence_error", error: msg });
    return scanError(msg, bookingRiderId, bookingId, qrCode, device.id);
  }

  // 12. Record the scan
  const now = new Date();
  const updateData: Record<string, unknown> = { status: NEXT_RIDER_STATUS[location] };

  if (location === "FIRST_FLOOR")   updateData.firstFloorTime = now;
  if (location === "THIRD_FLOOR")   updateData.thirdFloorTime = now;
  if (location === "FIFTH_FLOOR") {
    updateData.fifthFloorTime = now;
    updateData.launchLineNumber = launchLineNumber;
  }
  if (location === "LANDING_TOWER") updateData.landingTime    = now;

  // Wind data at 5th floor (best-effort, never blocks scan)
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

  // Update device last scan time
  await prisma.scanDevice.update({ where: { id: device.id }, data: { lastScanAt: now } });

  // Release wristband on landing
  if (location === "LANDING_TOWER") {
    await prisma.qRWristband.update({
      where: { id: wristband.id },
      data:  {
        status: "AVAILABLE",
        currentBookingId: null,
        currentRiderId: null,
        releasedAt: now,
      },
    });
  }

  // Recompute booking status from all riders
  await updateBookingStatusFromTracking(bookingId);

  await logScan({ deviceId: device.id, qrCode, location, bookingId, bookingRiderId, result: "success" });

  return NextResponse.json({
    success:              true,
    location,
    locationLabel:        LOCATION_LABEL[location],
    riderName:            updated.bookingRider.name,
    bookingId,
    rideDurationSeconds:  updated.rideDurationSeconds,
    rideSpeedKmph:        updated.rideSpeedKmph,
    launchLineNumber:     updated.launchLineNumber,
    windSpeedKmh:         updated.windSpeedKmh,
    windDirectionCompass: updated.windDirectionCompass,
    status:               updated.status,
  });
}

function normalizeLaunchLineNumber(value: unknown) {
  const line = Number(value);
  return line === 1 || line === 2 ? line : null;
}

// ── PATCH: Did Not Fly — 5th floor only ─────────────────────────────────────
export async function PATCH(req: NextRequest) {
  await ensureRideTrackingLaunchLineColumn();
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
  if (!wristband?.currentRiderId || !wristband.currentBookingId) {
    return NextResponse.json({ success: false, error: "Wristband not linked to an active rider" }, { status: 404 });
  }

  // Waiver check even for Did Not Fly
  const bookingRider = await prisma.bookingRider.findUnique({ where: { id: wristband.currentRiderId } });
  if (bookingRider) {
    const waiverResult = await checkRiderWaiver(wristband.currentBookingId, bookingRider);
    if (!waiverResult.signed) {
      return NextResponse.json({ success: false, error: `Scan blocked. ${waiverResult.error}` }, { status: 422 });
    }
  }

  const tracking = await prisma.rideTracking.findUnique({ where: { bookingRiderId: wristband.currentRiderId } });
  if (!tracking) return NextResponse.json({ success: false, error: "No ride tracking record found" }, { status: 404 });

  const now = new Date();
  await prisma.rideTracking.update({
    where: { id: tracking.id },
    data:  { status: "DID_NOT_FLY", didNotFlyReason: reason, didNotFlyAt: now, remarks },
  });

  await prisma.qRWristband.update({
    where: { id: wristband.id },
    data:  {
      status: "AVAILABLE",
      currentBookingId: null,
      currentRiderId: null,
      releasedAt: now,
    },
  });

  await updateBookingStatusFromTracking(tracking.bookingId);

  return NextResponse.json({ success: true });
}

// ── GET: device info for kiosk PIN auth ─────────────────────────────────────
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
  const settings = parseScanDeviceSettings(device.notes);

  return NextResponse.json({
    id:               device.id,
    deviceName:       device.deviceName,
    assignedLocation: device.assignedLocation,
    status:           device.status,
    scanMode:         settings.scanMode,
  });
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function scanError(
  error: string,
  bookingRiderId: string | null,
  bookingId: string | null,
  qrCode: string | null,
  deviceId: string | null,
) {
  return NextResponse.json({ success: false, error }, { status: 200 });
}

async function logScan(opts: {
  deviceId: string | null;
  qrCode: string;
  location: ScanLocation;
  bookingId?: string;
  bookingRiderId?: string;
  result: string;
  error?: string;
}) {
  await prisma.scanEvent.create({
    data: {
      deviceId:       opts.deviceId,
      wristbandQrId:  opts.qrCode,
      scanLocation:   opts.location,
      bookingId:      opts.bookingId,
      bookingRiderId: opts.bookingRiderId,
      scanResult:     opts.result,
      errorMessage:   opts.error,
    },
  }).catch(() => {}); // must never fail the scan response
}
