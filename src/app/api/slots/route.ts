import { NextRequest, NextResponse } from "next/server";
import { getSlotsForDate } from "@/lib/booking/slots";

/**
 * GET /api/slots?date=YYYY-MM-DD&riders=N&activity=zipline
 *
 * Returns available time slots with full range labels.
 * Uses getSlotsForDate() which:
 *  1. Reads the slot template for the day (with break times)
 *  2. Generates slots via generateSlots() — break time excluded
 *  3. Creates/updates TimeSlot DB records (so booking creation has valid IDs)
 *  4. Removes admin-blocked slots
 *  5. Calculates remaining capacity
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const dateStr      = searchParams.get("date");
  const numRiders    = parseInt(searchParams.get("riders") ?? "1");
  const activitySlug = searchParams.get("activity") ?? "zipline";

  if (!dateStr) return NextResponse.json({ error: "date required" }, { status: 400 });

  try {
    const slots = await getSlotsForDate(activitySlug, dateStr, numRiders);

    if (slots.length === 0) {
      return NextResponse.json({
        slots: [],
        message: "No available slots for this date. Please select another date.",
      });
    }

    return NextResponse.json({ slots });
  } catch (err: any) {
    console.error("[GET /api/slots]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
