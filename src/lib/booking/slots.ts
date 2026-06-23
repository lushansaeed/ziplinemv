import { prisma } from "@/lib/prisma/client";
import { SlotStatus } from "@prisma/client";
import { addDays, format, getDay, parseISO } from "date-fns";

export async function getAvailableDates(
  activitySlug: string,
  fromDate: Date,
  days = 60
): Promise<string[]> {
  const activity = await prisma.activity.findUnique({ where: { slug: activitySlug } });
  if (!activity) return [];

  const templates = await prisma.slotTemplate.findMany({
    where: { activityId: activity.id, active: true },
  });
  const activeDays = new Set(templates.map((t) => t.dayOfWeek));

  const available: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = addDays(fromDate, i);
    if (!activeDays.has(getDay(d))) continue;

    // Check if any slot exists and isn't fully blocked
    const dateStr = format(d, "yyyy-MM-dd");
    const blocked = await prisma.timeSlot.count({
      where: {
        activityId: activity.id,
        date:       parseISO(dateStr),
        status:     { in: [SlotStatus.WEATHER_CLOSED, SlotStatus.EVENT_CLOSED] },
      },
    });

    // If the entire day isn't blocked, mark as available
    const totalTemplateSlots = templates.filter((t) => t.dayOfWeek === getDay(d)).length;
    if (blocked < totalTemplateSlots) available.push(dateStr);
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

  // Get or generate slots for this date
  let slots = await prisma.timeSlot.findMany({
    where: { activityId: activity.id, date },
    orderBy: { startTime: "asc" },
  });

  if (slots.length === 0) {
    // Auto-generate from templates
    const dayOfWeek = getDay(date);
    const templates = await prisma.slotTemplate.findMany({
      where: { activityId: activity.id, dayOfWeek, active: true },
      orderBy: { startTime: "asc" },
    });

    if (templates.length > 0) {
      await prisma.timeSlot.createMany({
        data: templates.map((t) => ({
          activityId: activity.id,
          date,
          startTime:  t.startTime,
          endTime:    t.endTime,
          capacity:   t.capacity,
          bookedCount: 0,
          status:     SlotStatus.AVAILABLE,
        })),
        skipDuplicates: true,
      });

      slots = await prisma.timeSlot.findMany({
        where: { activityId: activity.id, date },
        orderBy: { startTime: "asc" },
      });
    }
  }

  return slots
    .filter((s) => s.status !== SlotStatus.BLOCKED &&
                   s.status !== SlotStatus.WEATHER_CLOSED &&
                   s.status !== SlotStatus.EVENT_CLOSED)
    .map((s) => ({
      id:          s.id,
      startTime:   s.startTime,
      endTime:     s.endTime,
      capacity:    s.capacity,
      bookedCount: s.bookedCount,
      available:   s.capacity - s.bookedCount,
      canBook:     s.capacity - s.bookedCount >= numRiders,
      status:      s.status,
      priceOverride: s.priceOverride ? Number(s.priceOverride) : null,
    }));
}
