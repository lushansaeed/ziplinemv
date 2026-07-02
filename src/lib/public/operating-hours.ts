import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/lib/prisma/client";

const DAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
const DEFAULT_HOURS = "08:00 – 17:00";

type DayKey = (typeof DAY_KEYS)[number];

export interface PublicOperatingHours {
  summary: string;
  byDay: Record<DayKey, string>;
  openDays: number[];
}

function formatRange(start?: string, end?: string) {
  if (!start || !end) return "Closed";
  return `${start} – ${end}`;
}

export async function getPublicOperatingHours(activitySlug = "zipline"): Promise<PublicOperatingHours> {
  noStore();

  const fallbackByDay = Object.fromEntries(DAY_KEYS.map((day) => [day, DEFAULT_HOURS])) as Record<DayKey, string>;

  try {
    const templates = await prisma.slotTemplate.findMany({
      where: { isActive: true, activity: { slug: activitySlug, active: true } },
      select: { dayOfWeek: true, startTime: true, endTime: true },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });

    if (templates.length === 0) {
      return { summary: `Open daily ${DEFAULT_HOURS}`, byDay: fallbackByDay, openDays: [0, 1, 2, 3, 4, 5, 6] };
    }

    const grouped = new Map<number, { startTime: string; endTime: string }[]>();
    for (const template of templates) {
      const existing = grouped.get(template.dayOfWeek) ?? [];
      existing.push({ startTime: template.startTime, endTime: template.endTime });
      grouped.set(template.dayOfWeek, existing);
    }

    const byDay = Object.fromEntries(
      DAY_KEYS.map((day, index) => {
        const dayTemplates = grouped.get(index) ?? [];
        const starts = dayTemplates.map((template) => template.startTime).sort();
        const ends = dayTemplates.map((template) => template.endTime).sort();
        return [day, formatRange(starts[0], ends[ends.length - 1])];
      })
    ) as Record<DayKey, string>;

    const openRanges = Object.values(byDay).filter((range) => range !== "Closed");
    const starts = templates.map((template) => template.startTime).sort();
    const ends = templates.map((template) => template.endTime).sort();
    const globalRange = formatRange(starts[0], ends[ends.length - 1]);
    const allDaysOpen = DAY_KEYS.every((_, index) => grouped.has(index));
    const sameDailyRange = openRanges.length > 0 && openRanges.every((range) => range === openRanges[0]);
    const summary = allDaysOpen && sameDailyRange
      ? `Open daily ${openRanges[0]}`
      : `Slots ${globalRange}`;

    return { summary, byDay, openDays: Array.from(grouped.keys()).sort((a, b) => a - b) };
  } catch {
    return { summary: `Open daily ${DEFAULT_HOURS}`, byDay: fallbackByDay, openDays: [0, 1, 2, 3, 4, 5, 6] };
  }
}
