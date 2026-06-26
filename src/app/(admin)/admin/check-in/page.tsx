import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { requirePermission } from "@/lib/auth/permissions";
import { CheckInModule } from "@/components/admin/check-in/check-in-module";

export const metadata: Metadata = { title: "Check-in | Admin" };

export default async function CheckInPage() {
  await requirePermission("bookings", "edit");
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
