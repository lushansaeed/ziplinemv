import { prisma } from "@/lib/prisma/client";
import { SlotStatus } from "@prisma/client";
import { addDays, format, getDay } from "date-fns";
import { generateSlots } from "./generate-slots";

/** Parse a YYYY-MM-DD string as UTC midnight — safe across all server timezones. */
function parseUTCDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export async function getAvailableDates(
  activitySlug: string,
  fromDate: Date,
  days = 60
): Promise<string[]> {
  const activity = await prisma.activity.findUnique({ where: { slug: activitySlug } });
  if (!activity) return [];

  const templates = await prisma.slotTemplate.findMany({
    where: { activityId: activity.id, isActive: true },
  });
  const activeDays = new Set(templates.map((t) => t.dayOfWeek));

  const available: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = addDays(fromDate, i);
    const dow = getDay(d);
    if (!activeDays.has(dow)) continue;

    const dateStr = format(d, "yyyy-MM-dd");
    const utcDate = parseUTCDate(dateStr);

    const override = await prisma.dateSlotOverride.findFirst({
      where: { activityId: activity.id, date: utcDate, isClosed: true, isActive: true },
    });
    if (override) continue;

    available.push(dateStr);
  }
  return available;
}

export async function getSlotsForDate(
  activitySlug: string,
  dateStr: string,
  numRiders = 1
) {
  const activity = await prisma.activity.findUnique({ where: { slug: activitySlug } });
  if (!activity) return [];

  // Always UTC midnight — prevents timezone mismatch with DB @db.Date fields
  const date       = parseUTCDate(dateStr);
  const dayOfWeek  = getDay(date);

  const override = await prisma.dateSlotOverride.findFirst({
    where: { activityId: activity.id, date, isActive: true },
  });
  if (override?.isClosed) return [];

  const template = await prisma.slotTemplate.findFirst({
    where: { activityId: activity.id, dayOfWeek, isActive: true },
  });
  if (!template) return [];

  const config = {
    startTime:       override?.startTime        ?? template.startTime,
    endTime:         override?.endTime          ?? template.endTime,
    breakStartTime:  override?.breakStartTime   ?? template.breakStartTime  ?? undefined,
    breakEndTime:    override?.breakEndTime     ?? template.breakEndTime    ?? undefined,
    intervalMinutes: override?.slotIntervalMinutes ?? template.slotIntervalMinutes,
    capacityPerSlot: override?.capacityPerSlot  ?? template.capacity,
  };

  // Generate canonical slots from the current template
  const generated = generateSlots({
    startTime:       config.startTime,
    endTime:         config.endTime,
    breakStartTime:  config.breakStartTime ?? undefined,
    breakEndTime:    config.breakEndTime   ?? undefined,
    intervalMinutes: config.intervalMinutes,
  });
  if (generated.length === 0) return [];

  const generatedMap = Object.fromEntries(
    generated.map((g) => [g.startTime, g])
  );
  const validStartTimes = new Set(generated.map((g) => g.startTime));

  // Create missing slots (skipDuplicates so existing startTimes are untouched)
  await prisma.timeSlot.createMany({
    data: generated.map((g) => ({
      activityId:  activity.id,
      date,
      startTime:   g.startTime,
      endTime:     g.endTime,
      capacity:    config.capacityPerSlot,
      bookedCount: 0,
      status:      SlotStatus.AVAILABLE,
    })),
    skipDuplicates: true,
  });

  // Sync capacity on ALL slots for this date so template changes propagate
  await prisma.timeSlot.updateMany({
    where: { activityId: activity.id, date },
    data:  { capacity: config.capacityPerSlot },
  });

  // Fetch all slots for the date, then filter to valid startTimes
  const allSlots = await prisma.timeSlot.findMany({
    where:   { activityId: activity.id, date },
    orderBy: { startTime: "asc" },
  });

  const blocked = await prisma.blockedSlot.findMany({
    where: { activityId: activity.id, date, isActive: true },
  });
  const blockedSet = new Set(blocked.map((b) => `${b.slotStartTime}-${b.slotEndTime}`));

  const templateStartMin = timeToMinutes(config.startTime);
  const templateEndMin   = timeToMinutes(config.endTime);
  const breakStartMin    = config.breakStartTime ? timeToMinutes(config.breakStartTime) : null;
  const breakEndMin      = config.breakEndTime   ? timeToMinutes(config.breakEndTime)   : null;

  return allSlots
    .filter((s) => {
      const startMin = timeToMinutes(s.startTime);
      // Must be within template operating hours
      if (startMin < templateStartMin || startMin >= templateEndMin) return false;
      // Must not be in the break window
      if (breakStartMin !== null && breakEndMin !== null) {
        if (startMin >= breakStartMin && startMin < breakEndMin) return false;
      }
      return true;
    })
    .filter((s) => s.status !== SlotStatus.WEATHER_CLOSED && s.status !== SlotStatus.EVENT_CLOSED)
    .map((s) => {
      const slotKey   = `${s.startTime}-${s.endTime}`;
      const isBlocked = blockedSet.has(slotKey) || s.status === SlotStatus.BLOCKED;
      const remaining = Math.max(0, s.capacity - s.bookedCount);
      const canBook   = !isBlocked && remaining >= numRiders;
      // Use generated label if startTime matches, otherwise build from slot times
      const label     = generatedMap[s.startTime]?.label ?? `${s.startTime} to ${s.endTime}`;

      return {
        id:            s.id,
        startTime:     s.startTime,
        endTime:       s.endTime,
        label,
        capacity:      s.capacity,
        booked:        s.bookedCount,
        remaining,
        available:     remaining,
        canBook,
        selectable:    canBook,
        status:        isBlocked ? "blocked" : remaining <= 0 ? "full" : "available",
        priceOverride: s.priceOverride ? Number(s.priceOverride) : null,
      } as const;
    });
}
