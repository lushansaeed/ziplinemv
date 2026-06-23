import type { Metadata } from "next";
import { prisma } from "@/lib/prisma/client";
import { requireRole } from "@/lib/auth/actions";
import { BOOKING_ACCESS } from "@/lib/auth/roles";
import { PageHeader } from "@/components/shared/page-header";
import { WaiversTable } from "@/components/admin/waivers/waivers-table";

export const metadata: Metadata = { title: "Waivers | Admin" };

const PER_PAGE = 30;

async function getWaivers(params: Record<string, string | undefined>) {
  const page   = Math.max(1, parseInt(params.page ?? "1"));
  const search = params.search ?? "";
  const status = params.status;

  const where: any = {
    AND: [
      search ? {
        OR: [
          { riderName: { contains: search, mode: "insensitive" } },
          { booking: { reference: { contains: search, mode: "insensitive" } } },
          { booking: { customer: { name: { contains: search, mode: "insensitive" } } } },
        ],
      } : {},
      status ? { status } : {},
    ],
  };

  const [waivers, total] = await Promise.all([
    prisma.waiver.findMany({
      where,
      skip:    (page - 1) * PER_PAGE,
      take:    PER_PAGE,
      orderBy: { createdAt: "desc" },
      include: {
        booking: {
          select: {
            reference: true, bookingDate: true,
            customer:  { select: { name: true, phone: true } },
            slot:      { select: { startTime: true } },
          },
        },
      },
    }),
    prisma.waiver.count({ where }),
  ]);

  return { waivers, total, page, perPage: PER_PAGE };
}

export default async function WaiversPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  await requireRole(BOOKING_ACCESS as any);
  const data = await getWaivers(searchParams);

  return (
    <div>
      <PageHeader title="Waivers" description={`${data.total} waiver records`} />
      <WaiversTable {...data} searchParams={searchParams} />
    </div>
  );
}
