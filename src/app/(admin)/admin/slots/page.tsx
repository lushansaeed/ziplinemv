import type { Metadata } from "next";
import { prisma } from "@/lib/prisma/client";
import { requireRole } from "@/lib/auth/actions";
import { OPERATIONS_AND_ABOVE } from "@/lib/auth/roles";
import { PageHeader } from "@/components/shared/page-header";
import { SlotsWorkspace } from "@/components/admin/slots/slots-workspace";
import { addDays, format, startOfDay } from "date-fns";

export const metadata: Metadata = { title: "Time Slots | Admin" };

async function getSlotsData(dateStr?: string) {
  const activity = await prisma.activity.findUnique({ where: { slug: "zipline" } });
  if (!activity) return { activity: null, templates: [], slots: [], date: dateStr ?? format(new Date(), "yyyy-MM-dd") };

  const date = dateStr ? new Date(dateStr) : new Date();
  const from = startOfDay(date);
  const to   = addDays(from, 14); // show 2 weeks

  const [templates, slots] = await Promise.all([
    prisma.slotTemplate.findMany({
      where:   { activityId: activity.id },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    }),
    prisma.timeSlot.findMany({
      where:   { activityId: activity.id, date: { gte: from, lt: to } },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
      include: { _count: { select: { bookings: true } } },
    }),
  ]);

  return { activity, templates, slots, date: format(from, "yyyy-MM-dd") };
}

export default async function SlotsPage({
  searchParams,
}: {
  searchParams: { date?: string };
}) {
  await requireRole(OPERATIONS_AND_ABOVE as any);
  const data = await getSlotsData(searchParams.date);
  return (
    <div>
      <PageHeader
        title="Time Slots"
        description="Manage operating templates, block individual slots, and set capacity."
      />
      <SlotsWorkspace {...data} />
    </div>
  );
}
