import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { requireRole } from "@/lib/auth/actions";
import { BOOKING_ACCESS } from "@/lib/auth/roles";
import { CheckInModule } from "@/components/admin/check-in/check-in-module";

export const metadata: Metadata = { title: "Check-in | Admin" };

export default async function CheckInPage() {
  await requireRole(BOOKING_ACCESS as any);
  return (
    <div>
      <PageHeader
        title="Check-in"
        description="Search by booking reference, QR code, phone, or customer name."
      />
      <div className="p-6 max-w-2xl">
        <CheckInModule />
      </div>
    </div>
  );
}
