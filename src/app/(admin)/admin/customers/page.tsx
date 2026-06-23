import type { Metadata } from "next";
import { prisma } from "@/lib/prisma/client";
import { requireRole } from "@/lib/auth/actions";
import { BOOKING_ACCESS } from "@/lib/auth/roles";
import { PageHeader } from "@/components/shared/page-header";
import { CustomersTable } from "@/components/admin/customers/customers-table";
import { Prisma } from "@prisma/client";

export const metadata: Metadata = { title: "Customers | Admin" };

const PER_PAGE = 30;

async function getCustomers(params: Record<string, string | undefined>) {
  const page   = Math.max(1, parseInt(params.page ?? "1"));
  const search = params.search ?? "";
  const source = params.source;

  const where: Prisma.CustomerWhereInput = {
    AND: [
      search ? {
        OR: [
          { name:  { contains: search, mode: "insensitive" } },
          { phone: { contains: search } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      } : {},
      source ? { source: source as any } : {},
    ],
  };

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      skip:    (page - 1) * PER_PAGE,
      take:    PER_PAGE,
      orderBy: { createdAt: "desc" },
      include: {
        agent:     { select: { businessName: true } },
        affiliate: { select: { name: true } },
        _count:    { select: { bookings: true } },
      },
    }),
    prisma.customer.count({ where }),
  ]);

  return { customers, total, page, perPage: PER_PAGE };
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  await requireRole(BOOKING_ACCESS as any);
  const data = await getCustomers(searchParams);

  return (
    <div>
      <PageHeader title="Customers" description={`${data.total} total customers`} />
      <CustomersTable {...data} searchParams={searchParams} />
    </div>
  );
}
