import { requirePermission } from "@/lib/auth/permissions";
import { LiveRideBoard } from "@/components/admin/ride-tracking/live-ride-board";

export const dynamic = "force-dynamic";
export const metadata = { title: "Live Ride Board" };

export default async function LiveRideBoardPage() {
  await requirePermission("ride_tracking", "view");
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Live Ride Board</h1>
        <p className="text-sm text-muted-foreground mt-1">Real-time rider progress tracking</p>
      </div>
      <LiveRideBoard />
    </div>
  );
}
