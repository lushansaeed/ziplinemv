import type { Metadata } from "next";
import { prisma } from "@/lib/prisma/client";
import { requirePermission } from "@/lib/auth/permissions";
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

  const [rawDeliveries, total] = await Promise.all([
    prisma.customerMediaDelivery.findMany({
      where,
      skip:    (page - 1) * PER_PAGE,
      take:    PER_PAGE,
      orderBy: { createdAt: "desc" },
      include: {
        booking: {
          select: {
            id: true, reference: true, bookingDate: true, driveFolderUrl: true, mediaFolderStatus: true, mediaUploadedAt: true,
            customer:  { select: { name: true, phone: true, email: true } },
            addOns:    { include: { addOn: { select: { id: true, name: true } } } },
          },
        },
        assignedTo: { select: { name: true } },
      },
    }),
    prisma.customerMediaDelivery.count({ where }),
  ]);

  // Parse per-addon statuses from notes JSON field
  // Format stored: {"addonStatuses":{"addOnId1":"SENT_TO_CUSTOMER","addOnId2":"PENDING"}}
  const deliveries = rawDeliveries.map((d) => {
    let addonStatuses: Record<string, string> = {};
    try {
      if (d.notes) {
        const parsed = JSON.parse(d.notes);
        if (parsed.addonStatuses) addonStatuses = parsed.addonStatuses;
      }
    } catch {}
    // Default all purchased add-ons to PENDING if not set
    d.booking.addOns.forEach((a) => {
      if (!addonStatuses[a.addOn.id]) addonStatuses[a.addOn.id] = "PENDING";
    });
    return { ...d, addonStatuses };
  });

  const staff = await prisma.user.findMany({
    where:  { role: { in: ["MEDIA_STAFF", "ADMIN", "SUPER_ADMIN"] }, status: "ACTIVE" },
    select: { id: true, name: true },
  });

  return { deliveries, total, page, perPage: PER_PAGE, staff };
}

export default async function CustomerMediaDeliveryPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  await requirePermission("media", "view");
  const data = await getDeliveries(searchParams);
  return (
    <div>
      <PageHeader
        title="Customer Media Delivery"
        description="Track delivery status per booking and per add-on. Automatically reflects new add-ons."
      />
      <CustomerMediaTable {...(data as any)} searchParams={searchParams as Record<string, string | undefined>} />
    </div>
  );
}
