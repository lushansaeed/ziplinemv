import { prisma } from "@/lib/prisma/client";
import { SlotStatus } from "@prisma/client";
import { addDays, format, getDay, parseISO } from "date-fns";
import { generateSlots } from "./generate-slots";

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

    // Check for closed override
    const override = await prisma.dateSlotOverride.findFirst({
      where: { activityId: activity.id, date: parseISO(dateStr), isClosed: true, isActive: true },
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

  const date = parseISO(dateStr);
  const dayOfWeek = getDay(date);

  // Check date override
  const override = await prisma.dateSlotOverride.findFirst({
    where: { activityId: activity.id, date, isActive: true },
  });

  if (override?.isClosed) return [];

  // Get template
  const template = await prisma.slotTemplate.findFirst({
    where: { activityId: activity.id, dayOfWeek, isActive: true },
  });
  if (!template) return [];

  // Merge override
  const config = {
    startTime:       override?.startTime       ?? template.startTime,
    endTime:         override?.endTime         ?? template.endTime,
    breakStartTime:  override?.breakStartTime  ?? template.breakStartTime  ?? undefined,
    breakEndTime:    override?.breakEndTime    ?? template.breakEndTime    ?? undefined,
    intervalMinutes: override?.slotIntervalMinutes ?? template.slotIntervalMinutes,
    capacityPerSlot: override?.capacityPerSlot ?? template.capacity,
  };

  // Generate slots
  const generated = generateSlots({
    startTime:       config.startTime,
    endTime:         config.endTime,
    breakStartTime:  config.breakStartTime ?? undefined,
    breakEndTime:    config.breakEndTime   ?? undefined,
    intervalMinutes: config.intervalMinutes,
  });

  if (generated.length === 0) return [];

  // Auto-create TimeSlot records if missing
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

  // Fetch with booked counts
  const slots = await prisma.timeSlot.findMany({
    where:   { activityId: activity.id, date },
    orderBy: { startTime: "asc" },
  });

  // Get blocked slots
  const blocked = await prisma.blockedSlot.findMany({
    where: { activityId: activity.id, date, isActive: true },
  });
  const blockedSet = new Set(blocked.map((b) => `${b.slotStartTime}-${b.slotEndTime}`));

  // Filter to only generated slots (in case old slots exist)
  const generatedKeys = new Set(generated.map((g) => `${g.startTime}-${g.endTime}`));
  const generatedMap  = Object.fromEntries(generated.map((g) => [`${g.startTime}-${g.endTime}`, g]));

  return slots
    .filter((s) => generatedKeys.has(`${s.startTime}-${s.endTime}`))
    .filter((s) => s.status !== SlotStatus.WEATHER_CLOSED && s.status !== SlotStatus.EVENT_CLOSED)
    .map((s) => {
      const key       = `${s.startTime}-${s.endTime}`;
      const isBlocked = blockedSet.has(key) || s.status === SlotStatus.BLOCKED;
      const available = s.capacity - s.bookedCount;
      const label     = generatedMap[key]?.label ?? `${s.startTime} to ${s.endTime}`;

      return {
        id:          s.id,
        startTime:   s.startTime,
        endTime:     s.endTime,
        label,
        capacity:    s.capacity,
        bookedCount: s.bookedCount,
        available,
        canBook:     !isBlocked && available >= numRiders,
        status:      isBlocked ? "blocked" : available <= 0 ? "full" : "available",
        priceOverride: s.priceOverride ? Number(s.priceOverride) : null,
      };
    });
}
