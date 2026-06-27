import { requirePermission } from "@/lib/auth/permissions";
import { RideReports } from "@/components/admin/ride-tracking/ride-reports";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ride Reports" };

export default async function RideReportsPage() {
  await requirePermission("ride_tracking", "view");
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Ride Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">Filter, view and export ride tracking data</p>
      </div>
      <RideReports />
    </div>
  );
}
