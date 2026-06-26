import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { validateSlotConfig } from "@/lib/booking/generate-slots";
import { requireApiPermission } from "@/lib/auth/permissions";

export async function POST(req: NextRequest) {
  const auth = await requireApiPermission("slots", "edit");
  if (!auth.ok) return auth.response;

  const { activityId, templates } = await req.json();
  if (!activityId || !Array.isArray(templates)) {
    return NextResponse.json({ error: "activityId and templates[] required" }, { status: 400 });
  }

  // Validate each template
  for (const t of templates) {
    if (!t.isActive) continue; // skip validation for inactive days
    const errors = validateSlotConfig({
      startTime: t.startTime, endTime: t.endTime,
      breakStartTime: t.breakStartTime || undefined,
      breakEndTime:   t.breakEndTime   || undefined,
      intervalMinutes: t.slotIntervalMinutes,
    });
    if (errors.length > 0) {
      const day = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][t.dayOfWeek];
      return NextResponse.json({ error: `${day}: ${errors[0]}` }, { status: 400 });
    }
  }

  // Upsert all 7 templates
  await Promise.all(templates.map((t: any) =>
    prisma.slotTemplate.upsert({
      where:  { activityId_dayOfWeek: { activityId, dayOfWeek: t.dayOfWeek } },
      update: {
        isActive:            t.isActive,
        startTime:           t.startTime,
        endTime:             t.endTime,
        breakStartTime:      t.breakStartTime || null,
        breakEndTime:        t.breakEndTime   || null,
        slotIntervalMinutes: t.slotIntervalMinutes,
        capacity:            t.capacity,
      },
      create: {
        activityId,
        dayOfWeek:           t.dayOfWeek,
        isActive:            t.isActive,
        startTime:           t.startTime,
        endTime:             t.endTime,
        breakStartTime:      t.breakStartTime || null,
        breakEndTime:        t.breakEndTime   || null,
        slotIntervalMinutes: t.slotIntervalMinutes,
        capacity:            t.capacity,
      },
    })
  ));

  return NextResponse.json({ success: true });
}
