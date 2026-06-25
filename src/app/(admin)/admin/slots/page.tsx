import type { Metadata } from "next";
import { prisma } from "@/lib/prisma/client";
import { requireRole } from "@/lib/auth/actions";
import { OPERATIONS_AND_ABOVE } from "@/lib/auth/roles";
import { PageHeader } from "@/components/shared/page-header";
import { SlotTemplateManager } from "@/components/admin/slots/slot-template-manager";

export const metadata: Metadata = { title: "Time Slots | Admin" };

export default async function SlotsPage() {
  await requireRole(OPERATIONS_AND_ABOVE as any);

  const activity = await prisma.activity.findUnique({ where: { slug: "zipline" } });
  if (!activity) return <div className="p-6 text-muted-foreground">Activity not found.</div>;

  const templates = await prisma.slotTemplate.findMany({
    where:   { activityId: activity.id },
    orderBy: { dayOfWeek: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Time Slots"
        description="Configure slot templates for each day of the week. Slots are generated dynamically from these templates."
      />
      <SlotTemplateManager
        activityId={activity.id}
        templates={templates.map((t) => ({
          id:                  t.id,
          dayOfWeek:           t.dayOfWeek,
          isActive:            t.isActive,
          startTime:           t.startTime,
          endTime:             t.endTime,
          breakStartTime:      t.breakStartTime ?? "",
          breakEndTime:        t.breakEndTime   ?? "",
          slotIntervalMinutes: t.slotIntervalMinutes,
          capacity:            t.capacity,
        }))}
      />
    </div>
  );
}
