import { requirePermission } from "@/lib/auth/permissions";
import { DeviceManager } from "@/components/admin/ride-tracking/device-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Scan Devices" };

export default async function DevicesPage() {
  await requirePermission("ride_tracking", "view");
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Scan Devices</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage floor scanning devices and their assigned locations</p>
      </div>
      <DeviceManager />
    </div>
  );
}
