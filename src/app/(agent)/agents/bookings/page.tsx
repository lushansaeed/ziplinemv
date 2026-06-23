import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma/client";
import { getApprovedAgent } from "@/lib/agent/helpers";
import { PageHeader } from "@/components/shared/page-header";
import { AgentBookingsTable } from "@/components/agent/bookings/agent-bookings-table";
import { Prisma } from "@prisma/client";

export const metadata: Metadata = { title: "My Bookings | Agent Portal" };

const PER_PAGE = 20;

async function getAgentBookings(agentId: string, params: Record<string, string | undefined>) {
  const page   = Math.max(1, parseInt(params.page ?? "1"));
  const search = params.search ?? "";
  const status = params.status;

  const where: Prisma.BookingWhereInput = {
    agentId,
    AND: [
      search ? {
        OR: [
          { reference:          { contains: search.toUpperCase() } },
          { customer: { name:   { contains: search, mode: "insensitive" } } },
          { customer: { phone:  { contains: search } } },
        ],
      } : {},
      status ? { bookingStatus: status as any } : {},
    ],
  };

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      orderBy: [{ bookingDate: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: {
        customer: { select: { name: true, phone: true, nationality: true } },
        package:  { select: { name: true } },
        slot:     { select: { startTime: true } },
        addOns:   { include: { addOn: { select: { name: true } } } },
        agentCommission: { select: { amount: true, status: true } },
      },
    }),
    prisma.booking.count({ where }),
  ]);

  return { bookings, total, page, perPage: PER_PAGE };
}

export default async function AgentBookingsPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  const { agent } = await getApprovedAgent();
  const data = await getAgentBookings(agent.id, searchParams);

  return (
    <div>
      <PageHeader
        title="My Bookings"
        description={`${data.total} total bookings`}
        actions={
          <Link href="/agents/bookings/new" className="btn-brand text-sm px-4 py-2">
            <Plus className="w-4 h-4" />
            New booking
          </Link>
        }
      />
      <AgentBookingsTable
        bookings={data.bookings as any}
        total={data.total}
        page={data.page}
        perPage={data.perPage}
        searchParams={searchParams as Record<string, string | undefined>}
      />
    </div>
  );
}
