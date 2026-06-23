import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma/client";
import { requireRole } from "@/lib/auth/actions";
import { BOOKING_ACCESS } from "@/lib/auth/roles";
import { PageHeader } from "@/components/shared/page-header";
import { WalkInBookingForm } from "@/components/admin/bookings/walk-in-form";

export const metadata: Metadata = { title: "Walk-in Booking | Admin" };

async function getFormData() {
  const [packages, addOns, activity] = await Promise.all([
    prisma.package.findMany({ where: { active: true }, orderBy: { displayOrder: "asc" } }),
    prisma.addOn.findMany({   where: { active: true }, orderBy: { displayOrder: "asc" } }),
    prisma.activity.findUnique({ where: { slug: "zipline" } }),
  ]);
  return { packages, addOns, activityId: activity?.id ?? "" };
}

export default async function WalkInBookingPage() {
  await requireRole(BOOKING_ACCESS as any);
  const { packages, addOns, activityId } = await getFormData();

  return (
    <div>
      <PageHeader
        title="Walk-in Booking"
        description="Create a booking for a walk-in customer. Source will be set to walk-in."
        actions={
          <Link href="/admin/bookings" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to bookings
          </Link>
        }
      />
      <div className="p-6 max-w-3xl">
        <WalkInBookingForm packages={packages} addOns={addOns} />
      </div>
    </div>
  );
}
