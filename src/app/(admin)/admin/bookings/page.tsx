import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma/client";
import { requirePermission, userHasPermission } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { BookingsTable } from "@/components/admin/bookings/bookings-table";
import { TestBookingButton } from "@/components/admin/bookings/test-booking-button";
import { Prisma } from "@prisma/client";

export const metadata: Metadata = { title: "Bookings | Admin" };

const PER_PAGE = 25;

interface SearchParams {
  page?:    string;
  search?:  string;
  status?:  string;
  payment?: string;
  source?:  string;
  from?:    string;
  to?:      string;
  sort?:    string;
  dir?:     string;
}

async function getBookings(params: SearchParams) {
  const page    = Math.max(1, parseInt(params.page ?? "1"));
  const search  = params.search ?? "";
  const skip    = (page - 1) * PER_PAGE;

  const where: Prisma.BookingWhereInput = {
    AND: [
      search ? {
        OR: [
          { reference:          { contains: search, mode: "insensitive" } },
          { customer: { name:   { contains: search, mode: "insensitive" } } },
          { customer: { phone:  { contains: search, mode: "insensitive" } } },
          { customer: { email:  { contains: search, mode: "insensitive" } } },
        ],
      } : {},
      params.status  ? { bookingStatus: params.status  as any } : {},
      params.payment ? { paymentStatus: params.payment as any } : {},
      params.source  ? { source:        params.source  as any } : {},
      params.from    ? { bookingDate:   { gte: new Date(params.from) } } : {},
      params.to      ? { bookingDate:   { lte: new Date(params.to)   } } : {},
    ],
  };

  const sortField = params.sort ?? "createdAt";
  const sortDir   = (params.dir ?? "desc") as "asc" | "desc";

  const validSortFields: Record<string, Prisma.BookingOrderByWithRelationInput> = {
    createdAt:   { createdAt: sortDir },
    bookingDate: { bookingDate: sortDir },
    total:       { total: sortDir },
    reference:   { reference: sortDir },
  };
  const orderBy = validSortFields[sortField] ?? { createdAt: "desc" };

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      orderBy,
      skip,
      take: PER_PAGE,
      include: {
        customer: { select: { name: true, phone: true, email: true, nationality: true } },
        package:  { select: { name: true } },
        slot:     { select: { startTime: true, endTime: true } },
        agent:    { select: { businessName: true } },
        affiliate:{ select: { name: true } },
        addOns:   { include: { addOn: { select: { name: true } } } },
        waivers:  { select: { status: true } },
      },
    }),
    prisma.booking.count({ where }),
  ]);

  return { bookings, total, page, perPage: PER_PAGE };
}

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requirePermission("bookings", "view");
  const canEditPayments = await userHasPermission(user.id, user.role, "payments", "edit");
  const { bookings, total, page, perPage } = await getBookings(searchParams);

  return (
    <div>
      <PageHeader
        title="Bookings"
        description={`${total} total bookings`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <TestBookingButton />
            <Link href="/admin/bookings/walk-in" className="btn-brand text-sm px-4 py-2">
              <Plus className="w-4 h-4" />
              Walk-in booking
            </Link>
          </div>
        }
      />
      <BookingsTable
        bookings={bookings as any}
        total={total}
        page={page}
        perPage={perPage}
        searchParams={searchParams as Record<string, string | undefined>}
        canEditPayments={canEditPayments}
      />
    </div>
  );
}
