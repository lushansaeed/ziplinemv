"use client";

import { useState } from "react";
import { X, QrCode, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface Rider {
  id: string;
  name: string;
  hasWristband: boolean;
}

interface Props {
  bookingId: string;
  reference: string;
  riders: Rider[];
  onClose: () => void;
  onSuccess: () => void;
}

export function WristbandCheckInModal({ bookingId, reference, riders, onClose, onSuccess }: Props) {
  const [assignments, setAssignments] = useState<Record<string, string>>(
    Object.fromEntries(riders.map((r) => [r.id, ""]))
  );
  const [saving, setSaving] = useState(false);

  const canSave = riders.every((r) => r.hasWristband || assignments[r.id]?.trim().length > 0);

  async function handleSave() {
    const toAssign = riders
      .filter((r) => !r.hasWristband && assignments[r.id]?.trim())
      .map((r) => ({ bookingRiderId: r.id, wristbandQrCode: assignments[r.id].trim() }));

    if (toAssign.length === 0) { onClose(); return; }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}/wristband-check-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignments: toAssign }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        const errs = data.errors ?? [data.error ?? "Failed to assign wristbands"];
        toast.error(errs.join("; "));
      } else {
        toast.success("Wristbands assigned — booking checked in");
        onSuccess();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              <QrCode className="w-5 h-5 text-primary" />
              Assign Wristbands
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Booking {reference}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Scan or enter the QR code printed on each rider's wristband.
          </p>
          {riders.map((rider) => (
            <div key={rider.id} className="space-y-1.5">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                {rider.hasWristband && <Check className="w-4 h-4 text-green-500" />}
                {rider.name}
                {rider.hasWristband && <span className="text-xs text-green-600 font-normal">already assigned</span>}
              </label>
              {!rider.hasWristband && (
                <input
                  type="text"
                  value={assignments[rider.id] ?? ""}
                  onChange={(e) => setAssignments((prev) => ({ ...prev, [rider.id]: e.target.value }))}
                  placeholder="Scan or type QR code..."
                  autoComplete="off"
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm font-mono bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              )}
            </div>
          ))}

          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>Each wristband QR must be unique. A wristband in use by another active rider cannot be assigned.</span>
          </div>
        </div>

        <div className="flex gap-3 p-6 pt-0">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
          >
            {saving ? "Saving..." : "Confirm Check-In"}
          </button>
        </div>
      </div>
    </div>
  );
}
