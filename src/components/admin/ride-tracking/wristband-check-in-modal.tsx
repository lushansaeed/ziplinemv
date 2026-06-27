"use client";

import { useEffect, useState } from "react";
import { X, QrCode, Check, AlertCircle, ShieldAlert, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

interface Rider {
  id: string;
  name: string;
  hasWristband: boolean;
  waiverSigned?: boolean; // loaded from API
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
  const [waiverMap, setWaiverMap] = useState<Record<string, boolean>>({});
  const [loadingWaivers, setLoadingWaivers] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load waiver status for each rider
  useEffect(() => {
    fetch(`/api/admin/bookings/${bookingId}/waiver-status`)
      .then((r) => r.json())
      .then((data: { riderId: string; signed: boolean }[]) => {
        const map: Record<string, boolean> = {};
        data.forEach((d) => { map[d.riderId] = d.signed; });
        setWaiverMap(map);
      })
      .catch(() => {})
      .finally(() => setLoadingWaivers(false));
  }, [bookingId]);

  const allWaiversSigned = riders.every((r) => waiverMap[r.id] === true);
  const canSave = !loadingWaivers && allWaiversSigned &&
    riders.every((r) => r.hasWristband || assignments[r.id]?.trim().length > 0);

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
        const errs: string[] = data.errors ?? [data.error ?? "Failed to assign wristbands"];
        errs.forEach((e) => toast.error(e, { duration: 8000 }));
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
          {/* Waiver status warning */}
          {!loadingWaivers && !allWaiversSigned && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
              <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600" />
              <span>
                <strong>Waiver required.</strong> One or more riders have not signed the waiver form.
                Wristband linking is blocked until all waivers are completed. Resend the waiver link and ask the customer to sign before proceeding.
              </span>
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            Scan or enter the QR code printed on each rider's wristband. All waivers must be signed first.
          </p>

          {riders.map((rider) => {
            const signed = waiverMap[rider.id];
            return (
              <div key={rider.id} className="space-y-1.5">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  {rider.hasWristband
                    ? <Check className="w-4 h-4 text-green-500" />
                    : signed
                      ? <ShieldCheck className="w-4 h-4 text-green-500" />
                      : <ShieldAlert className="w-4 h-4 text-red-500" />
                  }
                  {rider.name}
                  {rider.hasWristband && <span className="text-xs text-green-600 font-normal">already assigned</span>}
                  {!rider.hasWristband && !loadingWaivers && (
                    signed
                      ? <span className="text-xs text-green-600 font-normal">waiver signed ✓</span>
                      : <span className="text-xs text-red-600 font-semibold">waiver not signed — blocked</span>
                  )}
                </label>
                {!rider.hasWristband && (
                  <input
                    type="text"
                    value={assignments[rider.id] ?? ""}
                    onChange={(e) => setAssignments((prev) => ({ ...prev, [rider.id]: e.target.value }))}
                    placeholder={signed === false ? "Blocked — waiver not signed" : "Scan or type QR code..."}
                    disabled={signed === false}
                    autoComplete="off"
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm font-mono bg-background focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                )}
              </div>
            );
          })}

          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              Wristband linking requires a completed waiver. This check is enforced by the server and cannot be bypassed.
            </span>
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
