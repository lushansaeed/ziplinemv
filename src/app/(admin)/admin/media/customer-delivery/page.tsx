import type { Metadata } from "next";
import { prisma } from "@/lib/prisma/client";
import { requireRole } from "@/lib/auth/actions";
import { MEDIA_ACCESS } from "@/lib/auth/roles";
import { PageHeader } from "@/components/shared/page-header";
import { CustomerMediaTable } from "@/components/admin/media/customer-media-table";

export const metadata: Metadata = { title: "Customer Media Delivery | Admin" };

const PER_PAGE = 25;

async function getDeliveries(params: Record<string, string | undefined>) {
  const page   = Math.max(1, parseInt(params.page ?? "1"));
  const search = params.search ?? "";
  const status = params.status;

  const where: any = {
    AND: [
      search ? {
        OR: [
          { booking: { reference: { contains: search.toUpperCase() } } },
          { booking: { customer: { name: { contains: search, mode: "insensitive" } } } },
        ],
      } : {},
      status ? { deliveryStatus: status } : {},
    ],
  };

  const [deliveries, total] = await Promise.all([
    prisma.customerMediaDelivery.findMany({
      where,
      skip:    (page - 1) * PER_PAGE,
      take:    PER_PAGE,
      orderBy: { createdAt: "desc" },
      include: {
        booking: {
          select: {
            reference: true, bookingDate: true,
            customer:  { select: { name: true, phone: true, email: true } },
            addOns:    { include: { addOn: { select: { name: true } } } },
          },
        },
        assignedTo: { select: { name: true } },
      },
    }),
    prisma.customerMediaDelivery.count({ where }),
  ]);

  const staff = await prisma.user.findMany({
    where: { role: { in: ["MEDIA_STAFF", "ADMIN", "SUPER_ADMIN"] }, status: "ACTIVE" },
    select: { id: true, name: true },
  });

  return { deliveries, total, page, perPage: PER_PAGE, staff };
}

export default async function CustomerMediaDeliveryPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  await requireRole(MEDIA_ACCESS as any);
  const data = await getDeliveries(searchParams);
  return (
    <div>
      <PageHeader title="Customer Media Delivery" description="Track and manage photography, 360° video, and drone footage delivery." />
      <CustomerMediaTable {...data} searchParams={searchParams} />
    </div>
  );
}
