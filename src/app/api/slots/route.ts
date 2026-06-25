import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { generateSlots } from "@/lib/booking/generate-slots";
import { parseISO, getDay } from "date-fns";

export interface SlotAvailability {
  startTime:   string;
  endTime:     string;
  label:       string;      // "09:00 to 09:30"
  capacity:    number;
  booked:      number;
  remaining:   number;
  status:      "available" | "full" | "blocked" | "closed";
  selectable:  boolean;
  priceOverride?: number | null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const dateStr    = searchParams.get("date");
  const numRiders  = parseInt(searchParams.get("riders") ?? "1");
  const activitySlug = searchParams.get("activity") ?? "zipline";

  if (!dateStr) return NextResponse.json({ error: "date required" }, { status: 400 });

  try {
    const date     = parseISO(dateStr);
    const dayOfWeek = getDay(date); // 0=Sun

    const activity = await prisma.activity.findUnique({ where: { slug: activitySlug } });
    if (!activity) return NextResponse.json({ error: "Activity not found" }, { status: 404 });

    // 1. Check date override
    const override = await prisma.dateSlotOverride.findFirst({
      where: { activityId: activity.id, date, isActive: true },
    });

    if (override?.isClosed) {
      return NextResponse.json({ slots: [], closed: true, message: "This date is closed." });
    }

    // 2. Get template for this day
    const template = await prisma.slotTemplate.findFirst({
      where: { activityId: activity.id, dayOfWeek, isActive: true },
    });

    if (!template) {
      return NextResponse.json({ slots: [], message: "No available slots for this date. Please select another date." });
    }

    // 3. Merge override settings over template
    const config = {
      startTime:       override?.startTime       ?? template.startTime,
      endTime:         override?.endTime         ?? template.endTime,
      breakStartTime:  override?.breakStartTime  ?? template.breakStartTime  ?? undefined,
      breakEndTime:    override?.breakEndTime    ?? template.breakEndTime    ?? undefined,
      intervalMinutes: override?.slotIntervalMinutes ?? template.slotIntervalMinutes,
      capacityPerSlot: override?.capacityPerSlot ?? template.capacity,
    };

    // 4. Generate all possible slots
    const generated = generateSlots({
      startTime:       config.startTime,
      endTime:         config.endTime,
      breakStartTime:  config.breakStartTime,
      breakEndTime:    config.breakEndTime,
      intervalMinutes: config.intervalMinutes,
    });

    if (generated.length === 0) {
      return NextResponse.json({ slots: [], message: "No available slots for this date. Please select another date." });
    }

    // 5. Get blocked slots for this date
    const blocked = await prisma.blockedSlot.findMany({
      where: { activityId: activity.id, date, isActive: true },
    });
    const blockedSet = new Set(blocked.map((b) => `${b.slotStartTime}-${b.slotEndTime}`));

    // 6. Get existing time slots + bookings for this date
    const existingSlots = await prisma.timeSlot.findMany({
      where: { activityId: activity.id, date },
    });
    const slotBookings: Record<string, number> = {};
    for (const s of existingSlots) {
      slotBookings[`${s.startTime}-${s.endTime}`] = s.bookedCount;
    }

    // 7. Build availability list
    const slots: SlotAvailability[] = generated.map((g) => {
      const key      = `${g.startTime}-${g.endTime}`;
      const booked   = slotBookings[key] ?? 0;
      const capacity = config.capacityPerSlot;
      const remaining = Math.max(0, capacity - booked);
      const isBlocked = blockedSet.has(key);
      const isFull    = remaining < numRiders;

      let status: SlotAvailability["status"] = "available";
      if (isBlocked)  status = "blocked";
      else if (isFull) status = "full";

      return {
        startTime:  g.startTime,
        endTime:    g.endTime,
        label:      g.label,
        capacity,
        booked,
        remaining,
        status,
        selectable: status === "available",
      };
    });

    return NextResponse.json({ slots });
  } catch (err: any) {
    console.error("[GET /api/slots]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
