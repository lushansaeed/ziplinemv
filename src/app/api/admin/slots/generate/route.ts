import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { parseISO, getDay } from "date-fns";
import { SlotStatus } from "@prisma/client";
import { requireApiPermission } from "@/lib/auth/permissions";

export async function POST(req: NextRequest) {
  const auth = await requireApiPermission("slots", "create");
  if (!auth.ok) return auth.response;

  const { date, activityId } = await req.json();
  if (!date || !activityId) return NextResponse.json({ error: "date and activityId required" }, { status: 400 });

  const parsedDate = parseISO(date);
  const dayOfWeek  = getDay(parsedDate);

  const templates = await prisma.slotTemplate.findMany({
    where: { activityId, dayOfWeek, isActive: true },
    orderBy: { startTime: "asc" },
  });

  if (templates.length === 0) {
    return NextResponse.json({ slots: [], message: "No active templates for this day." });
  }

  await prisma.timeSlot.createMany({
    data: templates.map((t) => ({
      activityId,
      date:        parsedDate,
      startTime:   t.startTime,
      endTime:     t.endTime,
      capacity:    t.capacity,
      bookedCount: 0,
      status:      SlotStatus.AVAILABLE,
    })),
    skipDuplicates: true,
  });

  const slots = await prisma.timeSlot.findMany({
    where:   { activityId, date: parsedDate },
    orderBy: { startTime: "asc" },
    include: { _count: { select: { bookings: true } } },
  });

  return NextResponse.json({ slots });
}
