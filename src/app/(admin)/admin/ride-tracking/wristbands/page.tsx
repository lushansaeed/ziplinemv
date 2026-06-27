import { requirePermission } from "@/lib/auth/permissions";
import { WristbandManager } from "@/components/admin/ride-tracking/wristband-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Wristband Management" };

export default async function WristbandsPage() {
  await requirePermission("ride_tracking", "view");
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">QR Wristbands</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage QR wristband inventory and assignments</p>
      </div>
      <WristbandManager />
    </div>
  );
}
